import { ArrowRightLeft, Check, Circle, GripVertical } from "lucide-react";
import type { PointerEvent } from "react";
import { getAbsolutePlacement, minutesToLabel } from "@/lib/scheduler";
import type { AppSettings, ScheduleBlock, Task } from "@/lib/types";

export interface BlockPointerDragStart {
  blockId: string;
  offsetMinutes: number;
  pointerId: number;
  startX: number;
  startY: number;
}

interface ScheduleBlockCardProps {
  block: ScheduleBlock;
  task?: Task;
  settings: AppSettings;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: (blockId: string) => void;
  onFineEdit: (blockId: string) => void;
  onSwap: (sourceBlockId: string, targetBlockId: string) => void;
  onToggleComplete: (blockId: string) => void;
  onPointerDragStart: (drag: BlockPointerDragStart) => void;
}

export function ScheduleBlockCard({
  block,
  task,
  settings,
  isSelected,
  isDragging,
  onSelect,
  onFineEdit,
  onSwap,
  onToggleComplete,
  onPointerDragStart,
}: ScheduleBlockCardProps) {
  const placement = getAbsolutePlacement(block, settings);
  const isCompleted = Boolean(block.completedAt);
  const getOffsetMinutes = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetRatio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0;
    const rawOffsetMinutes = Math.max(
      0,
      Math.min(block.durationMinutes, offsetRatio * block.durationMinutes),
    );

    return Math.round(rawOffsetMinutes / settings.slotSizeMinutes) * settings.slotSizeMinutes;
  };

  return (
    <article
      data-block-id={block.id}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }

        onPointerDragStart({
          blockId: block.id,
          offsetMinutes: getOffsetMinutes(event),
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
        });
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const raw = event.dataTransfer.getData("application/json");
        if (!raw) {
          return;
        }

        const payload = JSON.parse(raw) as { kind: string; blockId?: string };
        if (payload.kind === "block" && payload.blockId) {
          onSwap(payload.blockId, block.id);
        }
      }}
      onClick={() => onSelect(block.id)}
      onDoubleClick={() => onFineEdit(block.id)}
      className={`absolute inset-x-2 z-10 flex select-none flex-col justify-between rounded-lg border px-3 py-2 shadow-sm transition ${
        isSelected
          ? isCompleted
            ? "border-[var(--accent-strong)] bg-[var(--accent)] text-white"
            : "border-[var(--accent-strong)] bg-[var(--accent)] text-white"
          : isCompleted
            ? "border-[rgba(47,127,104,0.18)] bg-[var(--surface-muted)] text-[var(--muted)] hover:border-[var(--accent)]"
            : "border-[rgba(47,127,104,0.22)] bg-[var(--accent-soft)] text-[var(--text)] hover:border-[var(--accent)]"
      } ${isDragging ? "cursor-grabbing opacity-60" : "cursor-grab"}`}
      style={{ ...placement, touchAction: "none" }}
    >
      <div className="flex min-w-0 items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-semibold ${isCompleted ? "line-through decoration-2" : ""}`}>
            {task?.title ?? "Missing task"}
          </div>
          <div className={isSelected ? "text-xs text-white/78" : "text-xs text-[var(--muted)]"}>
            {minutesToLabel(block.startMinutes)} - {minutesToLabel(block.startMinutes + block.durationMinutes)}
          </div>
        </div>
        <button
          className={`-mr-1 rounded-full border p-1 transition ${
            isSelected
              ? "border-white/45 bg-white/15 text-white hover:bg-white/25"
              : isCompleted
                ? "border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
                : "border-[var(--line-strong)] bg-white/80 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
          }`}
          type="button"
          aria-label={isCompleted ? `Mark ${task?.title ?? "block"} as not done` : `Mark ${task?.title ?? "block"} done`}
          title={isCompleted ? "Mark not done" : "Mark done"}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onToggleComplete(block.id);
          }}
        >
          {isCompleted ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={isSelected ? "text-white/78" : "text-[var(--muted)]"}>
          {block.durationMinutes}m
        </span>
        {isCompleted ? (
          <span className={isSelected ? "font-semibold text-white/85" : "font-semibold text-[var(--accent-strong)]"}>
            Done
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1 opacity-75">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          swap
        </span>
      </div>
    </article>
  );
}
