import { AlertTriangle, X } from "lucide-react";
import type { Conflict } from "@/lib/types";

interface ConflictBannerProps {
  conflict: Conflict | null;
  onDismiss: () => void;
}

export function ConflictBanner({ conflict, onDismiss }: ConflictBannerProps) {
  if (!conflict) {
    return null;
  }

  return (
    <div className="fixed left-4 right-4 top-4 z-50 mx-auto flex max-w-3xl items-start gap-3 rounded-lg border border-[var(--amber)] bg-[var(--amber-soft)] px-4 py-3 text-sm shadow-[var(--shadow)]">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--amber)]" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[var(--text)]">{conflict.title}</div>
        <div className="mt-0.5 text-[var(--muted)]">{conflict.message}</div>
      </div>
      <button
        className="rounded-md p-1 text-[var(--muted)] hover:bg-white/70 hover:text-[var(--text)]"
        onClick={onDismiss}
        type="button"
        aria-label="Dismiss conflict"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
