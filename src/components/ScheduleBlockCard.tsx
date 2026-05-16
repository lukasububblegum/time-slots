import { ArrowRightLeft, Check, CheckCircle2, Circle, GripVertical, MessageSquare, Tags } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { useRef, useState } from "react";
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
  const tags = task?.tags ?? [];
  const extraTagCount = Math.max(0, tags.length - 1);
  const detailText = block.notes ?? task?.description;
  const hasMetadata = tags.length > 0 || Boolean(detailText);
  const metadataLabel = tags[0] ? `${tags[0]}${extraTagCount ? ` +${extraTagCount}` : ""}` : "Comment";
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsStyle, setDetailsStyle] = useState<CSSProperties>();
  const cardRef = useRef<HTMLElement | null>(null);
  const cardTone = isSelected
    ? isCompleted
      ? "border-[#5f877d] bg-[#5f877d] text-white shadow-[0_16px_36px_rgba(54,92,84,0.22)]"
      : "border-[var(--accent-strong)] bg-[var(--accent)] text-white"
    : isCompleted
      ? "border-[#c4ded6] bg-[#f4fbf7] text-[#536660] shadow-[0_10px_26px_rgba(79,130,114,0.10)] hover:border-[#91bdae]"
      : "border-[rgba(47,127,104,0.22)] bg-[var(--accent-soft)] text-[var(--text)] hover:border-[var(--accent)]";
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
      ref={cardRef}
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
      className={`absolute inset-x-2 z-10 flex select-none flex-col justify-between overflow-hidden rounded-lg border px-2.5 py-1.5 shadow-sm transition ${cardTone} ${
        isDragging ? "cursor-grabbing opacity-60" : "cursor-grab"
      }`}
      style={{ ...placement, touchAction: "none" }}
    >
      {isCompleted ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-1.5 ${
            isSelected ? "bg-white/35" : "bg-[#75b9a5]"
          }`}
        />
      ) : null}
      <div className="flex min-w-0 items-start gap-1.5">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`truncate text-sm font-semibold ${isCompleted ? "line-through decoration-2" : ""}`}>
              {task?.title ?? "Missing task"}
            </span>
            {isCompleted ? (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${
                  isSelected
                    ? "bg-white/18 text-white"
                    : "bg-[#d9f1e8] text-[#2f7c69]"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Done
              </span>
            ) : null}
            {hasMetadata ? (
              <button
                className={`inline-flex max-w-[8.5rem] shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-[0_1px_2px_rgba(36,49,59,0.06)] ${
                  isSelected
                    ? "border-white/35 bg-white/18 text-white"
                    : isCompleted
                      ? "border-[#aacdc1] bg-[#e6f6ef] text-[#2f6f61]"
                      : "border-[#9fcfc3] bg-white/78 text-[var(--accent-strong)]"
                }`}
                type="button"
                aria-expanded={detailsOpen}
                aria-label={`Show details for ${task?.title ?? "block"}`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  const rect = cardRef.current?.getBoundingClientRect();
                  if (rect) {
                    const width = Math.min(Math.max(rect.width, 240), 340);
                    setDetailsStyle({
                      left: Math.min(rect.left, window.innerWidth - width - 12),
                      top: Math.min(rect.bottom + 6, window.innerHeight - 220),
                      width,
                    });
                  }
                  setDetailsOpen((open) => !open);
                }}
              >
                {tags.length ? <Tags className="h-3.5 w-3.5 shrink-0" /> : <MessageSquare className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{metadataLabel}</span>
              </button>
            ) : null}
          </div>
          <div
            className={
              isSelected
                ? "text-xs text-white/78"
                : isCompleted
                  ? "text-xs text-[#6b817a]"
                  : "text-xs text-[var(--muted)]"
            }
          >
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
      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
        <span
          className={
            isSelected
              ? "text-white/78"
              : isCompleted
                ? "text-[#6b817a]"
                : "text-[var(--muted)]"
          }
        >
          {block.durationMinutes}m
        </span>
        <span className={`inline-flex items-center gap-1 ${isCompleted ? "opacity-50" : "opacity-75"}`}>
          <ArrowRightLeft className="h-3.5 w-3.5" />
          swap
        </span>
      </div>
      {detailsOpen && hasMetadata ? (
        <div
          className="fixed z-50 rounded-lg border border-[var(--line-strong)] bg-white p-3 text-[var(--text)] shadow-[0_18px_40px_rgba(36,49,59,0.18)]"
          style={detailsStyle}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {tags.length ? (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Tags</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#9fcfc3] bg-[#f4fbf7] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {detailText ? (
            <div className={tags.length ? "mt-3" : ""}>
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Comment</div>
              <p className="mt-1 text-sm leading-snug text-[var(--text)]">{detailText}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
