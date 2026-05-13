import type { AppSettings, ScheduleBlock } from "@/lib/types";

export const minutesToLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export const dateKey = (date: Date) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};

export const addDays = (date: string, amount: number) => {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + amount);
  return dateKey(next);
};

export const formatDisplayDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));

export const getWeekDates = (date: string) => {
  const base = new Date(`${date}T00:00:00`);
  const mondayOffset = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(base);
    next.setDate(base.getDate() + index);
    return dateKey(next);
  });
};

export const buildSlots = (settings: AppSettings) => {
  const slots: number[] = [];
  for (
    let minute = settings.dayStartMinutes;
    minute < settings.dayEndMinutes;
    minute += settings.slotSizeMinutes
  ) {
    slots.push(minute);
  }
  return slots;
};

export const snapToSlot = (minutes: number, slotSize: number) =>
  Math.round(minutes / slotSize) * slotSize;

export const blockEnd = (block: Pick<ScheduleBlock, "startMinutes" | "durationMinutes">) =>
  block.startMinutes + block.durationMinutes;

export const blocksOverlap = (
  a: Pick<ScheduleBlock, "date" | "startMinutes" | "durationMinutes">,
  b: Pick<ScheduleBlock, "date" | "startMinutes" | "durationMinutes">,
) => {
  if (a.date !== b.date) {
    return false;
  }

  return a.startMinutes < b.startMinutes + b.durationMinutes && b.startMinutes < a.startMinutes + a.durationMinutes;
};

export const findOverlap = (
  candidate: Pick<ScheduleBlock, "id" | "date" | "startMinutes" | "durationMinutes">,
  blocks: ScheduleBlock[],
  ignoreIds: string[] = [],
) =>
  blocks.find(
    (block) =>
      !block.deletedAt &&
      block.id !== candidate.id &&
      !ignoreIds.includes(block.id) &&
      blocksOverlap(candidate, block),
  );

export const isInsideDay = (
  block: Pick<ScheduleBlock, "startMinutes" | "durationMinutes">,
  settings: AppSettings,
) =>
  block.startMinutes >= settings.dayStartMinutes &&
  block.startMinutes + block.durationMinutes <= settings.dayEndMinutes;

export const findOpenSlot = (
  blocks: ScheduleBlock[],
  date: string,
  durationMinutes: number,
  settings: AppSettings,
) => {
  for (
    let startMinutes = settings.dayStartMinutes;
    startMinutes <= settings.dayEndMinutes - durationMinutes;
    startMinutes += settings.slotSizeMinutes
  ) {
    const candidate = {
      id: "candidate",
      date,
      startMinutes,
      durationMinutes,
    };

    if (!findOverlap(candidate, blocks)) {
      return startMinutes;
    }
  }

  return null;
};

export const getGridPlacement = (block: ScheduleBlock, settings: AppSettings) => {
  const startIndex = (block.startMinutes - settings.dayStartMinutes) / settings.slotSizeMinutes + 1;
  const span = block.durationMinutes / settings.slotSizeMinutes;

  return {
    gridRow: `${startIndex} / span ${span}`,
  };
};

export const getAbsolutePlacement = (block: ScheduleBlock, settings: AppSettings) => {
  const dayMinutes = settings.dayEndMinutes - settings.dayStartMinutes;
  const top = ((block.startMinutes - settings.dayStartMinutes) / dayMinutes) * 100;
  const height = (block.durationMinutes / dayMinutes) * 100;

  return {
    top: `${top}%`,
    height: `${height}%`,
  };
};

export const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

export const canSwapBlocks = (
  source: ScheduleBlock,
  target: ScheduleBlock,
  blocks: ScheduleBlock[],
) => {
  const sourceAtTarget = {
    ...source,
    date: target.date,
    startMinutes: target.startMinutes,
  };
  const targetAtSource = {
    ...target,
    date: source.date,
    startMinutes: source.startMinutes,
  };

  return {
    sourceConflict: findOverlap(sourceAtTarget, blocks, [target.id]),
    targetConflict: findOverlap(targetAtSource, blocks, [source.id]),
  };
};
