import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { Priority } from "@/lib/types";

export interface TaskComposerInput {
  title: string;
  description?: string;
  priority: Priority;
  estimatedMinutes: number;
  dueDate?: string;
  tags: string[];
}

interface TaskComposerProps {
  onCreate: (input: TaskComposerInput) => Promise<void>;
}

export function TaskComposer({ onCreate }: TaskComposerProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [tags, setTags] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    await onCreate({
      title,
      priority,
      estimatedMinutes,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    setTitle("");
    setPriority("medium");
    setEstimatedMinutes(45);
    setTags("");
  };

  return (
    <form className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm" onSubmit={submit}>
      <label className="text-xs font-semibold uppercase text-[var(--muted)]" htmlFor="task-title">
        New task
      </label>
      <input
        id="task-title"
        className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text)]"
        placeholder="Task title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
        <select
          className="rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
          aria-label="Priority"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          className="rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm"
          value={estimatedMinutes}
          onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
          aria-label="Estimated duration"
        >
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={45}>45 min</option>
          <option value={60}>60 min</option>
          <option value={90}>90 min</option>
          <option value={120}>120 min</option>
        </select>
      </div>
      <input
        className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text)]"
        placeholder="Tags, comma separated"
        value={tags}
        onChange={(event) => setTags(event.target.value)}
      />
      <button
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
        type="submit"
      >
        <Plus className="h-4 w-4" />
        Add task
      </button>
    </form>
  );
}
