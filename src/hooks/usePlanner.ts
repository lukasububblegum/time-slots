"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { DEFAULT_SETTINGS, db, makeScheduleBlock, makeTask, seedDemoData, touch } from "@/lib/db";
import { addDays, daysBetween, findOverlap, getWeeklyRepeatGroup, isInsideDay } from "@/lib/scheduler";
import { isCloudSyncConfigured } from "@/lib/sync";
import type { AppSettings, ScheduleBlock, Task } from "@/lib/types";

const activeOnly = <T extends { deletedAt?: string }>(item: T) => !item.deletedAt;

export function usePlanner() {
  useEffect(() => {
    if (isCloudSyncConfigured()) {
      return;
    }

    void seedDemoData();
  }, []);

  const tasks = useLiveQuery(() => db.tasks.filter(activeOnly).toArray(), [], []);
  const blocks = useLiveQuery(() => db.scheduleBlocks.filter(activeOnly).toArray(), [], []);
  const settings = useLiveQuery(
    async () => (await db.settings.get("local")) ?? DEFAULT_SETTINGS,
    [],
    DEFAULT_SETTINGS,
  );

  const createTask = async (input: Parameters<typeof makeTask>[0]) => {
    const task = makeTask(input);
    await db.tasks.put(task);
    return task;
  };

  const updateTask = async (taskId: string, patch: Partial<Omit<Task, "id" | "createdAt">>) => {
    const task = await db.tasks.get(taskId);
    if (!task || task.deletedAt) {
      return;
    }

    await db.tasks.put(touch({ ...task, ...patch }));
  };

  const toggleBlockCompleted = async (blockId: string) => {
    const block = await db.scheduleBlocks.get(blockId);
    if (!block || block.deletedAt) {
      return;
    }

    await db.scheduleBlocks.put(
      touch({
        ...block,
        completedAt: block.completedAt ? undefined : new Date().toISOString(),
      }),
    );
  };

  const deleteTask = async (taskId: string) => {
    const timestamp = new Date().toISOString();
    const task = await db.tasks.get(taskId);
    if (!task) {
      return;
    }

    const taskBlocks = await db.scheduleBlocks.where("taskId").equals(taskId).toArray();

    await db.transaction("rw", db.tasks, db.scheduleBlocks, async () => {
      await db.tasks.put({
        ...touch(task),
        deletedAt: timestamp,
      });
      await db.scheduleBlocks.bulkPut(
        taskBlocks.map((block) => ({
          ...touch(block),
          deletedAt: timestamp,
        })),
      );
    });
  };

  const scheduleTask = async (
    taskId: string,
    date: string,
    startMinutes: number,
    allBlocks: ScheduleBlock[],
    appSettings: AppSettings,
  ) => {
    const task = await db.tasks.get(taskId);
    if (!task || task.deletedAt) {
      return { ok: false, message: "Task no longer exists." };
    }

    const durationMinutes = Math.max(appSettings.slotSizeMinutes, task.estimatedMinutes);
    const candidate = makeScheduleBlock({
      taskId,
      date,
      startMinutes,
      durationMinutes,
    });

    if (!isInsideDay(candidate, appSettings)) {
      return { ok: false, message: "That block would fall outside your visible day." };
    }

    const overlap = findOverlap(candidate, allBlocks);
    if (overlap) {
      return { ok: false, message: "That slot is already occupied. Drop onto the block itself to swap." };
    }

    await db.scheduleBlocks.put(candidate);
    return { ok: true, block: candidate };
  };

  const moveBlock = async (
    blockId: string,
    date: string,
    startMinutes: number,
    allBlocks: ScheduleBlock[],
    appSettings: AppSettings,
    options: { moveRepeatSeries?: boolean } = {},
  ) => {
    const block = await db.scheduleBlocks.get(blockId);
    if (!block || block.deletedAt) {
      return { ok: false, message: "Scheduled block no longer exists." };
    }

    const relatedBlocks = options.moveRepeatSeries ? getWeeklyRepeatGroup(block, allBlocks) : [];
    const blocksToMove = [block, ...relatedBlocks];
    const movingIds = blocksToMove.map((item) => item.id);
    const dayDelta = daysBetween(block.date, date);
    const startDelta = startMinutes - block.startMinutes;
    const candidates = blocksToMove.map((item) =>
      touch({
        ...item,
        date: addDays(item.date, dayDelta),
        startMinutes: item.startMinutes + startDelta,
      }),
    );
    const candidate = candidates.find((item) => item.id === blockId) ?? candidates[0];

    if (candidates.some((item) => !isInsideDay(item, appSettings))) {
      return { ok: false, message: "That move would fall outside your visible day." };
    }

    const overlap = candidates.find((item) => findOverlap(item, allBlocks, movingIds));
    if (overlap) {
      return {
        ok: false,
        message: options.moveRepeatSeries
          ? "That repeat-series move would overlap another block."
          : "That time overlaps another block. Drop onto a block to swap.",
      };
    }

    await db.scheduleBlocks.bulkPut(candidates);
    return { ok: true, block: candidate, movedCount: candidates.length };
  };

  const resizeBlock = async (
    blockId: string,
    deltaMinutes: number,
    allBlocks: ScheduleBlock[],
    appSettings: AppSettings,
  ) => {
    const block = await db.scheduleBlocks.get(blockId);
    if (!block || block.deletedAt) {
      return { ok: false, message: "Scheduled block no longer exists." };
    }

    const nextDuration = Math.max(
      appSettings.slotSizeMinutes,
      block.durationMinutes + deltaMinutes,
    );
    const candidate = touch({
      ...block,
      durationMinutes: nextDuration,
    });

    if (!isInsideDay(candidate, appSettings)) {
      return { ok: false, message: "That duration would extend past the visible day." };
    }

    const overlap = findOverlap(candidate, allBlocks, [blockId]);
    if (overlap) {
      return { ok: false, message: "That resize would overlap another block." };
    }

    await db.scheduleBlocks.put(candidate);
    return { ok: true, block: candidate };
  };

  const setBlockTime = async (
    blockId: string,
    date: string,
    startMinutes: number,
    endMinutes: number,
    allBlocks: ScheduleBlock[],
    appSettings: AppSettings,
  ) => {
    const block = await db.scheduleBlocks.get(blockId);
    if (!block || block.deletedAt) {
      return { ok: false, message: "Scheduled block no longer exists." };
    }

    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes < 1) {
      return { ok: false, message: "End time must be after start time." };
    }

    const candidate = touch({
      ...block,
      date,
      startMinutes,
      durationMinutes,
    });

    if (!isInsideDay(candidate, appSettings)) {
      return { ok: false, message: "That time range falls outside your visible day." };
    }

    const overlap = findOverlap(candidate, allBlocks, [blockId]);
    if (overlap) {
      return { ok: false, message: "That precise time range overlaps another block." };
    }

    await db.scheduleBlocks.put(candidate);
    return { ok: true, block: candidate };
  };

  const swapBlocks = async (
    sourceBlockId: string,
    targetBlockId: string,
    allBlocks: ScheduleBlock[],
  ) => {
    if (sourceBlockId === targetBlockId) {
      return { ok: true };
    }

    const source = await db.scheduleBlocks.get(sourceBlockId);
    const target = await db.scheduleBlocks.get(targetBlockId);
    if (!source || !target || source.deletedAt || target.deletedAt) {
      return { ok: false, message: "One of those blocks no longer exists." };
    }

    const sourceAtTarget = touch({
      ...source,
      date: target.date,
      startMinutes: target.startMinutes,
    });
    const targetAtSource = touch({
      ...target,
      date: source.date,
      startMinutes: source.startMinutes,
    });

    const sourceOverlap = findOverlap(sourceAtTarget, allBlocks, [target.id]);
    const targetOverlap = findOverlap(targetAtSource, allBlocks, [source.id]);
    if (sourceOverlap || targetOverlap) {
      return { ok: false, message: "Those two blocks cannot swap without colliding with another block." };
    }

    await db.transaction("rw", db.scheduleBlocks, async () => {
      await db.scheduleBlocks.put(sourceAtTarget);
      await db.scheduleBlocks.put(targetAtSource);
    });

    return { ok: true };
  };

  const unscheduleBlock = async (blockId: string) => {
    const block = await db.scheduleBlocks.get(blockId);
    if (!block || block.deletedAt) {
      return;
    }

    await db.scheduleBlocks.put({
      ...touch(block),
      deletedAt: new Date().toISOString(),
    });
  };

  const deleteBlock = async (
    blockId: string,
    allBlocks: ScheduleBlock[],
    options: { deleteFutureRepeats?: boolean } = {},
  ) => {
    const block = await db.scheduleBlocks.get(blockId);
    if (!block || block.deletedAt) {
      return;
    }

    const blocksToDelete = options.deleteFutureRepeats
      ? [block, ...getWeeklyRepeatGroup(block, allBlocks, { futureOnly: true })]
      : [block];
    const timestamp = new Date().toISOString();

    await db.scheduleBlocks.bulkPut(
      blocksToDelete.map((candidate) => ({
        ...touch(candidate),
        deletedAt: timestamp,
      })),
    );
  };

  const repeatBlockWeekly = async (
    blockId: string,
    repeatWeeks: number,
    allBlocks: ScheduleBlock[],
    appSettings: AppSettings,
  ) => {
    const source = await db.scheduleBlocks.get(blockId);
    if (!source || source.deletedAt) {
      return { ok: false, message: "Scheduled block no longer exists." };
    }

    const weeks = Math.max(1, Math.min(52, Math.floor(repeatWeeks)));
    const existingAndPlanned = allBlocks.slice();
    const blocksToCreate: ScheduleBlock[] = [];
    let skipped = 0;

    for (let week = 1; week <= weeks; week += 1) {
      const candidate = makeScheduleBlock({
        taskId: source.taskId,
        date: addDays(source.date, week * 7),
        startMinutes: source.startMinutes,
        durationMinutes: source.durationMinutes,
      });

      if (!isInsideDay(candidate, appSettings)) {
        skipped += 1;
        continue;
      }

      const overlap = findOverlap(candidate, existingAndPlanned, [source.id]);
      if (overlap) {
        skipped += 1;
        continue;
      }

      blocksToCreate.push(candidate);
      existingAndPlanned.push(candidate);
    }

    if (!blocksToCreate.length) {
      return {
        ok: false,
        message: "No repeats were created because every future slot conflicted.",
      };
    }

    await db.scheduleBlocks.bulkPut(blocksToCreate);
    return {
      ok: true,
      created: blocksToCreate.length,
      skipped,
      message: skipped
        ? `Created ${blocksToCreate.length} repeats and skipped ${skipped} conflicts.`
        : `Created ${blocksToCreate.length} weekly repeats.`,
    };
  };

  return {
    tasks,
    blocks,
    settings,
    createTask,
    updateTask,
    toggleBlockCompleted,
    deleteTask,
    scheduleTask,
    moveBlock,
    resizeBlock,
    setBlockTime,
    swapBlocks,
    unscheduleBlock,
    deleteBlock,
    repeatBlockWeekly,
  };
}
