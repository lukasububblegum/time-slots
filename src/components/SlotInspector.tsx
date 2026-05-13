import { ArrowDownToLine, ArrowRightLeft, CalendarClock, Minus, MoveRight, Pencil, Plus, Trash2 } from "lucide-react";
import { buildSlots, minutesToLabel } from "@/lib/scheduler";
import type { AppSettings, ScheduleBlock, Task } from "@/lib/types";

interface SlotInspectorProps {
  selectedTask?: Task;
  selectedBlock?: ScheduleBlock;
  blockTask?: Task;
  activeDate: string;
  settings: AppSettings;
  pendingSwapBlockId?: string;
  onScheduleTask: (taskId: string, date: string, startMinutes: number) => void;
  onMoveBlock: (date: string, startMinutes: number) => void;
  onResize: (deltaMinutes: number) => void;
  onUnschedule: () => void;
  onFineEdit: () => void;
  onStartSwap: (blockId: string) => void;
  onCancelSwap: () => void;
  onDeleteTask: (taskId: string) => void;
}

export function SlotInspector({
  selectedTask,
  selectedBlock,
  blockTask,
  activeDate,
  settings,
  pendingSwapBlockId,
  onScheduleTask,
  onMoveBlock,
  onResize,
  onUnschedule,
  onFineEdit,
  onStartSwap,
  onCancelSwap,
  onDeleteTask,
}: SlotInspectorProps) {
  const slots = buildSlots(settings);
  const defaultStart = selectedBlock?.startMinutes ?? settings.dayStartMinutes;
  const isSwapPending = Boolean(selectedBlock && pendingSwapBlockId === selectedBlock.id);

  if (!selectedTask && !selectedBlock) {
    return (
      <aside className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Details</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Select a task or scheduled block to edit duration, unschedule, or delete.
        </p>
      </aside>
    );
  }

  if (selectedBlock) {
    return (
      <aside className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="h-5 w-5 text-[var(--accent)]" />
          Scheduled block
        </div>
        <h3 className="mt-4 text-lg font-semibold">{blockTask?.title ?? "Missing task"}</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase text-[var(--muted)]">Time</dt>
            <dd className="mt-1 font-medium">
              {minutesToLabel(selectedBlock.startMinutes)} -{" "}
              {minutesToLabel(selectedBlock.startMinutes + selectedBlock.durationMinutes)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-[var(--muted)]">Duration</dt>
            <dd className="mt-1 font-medium">{selectedBlock.durationMinutes} minutes</dd>
          </div>
          {blockTask?.tags.length ? (
            <div>
              <dt className="text-xs uppercase text-[var(--muted)]">Tags</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {blockTask.tags.map((tag) => (
                  <span key={tag} className="rounded bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--accent-strong)]">
                    {tag}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-3">
          <div className="text-xs font-semibold uppercase text-[var(--muted)]">Move</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              className="rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm"
              type="date"
              defaultValue={selectedBlock.date}
              id="block-move-date"
            />
            <select
              className="rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm"
              defaultValue={defaultStart}
              id="block-move-time"
            >
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {minutesToLabel(slot)}
                </option>
              ))}
            </select>
          </div>
          <button
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--surface)]"
            type="button"
            onClick={() => {
              const date = (document.getElementById("block-move-date") as HTMLInputElement | null)?.value;
              const start = Number((document.getElementById("block-move-time") as HTMLSelectElement | null)?.value);
              if (date && Number.isFinite(start)) {
                onMoveBlock(date, start);
              }
            }}
          >
            <MoveRight className="h-4 w-4" />
            Move block
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)]"
            type="button"
            onClick={() => onResize(-5)}
          >
            <Minus className="h-4 w-4" />
            5m
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)]"
            type="button"
            onClick={() => onResize(5)}
          >
            <Plus className="h-4 w-4" />
            5m
          </button>
        </div>
        <button
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          type="button"
          onClick={onUnschedule}
        >
          <ArrowDownToLine className="h-4 w-4" />
          Unschedule
        </button>
        <button
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)]"
          type="button"
          onClick={onFineEdit}
        >
          <Pencil className="h-4 w-4" />
          Fine edit
        </button>
        <button
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)]"
          type="button"
          onClick={() => {
            if (isSwapPending) {
              onCancelSwap();
            } else {
              onStartSwap(selectedBlock.id);
            }
          }}
        >
          <ArrowRightLeft className="h-4 w-4" />
          {isSwapPending ? "Cancel swap" : "Pick swap target"}
        </button>
        {isSwapPending ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Tap another scheduled block to complete the swap.
          </p>
        ) : null}
      </aside>
    );
  }

  if (!selectedTask) {
    return null;
  }

  return (
    <aside className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Task</h2>
      <h3 className="mt-4 text-lg font-semibold">{selectedTask.title}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {selectedTask.description || "No description yet."}
      </p>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase text-[var(--muted)]">Estimate</dt>
          <dd className="mt-1 font-medium">{selectedTask.estimatedMinutes} minutes</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-[var(--muted)]">Priority</dt>
          <dd className="mt-1 font-medium capitalize">{selectedTask.priority}</dd>
        </div>
      </dl>
      <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-3">
        <div className="text-xs font-semibold uppercase text-[var(--muted)]">Schedule</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            className="rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm"
            type="date"
            defaultValue={activeDate}
            id="task-schedule-date"
          />
          <select
            className="rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm"
            defaultValue={settings.dayStartMinutes}
            id="task-schedule-time"
          >
            {slots.map((slot) => (
              <option key={slot} value={slot}>
                {minutesToLabel(slot)}
              </option>
            ))}
          </select>
        </div>
        <button
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          type="button"
          onClick={() => {
            const date = (document.getElementById("task-schedule-date") as HTMLInputElement | null)?.value;
            const start = Number((document.getElementById("task-schedule-time") as HTMLSelectElement | null)?.value);
            if (date && Number.isFinite(start)) {
              onScheduleTask(selectedTask.id, date, start);
            }
          }}
        >
          <CalendarClock className="h-4 w-4" />
          Schedule task
        </button>
      </div>
      <button
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--rose)] px-3 py-2 text-sm font-semibold text-[var(--rose)] hover:bg-[var(--rose-soft)]"
        type="button"
        onClick={() => onDeleteTask(selectedTask.id)}
      >
        <Trash2 className="h-4 w-4" />
        Delete task
      </button>
    </aside>
  );
}
