import { X } from "lucide-react";
import { useState } from "react";
import { minutesToLabel, parseTimeToMinutes } from "@/lib/scheduler";
import type { AppSettings, ScheduleBlock, Task } from "@/lib/types";

interface PreciseTimeEditorProps {
  block: ScheduleBlock;
  task?: Task;
  settings: AppSettings;
  onClose: () => void;
  onSave: (date: string, startMinutes: number, endMinutes: number) => Promise<void>;
}

export function PreciseTimeEditor({
  block,
  task,
  settings,
  onClose,
  onSave,
}: PreciseTimeEditorProps) {
  const [date, setDate] = useState(block.date);
  const [start, setStart] = useState(minutesToLabel(block.startMinutes));
  const [end, setEnd] = useState(minutesToLabel(block.startMinutes + block.durationMinutes));
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);

    if (startMinutes === null || endMinutes === null) {
      setError("Use a valid HH:MM time.");
      return;
    }

    if (startMinutes < settings.dayStartMinutes || endMinutes > settings.dayEndMinutes) {
      setError(
        `Keep the block inside ${minutesToLabel(settings.dayStartMinutes)}-${minutesToLabel(settings.dayEndMinutes)}.`,
      );
      return;
    }

    if (endMinutes <= startMinutes) {
      setError("End time must be after start time.");
      return;
    }

    setError(null);
    await onSave(date, startMinutes, endMinutes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/24 p-3 sm:items-center sm:justify-center">
      <section className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Fine time edit</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {task?.title ?? "Scheduled block"}
            </p>
          </div>
          <button
            aria-label="Close precise time editor"
            className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">
            Date
            <input
              className="rounded-md border border-[var(--line)] bg-white px-3 py-2 font-normal"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-semibold">
              Start
              <input
                className="rounded-md border border-[var(--line)] bg-white px-3 py-2 font-normal"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{2}:[0-9]{2}"
                placeholder="08:07"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              End
              <input
                className="rounded-md border border-[var(--line)] bg-white px-3 py-2 font-normal"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{2}:[0-9]{2}"
                placeholder="09:33"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-md bg-[var(--rose-soft)] px-3 py-2 text-sm text-[var(--rose)]">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)]"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
            type="button"
            onClick={save}
          >
            Save time
          </button>
        </div>
      </section>
    </div>
  );
}
