import Dexie, { type Table } from "dexie";
import type { AppSettings, ScheduleBlock, Task } from "@/lib/types";

const now = () => new Date().toISOString();

export const DEFAULT_SETTINGS: AppSettings = {
  id: "local",
  dayStartMinutes: 7 * 60,
  dayEndMinutes: 21 * 60,
  slotSizeMinutes: 5,
  defaultView: "day",
};

export class PlannerDatabase extends Dexie {
  tasks!: Table<Task, string>;
  scheduleBlocks!: Table<ScheduleBlock, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("timeSlotsPlanner");

    this.version(1).stores({
      tasks: "id, status, priority, dueDate, updatedAt, deletedAt, deviceUpdatedAt",
      scheduleBlocks:
        "id, taskId, date, startMinutes, updatedAt, deletedAt, deviceUpdatedAt",
      settings: "id",
    });
  }
}

export const db = new PlannerDatabase();

export async function ensureDefaultSettings() {
  const existing = await db.settings.get("local");
  if (!existing) {
    await db.settings.put(DEFAULT_SETTINGS);
    return;
  }

  if (existing.slotSizeMinutes !== DEFAULT_SETTINGS.slotSizeMinutes) {
    await db.settings.put({
      ...existing,
      slotSizeMinutes: DEFAULT_SETTINGS.slotSizeMinutes,
    });
  }
}

export function makeTask(input: {
  title: string;
  description?: string;
  priority: Task["priority"];
  estimatedMinutes: number;
  dueDate?: string;
  tags: string[];
}): Task {
  const timestamp = now();

  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    status: "todo",
    priority: input.priority,
    tags: input.tags,
    estimatedMinutes: input.estimatedMinutes,
    dueDate: input.dueDate || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    deviceUpdatedAt: timestamp,
  };
}

export function makeScheduleBlock(input: {
  taskId: string;
  date: string;
  startMinutes: number;
  durationMinutes: number;
}): ScheduleBlock {
  const timestamp = now();

  return {
    id: crypto.randomUUID(),
    taskId: input.taskId,
    date: input.date,
    startMinutes: input.startMinutes,
    durationMinutes: input.durationMinutes,
    createdAt: timestamp,
    updatedAt: timestamp,
    deviceUpdatedAt: timestamp,
  };
}

export function touch<T extends { updatedAt: string; deviceUpdatedAt: string }>(value: T): T {
  const timestamp = now();
  return {
    ...value,
    updatedAt: timestamp,
    deviceUpdatedAt: timestamp,
  };
}

export async function seedDemoData() {
  await ensureDefaultSettings();
  const existingTasks = await db.tasks.filter((task) => !task.deletedAt).count();
  if (existingTasks > 0) {
    return;
  }

  const tasks = [
    makeTask({
      title: "Deep work draft",
      description: "Outline and write the first pass.",
      priority: "high",
      estimatedMinutes: 90,
      tags: ["focus"],
    }),
    makeTask({
      title: "Email follow-up",
      priority: "medium",
      estimatedMinutes: 30,
      tags: ["admin"],
    }),
    makeTask({
      title: "Workout",
      priority: "low",
      estimatedMinutes: 45,
      tags: ["health"],
    }),
    makeTask({
      title: "Plan next sprint",
      priority: "high",
      estimatedMinutes: 60,
      tags: ["planning"],
    }),
  ];

  const today = new Date().toISOString().slice(0, 10);
  const blocks = [
    makeScheduleBlock({
      taskId: tasks[0].id,
      date: today,
      startMinutes: 9 * 60,
      durationMinutes: 90,
    }),
    makeScheduleBlock({
      taskId: tasks[1].id,
      date: today,
      startMinutes: 13 * 60 + 30,
      durationMinutes: 30,
    }),
  ];

  await db.transaction("rw", db.tasks, db.scheduleBlocks, async () => {
    await db.tasks.bulkPut(tasks);
    await db.scheduleBlocks.bulkPut(blocks);
  });
}
