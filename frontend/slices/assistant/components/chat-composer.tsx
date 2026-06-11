"use client";

import { useState, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
    <div className="flex items-end gap-2 border-t bg-background/60 p-3 [padding-bottom:calc(0.75rem+var(--sai-bottom))]">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder={streaming ? "Alfa is replying…" : "Message Alfa…"}
        className={cn(
          "max-h-32 min-h-9 flex-1 resize-none",
          "scrollbar-thin",
        )}
      />
      {streaming ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={onStop}
          aria-label="Stop generating"
          className="size-9 flex-none"
        >
          <Square className="size-4 fill-current" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className="size-9 flex-none"
        >
          <Send className="size-4" />
        </Button>
      )}
    </div>
  );
}
