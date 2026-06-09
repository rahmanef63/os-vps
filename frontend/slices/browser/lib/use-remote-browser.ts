"use client";

// Drives the remote browser with MULTITAB: each UI tab maps to its own runtime
// consumer (`ui-<id>`) = its own page + screencast stream. The active tab's live
// frames come from the CDP screencast (parsed in JS); if the stream can't open,
// it falls back to fast adaptive JPEG polling so the view is never frozen.
import { useCallback, useEffect, useRef, useState } from "react";
import { useBrowserApi, type RemoteState } from "./host";
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
  const urlRef = useRef<string | null>(null);
  const liveRef = useRef(false);
  const activityRef = useRef(0);
  const lastPollRef = useRef(0);
  const nextId = useRef(1);

  const consumer = `ui-${activeId}`;
  const consumerRef = useRef(consumer);
  // eslint-disable-next-line react-hooks/refs -- latest-value ref: async stream/poll callbacks compare against the CURRENT consumer synchronously; an effect-based sync would lag a commit
  consumerRef.current = consumer;

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
    } catch {
      /* keep last frame */
    }
  }, [api, setFrame]);

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
      } catch {
        /* stale frame; retry */
      } finally {
        setBusy(false);
      }
    },
    [api, refresh, mergeState],
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
      if (typeof document !== "undefined" && document.hidden) return;
      const now = Date.now();
      const minGap = now - activityRef.current > 8000 ? 1000 : 320;
      if (now - lastPollRef.current < minGap) return;
      lastPollRef.current = now;
      void refresh();
    }, 320);
    return () => clearInterval(beat);
  }, [consumer, api, refresh, mergeState]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return {
    shot, state, busy, live, tabs, activeId,
    navigate, click, type, key, scroll, back, forward, reload, refresh,
    newTab, switchTab, closeTab,
    agentLog: api.agentLog,
  };
}
