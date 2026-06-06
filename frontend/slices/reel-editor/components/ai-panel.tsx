"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AI_SUGGESTIONS } from "../lib/ai-edit";

export type AiMessage = { role: "user" | "ai"; text: string };

// AI edit panel: chat-style log + suggestion chips + one-line command input.
export function AiPanel({
  log,
  hasSel,
  onSend,
}: {
  log: AiMessage[];
  hasSel: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [log]);

  const send = (raw: string) => {
    const s = raw.trim();
    if (!s) return;
    onSend(s);
    setValue("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" /> AI Assistant
      </div>
      <p className="text-[10.5px] text-muted-foreground">
        {hasSel ? "Acting on the selected clip." : "Select a clip for clip-level edits."}
      </p>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {log.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[94%] rounded-xl px-2.5 py-1.5 text-xs leading-snug",
              m.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-secondary text-foreground",
            )}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {AI_SUGGESTIONS.map((s) => (
          <Button
            key={s}
            type="button"
            variant="ghost"
            onClick={() => send(s)}
            className="h-auto rounded-full border border-border bg-secondary px-2 py-1 text-[10.5px] font-normal text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {s}
          </Button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <Input
          value={value}
          placeholder="Describe an edit…"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") send(value);
          }}
        />
        <Button size="sm" onClick={() => send(value)}>
          Go
        </Button>
      </div>
    </div>
  );
}
