import { type FormEvent, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowRightLeft, CalendarClock, CheckCircle2, MessageSquare, Minus, MoveRight, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { durationOptionsMinutes } from "@/lib/durations";
import { buildSlots, minutesToLabel } from "@/lib/scheduler";
import type { AppSettings, Priority, ScheduleBlock, Task } from "@/lib/types";

type TaskInfoPatch = Partial<Pick<Task, "title" | "description" | "priority" | "tags" | "estimatedMinutes">>;

const parseTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

interface TaskInfoEditorProps {
  task: Task;
  block?: ScheduleBlock;
  repeatGroupCount?: number;
  onSave: (patch: TaskInfoPatch, blockNotes?: string, applyToRepeats?: boolean) => void;
}

function TaskInfoEditor({ task, block, repeatGroupCount = 0, onSave }: TaskInfoEditorProps) {
  const tagText = task.tags.join(", ");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes);
  const [tags, setTags] = useState(tagText);
  const [blockNotes, setBlockNotes] = useState(block?.notes ?? "");
  const [applyToRepeats, setApplyToRepeats] = useState(Boolean(block && repeatGroupCount));

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setEstimatedMinutes(task.estimatedMinutes);
    setTags(tagText);
    setBlockNotes(block?.notes ?? "");
    setApplyToRepeats(Boolean(block && repeatGroupCount));
  }, [block?.id, block?.notes, repeatGroupCount, tagText, task.description, task.estimatedMinutes, task.id, task.priority, task.title]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !Number.isFinite(estimatedMinutes) || estimatedMinutes < 1) {
      return;
    }

    onSave(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        estimatedMinutes,
        tags: parseTags(tags),
      },
      block ? blockNotes : undefined,
      block ? applyToRepeats : false,
    );
  };

  return (
    <form className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-3" onSubmit={handleSubmit}>
      <div className="text-xs font-semibold uppercase text-[var(--muted)]">Edit info</div>
      <div className="mt-3 space-y-3">
        <label className="block text-xs font-medium text-[var(--muted)]">
          Title
          <input
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm text-[var(--ink)]"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-[var(--muted)]">
          Task comment
          <textarea
            className="mt-1 min-h-20 w-full resize-y rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm text-[var(--ink)]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Default comment shown on this task"
          />
        </label>
        {block ? (
          <label className="block text-xs font-medium text-[var(--muted)]">
            Block note
            <textarea
              className="mt-1 min-h-16 w-full resize-y rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm text-[var(--ink)]"
              value={blockNotes}
              onChange={(event) => setBlockNotes(event.target.value)}
              placeholder="Optional note just for this scheduled block"
            />
          </label>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-medium text-[var(--muted)]">
            Priority
            <select
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm text-[var(--ink)]"
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-[var(--muted)]">
            Estimate
            <select
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm text-[var(--ink)]"
              value={estimatedMinutes}
              onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
              aria-label="Estimated duration"
            >
              {durationOptionsMinutes.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes < 60 || minutes % 60 ? `${minutes} min` : `${minutes / 60} hr`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-medium text-[var(--muted)]">
          Tags
          <input
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm text-[var(--ink)]"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="class, focus, admin"
          />
        </label>
        {block && repeatGroupCount ? (
          <label className="flex items-start gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--muted)]">
            <input
              className="mt-0.5 h-4 w-4 rounded border-[var(--line)] accent-[var(--accent)]"
              checked={applyToRepeats}
              type="checkbox"
              onChange={(event) => setApplyToRepeats(event.target.checked)}
            />
            <span>
              Apply these edits to {repeatGroupCount} linked block
              {repeatGroupCount === 1 ? "" : "s"} in this repeat chain. Uncheck to edit only this block.
            </span>
          </label>
        ) : null}
      </div>
      <button
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
        type="submit"
      >
        <Save className="h-4 w-4" />
        Save info
      </button>
    </form>
  );
}

interface SlotInspectorProps {
  selectedTask?: Task;
  selectedBlock?: ScheduleBlock;
  blockTask?: Task;
  readOnly?: boolean;
  futureRepeatCount: number;
  repeatGroupCount: number;
  activeDate: string;
  settings: AppSettings;
  pendingSwapBlockId?: string;
  onScheduleTask: (taskId: string, date: string, startMinutes: number) => void;
  onUpdateTask: (taskId: string, patch: TaskInfoPatch) => void;
  onUpdateBlockInfo: (
    blockId: string,
    taskPatch: TaskInfoPatch,
    blockNotes: string | undefined,
    applyToRepeats: boolean,
  ) => void;
  onMoveBlock: (date: string, startMinutes: number) => void;
  onResize: (deltaMinutes: number) => void;
  onToggleComplete: () => void;
  onRepeatWeekly: (repeatWeeks: number) => void;
  onUnschedule: () => void;
  onDeleteBlock: (deleteFutureRepeats: boolean) => void;
  onFineEdit: () => void;
  onStartSwap: (blockId: string) => void;
  onCancelSwap: () => void;
  onDeleteTask: (taskId: string) => void;
}

export function SlotInspector({
  selectedTask,
  selectedBlock,
  blockTask,
  readOnly = false,
  futureRepeatCount,
  repeatGroupCount,
  activeDate,
  settings,
  pendingSwapBlockId,
  onScheduleTask,
  onUpdateTask,
  onUpdateBlockInfo,
  onMoveBlock,
  onResize,
  onToggleComplete,
  onRepeatWeekly,
  onUnschedule,
  onDeleteBlock,
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
            <dt className="text-xs uppercase text-[var(--muted)]">Status</dt>
            <dd className="mt-1 font-medium">
              {selectedBlock.completedAt ? "Done" : "Scheduled"}
            </dd>
          </div>
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
          {blockTask?.priority ? (
            <div>
              <dt className="text-xs uppercase text-[var(--muted)]">Priority</dt>
              <dd className="mt-2">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${
                    blockTask.priority === "high"
                      ? "border-[#e9a1af] bg-[#ffe3ea] text-[#a93149]"
                      : blockTask.priority === "medium"
                        ? "border-[#e8bd78] bg-[#fff0d8] text-[#8c5716]"
                        : "border-[#b6cff4] bg-[#e6efff] text-[#3568ae]"
                  }`}
                >
                  {blockTask.priority}
                </span>
              </dd>
            </div>
          ) : null}
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
          {blockTask?.description ? (
            <div>
              <dt className="flex items-center gap-1 text-xs uppercase text-[var(--muted)]">
                <MessageSquare className="h-3.5 w-3.5" />
                Task comment
              </dt>
              <dd className="mt-2 rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-3 leading-snug">
                {blockTask.description}
              </dd>
            </div>
          ) : null}
          {selectedBlock.notes ? (
            <div>
              <dt className="flex items-center gap-1 text-xs uppercase text-[var(--muted)]">
                <MessageSquare className="h-3.5 w-3.5" />
                Block note
              </dt>
              <dd className="mt-2 rounded-md border border-[var(--line)] bg-white p-3 leading-snug">
                {selectedBlock.notes}
              </dd>
            </div>
          ) : null}
        </dl>
        {!readOnly && blockTask ? (
          <>
            <TaskInfoEditor
              block={selectedBlock}
              repeatGroupCount={repeatGroupCount}
              task={blockTask}
              onSave={(patch, blockNotes, applyToRepeats) => {
                onUpdateBlockInfo(selectedBlock.id, patch, blockNotes, Boolean(applyToRepeats));
              }}
            />
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
            <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-3">
              <div className="text-xs font-semibold uppercase text-[var(--muted)]">Repeat weekly</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  className="rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm"
                  type="number"
                  min={1}
                  max={52}
                  step={1}
                  defaultValue={12}
                  id="block-repeat-weeks"
                  aria-label="Weeks to repeat"
                />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--surface)]"
                  type="button"
                  onClick={() => {
                    const repeatWeeks = Number(
                      (document.getElementById("block-repeat-weeks") as HTMLInputElement | null)?.value,
                    );
                    if (Number.isFinite(repeatWeeks)) {
                      onRepeatWeekly(repeatWeeks);
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Copies this block into future weeks at the same time. Use 1-52 weeks.
              </p>
            </div>
            <button
              className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                selectedBlock.completedAt
                  ? "border border-[var(--line)] bg-white text-[var(--accent-strong)] hover:bg-[var(--surface-muted)]"
                  : "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
              }`}
              type="button"
              onClick={onToggleComplete}
            >
              <CheckCircle2 className="h-4 w-4" />
              {selectedBlock.completedAt ? "Mark not done" : "Mark done"}
            </button>
            <button
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
              type="button"
              onClick={onUnschedule}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Unschedule
            </button>
            <button
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--rose)] px-3 py-2 text-sm font-semibold text-[var(--rose)] hover:bg-[var(--rose-soft)]"
              type="button"
              onClick={() => {
                const deleteFutureRepeats = Boolean(
                  (document.getElementById(`delete-future-repeats-${selectedBlock.id}`) as HTMLInputElement | null)
                    ?.checked,
                );
                onDeleteBlock(deleteFutureRepeats);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete block
            </button>
            {futureRepeatCount ? (
              <label className="mt-2 flex items-start gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--muted)]">
                <input
                  className="mt-0.5 h-4 w-4 rounded border-[var(--line)] accent-[var(--rose)]"
                  id={`delete-future-repeats-${selectedBlock.id}`}
                  type="checkbox"
                />
                <span>
                  Also delete {futureRepeatCount} linked weekly repeat
                  {futureRepeatCount === 1 ? "" : "s"} in this repeat chain.
                </span>
              </label>
            ) : null}
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
          </>
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
      {!readOnly ? (
        <>
          <TaskInfoEditor
            task={selectedTask}
            onSave={(patch) => {
              onUpdateTask(selectedTask.id, patch);
            }}
          />
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
        </>
      ) : null}
    </aside>
  );
}
