"use client";
/* Notification Center — the macOS right-edge slide-out (toggled by clicking the
   menu-bar clock). Promotes transient toasts to a persistent, scrollable history
   plus a month calendar. Reads the appshell notification log (lib/toast); open
   state lives in the window store so the clock + ⌘ commands can drive it. Opening
   marks everything read (clears the menu-bar unread dot). Desktop chrome — render
   once in the desktop surface. */
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { X, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationCenterOpen } from "../hooks/use-shell";
import { setNotificationCenterOpen } from "../lib/store";
import {
  useNotifications,
  dismissNotification,
  clearNotifications,
  markNotificationsRead,
  type NotificationItem,
} from "../lib/toast";

export function NotificationCenter() {
  const open = useNotificationCenterOpen();
  const items = useNotifications();
  const close = () => setNotificationCenterOpen(false);

  // Opening = "seen": clear the unread badge. Esc closes.
  useEffect(() => {
    if (!open) return;
    markNotificationsRead();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[889]" onClick={close} />
      <aside
        className="glass fixed right-0 top-0 bottom-0 z-[890] flex w-[340px] flex-col gap-3 border-l border-border p-3 pt-9 shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-200"
        style={{ background: "var(--glass-menu)" }}
      >
        <header className="flex items-center px-1">
          <h2 className="text-[15px] font-semibold">Notifications</h2>
          {items.length > 0 && (
            <Button type="button" variant="ghost" onClick={clearNotifications} className="h-auto p-0 font-normal hover:bg-transparent ml-auto text-xs font-medium text-primary hover:underline">
              Clear All
            </Button>
          )}
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {items.length === 0 ? (
            <div className="mt-10 flex flex-col items-center gap-2 text-muted-foreground">
              <BellOff className="size-7 opacity-50" />
              <p className="text-sm">No Notifications</p>
            </div>
          ) : (
            items.map((n) => <NotifCard key={n.id} n={n} />)
          )}
        </div>

        <MonthCalendar />
      </aside>
    </>
  );
}

const TONE_DOT: Record<NotificationItem["tone"], string> = {
  default: "bg-primary",
  success: "bg-emerald-500",
  error: "bg-rose-500",
};

function NotifCard({ n }: { n: NotificationItem }) {
  return (
    <div className="group relative rounded-2xl border border-border bg-background/70 p-3 pr-8 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", TONE_DOT[n.tone])} />
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Rahman OS · {relTime(n.ts)}
        </span>
      </div>
      <p className="mt-1 text-[13px] leading-snug text-foreground">{n.message}</p>
      <Button type="button" variant="ghost"
        aria-label="Dismiss"
        onClick={() => dismissNotification(n.id)}
        className="h-auto p-0 font-normal hover:bg-transparent absolute right-2 top-2 grid size-5 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

function relTime(ts: number): string {
  if (!ts) return "now";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

// Lightweight current-month grid (no dep) — today highlighted with the accent.
function MonthCalendar() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const today = now.getDate();
  const first = new Date(y, mo, 1).getDay();
  const days = new Date(y, mo + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <div className="mb-2 px-1 text-[13px] font-semibold">
        {now.toLocaleDateString([], { month: "long", year: "numeric" })}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
        {DOW.map((d, i) => (
          <span key={i} className="font-medium text-muted-foreground">{d}</span>
        ))}
        {cells.map((d, i) => (
          <span
            key={i}
            className={cn(
              "mx-auto grid size-6 place-items-center rounded-full tabular-nums",
              d === today ? "bg-primary font-semibold text-primary-foreground" : "text-foreground/80",
            )}
          >
            {d ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}
