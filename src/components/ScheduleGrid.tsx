import { CalendarDays } from "lucide-react";
import type { DragEvent } from "react";
import { useEffect, useState } from "react";
import {
  ScheduleBlockCard,
  type BlockPointerDragStart,
} from "@/components/ScheduleBlockCard";
import {
  buildSlots,
  formatDisplayDate,
  getAbsolutePlacement,
  getWeekDates,
  minutesToLabel,
  snapToSlot,
} from "@/lib/scheduler";
import type { AppSettings, CalendarView, DragPayload, ScheduleBlock, Task } from "@/lib/types";

interface ScheduleGridProps {
  date: string;
  view: CalendarView;
  tasks: Task[];
  blocks: ScheduleBlock[];
  settings: AppSettings;
  selectedBlockId?: string;
  onDropTask: (taskId: string, date: string, startMinutes: number) => void;
  onMoveBlock: (blockId: string, date: string, startMinutes: number) => void;
  onSwapBlocks: (sourceBlockId: string, targetBlockId: string) => void;
  onSelectBlock: (blockId: string) => void;
  onFineEditBlock: (blockId: string) => void;
  compact?: boolean;
}

function readDragPayload(event: DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData("application/json");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

interface DragPreview {
  date: string;
  startMinutes: number;
  durationMinutes: number;
}

const DRAG_THRESHOLD_PX = 4;

export function ScheduleGrid({
  date,
  view,
  tasks,
  blocks,
  settings,
  selectedBlockId,
  onDropTask,
  onMoveBlock,
  onSwapBlocks,
  onSelectBlock,
  onFineEditBlock,
  compact = false,
}: ScheduleGridProps) {
  const slots = buildSlots(settings);
  const dates = view === "week" ? getWeekDates(date) : [date];
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const rows = `repeat(${slots.length}, minmax(${compact ? 12 : 11}px, 1fr))`;
  const minWidthClass =
    view === "week" ? "min-w-[980px]" : "min-w-[420px] sm:min-w-[560px]";
  const [activeDrag, setActiveDrag] = useState<DragPayload | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [pointerDrag, setPointerDrag] = useState<BlockPointerDragStart | null>(null);

  const getPreviewFromClientY = (
    element: HTMLElement,
    clientY: number,
    payload: DragPayload,
    targetDate: string,
  ): DragPreview | null => {
    const rect = element.getBoundingClientRect();
    const dayMinutes = settings.dayEndMinutes - settings.dayStartMinutes;
    if (rect.height <= 0 || dayMinutes <= 0) {
      return null;
    }

    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const pointerMinutes = settings.dayStartMinutes + ratio * dayMinutes;
    const durationMinutes =
      payload.kind === "task"
        ? tasks.find((task) => task.id === payload.taskId)?.estimatedMinutes
        : blocks.find((block) => block.id === payload.blockId)?.durationMinutes;

    if (!durationMinutes) {
      return null;
    }

    const offsetMinutes = payload.kind === "block" ? payload.offsetMinutes ?? 0 : 0;
    const snappedStart = snapToSlot(pointerMinutes - offsetMinutes, settings.slotSizeMinutes);
    const maxStart = settings.dayEndMinutes - durationMinutes;
    const startMinutes = Math.min(maxStart, Math.max(settings.dayStartMinutes, snappedStart));

    return {
      date: targetDate,
      startMinutes,
      durationMinutes,
    };
  };

  const getPreviewFromDragEvent = (
    event: DragEvent<HTMLElement>,
    payload: DragPayload,
    targetDate: string,
  ) => getPreviewFromClientY(event.currentTarget, event.clientY, payload, targetDate);

  useEffect(() => {
    if (!pointerDrag) {
      return;
    }

    const payload: DragPayload = {
      kind: "block",
      blockId: pointerDrag.blockId,
      offsetMinutes: pointerDrag.offsetMinutes,
    };

    const findDayColumn = (clientX: number) => {
      const columns = Array.from(
        document.querySelectorAll<HTMLElement>("[data-schedule-day]"),
      );

      return (
        columns.find((column) => {
          const rect = column.getBoundingClientRect();
          return clientX >= rect.left && clientX <= rect.right;
        }) ?? null
      );
    };

    const getPreview = (event: PointerEvent) => {
      const column = findDayColumn(event.clientX);
      if (!column) {
        return null;
      }

      const targetDate = column.dataset.scheduleDay;
      if (!targetDate) {
        return null;
      }

      return getPreviewFromClientY(column, event.clientY, payload, targetDate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerDrag.pointerId) {
        return;
      }

      event.preventDefault();
      const moved =
        Math.abs(event.clientX - pointerDrag.startX) > DRAG_THRESHOLD_PX ||
        Math.abs(event.clientY - pointerDrag.startY) > DRAG_THRESHOLD_PX;

      setDragPreview(moved ? getPreview(event) : null);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerDrag.pointerId) {
        return;
      }

      const moved =
        Math.abs(event.clientX - pointerDrag.startX) > DRAG_THRESHOLD_PX ||
        Math.abs(event.clientY - pointerDrag.startY) > DRAG_THRESHOLD_PX;
      const targetBlock = (
        document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
      )?.closest<HTMLElement>("[data-block-id]");
      const targetBlockId = targetBlock?.dataset.blockId;
      const preview = getPreview(event);

      setPointerDrag(null);
      setDragPreview(null);

      if (!moved) {
        return;
      }

      if (targetBlockId && targetBlockId !== pointerDrag.blockId) {
        onSwapBlocks(pointerDrag.blockId, targetBlockId);
        return;
      }

      if (preview) {
        onMoveBlock(pointerDrag.blockId, preview.date, preview.startMinutes);
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== pointerDrag.pointerId) {
        return;
      }

      setPointerDrag(null);
      setDragPreview(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [blocks, onMoveBlock, onSwapBlocks, pointerDrag, settings, tasks]);

  return (
    <section className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-5 w-5 shrink-0 text-[var(--accent)]" />
          <div>
            <h2 className="text-sm font-semibold">Schedule</h2>
            <p className="text-xs text-[var(--muted)]">Drop on empty slots to move. Drop a block on another block to swap.</p>
          </div>
        </div>
      </div>

      <div className="overflow-auto">
        <div
          className={`grid ${minWidthClass}`}
          style={{ gridTemplateColumns: `72px repeat(${dates.length}, minmax(180px, 1fr))` }}
        >
          <div className="sticky left-0 z-20 border-b border-r border-[var(--line)] bg-[var(--surface)]" />
          {dates.map((day) => (
            <div
              key={day}
              className={`border-b border-r border-[var(--line)] px-3 py-2 text-sm font-semibold ${
                day === date ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-white"
              }`}
            >
              {formatDisplayDate(day)}
            </div>
          ))}

          <div className="sticky left-0 z-20 grid border-r border-[var(--line)] bg-[var(--surface)]" style={{ gridTemplateRows: rows }}>
            {slots.map((slot) => (
              <div
                key={slot}
                className={`px-2 pt-1 text-[11px] text-[var(--muted)] ${
                  slot % 60 === 0
                    ? "border-b border-[var(--line-strong)]"
                    : slot % 15 === 0
                      ? "border-b border-[var(--line)]"
                      : ""
                }`}
              >
                {slot % 60 === 0 ? minutesToLabel(slot) : ""}
              </div>
            ))}
          </div>

          {dates.map((day) => (
            <div
              key={day}
              data-schedule-day={day}
              className="relative grid border-r border-[var(--line)]"
              style={{ gridTemplateRows: rows }}
              onDragOverCapture={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                const payload = readDragPayload(event) ?? activeDrag;
                if (!payload) {
                  return;
                }

                setDragPreview(getPreviewFromDragEvent(event, payload, day));
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                const payload = readDragPayload(event) ?? activeDrag;
                if (!payload) {
                  return;
                }

                setDragPreview(getPreviewFromDragEvent(event, payload, day));
              }}
              onDragLeave={(event) => {
                if (
                  event.relatedTarget instanceof Node &&
                  event.currentTarget.contains(event.relatedTarget)
                ) {
                  return;
                }

                setDragPreview(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const payload = readDragPayload(event) ?? activeDrag;
                if (!payload) {
                  setDragPreview(null);
                  setActiveDrag(null);
                  return;
                }

                const preview = getPreviewFromDragEvent(event, payload, day);
                setDragPreview(null);
                setActiveDrag(null);
                if (!preview) {
                  return;
                }

                if (payload.kind === "task") {
                  onDropTask(payload.taskId, day, preview.startMinutes);
                } else {
                  onMoveBlock(payload.blockId, day, preview.startMinutes);
                }
              }}
            >
              {slots.map((slot) => (
                <div
                  key={`${day}-${slot}`}
                  className={`${
                    slot % 60 === 0
                      ? "border-b border-[var(--line-strong)] bg-[rgba(246,247,244,0.68)]"
                      : slot % 15 === 0
                        ? "border-b border-[var(--line)] bg-white"
                        : "bg-white"
                  } hover:bg-[var(--accent-soft)]`}
                />
              ))}

              {dragPreview?.date === day ? (
                <div
                  className="pointer-events-none absolute inset-x-2 z-20 rounded-lg border-2 border-dashed border-[var(--accent)] bg-[rgba(47,127,104,0.14)] px-3 py-2 text-xs font-semibold text-[var(--accent-strong)] shadow-sm"
                  style={getAbsolutePlacement(
                    {
                      id: "drag-preview",
                      taskId: "drag-preview",
                      date: day,
                      startMinutes: dragPreview.startMinutes,
                      durationMinutes: dragPreview.durationMinutes,
                      createdAt: "",
                      updatedAt: "",
                      deviceUpdatedAt: "",
                    },
                    settings,
                  )}
                >
                  Align {minutesToLabel(dragPreview.startMinutes)} -{" "}
                  {minutesToLabel(dragPreview.startMinutes + dragPreview.durationMinutes)}
                </div>
              ) : null}

              {blocks
                .filter((block) => block.date === day)
                .map((block) => (
                  <ScheduleBlockCard
                    key={block.id}
                    block={block}
                    task={taskById.get(block.taskId)}
                    settings={settings}
                    isSelected={selectedBlockId === block.id}
                    isDragging={pointerDrag?.blockId === block.id}
                    onSelect={onSelectBlock}
                    onFineEdit={onFineEditBlock}
                    onSwap={onSwapBlocks}
                    onPointerDragStart={setPointerDrag}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
