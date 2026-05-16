export type TaskStatus = "todo" | "in-progress" | "done";
export type Priority = "high" | "medium" | "low";
export type CalendarView = "day" | "week";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  estimatedMinutes: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deviceUpdatedAt: string;
}

export interface ScheduleBlock {
  id: string;
  taskId: string;
  date: string;
  startMinutes: number;
  durationMinutes: number;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deviceUpdatedAt: string;
}

export interface AppSettings {
  id: "local";
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotSizeMinutes: number;
  defaultView: CalendarView;
}

export interface PlannerState {
  tasks: Task[];
  blocks: ScheduleBlock[];
  settings: AppSettings;
}

export type DragPayload =
  | {
      kind: "task";
      taskId: string;
    }
  | {
      kind: "block";
      blockId: string;
      offsetMinutes?: number;
    };

export interface Conflict {
  title: string;
  message: string;
}
