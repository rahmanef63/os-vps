"use client";

import { useCallback, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./components/tabs";
import { usePublishInspector } from "./lib/host";
import { useAIStore } from "./lib/store";
import type { Agent, Automation, Skill } from "./lib/types";
import { AgentForm } from "./components/agent-form";
import { AgentSwitcher } from "./components/agent-switcher";
import { AutomationForm } from "./components/automation-form";
import { AutomationView } from "./components/automation-view";
import { ChatPanel, type ChatHandle } from "./components/chat-panel";
import { LibraryGrid } from "./components/library-grid";
import { SkillForm } from "./components/skill-form";

type Tab = "chat" | "agents" | "skills" | "automations";
type FormState =
  | { kind: "skill"; item?: Skill }
  | { kind: "agent"; item?: Agent }
  | { kind: "automation"; item?: Automation }
  | null;

const TABS: [Tab, string][] = [
  ["chat", "Chat"],
  ["agents", "Agents"],
  ["skills", "Skills"],
  ["automations", "Automations"],
];

// Alfa: tabbed assistant. Chat keeps the real Claude stream; the other tabs
// manage agents/skills/automations entirely in localStorage (no Convex).
export default function Assistant() {
  const store = useAIStore();
  const [tab, setTab] = useState<Tab>("chat");
  const [form, setForm] = useState<FormState>(null);
  const chatRef = useRef<ChatHandle>(null);

  const runAutomation = useCallback(
    (auto: Automation) => {
      setTab("chat");
      const agent = store.agents.find((a) => a.id === auto.agentId);
      setTimeout(() => chatRef.current?.runSteps(auto, agent), 30);
    },
    [store.agents],
  );

  // Surface Alfa's own library state to the shell AI Inspector. Called above the
  // early return so it runs unconditionally.
  const agentName = store.activeAgent?.name ?? "—";
  usePublishInspector(
    "assistant",
    {
      subject: agentName,
      props: [
        { label: "Active agent", value: agentName },
        { label: "Agents", value: String(store.agents.length) },
        { label: "Skills", value: String(store.skills.length) },
        { label: "Automations", value: String(store.automations.length) },
      ],
      context: `Alfa assistant, agent ${agentName}`,
      suggestions: ["What can you do?", "List my skills"],
    },
    [agentName, store.agents.length, store.skills.length, store.automations.length],
  );

  if (form) {
    if (form.kind === "skill")
      return <SkillForm skill={form.item} store={store} onClose={() => setForm(null)} />;
    if (form.kind === "agent")
      return <AgentForm agent={form.item} store={store} onClose={() => setForm(null)} />;
    return <AutomationForm auto={form.item} store={store} onClose={() => setForm(null)} />;
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {tab !== "chat" ? (
        <div className="flex items-center overflow-x-auto border-b border-border bg-card/40 px-3 py-2 [scrollbar-width:none]">
          {/* flex-1 spacer, not justify-end: end-aligned overflow in a scroll row
              is unreachable on the start side. The spacer collapses to 0 when the
              tabs overflow, so they left-align and every tab stays scrollable. */}
          <div className="flex-1" />
          <TabBar tab={tab} setTab={setTab} />
        </div>
      ) : null}

      {/* ChatPanel stays MOUNTED across tab switches (hidden via CSS) so the
          live stream + messages survive — unmounting it mid-stream would wipe
          state and orphan the `for await` into a dead component. */}
      <div className={tab === "chat" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
        <ChatPanel
          ref={chatRef}
          agent={store.activeAgent}
          onSwitchAgent={() => {}}
          switcher={
            <>
              <AgentSwitcher store={store} onNew={() => setForm({ kind: "agent" })} />
              {/* Spacer instead of ml-auto: collapses when the row overflows so the
                  tab group left-aligns and all tabs stay reachable by scrolling. */}
              <div className="flex-1" />
              <div className="shrink-0">
                <TabBar tab="chat" setTab={setTab} />
              </div>
            </>
          }
        />
      </div>

      {tab === "agents" ? (
        <LibraryGrid
          kind="agent"
          store={store}
          onNew={() => setForm({ kind: "agent" })}
          onEdit={(it) => setForm({ kind: "agent", item: it as Agent })}
        />
      ) : tab === "skills" ? (
        <LibraryGrid
          kind="skill"
          store={store}
          onNew={() => setForm({ kind: "skill" })}
          onEdit={(it) => setForm({ kind: "skill", item: it as Skill })}
        />
      ) : tab === "automations" ? (
        <AutomationView
          store={store}
          onRun={runAutomation}
          onNew={() => setForm({ kind: "automation" })}
          onEdit={(it) => setForm({ kind: "automation", item: it })}
        />
      ) : null}
    </div>
  );
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <Tabs>
      <TabsList className="shrink-0">
        {TABS.map(([v, l]) => (
          <TabsTrigger key={v} active={tab === v} onClick={() => setTab(v)}>
            {l}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
