import { Clock, GripVertical, Trash2 } from "lucide-react";
import { TaskComposer, type TaskComposerInput } from "@/components/TaskComposer";
import type { Priority, Task } from "@/lib/types";

const priorityClass: Record<Priority, string> = {
  high: "bg-[var(--rose-soft)] text-[var(--rose)]",
  medium: "bg-[var(--amber-soft)] text-[var(--amber)]",
  low: "bg-[var(--blue-soft)] text-[var(--blue)]",
};

interface TaskInboxProps {
  tasks: Task[];
  onCreate: (input: TaskComposerInput) => Promise<void>;
  onSelectTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  selectedTaskId?: string;
}

export function TaskInbox({
  tasks,
  onCreate,
  onSelectTask,
  onDeleteTask,
  selectedTaskId,
}: TaskInboxProps) {
  return (
    <aside className="flex min-h-0 flex-col gap-3">
      <TaskComposer onCreate={onCreate} />
      <section className="min-h-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-sm">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h2 className="text-sm font-semibold">Unscheduled</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Drag a task into the calendar.</p>
        </div>
        <div className="flex max-h-[calc(100vh-22rem)] min-h-48 flex-col gap-2 overflow-auto p-3">
          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--line-strong)] px-3 py-6 text-center text-sm text-[var(--muted)]">
              Every task is scheduled.
            </div>
          ) : null}
          {tasks.map((task) => (
            <article
              key={task.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({ kind: "task", taskId: task.id }),
                );
              }}
              onClick={() => onSelectTask(task.id)}
              className={`cursor-grab rounded-lg border bg-white p-3 shadow-sm transition hover:border-[var(--accent)] ${
                selectedTaskId === task.id ? "border-[var(--accent)]" : "border-[var(--line)]"
              }`}
            >
              <div className="flex items-start gap-2">
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{task.title}</div>
                  {task.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                      {task.description}
                    </p>
                  ) : null}
                </div>
                <button
                  className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--rose-soft)] hover:text-[var(--rose)]"
                  type="button"
                  aria-label={`Delete ${task.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteTask(task.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-1 text-xs font-semibold ${priorityClass[task.priority]}`}>
                  {task.priority}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted)]">
                  <Clock className="h-3.5 w-3.5" />
                  {task.estimatedMinutes}m
                </span>
                {task.tags.map((tag) => (
                  <span key={tag} className="rounded bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--accent-strong)]">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}
