"use client";

// Drives the shared remote-browser page behind the BrowserAdapter seam
// (lib/host.ts). The live frame comes from the CDP screencast MJPEG stream,
// parsed in JS (reliable across browsers, unlike a raw MJPEG <img>) and fed to
// one objectURL the viewer renders. If the stream can't open, it falls back to
// JPEG screenshot polling so the view is never frozen.
import { useCallback, useEffect, useRef, useState } from "react";
import { useBrowserApi, type RemoteState } from "./host";

/** Remote viewport dimensions — click coords are mapped into this space. */
export const VIEW_W = 1280;
export const VIEW_H = 800;

const POLL_EVERY = 1000;
const POLL_FOR = 5000;

export type { RemoteState } from "./host";

// Find the first index of `\r\n\r\n` (header/body separator) at or after `from`.
function headerEnd(b: Uint8Array, from: number): number {
  for (let i = from; i + 3 < b.length; i++)
    if (b[i] === 13 && b[i + 1] === 10 && b[i + 2] === 13 && b[i + 3] === 10) return i;
  return -1;
}

export function useRemoteBrowser() {
  const api = useBrowserApi();
  const [shot, setShot] = useState<string | null>(null);
  const [state, setState] = useState<RemoteState>({ url: "", title: "" });
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const urlRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveRef = useRef(false);

  // Swap the rendered frame, revoking the previous objectURL.
  const setFrame = useCallback((blob: Blob) => {
    const next = URL.createObjectURL(blob);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setShot(next);
  }, []);

  // Poll one JPEG frame (fallback path + post-action snappiness).
  const refresh = useCallback(async () => {
    try {
      const blob = await api.screenshot();
      if (blob) setFrame(blob);
    } catch {
      /* transient — keep last frame */
    }
  }, [api, setFrame]);

  const refreshSettling = useCallback(() => {
    if (liveRef.current) return; // stream already shows changes live
    void refresh();
    if (pollRef.current) clearInterval(pollRef.current);
    const started = Date.now();
    pollRef.current = setInterval(() => {
      if (Date.now() - started > POLL_FOR || liveRef.current) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        return;
      }
      void refresh();
    }, POLL_EVERY);
  }, [refresh]);

  const act = useCallback(
    async (path: string, body?: unknown, settle = true) => {
      setBusy(true);
      try {
        const data = await api.act(path, body);
        if (typeof data.url === "string")
          setState({ url: data.url, title: data.title ?? data.url });
        if (settle) refreshSettling();
        else if (!liveRef.current) await refresh();
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

  // Live screencast: read the multipart stream, emit each JPEG part as a frame.
  // Retries on drop; flips `live` off so polling covers any gap.
  useEffect(() => {
    let stopped = false;
    let ctrl: AbortController | null = null;

    const consume = async () => {
      ctrl = new AbortController();
      const res = await fetch("/api/v1/browser/screencast", { signal: ctrl.signal });
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
      liveRef.current = true;
      setLive(true);
      const reader = res.body.getReader();
      let buf = new Uint8Array(0);
      for (;;) {
        const { done, value } = await reader.read();
        if (done || stopped) break;
        const merged = new Uint8Array(buf.length + value.length);
        merged.set(buf);
        merged.set(value, buf.length);
        buf = merged;
        // Drain every complete part currently in the buffer.
        for (;;) {
          const he = headerEnd(buf, 0);
          if (he < 0) break;
          const header = new TextDecoder().decode(buf.subarray(0, he));
          const m = header.match(/content-length:\s*(\d+)/i);
          if (!m) {
            buf = buf.subarray(he + 4); // malformed header — skip it
            continue;
          }
          const len = Number(m[1]);
          const bodyStart = he + 4;
          if (buf.length < bodyStart + len) break; // wait for more bytes
          setFrame(new Blob([buf.subarray(bodyStart, bodyStart + len)], { type: "image/jpeg" }));
          buf = buf.subarray(bodyStart + len + 2); // skip JPEG + trailing CRLF
        }
      }
    };

    const loop = async () => {
      while (!stopped) {
        try {
          await consume();
        } catch {
          /* fall through to poll + retry */
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
  }, [setFrame]);

  // Initial state + a heartbeat that polls ONLY while the stream is down, so the
  // fallback view stays fresh and an idle/hidden tab costs nothing.
  useEffect(() => {
    void (async () => {
      try {
        setState(await api.state());
      } catch {
        /* offline — leave blank */
      }
    })();
    const beat = setInterval(() => {
      if (liveRef.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      void refresh();
    }, 1500);
    return () => clearInterval(beat);
  }, [api, refresh]);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return { shot, state, busy, live, navigate, click, type, key, scroll, back, forward, reload, refresh };
}
