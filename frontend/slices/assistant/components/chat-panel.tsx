"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { streamReply, type WireMsg } from "../lib/stream";
import { toolById } from "../lib/tools";
import type { Agent, Automation } from "../lib/types";
import { MessageBubble, type ChatMessage } from "./message-bubble";
import { ChatComposer } from "./chat-composer";
import { EmptyState } from "./empty-state";

const SUGGESTED = ["Show system stats", "List /home", "Restart a service"];

function errText(err: unknown): string {
  const code = err instanceof Error ? err.message : "";
  if (code === "no_api_key")
    return "No Anthropic API key set. Add one in Settings → AI, or set ANTHROPIC_API_KEY on the server.";
  if (code === "unauthorized") return "Session expired — sign in again.";
  return "Couldn't reach the assistant. Try again.";
}

let seq = 0;
const nextId = () => `m${Date.now()}-${seq++}`;

export type ChatHandle = {
  runSteps: (auto: Automation, agent?: Agent) => void;
  stop: () => void;
};

// The REAL streaming chat. Keeps streamReply + useAuthToken exactly as before;
// the only addition is prepending the active agent's persona as a leading
// system-style turn so replies adopt the selected agent's voice. An
// AbortController threads through streamReply so closing the window, switching
// tabs, or hitting Stop cancels the upstream generation (no orphaned billing).
export const ChatPanel = forwardRef<
  ChatHandle,
  { agent: Agent; onSwitchAgent: () => void; switcher: React.ReactNode }
>(function ChatPanel({ agent, switcher }, ref) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const agentRef = useRef(agent);
  agentRef.current = agent;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // Abort the in-flight stream if the panel unmounts (window close / app swap).
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      if (streaming) return;
      const a = agentRef.current;
      const userMsg: ChatMessage = { id: nextId(), role: "user", text };
      const replyId = nextId();
      // Persona is sent as a leading system-style user line; the rest is the
      // real turn history. Same WireMsg[] shape streamReply already accepts.
      const wire: WireMsg[] = [];
      if (a.persona.trim())
        wire.push({ role: "user", text: `[System — you are ${a.name}] ${a.persona}` });
      wire.push(
        ...messages.map((m) => ({ role: m.role, text: m.text })),
        { role: "user", text },
      );
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: replyId, role: "assistant", text: "" },
      ]);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStreaming(true);
      try {
        for await (const token of streamReply(wire, ctrl.signal)) {
          setMessages((prev) =>
            prev.map((m) => (m.id === replyId ? { ...m, text: m.text + token } : m)),
          );
        }
      } catch (err) {
        if (ctrl.signal.aborted) return; // user stopped — keep partial reply
        // APPEND the error so the streamed tokens are never erased.
        const note = errText(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? { ...m, text: m.text ? `${m.text}\n\n⚠ ${note}` : note }
              : m,
          ),
        );
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setStreaming(false);
      }
    },
    [streaming, messages],
  );

  // Automations narrate (no real execution) into the same thread.
  useImperativeHandle(ref, () => ({
    runSteps(auto, runAgent) {
      const lines = auto.steps.map((s, i) => {
        const t = toolById(s.tool);
        return `  ${i + 1}. ${t?.name ?? s.tool}${s.argText ? ` — ${s.argText}` : ""}`;
      });
      const body =
        `Running automation “${auto.name}” as ${(runAgent ?? agentRef.current).name}:\n` +
        (lines.join("\n") || "  (no steps)") +
        "\n\n(Steps logged — no real execution in this build.)";
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: body }]);
    },
    stop,
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-card/40 px-3 py-2 [scrollbar-width:none]">
        {switcher}
      </div>
      {messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto">
          <EmptyState prompts={SUGGESTED} onPick={send} />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-4 p-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      )}
      <ChatComposer onSend={send} streaming={streaming} onStop={stop} />
    </div>
  );
});
