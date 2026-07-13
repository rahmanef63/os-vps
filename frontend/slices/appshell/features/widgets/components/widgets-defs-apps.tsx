"use client";

import { useState } from "react";
import { CalendarDays, Check, ListTodo, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./widget-cards";

// "App-like" desktop widgets (as opposed to the glanceable telemetry cards in
// widgets-defs.tsx): a mini calendar and a persisted task list. Split out to keep
// widgets-defs.tsx under the line ceiling.

const TASKS_KEY = "os-vps:widget:tasks";
type Task = { id: string; text: string; done: boolean };

// Current-month mini calendar, today highlighted. Client-only (the desktop stack
// never SSRs — see ClockWidget), so a lazy `new Date()` is hydration-safe.
export function CalendarWidget() {
  const [now] = useState(() => new Date());
  const y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  const lead = new Date(y, m, 1).getDay(); // blank cells before day 1 (0=Sun)
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <CalendarDays className="size-4 text-muted-foreground" />
        <span className="text-[12.5px] font-semibold">{now.toLocaleDateString([], { month: "long", year: "numeric" })}</span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-medium text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] tabular-nums">
        {cells.map((d, i) => (
          <div key={i} className={cn("rounded py-0.5", d === today && "bg-primary font-bold text-primary-foreground")}>
            {d ?? ""}
          </div>
        ))}
      </div>
    </Card>
  );
}

// A persisted checklist (localStorage). Interactive → opts back into pointer
// events. Add on Enter, click a row to toggle, × to delete.
export function TasksWidget() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(TASKS_KEY) ?? "[]") as Task[];
    } catch {
      return [];
    }
  });
  const [draft, setDraft] = useState("");
  const save = (next: Task[]) => {
    setTasks(next);
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
  };
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    save([...tasks, { id: `${Date.now().toString(36)}-${tasks.length}`, text: t, done: false }]);
    setDraft("");
  };
  const left = tasks.filter((t) => !t.done).length;
  return (
    <Card className="pointer-events-auto">
      <div className="mb-2 flex items-center gap-2">
        <ListTodo className="size-4 text-muted-foreground" />
        <span className="text-[12.5px] font-semibold">Tasks</span>
        <span className="ml-auto text-[11px] text-muted-foreground">{left} left</span>
      </div>
      {tasks.length > 0 && (
        <div className="mb-2 flex max-h-28 flex-col gap-1 overflow-auto">
          {tasks.map((t) => (
            <div key={t.id} className="group flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => save(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                className="flex flex-1 items-center gap-1.5 text-left"
              >
                <span className={cn("grid size-4 shrink-0 place-items-center rounded border border-white/25", t.done && "border-primary bg-primary")}>
                  {t.done && <Check className="size-3 text-primary-foreground" />}
                </span>
                <span className={cn("truncate", t.done && "text-muted-foreground line-through")}>{t.text}</span>
              </button>
              <button
                type="button"
                onClick={() => save(tasks.filter((x) => x.id !== t.id))}
                aria-label="Delete task"
                className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder="Add task…"
        className="w-full rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
      />
    </Card>
  );
}
