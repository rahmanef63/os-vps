"use client";

import { useEffect } from "react";
import { useSyncExternalStore } from "react";

// Per-app "AI Inspector" bus. Each app PUBLISHES a descriptor of its current
// state (props the user/AI can see) + actions (callable by a click or surfaced
// to Alfa) + a freeform `context` string fed to the scoped AI chat. Mirrors the
// mock-os pattern where apps register handlers an assistant can call — here it's
// a typed module store, keyed by appId, read by the shell Inspector panel.

export type InspectorProp = { label: string; value: string };
export type InspectorAction = {
  id: string;
  label: string;
  run: () => void | Promise<void>;
};
export type InspectorInfo = {
  /** Headline for the focused subject, e.g. a URL or open file name. */
  subject?: string;
  /** Read-only state rows shown in the Properties tab. */
  props?: InspectorProp[];
  /** Quick actions — clickable buttons, also listed to the AI as affordances. */
  actions?: InspectorAction[];
  /** Freeform context handed to the scoped AI chat. */
  context?: string;
  /** Prompt chips offered in the AI tab. */
  suggestions?: string[];
};

type Listener = () => void;

const infos = new Map<string, InspectorInfo>();
const listeners = new Set<Listener>();
let version = 0;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

export function publishInspector(appId: string, info: InspectorInfo): void {
  infos.set(appId, info);
  emit();
}

export function clearInspector(appId: string): void {
  if (infos.delete(appId)) emit();
}

export const inspectorStore = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  version: () => version,
  get: (appId: string | null | undefined): InspectorInfo | undefined =>
    appId ? infos.get(appId) : undefined,
};

// Read the inspector descriptor for a given app id, reactively.
export function useInspectorInfo(appId: string | null | undefined): InspectorInfo | undefined {
  useSyncExternalStore(inspectorStore.subscribe, inspectorStore.version, inspectorStore.version);
  return inspectorStore.get(appId);
}

// Apps call this to publish/refresh their descriptor. Re-runs when `deps`
// change; clears on unmount so a closed app leaves no stale inspector.
export function usePublishInspector(
  appId: string,
  info: InspectorInfo,
  deps: unknown[],
): void {
  useEffect(() => {
    publishInspector(appId, info);
    return () => clearInspector(appId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, ...deps]);
}
