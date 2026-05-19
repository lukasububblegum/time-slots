"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConflictBanner } from "@/components/ConflictBanner";
import { PreciseTimeEditor } from "@/components/PreciseTimeEditor";
import { ScheduleGrid } from "@/components/ScheduleGrid";
import { SlotInspector } from "@/components/SlotInspector";
import { TaskInbox } from "@/components/TaskInbox";
import { ViewToolbar } from "@/components/ViewToolbar";
import { usePlanner } from "@/hooks/usePlanner";
import { exportScheduleHtml, exportScheduleIcs } from "@/lib/exportSchedule";
import { dateKey, getWeeklyRepeatGroup } from "@/lib/scheduler";
import { useCloudSync } from "@/lib/sync";
import type { CalendarView, Conflict, Task } from "@/lib/types";

type TaskInfoPatch = Partial<Pick<Task, "title" | "description" | "priority" | "tags" | "estimatedMinutes">>;

export function AppShell() {
  const {
    tasks,
    blocks,
    settings,
    createTask,
    updateTask,
    updateDefaultView,
    updateBlockInfo,
    deleteTask,
    toggleBlockCompleted,
    scheduleTask,
    moveBlock,
    resizeBlock,
    setBlockTime,
    swapBlocks,
    unscheduleBlock,
    deleteBlock,
    repeatBlockWeekly,
  } = usePlanner();
  const sync = useCloudSync();

  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [view, setView] = useState<CalendarView>("day");
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>();
  const [pendingSwapBlockId, setPendingSwapBlockId] = useState<string | undefined>();
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [scheduleOnly, setScheduleOnly] = useState(true);
  const [preciseBlockId, setPreciseBlockId] = useState<string | undefined>();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isLocalDev =
      process.env.NODE_ENV === "development" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost";

    if (isLocalDev) {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });

      if ("caches" in window) {
        void caches.keys().then((keys) => {
          keys
            .filter((key) => key.startsWith("time-slots-"))
            .forEach((key) => {
              void caches.delete(key);
            });
        });
      }

      return;
    }

    void navigator.serviceWorker.register("/sw.js");
  }, []);

  useEffect(() => {
    setView(settings.defaultView);
  }, [settings.defaultView]);

  const handleViewChange = (nextView: CalendarView) => {
    setView(nextView);
    void updateDefaultView(nextView);
  };

  const scheduledTaskIds = useMemo(
    () => new Set(blocks.map((block) => block.taskId)),
    [blocks],
  );
  const unscheduledTasks = useMemo(
    () => tasks.filter((task) => !scheduledTaskIds.has(task.id)),
    [tasks, scheduledTaskIds],
  );
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId);
  const preciseBlock = blocks.find((block) => block.id === preciseBlockId);
  const selectedBlockTask = selectedBlock
    ? tasks.find((task) => task.id === selectedBlock.taskId)
    : undefined;
  const selectedBlockLinkedRepeatCount = useMemo(() => {
    if (!selectedBlock) {
      return 0;
    }

    return getWeeklyRepeatGroup(selectedBlock, blocks).length;
  }, [blocks, selectedBlock]);
  const selectedBlockRepeatGroupCount = useMemo(() => {
    if (!selectedBlock) {
      return 0;
    }

    return getWeeklyRepeatGroup(selectedBlock, blocks).length;
  }, [blocks, selectedBlock]);
  const preciseBlockTask = preciseBlock
    ? tasks.find((task) => task.id === preciseBlock.taskId)
    : undefined;
  const syncFingerprint = useMemo(() => {
    const taskVersions = tasks
      .map((task) => `${task.id}:${task.updatedAt}:${task.deletedAt ?? ""}`)
      .sort();
    const blockVersions = blocks
      .map((block) => `${block.id}:${block.updatedAt}:${block.deletedAt ?? ""}:${block.completedAt ?? ""}`)
      .sort();

    return JSON.stringify({
      taskVersions,
      blockVersions,
      settings: {
        dayStartMinutes: settings.dayStartMinutes,
        dayEndMinutes: settings.dayEndMinutes,
        slotSizeMinutes: settings.slotSizeMinutes,
        defaultView: settings.defaultView,
      },
    });
  }, [blocks, settings, tasks]);
  const lastAutoSyncFingerprint = useRef<string | undefined>(undefined);
  const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncEnabled = sync.enabled;
  const syncIsSyncing = sync.isSyncing;
  const syncNow = sync.syncNow;

  useEffect(() => {
    if (!syncEnabled) {
      lastAutoSyncFingerprint.current = undefined;
      if (autoSyncTimer.current) {
        clearTimeout(autoSyncTimer.current);
      }
      return;
    }

    if (!lastAutoSyncFingerprint.current) {
      lastAutoSyncFingerprint.current = syncFingerprint;
      return;
    }

    if (syncIsSyncing || lastAutoSyncFingerprint.current === syncFingerprint) {
      return;
    }

    if (autoSyncTimer.current) {
      clearTimeout(autoSyncTimer.current);
    }

    autoSyncTimer.current = setTimeout(() => {
      lastAutoSyncFingerprint.current = syncFingerprint;
      void syncNow();
    }, 1800);

    return () => {
      if (autoSyncTimer.current) {
        clearTimeout(autoSyncTimer.current);
      }
    };
  }, [syncEnabled, syncFingerprint, syncIsSyncing, syncNow]);

  const showNotice = (title: string, message: string) => {
    setConflict({
      title,
      message,
    });
  };

  const showConflict = (message: string) => {
    showNotice("Schedule conflict", message);
  };

  const handleDropTask = async (taskId: string, date: string, startMinutes: number) => {
    const result = await scheduleTask(taskId, date, startMinutes, blocks, settings);
    if (!result.ok) {
      showConflict(result.message ?? "Could not schedule that task.");
      return;
    }

    if (result.block) {
      setSelectedBlockId(result.block.id);
    }
    setSelectedTaskId(undefined);
    setConflict(null);
  };

  const shouldMoveRepeatSeries = (blockId: string) => {
    const block = blocks.find((item) => item.id === blockId);
    if (!block) {
      return false;
    }

    const repeatCount = getWeeklyRepeatGroup(block, blocks).length;
    if (!repeatCount) {
      return false;
    }

    return window.confirm(
      `Move ${repeatCount} matching weekly repeat${repeatCount === 1 ? "" : "s"} too?\n\nOK: move the whole repeat series.\nCancel: move only this block.`,
    );
  };

  const handleMoveBlock = async (blockId: string, date: string, startMinutes: number) => {
    const result = await moveBlock(blockId, date, startMinutes, blocks, settings, {
      moveRepeatSeries: shouldMoveRepeatSeries(blockId),
    });
    if (!result.ok) {
      showConflict(result.message ?? "Could not move that block.");
      return;
    }

    setSelectedBlockId(blockId);
    setSelectedTaskId(undefined);
    setConflict(null);
  };

  const handleSwapBlocks = async (sourceBlockId: string, targetBlockId: string) => {
    const result = await swapBlocks(sourceBlockId, targetBlockId, blocks);
    if (!result.ok) {
      showConflict(result.message ?? "Could not swap those blocks.");
      return;
    }

    setSelectedBlockId(targetBlockId);
    setSelectedTaskId(undefined);
    setPendingSwapBlockId(undefined);
    setConflict(null);
  };

  const handleResize = async (deltaMinutes: number) => {
    if (!selectedBlockId) {
      return;
    }

    const result = await resizeBlock(selectedBlockId, deltaMinutes, blocks, settings);
    if (!result.ok) {
      showConflict(result.message ?? "Could not resize that block.");
      return;
    }

    setConflict(null);
  };

  const handlePreciseSave = async (date: string, startMinutes: number, endMinutes: number) => {
    if (!preciseBlockId) {
      return;
    }

    const result = await setBlockTime(
      preciseBlockId,
      date,
      startMinutes,
      endMinutes,
      blocks,
      settings,
    );
    if (!result.ok) {
      showConflict(result.message ?? "Could not save that precise time range.");
      return;
    }

    setSelectedBlockId(preciseBlockId);
    setPreciseBlockId(undefined);
    setConflict(null);
  };

  const handleUnschedule = async () => {
    if (!selectedBlockId) {
      return;
    }

    await unscheduleBlock(selectedBlockId);
    setSelectedBlockId(undefined);
  };

  const handleDeleteBlock = async (deleteFutureRepeats: boolean) => {
    if (!selectedBlockId) {
      return;
    }

    await deleteBlock(selectedBlockId, blocks, { deleteFutureRepeats });
    setSelectedBlockId(undefined);
  };

  const handleRepeatWeekly = async (repeatWeeks: number) => {
    if (!selectedBlockId) {
      return;
    }

    const result = await repeatBlockWeekly(selectedBlockId, repeatWeeks, blocks, settings);
    if (!result.ok) {
      showConflict(result.message ?? "Could not create weekly repeats.");
      return;
    }

    showNotice("Repeat complete", result.message ?? "Weekly repeats created.");
  };

  const handleUpdateTask = async (taskId: string, patch: TaskInfoPatch) => {
    await updateTask(taskId, patch);
    setConflict(null);
  };

  const handleUpdateBlockInfo = async (
    blockId: string,
    taskPatch: TaskInfoPatch,
    blockNotes: string | undefined,
    applyToRepeats: boolean,
  ) => {
    await updateBlockInfo(blockId, taskPatch, blockNotes, blocks, { applyToRepeats });
    setSelectedBlockId(blockId);
    setSelectedTaskId(undefined);
    setConflict(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    if (selectedTaskId === taskId) {
      setSelectedTaskId(undefined);
    }
    if (selectedBlock?.taskId === taskId) {
      setSelectedBlockId(undefined);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1720px] flex-col gap-4 p-3 sm:p-4 lg:p-5">
      <ConflictBanner conflict={conflict} onDismiss={() => setConflict(null)} />
      <ViewToolbar
        date={selectedDate}
        view={view}
        onDateChange={setSelectedDate}
        onViewChange={handleViewChange}
        onJumpToToday={() => setSelectedDate(dateKey(new Date()))}
        scheduleOnly={scheduleOnly}
        onScheduleOnlyChange={setScheduleOnly}
        onNewTask={() => {
          setScheduleOnly(false);
          window.setTimeout(() => document.getElementById("task-title")?.focus(), 0);
        }}
        onExportHtml={() => exportScheduleHtml({ date: selectedDate, view, tasks, blocks })}
        onExportCalendar={() => exportScheduleIcs({ date: selectedDate, view, tasks, blocks })}
        sync={sync}
      />
      <div
        className={`grid min-h-0 flex-1 grid-cols-1 gap-4 ${
          scheduleOnly
            ? "xl:grid-cols-[minmax(0,1fr)_300px]"
            : "md:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_300px]"
        }`}
      >
        {!scheduleOnly ? (
          <div className="min-w-0">
            <TaskInbox
              tasks={unscheduledTasks}
              onCreate={async (input) => {
                const task = await createTask(input);
                setSelectedTaskId(task.id);
                setSelectedBlockId(undefined);
              }}
              onSelectTask={(taskId) => {
                setSelectedTaskId(taskId);
                setSelectedBlockId(undefined);
              }}
              onDeleteTask={handleDeleteTask}
              selectedTaskId={selectedTaskId}
            />
          </div>
        ) : null}
        <ScheduleGrid
          date={selectedDate}
          view={view}
          tasks={tasks}
          blocks={blocks}
          settings={settings}
          selectedBlockId={selectedBlockId}
          onDropTask={handleDropTask}
          onMoveBlock={handleMoveBlock}
          onSwapBlocks={handleSwapBlocks}
          onToggleBlockComplete={toggleBlockCompleted}
          onFineEditBlock={(blockId) => {
            setSelectedBlockId(blockId);
            setSelectedTaskId(undefined);
            setPreciseBlockId(blockId);
          }}
          onSelectBlock={(blockId) => {
            if (pendingSwapBlockId && pendingSwapBlockId !== blockId) {
              void handleSwapBlocks(pendingSwapBlockId, blockId);
              return;
            }
            setSelectedBlockId(blockId);
            setSelectedTaskId(undefined);
          }}
          compact={scheduleOnly}
        />
        <div className={`min-w-0 ${scheduleOnly ? "" : "md:col-span-2 2xl:col-span-1"}`}>
            <SlotInspector
              selectedTask={selectedTask}
              selectedBlock={selectedBlock}
              blockTask={selectedBlockTask}
              readOnly={scheduleOnly}
              futureRepeatCount={selectedBlockLinkedRepeatCount}
              repeatGroupCount={selectedBlockRepeatGroupCount}
              activeDate={selectedDate}
              settings={settings}
              pendingSwapBlockId={pendingSwapBlockId}
              onScheduleTask={handleDropTask}
              onUpdateTask={handleUpdateTask}
              onUpdateBlockInfo={handleUpdateBlockInfo}
              onMoveBlock={(date, startMinutes) => {
                if (selectedBlockId) {
                  void handleMoveBlock(selectedBlockId, date, startMinutes);
                }
              }}
              onResize={handleResize}
              onToggleComplete={() => {
                if (selectedBlockId) {
                  void toggleBlockCompleted(selectedBlockId);
                }
              }}
              onRepeatWeekly={handleRepeatWeekly}
              onUnschedule={handleUnschedule}
              onDeleteBlock={handleDeleteBlock}
              onFineEdit={() => {
                if (selectedBlockId) {
                  setPreciseBlockId(selectedBlockId);
                }
              }}
              onStartSwap={(blockId) => setPendingSwapBlockId(blockId)}
              onCancelSwap={() => setPendingSwapBlockId(undefined)}
              onDeleteTask={handleDeleteTask}
            />
        </div>
      </div>
      {preciseBlock ? (
        <PreciseTimeEditor
          block={preciseBlock}
          task={preciseBlockTask}
          settings={settings}
          onClose={() => setPreciseBlockId(undefined)}
          onSave={handlePreciseSave}
        />
      ) : null}
    </main>
  );
}
