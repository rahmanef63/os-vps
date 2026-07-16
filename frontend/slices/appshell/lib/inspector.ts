"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

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
const appVersions = new Map<string, number>();
const listeners = new Set<Listener>();
let version = 0;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

function bump(appId: string) {
  appVersions.set(appId, (appVersions.get(appId) ?? 0) + 1);
}

export function publishInspector(appId: string, info: InspectorInfo): void {
  infos.set(appId, info);
  bump(appId);
  emit();
}

export function clearInspector(appId: string): void {
  if (infos.delete(appId)) {
    bump(appId);
    emit();
  }
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

// Read the inspector descriptor for a given app id, reactively. The snapshot is a
// PER-APP version, so a consumer only re-renders when THAT app republishes — not
// on every other app's publish. (A focused telemetry app used to re-render every
// inspector consumer in the shell on its 1.5s cadence via the global counter.)
export function useInspectorInfo(appId: string | null | undefined): InspectorInfo | undefined {
  const getSnapshot = useCallback(() => (appId ? appVersions.get(appId) ?? 0 : 0), [appId]);
  useSyncExternalStore(inspectorStore.subscribe, getSnapshot, getSnapshot);
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
