import {
  CalendarPlus,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Download,
  Eye,
  LogOut,
  Mail,
  PanelsLeftBottom,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { addDays, formatDisplayDate, getWeekDates } from "@/lib/scheduler";
import type { CloudSyncController } from "@/lib/sync";
import type { CalendarView } from "@/lib/types";

interface ViewToolbarProps {
  date: string;
  view: CalendarView;
  onDateChange: (date: string) => void;
  onViewChange: (view: CalendarView) => void;
  onJumpToToday: () => void;
  scheduleOnly: boolean;
  onScheduleOnlyChange: (scheduleOnly: boolean) => void;
  onNewTask: () => void;
  onExportHtml: () => void;
  onExportCalendar: () => void;
  sync: CloudSyncController;
}

export function ViewToolbar({
  date,
  view,
  onDateChange,
  onViewChange,
  onJumpToToday,
  scheduleOnly,
  onScheduleOnlyChange,
  onNewTask,
  onExportHtml,
  onExportCalendar,
  sync,
}: ViewToolbarProps) {
  const [email, setEmail] = useState("");
  const week = getWeekDates(date);
  const title =
    view === "week"
      ? `${formatDisplayDate(week[0])} - ${formatDisplayDate(week[6])}`
      : formatDisplayDate(date);
  const step = view === "week" ? 7 : 1;
  const syncDescription =
    sync.message ??
    (sync.configured
      ? sync.userEmail
        ? "Changes sync automatically"
        : "Sign in to sync across devices"
      : "Add Supabase env vars to enable cloud sync");

  return (
    <header className="flex flex-col gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-[var(--accent)]" />
          <h1 className="text-xl font-semibold tracking-normal">Time Slots</h1>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]">
          {sync.enabled ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
          {sync.label}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {sync.userEmail ? (
            <>
              <span className="max-w-[220px] truncate rounded-md bg-[var(--accent-soft)] px-2 py-1 font-medium text-[var(--accent-strong)]">
                {sync.userEmail}
              </span>
              <button
                className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-white px-2 py-1 font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)] disabled:opacity-60"
                type="button"
                disabled={sync.isSyncing}
                onClick={() => {
                  void sync.syncNow();
                }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${sync.isSyncing ? "animate-spin" : ""}`} />
                Sync now
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-white px-2 py-1 font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)]"
                type="button"
                onClick={() => {
                  void sync.signOut();
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </>
          ) : (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!email.trim()) {
                  return;
                }
                void sync.signInWithEmail(email.trim());
              }}
            >
              <input
                className="w-48 rounded-md border border-[var(--line)] bg-white px-2 py-1 text-xs text-[var(--text)] disabled:bg-[var(--surface-muted)]"
                type="email"
                placeholder="Email for sync"
                value={email}
                disabled={!sync.configured}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button
                className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-1 font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-55"
                type="submit"
                disabled={!sync.configured || !email.trim()}
              >
                <Mail className="h-3.5 w-3.5" />
                Sign in
              </button>
            </form>
          )}
          <span className={sync.error ? "text-[var(--rose)]" : "text-[var(--muted)]"}>
            {syncDescription}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-1">
          {(["day", "week"] as const).map((option) => (
            <button
              key={option}
              className={`rounded px-3 py-1.5 text-sm font-semibold capitalize ${
                view === option ? "bg-white text-[var(--text)] shadow-sm" : "text-[var(--muted)]"
              }`}
              type="button"
              onClick={() => onViewChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center rounded-md border border-[var(--line)] bg-white">
          <button
            className="p-2 text-[var(--muted)] hover:text-[var(--text)]"
            type="button"
            aria-label="Previous"
            onClick={() => onDateChange(addDays(date, -step))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="border-x border-[var(--line)] px-3 py-2 text-sm font-semibold" type="button" onClick={onJumpToToday}>
            {title}
          </button>
          <button
            className="p-2 text-[var(--muted)] hover:text-[var(--text)]"
            type="button"
            aria-label="Next"
            onClick={() => onDateChange(addDays(date, step))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
            scheduleOnly
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
              : "border-[var(--line)] bg-white text-[var(--text)] hover:bg-[var(--surface-muted)]"
          }`}
          type="button"
          aria-pressed={scheduleOnly}
          onClick={() => onScheduleOnlyChange(!scheduleOnly)}
        >
          {scheduleOnly ? <PanelsLeftBottom className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {scheduleOnly ? "Show panels" : "Schedule only"}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)]"
          type="button"
          onClick={onExportHtml}
        >
          <Download className="h-4 w-4" />
          HTML
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)]"
          type="button"
          onClick={onExportCalendar}
        >
          <CalendarPlus className="h-4 w-4" />
          Calendar
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          type="button"
          onClick={onNewTask}
        >
          <Plus className="h-4 w-4" />
          New task
        </button>
      </div>
    </header>
  );
}
