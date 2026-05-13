import { formatDisplayDate, getWeekDates, minutesToLabel } from "@/lib/scheduler";
import type { CalendarView, ScheduleBlock, Task } from "@/lib/types";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeIcsText = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll(/\r?\n/g, "\\n");

const foldIcsLine = (line: string) => {
  const chunks: string[] = [];
  let remaining = line;

  while (remaining.length > 74) {
    chunks.push(remaining.slice(0, 74));
    remaining = ` ${remaining.slice(74)}`;
  }

  chunks.push(remaining);
  return chunks.join("\r\n");
};

const toUtcIcsTimestamp = (date: Date) =>
  date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");

const toLocalIcsTimestamp = (date: string, minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${date.replaceAll("-", "")}T${String(hours).padStart(2, "0")}${String(mins).padStart(2, "0")}00`;
};

const getExportData = (input: {
  date: string;
  view: CalendarView;
  tasks: Task[];
  blocks: ScheduleBlock[];
}) => {
  const dates = input.view === "week" ? getWeekDates(input.date) : [input.date];
  const taskById = new Map(input.tasks.map((task) => [task.id, task]));
  const blocksByDate = dates.map((date) => ({
    date,
    blocks: input.blocks
      .filter((block) => block.date === date)
      .slice()
      .sort((a, b) => a.startMinutes - b.startMinutes),
  }));
  const title =
    input.view === "week"
      ? `Time Slots ${formatDisplayDate(dates[0])} - ${formatDisplayDate(dates[dates.length - 1])}`
      : `Time Slots ${formatDisplayDate(input.date)}`;

  return { dates, taskById, blocksByDate, title };
};

const downloadTextFile = (content: string, type: string, filename: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export function exportScheduleHtml(input: {
  date: string;
  view: CalendarView;
  tasks: Task[];
  blocks: ScheduleBlock[];
}) {
  const { taskById, blocksByDate, title } = getExportData(input);

  const body = blocksByDate
    .map(({ date, blocks }) => {
      const rows = blocks.length
        ? blocks
            .map((block) => {
              const task = taskById.get(block.taskId);
              return `<tr>
                <td>${minutesToLabel(block.startMinutes)}-${minutesToLabel(block.startMinutes + block.durationMinutes)}</td>
                <td><strong>${escapeHtml(task?.title ?? "Missing task")}</strong><span>${block.durationMinutes} min</span></td>
                <td>${escapeHtml(task?.priority ?? "")}</td>
                <td>${escapeHtml(task?.tags.join(", ") ?? "")}</td>
              </tr>`;
            })
            .join("")
        : `<tr><td colspan="4" class="empty">No scheduled blocks</td></tr>`;

      return `<section>
        <h2>${escapeHtml(formatDisplayDate(date))}</h2>
        <table>
          <thead><tr><th>Time</th><th>Task</th><th>Priority</th><th>Tags</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; background: #f7fbff; color: #24313b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 920px; margin: 0 auto; padding: 28px 18px 48px; }
    h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.1; }
    .meta { margin: 0 0 24px; color: #6d7c87; }
    section { margin: 18px 0; background: #fff; border: 1px solid #d9e8e6; border-radius: 10px; overflow: hidden; box-shadow: 0 12px 30px rgba(62, 106, 112, 0.08); }
    h2 { margin: 0; padding: 14px 16px; font-size: 16px; background: #dff5f1; color: #26756f; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 16px; border-top: 1px solid #d9e8e6; text-align: left; vertical-align: top; font-size: 14px; }
    th { color: #6d7c87; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    td:first-child { width: 128px; white-space: nowrap; font-variant-numeric: tabular-nums; color: #6d7c87; }
    td span { display: block; margin-top: 3px; color: #6d7c87; font-size: 12px; }
    .empty { color: #6d7c87; text-align: center; }
    @media print { body { background: #fff; } main { padding: 0; } section { box-shadow: none; break-inside: avoid; } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">Exported from Time Slots</p>
    ${body}
  </main>
</body>
</html>`;

  downloadTextFile(
    html,
    "text/html;charset=utf-8",
    `${input.view === "week" ? "time-slots-week" : "time-slots-day"}-${input.date}.html`,
  );
}

export function createScheduleIcs(input: {
  date: string;
  view: CalendarView;
  tasks: Task[];
  blocks: ScheduleBlock[];
}) {
  const { taskById, blocksByDate, title } = getExportData(input);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const timestamp = toUtcIcsTimestamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Time Slots//Personal Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(title)}`,
    `X-WR-TIMEZONE:${escapeIcsText(timezone)}`,
  ];

  blocksByDate.forEach(({ date, blocks }) => {
    blocks.forEach((block) => {
      const task = taskById.get(block.taskId);
      const descriptionParts = [
        task?.description,
        task?.priority ? `Priority: ${task.priority}` : undefined,
        task?.tags.length ? `Tags: ${task.tags.join(", ")}` : undefined,
        block.notes ? `Notes: ${block.notes}` : undefined,
        "Exported from Time Slots",
      ].filter(Boolean);

      lines.push(
        "BEGIN:VEVENT",
        `UID:${escapeIcsText(block.id)}@time-slots.local`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;TZID=${escapeIcsText(timezone)}:${toLocalIcsTimestamp(date, block.startMinutes)}`,
        `DTEND;TZID=${escapeIcsText(timezone)}:${toLocalIcsTimestamp(date, block.startMinutes + block.durationMinutes)}`,
        `SUMMARY:${escapeIcsText(task?.title ?? "Missing task")}`,
        `DESCRIPTION:${escapeIcsText(descriptionParts.join("\n"))}`,
      );

      if (task?.priority) {
        lines.push(`PRIORITY:${task.priority === "high" ? 1 : task.priority === "medium" ? 5 : 9}`);
      }

      if (task?.tags.length) {
        lines.push(`CATEGORIES:${task.tags.map(escapeIcsText).join(",")}`);
      }

      lines.push("END:VEVENT");
    });
  });

  lines.push("END:VCALENDAR");

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function exportScheduleIcs(input: {
  date: string;
  view: CalendarView;
  tasks: Task[];
  blocks: ScheduleBlock[];
}) {
  downloadTextFile(
    createScheduleIcs(input),
    "text/calendar;charset=utf-8",
    `${input.view === "week" ? "time-slots-week" : "time-slots-day"}-${input.date}.ics`,
  );
}
