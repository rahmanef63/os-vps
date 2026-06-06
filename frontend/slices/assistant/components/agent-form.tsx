"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AGENT_COLORS, SKILL_ICONS } from "../lib/presets";
import type { AIStore } from "../lib/store";
import { OS_TOOLS } from "../lib/tools";
import type { Agent } from "../lib/types";
import { Field, FormShell } from "./form-shell";
import { GlyphTile } from "./agent-avatar";
import { ColorPick, GlyphPick } from "./pickers";

export function AgentForm({
  agent,
  store,
  onClose,
}: {
  agent?: Agent;
  store: AIStore;
  onClose: () => void;
}) {
  const editing = !!agent;
  const [name, setName] = useState(agent?.name ?? "New Agent");
  const [glyph, setGlyph] = useState(agent?.glyph ?? "sparkles");
  const [color, setColor] = useState(agent?.color ?? AGENT_COLORS[0]);
  const [persona, setPersona] = useState(agent?.persona ?? "");
  const [allTools, setAllTools] = useState(!!agent?.allTools);
  const [skills, setSkills] = useState<string[]>(agent?.skills ?? []);

  const toggleSkill = (id: string) =>
    setSkills((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toolCount = allTools
    ? OS_TOOLS.length
    : new Set(
        skills.flatMap((id) => store.skills.find((x) => x.id === id)?.tools ?? []),
      ).size;

  const save = () => {
    const payload = { name, glyph, color, persona, allTools, skills };
    if (editing && agent) store.updateAgent(agent.id, payload);
    else store.setActiveAgentId(store.addAgent(payload).id);
    onClose();
  };

  return (
    <FormShell
      title={editing ? "Edit Agent" : "Create Agent"}
      editing={editing}
      onClose={onClose}
      onSave={save}
      preview={
        <div className="flex flex-col items-center gap-2">
          <GlyphTile glyph={glyph} color={color} size={64} />
          <span className="font-semibold">{name}</span>
          <span className="text-[11px] text-muted-foreground">
            {allTools ? "all tools" : `${skills.length} skills`} · {toolCount} tools
          </span>
        </div>
      }
    >
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Icon">
        <GlyphPick value={glyph} onChange={setGlyph} options={SKILL_ICONS} />
      </Field>
      <Field label="Color">
        <ColorPick value={color} onChange={setColor} options={AGENT_COLORS} />
      </Field>
      <Field label="Persona" hint="Voice & behaviour — prepended to the chat as context.">
        <Textarea
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          placeholder="e.g. Friendly editor that prefers vertical video…"
          className="min-h-16"
        />
      </Field>
      <Field label="Tool access" hint="Generalist agents can use every tool; curated agents only their skills' tools.">
        <label className="flex items-center gap-2.5 text-[13px] font-semibold text-muted-foreground">
          <Switch checked={allTools} onCheckedChange={setAllTools} />
          {allTools ? "Generalist — all tools" : "Curated — by skill"}
        </label>
      </Field>
      {!allTools ? (
        <Field label="Skills" hint="The agent owns these skills; its tools are their union.">
          <div className="flex flex-col gap-1.5">
            {store.skills.map((s) => {
              const on = skills.includes(s.id);
              return (
                <Button
                  key={s.id}
                  type="button"
                  variant="ghost"
                  onClick={() => toggleSkill(s.id)}
                  className={cn(
                    "flex h-auto w-full items-center justify-start gap-2.5 rounded-lg border px-2.5 py-2 text-left font-normal transition-colors",
                    on
                      ? "border-transparent bg-primary text-primary-foreground hover:bg-primary"
                      : "border-border bg-muted",
                  )}
                >
                  <GlyphTile glyph={s.glyph} color={s.color} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{s.name}</div>
                    <div className="truncate text-[11px] opacity-75">{s.tools.length} tools</div>
                  </div>
                  <span className={cn(on ? "opacity-100" : "opacity-30")}>✓</span>
                </Button>
              );
            })}
          </div>
        </Field>
      ) : null}
    </FormShell>
  );
}
