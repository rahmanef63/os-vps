"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useShellChat, type InspectorInfo, type ChatMessage } from "@/features/appshell";

type Msg = { role: "user" | "assistant"; text: string };

function errText(err: unknown): string {
  const code = err instanceof Error ? err.message : "";
  if (code === "no_api_key") return "No Anthropic key — add one in Settings → AI.";
  if (code === "unauthorized") return "Session expired — sign in again.";
  return "Couldn't reach Alfa. Try again.";
}

// Scoped Alfa chat. Prepends the focused app's context so replies are grounded
// in what the user is looking at (the mock-os "AI mode" per app, made real).
export function InspectorAI({ appId, subject, info }: { appId: string; subject: string; info: InspectorInfo }) {
  const chat = useShellChat();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  // Thread reset on app change happens via key={appId} at the call site
  // (remount), not an effect-driven setState here.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const send = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      const ctx =
        `[Context — the user is in the ${subject} app. ${info.context ?? ""}` +
        (info.props?.length
          ? ` Current state: ${info.props.map((p) => `${p.label}=${p.value}`).join(", ")}.`
          : "") +
        "] Answer about THIS app/state.";
      const wire: ChatMessage[] = [
        { role: "user", text: ctx },
        ...msgs.map((m) => ({ role: m.role, text: m.text })),
        { role: "user", text: t },
      ];
      setMsgs((p) => [...p, { role: "user", text: t }, { role: "assistant", text: "" }]);
      setDraft("");
      setBusy(true);
      try {
        for await (const tok of chat(wire)) {
          setMsgs((p) =>
            p.map((m, i) => (i === p.length - 1 ? { ...m, text: m.text + tok } : m)),
          );
        }
      } catch (err) {
        const note = errText(err);
        setMsgs((p) => p.map((m, i) => (i === p.length - 1 ? { ...m, text: note } : m)));
      } finally {
        setBusy(false);
      }
    },
    [busy, msgs, subject, info, chat],
  );

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2.5 p-3">
          {msgs.length === 0 ? (
            <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
              Ask Alfa about <strong>{subject}</strong>. She sees this app&apos;s current state.
            </p>
          ) : null}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[92%] whitespace-pre-wrap rounded-lg px-2.5 py-1.5 text-xs leading-relaxed",
                m.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-secondary text-secondary-foreground",
              )}
            >
              {m.text || "…"}
            </div>
          ))}
          <div ref={bottom} />
        </div>
      </ScrollArea>

      {info.suggestions?.length ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border p-2">
          {info.suggestions.map((s) => (
            <Button
              key={s}
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => send(s)}
              className="h-auto rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary disabled:opacity-50"
            >
              {s}
            </Button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-1.5 border-t border-border p-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Ask about ${subject}…`}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Send"
          disabled={busy || !draft.trim()}
          className="h-auto w-auto hover:bg-primary/90 grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
