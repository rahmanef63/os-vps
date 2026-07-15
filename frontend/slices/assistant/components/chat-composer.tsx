"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowUp, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useActiveShell } from "@/features/os-shell";

// Pinned composer: Enter sends, Shift+Enter inserts a newline. While the
// assistant is streaming the action button becomes a Stop button (aborts the
// upstream generation) — the composer is never permanently locked.
export function ChatComposer({
  onSend,
  streaming,
  onStop,
}: {
  onSend: (text: string) => void;
  streaming: boolean;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  const canSend = value.trim().length > 0 && !streaming;
  const ios = useActiveShell().id === "ios";

  function submit() {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !streaming) {
      e.preventDefault();
      submit();
    }
  }

  // Pinned to the pane bottom — pad past the home-bar on mobile (--sai-bottom).
  return (
    <div className="border-t bg-background/60 p-3 [padding-bottom:calc(0.75rem+var(--sai-bottom))]">
      {/* iOS = iMessage pill: the send FAB nests inside the --fill rounded pill. */}
      <div className={cn("flex items-end gap-2", ios && "gap-1.5 rounded-[20px] border border-[var(--sep)] bg-[var(--fill)] py-1 pl-3.5 pr-1")}>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={streaming ? "Alfa is replying…" : "Message Alfa…"}
          className={cn(
            "max-h-32 min-h-9 flex-1 resize-none scrollbar-thin",
            ios && "min-h-8 border-0 bg-transparent px-0 py-1.5 shadow-none focus-visible:ring-0",
          )}
        />
        {streaming ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={onStop}
            aria-label="Stop generating"
            className={cn("flex-none", ios ? "size-[30px] rounded-full" : "size-9")}
          >
            <Square className={ios ? "size-3 fill-current" : "size-4 fill-current"} />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send message"
            className={cn("flex-none", ios ? "size-[30px] rounded-full" : "size-9")}
          >
            {ios ? <ArrowUp className="size-4" /> : <Send className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
