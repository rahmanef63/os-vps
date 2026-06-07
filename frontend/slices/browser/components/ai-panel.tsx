"use client";

import { useEffect, useState } from "react";
import { Bot, User } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentLogEntry } from "../lib/host";

function fmt(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString();
}
// target is the action's JSON body, e.g. {"url":"..."} — show it compactly.
function detail(target?: string): string {
  if (!target) return "";
  try {
    return Object.values(JSON.parse(target)).join(" ").slice(0, 80);
  } catch {
    return target.slice(0, 80);
  }
}

// AI panel: a side sheet logging every browser action — what the AGENT (CLI)
// and you did. Polls while open so an agent session shows up live.
export function AiPanel({
  open,
  onOpenChange,
  fetchLog,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fetchLog: () => Promise<AgentLogEntry[]>;
}) {
  const [log, setLog] = useState<AgentLogEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    let stop = false;
    const tick = async () => {
      const e = await fetchLog().catch(() => []);
      if (!stop) setLog(e);
    };
    void tick();
    const iv = setInterval(tick, 3000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [open, fetchLog]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[340px] flex-col gap-0 sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>AI · Agent activity</SheetTitle>
          <SheetDescription>
            Browser actions driven by the agent (CLI) and this window — live.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="-mx-4 mt-3 flex-1 px-4">
          <ul className="space-y-1 text-xs">
            {log.length === 0 && (
              <li className="px-1 py-3 text-muted-foreground/60">
                No browser activity yet. Ask the agent to drive the browser and it shows here.
              </li>
            )}
            {log.map((e, i) => {
              const agent = e.actor === "agent";
              return (
                <li key={i} className="flex items-start gap-2 rounded-md border bg-card/40 px-2 py-1.5">
                  {agent ? (
                    <Bot className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  ) : (
                    <User className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{e.action.replace("browser.", "")}</span>
                      <span className="text-[10px] text-muted-foreground">{fmt(e.ts)}</span>
                    </div>
                    {detail(e.target) && (
                      <div className="truncate font-mono text-[10px] text-muted-foreground">{detail(e.target)}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground">{agent ? "agent (cli)" : "you"}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
