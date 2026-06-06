"use client";

import { useState, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Pinned composer: Enter sends, Shift+Enter inserts a newline. Locked out while
// the assistant is streaming so a second prompt can't race the first.
export function ChatComposer({
  onSend,
  streaming,
}: {
  onSend: (text: string) => void;
  streaming: boolean;
}) {
  const [value, setValue] = useState("");
  const canSend = value.trim().length > 0 && !streaming;

  function submit() {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t bg-background/60 p-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={streaming}
        rows={1}
        placeholder={streaming ? "Alfa is replying…" : "Message Alfa…"}
        className={cn(
          "max-h-32 min-h-9 flex-1 resize-none",
          "scrollbar-thin",
        )}
      />
      <Button
        type="button"
        size="icon"
        onClick={submit}
        disabled={!canSend}
        aria-label="Send message"
        className="size-9 flex-none"
      >
        {streaming ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
      </Button>
    </div>
  );
}
