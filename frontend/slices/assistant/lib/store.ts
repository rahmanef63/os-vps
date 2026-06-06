"use client";

import { useCallback, useEffect, useState } from "react";
import type { Agent, Automation, Skill } from "./types";
import { PRESET_AGENTS, PRESET_AUTOMATIONS, PRESET_SKILLS } from "./presets";

// Client-only persistence. No Convex — agents/skills/automations live entirely
// in localStorage, like the mock's Create-App flows.
const KEYS = {
  skills: "alfa.skills",
  agents: "alfa.agents",
  autos: "alfa.automations",
  active: "alfa.activeAgent",
} as const;

const uid = () => Math.random().toString(36).slice(2, 9);

function load<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback.map((p) => ({ ...p }));
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as T[]) : null;
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    /* ignore corrupt storage */
  }
  return fallback.map((p) => ({ ...p }));
}

function loadActive(): string {
  if (typeof window === "undefined") return PRESET_AGENTS[0].id;
  return window.localStorage.getItem(KEYS.active) ?? PRESET_AGENTS[0].id;
}

export type AIStore = ReturnType<typeof useAIStore>;

export function useAIStore() {
  const [skills, setSkills] = useState<Skill[]>(() => load(KEYS.skills, PRESET_SKILLS));
  const [agents, setAgents] = useState<Agent[]>(() => load(KEYS.agents, PRESET_AGENTS));
  const [automations, setAutomations] = useState<Automation[]>(() =>
    load(KEYS.autos, PRESET_AUTOMATIONS),
  );
  const [activeAgentId, setActiveAgentId] = useState<string>(loadActive);

  useEffect(() => {
    window.localStorage.setItem(KEYS.skills, JSON.stringify(skills));
  }, [skills]);
  useEffect(() => {
    window.localStorage.setItem(KEYS.agents, JSON.stringify(agents));
  }, [agents]);
  useEffect(() => {
    window.localStorage.setItem(KEYS.autos, JSON.stringify(automations));
  }, [automations]);
  useEffect(() => {
    window.localStorage.setItem(KEYS.active, activeAgentId);
  }, [activeAgentId]);

  const addSkill = useCallback((s: Omit<Skill, "id">) => {
    const sk: Skill = { id: `sk_${uid()}`, builtin: false, ...s };
    setSkills((ls) => [...ls, sk]);
    return sk;
  }, []);
  const updateSkill = useCallback((id: string, patch: Partial<Skill>) => {
    setSkills((ls) => ls.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);
  const removeSkill = useCallback((id: string) => {
    setSkills((ls) => ls.filter((s) => s.id !== id));
    setAgents((as) =>
      as.map((a) => ({ ...a, skills: a.skills.filter((x) => x !== id) })),
    );
  }, []);

  const addAgent = useCallback((a: Omit<Agent, "id">) => {
    const ag: Agent = { id: `ag_${uid()}`, builtin: false, ...a };
    setAgents((as) => [...as, ag]);
    return ag;
  }, []);
  const updateAgent = useCallback((id: string, patch: Partial<Agent>) => {
    setAgents((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);
  const removeAgent = useCallback((id: string) => {
    setAgents((as) => {
      const next = as.filter((a) => a.id !== id);
      setActiveAgentId((cur) => (cur === id && next[0] ? next[0].id : cur));
      return next;
    });
  }, []);

  const addAutomation = useCallback(
    (a: Omit<Automation, "id">) => {
      const au: Automation = { id: `au_${uid()}`, builtin: false, ...a };
      setAutomations((ls) => [...ls, au]);
      return au;
    },
    [],
  );
  const updateAutomation = useCallback((id: string, patch: Partial<Automation>) => {
    setAutomations((ls) => ls.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);
  const removeAutomation = useCallback((id: string) => {
    setAutomations((ls) => ls.filter((a) => a.id !== id));
  }, []);

  const activeAgent = agents.find((a) => a.id === activeAgentId) ?? agents[0];

  return {
    skills,
    agents,
    automations,
    activeAgent,
    activeAgentId,
    setActiveAgentId,
    addSkill,
    updateSkill,
    removeSkill,
    addAgent,
    updateAgent,
    removeAgent,
    addAutomation,
    updateAutomation,
    removeAutomation,
  };
}
