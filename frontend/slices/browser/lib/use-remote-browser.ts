"use client";

// Drives the remote browser with MULTITAB: each UI tab maps to its own runtime
// consumer (`ui-<id>`) = its own page + screencast stream. The active tab's live
// frames come from the CDP screencast (parsed in JS); if the stream can't open,
// it falls back to fast adaptive JPEG polling so the view is never frozen.
import { useCallback, useEffect, useRef, useState } from "react";
import { useBrowserApi, type RemoteState } from "./host";
import { useOfflineTracker } from "./use-offline-tracker";
import { useScreencast } from "./use-screencast";

export const VIEW_W = 1280;
export const VIEW_H = 800;

export type Tab = { id: number; url: string; title: string };
export type { RemoteState } from "./host";

export function useRemoteBrowser() {
  const api = useBrowserApi();
  const [tabs, setTabs] = useState<Tab[]>([{ id: 1, url: "", title: "New Tab" }]);
  const [activeId, setActiveId] = useState(1);
  const [shot, setShot] = useState<string | null>(null);
  const [state, setState] = useState<RemoteState>({ url: "", title: "" });
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  // Failure-streak → offline gate + one-shot toast extracted to a sibling hook
  // so this file stays under the 200-line cap. See use-offline-tracker.ts.
  const { offline, offlineRef, markOk, markFail, reset: resetOffline } = useOfflineTracker();
  const urlRef = useRef<string | null>(null);
  const liveRef = useRef(false);
  const activityRef = useRef(0);
  const lastPollRef = useRef(0);
  const nextId = useRef(1);

  // Live set of consumer ids this hook owns — read by the unmount cleanup so it
  // can keepalive-close every remote page, not just the active one.
  const ownedRef = useRef<Set<string>>(new Set(["ui-1"]));

  const consumer = `ui-${activeId}`;
  const consumerRef = useRef(consumer);
  // eslint-disable-next-line react-hooks/refs -- latest-value ref: async stream/poll callbacks compare against the CURRENT consumer synchronously; an effect-based sync would lag a commit
  consumerRef.current = consumer;
  useEffect(() => { ownedRef.current = new Set(tabs.map((t) => `ui-${t.id}`)); }, [tabs]);

  const setFrame = useCallback((blob: Blob) => {
    const next = URL.createObjectURL(blob);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setShot(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const blob = await api.screenshot(consumerRef.current);
      if (blob) setFrame(blob);
      markOk();
    } catch {
      markFail(); // keep last frame; count toward offline
    }
  }, [api, setFrame, markOk, markFail]);

  const retry = useCallback(() => {
    resetOffline();
    void refresh();
  }, [refresh, resetOffline]);

  const mergeState = useCallback((s: RemoteState) => {
    setState(s);
    setTabs((ts) => ts.map((t) => (`ui-${t.id}` === consumerRef.current ? { ...t, url: s.url, title: s.title || t.title } : t)));
  }, []);

  const act = useCallback(
    async (path: string, body?: unknown) => {
      setBusy(true);
      activityRef.current = Date.now();
      try {
        const data = await api.act(path, body, consumerRef.current);
        if (typeof data.url === "string") mergeState({ url: data.url, title: data.title ?? data.url });
        if (!liveRef.current) await refresh();
        else markOk();
      } catch {
        markFail(); // service erroring; surface offline instead of a stale frame
      } finally {
        setBusy(false);
      }
    },
    [api, refresh, mergeState, markOk, markFail],
  );

  const navigate = useCallback((url: string) => act("navigate", { url }), [act]);
  const click = useCallback((x: number, y: number) => act("click", { x, y }), [act]);
  const type = useCallback((text: string) => act("type", { text }), [act]);
  const key = useCallback((k: string) => act("key", { key: k }), [act]);
  const scroll = useCallback((dy: number) => act("scroll", { dy }), [act]);
  const back = useCallback(() => act("back"), [act]);
  const forward = useCallback(() => act("forward"), [act]);
  const reload = useCallback(() => act("reload"), [act]);

  // --- tabs ---
  const newTab = useCallback(() => {
    const id = nextId.current + 1;
    nextId.current = Math.max(nextId.current, id);
    setTabs((ts) => [...ts, { id, url: "", title: "New Tab" }]);
    setShot(null);
    setState({ url: "", title: "" });
    setActiveId(id);
  }, []);
  const switchTab = useCallback((id: number) => {
    setShot(null);
    setActiveId(id);
  }, []);
  const closeTab = useCallback(
    (id: number) => {
      void api.close(`ui-${id}`);
      setTabs((ts) => {
        const rest = ts.filter((t) => t.id !== id);
        if (rest.length === 0) {
          const nid = nextId.current + 1;
          nextId.current = nid;
          setActiveId(nid);
          setShot(null);
          return [{ id: nid, url: "", title: "New Tab" }];
        }
        setActiveId((cur) => (cur === id ? rest[rest.length - 1].id : cur));
        return rest;
      });
    },
    [api],
  );

  // Live screencast for the ACTIVE tab; reconnects when the tab changes.
  useScreencast({ consumer, consumerRef, liveRef, setLive, setFrame });

  // Active tab state on switch + fast adaptive poll fallback (when not live).
  useEffect(() => {
    void (async () => {
      try {
        mergeState(await api.state(consumer));
      } catch {
        /* leave blank */
      }
    })();
    const beat = setInterval(() => {
      if (liveRef.current) return;
      // Service is offline — stop hammering the dead endpoint. The user's
      // Retry click clears `offline` (via the `retry` callback) and the next
      // tick resumes polling.
      if (offlineRef.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      const now = Date.now();
      const minGap = now - activityRef.current > 8000 ? 1000 : 320;
      if (now - lastPollRef.current < minGap) return;
      lastPollRef.current = now;
      void refresh();
    }, 320);
    return () => clearInterval(beat);
    // offlineRef is a stable ref object returned from useOfflineTracker — its
    // identity never changes, so omitting it from deps is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumer, api, refresh, mergeState]);

  // Unmount = window close: revoke the live object URL AND keepalive-close
  // every remote Chromium page this hook owns (the active tab's close from the
  // tab-X path isn't enough). keepalive lets the fetch survive page unload.
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      for (const id of ownedRef.current) void api.close(id, true);
    },
    [api],
  );

  return {
    shot, state, busy, live, offline, tabs, activeId,
    navigate, click, type, key, scroll, back, forward, reload, refresh, retry,
    newTab, switchTab, closeTab,
    agentLog: api.agentLog,
  };
}
