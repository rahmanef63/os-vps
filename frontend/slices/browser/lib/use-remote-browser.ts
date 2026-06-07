"use client";

// Drives the single shared remote-browser page behind the BrowserAdapter
// seam (lib/host.ts). Every action runs through the adapter, then refreshes
// the screenshot; a short poll covers pages still settling after
// navigate/click. Exposes one objectURL (revoked on replace) for an <img>
// to render the 1280x800 viewport.
import { useCallback, useEffect, useRef, useState } from "react";
import { useBrowserApi, type RemoteState } from "./host";

/** Remote viewport dimensions — click coords are mapped into this space. */
export const VIEW_W = 1280;
export const VIEW_H = 800;

const POLL_EVERY = 1200;
const POLL_FOR = 6000;

export type { RemoteState } from "./host";

export function useRemoteBrowser() {
  const api = useBrowserApi();
  const [shot, setShot] = useState<string | null>(null);
  const [state, setState] = useState<RemoteState>({ url: "", title: "" });
  const [busy, setBusy] = useState(false);
  const urlRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch the PNG → blob → objectURL, revoking the previous one.
  const refresh = useCallback(async () => {
    try {
      const blob = await api.screenshot();
      if (!blob) return;
      const next = URL.createObjectURL(blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = next;
      setShot(next);
    } catch {
      /* transient — keep last frame */
    }
  }, [api]);

  // Refresh once, then poll for ~POLL_FOR while the page settles.
  const refreshSettling = useCallback(() => {
    void refresh();
    if (pollRef.current) clearInterval(pollRef.current);
    const started = Date.now();
    pollRef.current = setInterval(() => {
      if (Date.now() - started > POLL_FOR) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        return;
      }
      void refresh();
    }, POLL_EVERY);
  }, [refresh]);

  // POST an action, fold any {url,title} into state, then refresh + settle.
  const act = useCallback(
    async (path: string, body?: unknown, settle = true) => {
      setBusy(true);
      try {
        const data = await api.act(path, body);
        if (typeof data.url === "string")
          setState({ url: data.url, title: data.title ?? data.url });
        if (settle) refreshSettling();
        else await refresh();
      } catch {
        /* surfaced as a stale frame; user can retry */
      } finally {
        setBusy(false);
      }
    },
    [api, refresh, refreshSettling],
  );

  const navigate = useCallback((url: string) => act("navigate", { url }), [act]);
  const click = useCallback((x: number, y: number) => act("click", { x, y }), [act]);
  const type = useCallback((text: string) => act("type", { text }, false), [act]);
  const key = useCallback((k: string) => act("key", { key: k }), [act]);
  const scroll = useCallback((dy: number) => act("scroll", { dy }, false), [act]);
  const back = useCallback(() => act("back"), [act]);
  const forward = useCallback(() => act("forward"), [act]);
  const reload = useCallback(() => act("reload"), [act]);

  // Pull initial state + first frame on mount.
  // Pull initial state + first frame on mount, then keep a slow heartbeat so the
  // view stays live instead of freezing after the post-action settle burst ends.
  // Paused while the tab is hidden so an idle window costs nothing.
  useEffect(() => {
    void (async () => {
      try {
        setState(await api.state());
      } catch {
        /* offline — leave blank */
      }
      void refresh();
    })();
    const beat = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void refresh();
    }, 2000);
    return () => clearInterval(beat);
  }, [api, refresh]);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return { shot, state, busy, navigate, click, type, key, scroll, back, forward, reload, refresh };
}
