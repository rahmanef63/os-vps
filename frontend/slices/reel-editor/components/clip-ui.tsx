"use client";

// Tiny shared building blocks for the clip inspector tabs.

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{children}</h2>
      {right}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** A row of small mutually-exclusive choice buttons. */
export function BtnRow<T extends string>({
  options,
  value,
  onPick,
}: {
  options: { v: T; label: React.ReactNode; title?: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <Button
          key={o.v}
          type="button"
          variant="ghost"
          title={o.title}
          onClick={() => onPick(o.v)}
          className={cn(
            "h-6 flex-1 rounded-md px-0 text-xs font-normal capitalize",
            value === o.v ? "bg-primary text-primary-foreground hover:bg-primary" : "bg-secondary text-foreground hover:bg-secondary",
          )}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

/** Inspector tab strip. */
export function TabStrip<T extends string>({
  tabs,
  active,
  onPick,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onPick: (t: T) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-secondary p-0.5">
      {tabs.map((t) => (
        <Button
          key={t.id}
          type="button"
          variant="ghost"
          onClick={() => onPick(t.id)}
          className={cn(
            "h-6 flex-1 rounded-md px-0 text-[11px] font-semibold hover:bg-transparent",
            active === t.id ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
