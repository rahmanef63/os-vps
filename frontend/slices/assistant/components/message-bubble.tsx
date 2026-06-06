"use client";

import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

// One chat row: user messages align right (primary bubble), assistant messages
// align left with a Sparkles avatar. All colour via theme tokens, never hex.
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex w-full items-start gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-7 flex-none place-items-center rounded-full",
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        {isUser ? (
          <User className="size-3.5" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
      </span>
      <div
        className={cn(
          "max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-muted text-foreground",
        )}
      >
        {message.text || (
          <span className="text-muted-foreground">…</span>
        )}
      </div>
    </div>
  );
}
