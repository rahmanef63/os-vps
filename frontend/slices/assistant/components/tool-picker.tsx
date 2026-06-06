"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GROUP_META, GROUP_ORDER, OS_TOOLS } from "../lib/tools";
import { glyphIcon } from "./icon-map";

// Grouped, toggleable tool list reused by the Agent / Skill / Automation editors.
// Each group has a toggle-all/none control. Selection is a flat list of tool ids.
export function ToolPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const set = new Set(value);
  const toggle = (id: string) => {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    onChange([...n]);
  };

  return (
    <div className="flex flex-col gap-3">
      {GROUP_ORDER.map((g) => {
        const tools = OS_TOOLS.filter((t) => t.group === g);
        if (!tools.length) return null;
        const meta = GROUP_META[g];
        const Icon = glyphIcon(meta.icon);
        const all = tools.every((t) => set.has(t.id));
        return (
          <div key={g}>
            <div className="mb-1.5 flex items-center gap-2">
              <Icon className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold">{meta.label}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-5 px-2 text-[10px]"
                onClick={() => {
                  const n = new Set(set);
                  tools.forEach((t) => (all ? n.delete(t.id) : n.add(t.id)));
                  onChange([...n]);
                }}
              >
                {all ? "none" : "all"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tools.map((t) => {
                const on = set.has(t.id);
                return (
                  <Button
                    key={t.id}
                    type="button"
                    variant="ghost"
                    title={t.desc}
                    onClick={() => toggle(t.id)}
                    className={cn(
                      "h-auto rounded-full border px-2.5 py-1 text-[11px] font-normal transition-colors",
                      on
                        ? "border-transparent bg-primary text-primary-foreground hover:bg-primary"
                        : "border-border bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.name}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
