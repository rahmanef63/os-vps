"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useActiveShell } from "@/features/os-shell";
import { runToolAgent, useOsApi, type AgentMsg } from "../lib/host";
import { toolById } from "../lib/tools";
import type { Agent, Automation } from "../lib/types";
import { HOST_SYSTEM } from "../host-tools/registry";
import { useHostCommands, type HostToolUi } from "../host-tools/use-host-commands";
import { MessageBubble, type ChatMessage, type ToolCard } from "./message-bubble";
import { ApprovalCard } from "./approval-card";
import { ChatComposer } from "./chat-composer";
import { EmptyState } from "./empty-state";
import { useThreadPersistence } from "./use-thread-persistence";

const SUGGESTED = ["Show system stats", "List ~/projects", "Create notes.txt in ~/projects with a TODO"];

function errText(err: unknown): string {
  const code = err instanceof Error ? err.message : "";
  if (code.startsWith("no_api_key")) {
    const provider = code.split(":")[1] || "selected provider";
    return `No API key set for ${provider}. Add it in Settings → AI, then save and test that provider.`;
  }
  if (code === "unauthorized") return "Session expired — sign in again.";
  return "Couldn't reach the assistant. Try again.";
}

let seq = 0;
const nextId = () => `m${Date.now()}-${seq++}`;

export type ChatHandle = {
  runSteps: (auto: Automation, agent?: Agent) => void;
  stop: () => void;
  loadThread: (t: { id: string; createdAt: number; messages: unknown[]; history: unknown[] }) => void;
  newThread: () => void;
};

// Alfa's chat — now a REAL host-tool agent. The model streams a turn, then any
// tool_use runs through `invoke` (host-tools binding): read tools execute
// immediately, mutate tools (fs.write/mkdir/move, exec.run) render an approval
// card and PARK the loop until the user clicks Approve/Deny. An AbortController
// threads through the loop so Stop / window-close cancels the stream and unblocks
// any pending approval. The wire history lives in `historyRef` (tool_use +
// tool_result blocks), separate from the display `messages`.
export function ChatPanel({
  agent,
  switcher,
  ref,
}: {
  agent: Agent;
  switcher: React.ReactNode;
  ref?: Ref<ChatHandle>;
}) {
  const api = useOsApi();
  const ios = useActiveShell().id === "ios";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const agentRef = useRef(agent);
  const historyRef = useRef<AgentMsg[]>([]);
  // cardId → the approval promise's resolver (set while a mutate call is parked).
  const pendingRef = useRef<Map<string, (d: { approve: boolean; remember: boolean }) => void>>(new Map());
  useEffect(() => { agentRef.current = agent; }, [agent]);

  useEffect(() => {
    // Coalesce into one rAF (streaming appends `messages` per token) and use
    // instant behavior — a smooth scroll restarted every token both janks and
    // forces a layout each frame.
    const id = requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" }));
    return () => cancelAnimationFrame(id);
  }, [messages]);

  // Stable UI seam for the tool binding: push/patch tool cards + await approval.
  const pushCard = useCallback((id: string, card: ToolCard) => {
    setMessages((prev) => [...prev, { id, role: "tool", tool: card }]);
  }, []);
  const updateCard = useCallback((id: string, patch: Partial<ToolCard>) => {
    setMessages((prev) => prev.map((m) => (m.id === id && m.tool ? { ...m, tool: { ...m.tool, ...patch } } : m)));
  }, []);
  const requestApproval = useCallback(
    (id: string) => new Promise<{ approve: boolean; remember: boolean }>((resolve) => pendingRef.current.set(id, resolve)),
    [],
  );
  const ui = useMemo<HostToolUi>(() => ({ pushCard, updateCard, requestApproval }), [pushCard, updateCard, requestApproval]);
  const { tools, invoke } = useHostCommands(ui);

  const resolve = useCallback((id: string, approve: boolean, remember: boolean) => {
    const r = pendingRef.current.get(id);
    if (r) { pendingRef.current.delete(id); r({ approve, remember }); }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    // Unblock any parked approval so the loop can unwind cleanly.
    pendingRef.current.forEach((r) => r({ approve: false, remember: false }));
    pendingRef.current.clear();
  }, []);

  // Abort the in-flight run if the panel unmounts (window close / app swap).
  useEffect(() => () => abortRef.current?.abort(), []);

  // Thread persistence: save the conversation to a YAML thread + resume one.
  const { persist, loadThread, newThread } = useThreadPersistence(historyRef, setMessages, stop);

  const send = useCallback(
    async (text: string) => {
      if (streaming) return;
      const a = agentRef.current;
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text },
        { id: nextId(), role: "assistant", text: "" },
      ]);
      // Persona is injected once as a leading turn; the rest is real history.
      if (historyRef.current.length === 0 && a.persona.trim())
        historyRef.current.push({ role: "user", text: `[System — you are ${a.name}] ${a.persona}` });
      historyRef.current.push({ role: "user", text });

      const appendToLastAssistant = (fn: (t: string) => string) =>
        setMessages((prev) => {
          const next = [...prev];
          for (let k = next.length - 1; k >= 0; k--) {
            if (next[k].role === "assistant") { next[k] = { ...next[k], text: fn(next[k].text ?? "") }; break; }
          }
          return next;
        });

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStreaming(true);
      const modeNote =
        api.mode === "live"
          ? " You are in LIVE mode on a production VPS; tool actions are real."
          : " You are in MOCK mode; tool actions are simulated (no real VPS).";
      try {
        const { history: next } = await runToolAgent(
          historyRef.current,
          tools,
          invoke,
          {
            onDelta: (c) => appendToLastAssistant((t) => t + c),
            // After each tool card, open a fresh assistant bubble so the next
            // turn's text streams BELOW the card rather than into an earlier one.
            onTool: () => setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: "" }]),
          },
          8,
          HOST_SYSTEM + modeNote,
          ctrl.signal,
        );
        historyRef.current = next;
      } catch (err) {
        if (!ctrl.signal.aborted) {
          const note = errText(err);
          appendToLastAssistant((t) => (t ? `${t}\n\n⚠ ${note}` : note));
        }
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setStreaming(false);
        // Drop the empty streaming placeholders (model ended on a tool / no text),
        // then persist the finished turn to its thread.
        setMessages((prev) => {
          const cleaned = prev.filter((m) => !(m.role === "assistant" && !m.text));
          persist(cleaned);
          return cleaned;
        });
      }
    },
    [streaming, tools, invoke, api.mode, persist],
  );

  // Automations narrate (no real execution) into the same thread. (v1 — later
  // each step can be pushed through the same agent.)
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
    loadThread,
    newThread,
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-card/40 px-3 py-2 [scrollbar-width:none]">
        {switcher}
      </div>
      <div
        className={cn(
          "px-3 py-1 text-center text-[11px] font-medium",
          api.mode === "live" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
        )}
      >
        {api.mode === "live"
          ? "● LIVE — Alfa acts on your real VPS; every change needs your approval"
          : "MOCK — actions are simulated (switch to Live in Settings → Server)"}
      </div>
      {messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto">
          <EmptyState prompts={SUGGESTED} onPick={send} />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className={cn("flex flex-col p-4", ios ? "gap-1.5" : "gap-4")}>
            {messages.map((m) =>
              m.role === "tool" ? (
                <ApprovalCard key={m.id} message={m} onResolve={resolve} />
              ) : (
                <MessageBubble key={m.id} message={m} ios={ios} />
              ),
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      )}
      <ChatComposer onSend={send} streaming={streaming} onStop={stop} />
    </div>
  );
}
