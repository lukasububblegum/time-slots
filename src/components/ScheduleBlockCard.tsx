import { ArrowRightLeft, Check, CheckCircle2, Circle, GripVertical, MessageSquare, Tags } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { getAbsolutePlacement, minutesToLabel } from "@/lib/scheduler";
import type { AppSettings, Priority, ScheduleBlock, Task } from "@/lib/types";

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

const priorityLabel: Record<Priority, string> = {
  high: "High",
  medium: "Med",
  low: "Low",
};

const priorityTone: Record<Priority, string> = {
  high: "border-[#e9a1af] bg-[#ffe3ea] text-[#a93149]",
  medium: "border-[#e8bd78] bg-[#fff0d8] text-[#8c5716]",
  low: "border-[#b6cff4] bg-[#e6efff] text-[#3568ae]",
};

const priorityRailTone: Record<Priority, string> = {
  high: "bg-[#cf5d74]",
  medium: "bg-[#d1862d]",
  low: "bg-[#4e7fc6]",
};

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
  const hasComment = Boolean(detailText);
  const hasMetadata = tags.length > 0 || Boolean(detailText);
  const tagLabel = tags[0] ? `${tags[0]}${extraTagCount ? ` +${extraTagCount}` : ""}` : "";
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsStyle, setDetailsStyle] = useState<CSSProperties>();
  const [cardHeight, setCardHeight] = useState(0);
  const [metadataOverflow, setMetadataOverflow] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const metadataRef = useRef<HTMLDivElement | null>(null);
  const tagRows = Math.max(0, Math.ceil(tags.length / 3));
  const isCompactBlock = cardHeight > 0 && cardHeight < 112;
  const isTinyBlock = cardHeight > 0 && cardHeight < 72;
  const inlineMetadataMinHeight = 124 + tagRows * 23 + (detailText ? 22 : 0);
  const showInlineMetadata = hasMetadata && cardHeight >= inlineMetadataMinHeight;
  const showTagButton = tags.length > 0 && (!showInlineMetadata || metadataOverflow);
  const showCommentButton = hasComment && !showInlineMetadata;
  const showFooter = !isCompactBlock;
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
  const positionDetails = () => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const width = Math.min(Math.max(rect.width, 240), 340);
    const gap = 10;
    const margin = 12;
    const estimatedHeight = Math.min(
      260,
      70 + tags.length * 22 + (detailText ? Math.ceil(detailText.length / 34) * 22 : 0),
    );
    const clampTop = (top: number) =>
      Math.max(margin, Math.min(top, window.innerHeight - estimatedHeight - margin));

    if (rect.right + gap + width <= window.innerWidth - margin) {
      setDetailsStyle({
        left: rect.right + gap,
        top: clampTop(rect.top),
        width,
      });
      return;
    }

    if (rect.left - gap - width >= margin) {
      setDetailsStyle({
        left: rect.left - gap - width,
        top: clampTop(rect.top),
        width,
      });
      return;
    }

    const hasMoreRoomAbove = rect.top > window.innerHeight - rect.bottom;
    const verticalTop = hasMoreRoomAbove ? rect.top - estimatedHeight - gap : rect.bottom + gap;
    setDetailsStyle({
      left: Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)),
      top: clampTop(verticalTop),
      width,
    });
  };
  const toggleDetails = () => {
    positionDetails();
    setDetailsOpen((open) => !open);
  };

  useEffect(() => {
    const element = cardRef.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      setCardHeight(element.getBoundingClientRect().height);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!detailsOpen) {
      return;
    }

    const closeOnOutsidePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (cardRef.current?.contains(target) || detailsRef.current?.contains(target)) {
        return;
      }

      setDetailsOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetailsOpen(false);
      }
    };

    window.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointerDown, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [detailsOpen]);

  useEffect(() => {
    const element = metadataRef.current;
    if (!showInlineMetadata || !element) {
      setMetadataOverflow(false);
      return;
    }

    const updateOverflow = () => {
      const overflowNodes = Array.from(
        element.querySelectorAll<HTMLElement>("[data-overflow-check='true']"),
      );
      setMetadataOverflow(
        overflowNodes.some((node) => node.scrollWidth > node.clientWidth + 1),
      );
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    Array.from(element.children).forEach((child) => {
      observer.observe(child);
    });

    return () => {
      observer.disconnect();
    };
  }, [detailText, showInlineMetadata, tags]);

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
      {task?.priority ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${priorityRailTone[task.priority]} ${
            isSelected ? "opacity-90" : "opacity-80"
          }`}
        />
      ) : null}
      <div className="flex min-w-0 items-start gap-1.5">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                isCompleted ? "line-through decoration-2" : ""
              }`}
              title={task?.title ?? "Missing task"}
            >
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
          {(!isTinyBlock && task?.priority) || showTagButton || showCommentButton ? (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
              {task?.priority && !isTinyBlock ? (
                <span
                  className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] shadow-[0_1px_2px_rgba(36,49,59,0.10)] ${priorityTone[task.priority]}`}
                >
                  {priorityLabel[task.priority]}
                </span>
              ) : null}
              {showTagButton ? (
                <button
                  className={`inline-flex shrink items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-[0_1px_2px_rgba(36,49,59,0.06)] ${
                    isSelected
                      ? "border-white/35 bg-white/18 text-white"
                      : isCompleted
                        ? "border-[#aacdc1] bg-[#e6f6ef] text-[#2f6f61]"
                        : "border-[#9fcfc3] bg-white/78 text-[var(--accent-strong)]"
                  } ${isCompactBlock ? "max-w-[2rem]" : "max-w-[7.5rem]"}`}
                  type="button"
                  aria-expanded={detailsOpen}
                  aria-label={`Show tags for ${task?.title ?? "block"}`}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleDetails();
                  }}
                >
                  <Tags className="h-3.5 w-3.5 shrink-0" />
                  <span className={isCompactBlock ? "sr-only" : "truncate"}>{tagLabel}</span>
                </button>
              ) : null}
              {showCommentButton ? (
                <button
                  className={`inline-flex shrink-0 items-center justify-center rounded-full border p-1 shadow-[0_1px_2px_rgba(36,49,59,0.06)] ${
                    isSelected
                      ? "border-white/35 bg-white/18 text-white"
                      : isCompleted
                        ? "border-[#aacdc1] bg-[#e6f6ef] text-[#2f6f61]"
                        : "border-[#9fcfc3] bg-white/78 text-[var(--accent-strong)]"
                  }`}
                  type="button"
                  aria-expanded={detailsOpen}
                  aria-label={`Show comment for ${task?.title ?? "block"}`}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleDetails();
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                </button>
              ) : null}
            </div>
          ) : null}
          {showInlineMetadata ? (
            <div ref={metadataRef} className="mt-1 flex min-w-0 flex-col gap-1">
              {tags.length ? (
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      data-overflow-check="true"
                      className={`max-w-[8rem] truncate rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-[0_1px_2px_rgba(36,49,59,0.06)] ${
                        isSelected
                          ? "border-white/35 bg-white/18 text-white"
                          : isCompleted
                            ? "border-[#aacdc1] bg-[#e6f6ef] text-[#2f6f61]"
                            : "border-[#9fcfc3] bg-white/78 text-[var(--accent-strong)]"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {detailText ? (
                <button
                  className={`flex min-w-0 items-center gap-1 text-xs ${
                    isSelected
                      ? "text-white/78"
                      : isCompleted
                        ? "text-[#6b817a]"
                        : "text-[var(--muted)]"
                  }`}
                  type="button"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleDetails();
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span data-overflow-check="true" className="truncate text-left">{detailText}</span>
                </button>
              ) : null}
            </div>
          ) : null}
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
      {showFooter ? (
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
      ) : null}
      {detailsOpen && hasMetadata ? (
        <div
          ref={detailsRef}
          className="fixed z-50 max-h-[260px] overflow-y-auto rounded-lg border border-[var(--line-strong)] bg-white p-3 text-[var(--text)] shadow-[0_18px_40px_rgba(36,49,59,0.18)]"
          style={detailsStyle}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {task?.priority ? (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Priority</div>
              <span
                className={`mt-1.5 inline-flex rounded-full border px-2 py-1 text-xs font-black uppercase tracking-[0.08em] ${priorityTone[task.priority]}`}
              >
                {priorityLabel[task.priority]}
              </span>
            </div>
          ) : null}
          {tags.length ? (
            <div className={task?.priority ? "mt-3" : ""}>
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
            <div className={tags.length || task?.priority ? "mt-3" : ""}>
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Comment</div>
              <p className="mt-1 text-sm leading-snug text-[var(--text)]">{detailText}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
