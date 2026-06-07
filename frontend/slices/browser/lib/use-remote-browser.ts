"use client";

// Drives the remote browser with MULTITAB: each UI tab maps to its own runtime
// consumer (`ui-<id>`) = its own page + screencast stream. The active tab's live
// frames come from the CDP screencast (parsed in JS); if the stream can't open,
// it falls back to fast adaptive JPEG polling so the view is never frozen.
import { useCallback, useEffect, useRef, useState } from "react";
import { useBrowserApi, streamUrl, type RemoteState } from "./host";

export const VIEW_W = 1280;
export const VIEW_H = 800;

export type Tab = { id: number; url: string; title: string };
export type { RemoteState } from "./host";

function headerEnd(b: Uint8Array, from: number): number {
  for (let i = from; i + 3 < b.length; i++)
    if (b[i] === 13 && b[i + 1] === 10 && b[i + 2] === 13 && b[i + 3] === 10) return i;
  return -1;
}

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
  useEffect(() => {
    let stopped = false;
    let ctrl: AbortController | null = null;
    const consume = async () => {
      ctrl = new AbortController();
      const res = await fetch(streamUrl(consumer), { signal: ctrl.signal });
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
      liveRef.current = true;
      setLive(true);
      const reader = res.body.getReader();
      let buf = new Uint8Array(0);
      for (;;) {
        const { done, value } = await reader.read();
        if (done || stopped) break;
        const m = new Uint8Array(buf.length + value.length);
        m.set(buf);
        m.set(value, buf.length);
        buf = m;
        for (;;) {
          const he = headerEnd(buf, 0);
          if (he < 0) break;
          const head = new TextDecoder().decode(buf.subarray(0, he));
          const cl = head.match(/content-length:\s*(\d+)/i);
          if (!cl) {
            buf = buf.subarray(he + 4);
            continue;
          }
          const len = Number(cl[1]);
          const start = he + 4;
          if (buf.length < start + len) break;
          if (consumerRef.current === consumer)
            setFrame(new Blob([buf.subarray(start, start + len)], { type: "image/jpeg" }));
          buf = buf.subarray(start + len + 2);
        }
      }
    };
    const loop = async () => {
      while (!stopped) {
        try {
          await consume();
        } catch {
          /* fall to poll + retry */
        }
        liveRef.current = false;
        setLive(false);
        if (stopped) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    void loop();
    return () => {
      stopped = true;
      ctrl?.abort();
    };
  }, [consumer, setFrame]);

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
