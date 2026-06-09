"use client";

// Live CDP screencast consumer: parses the multipart-JPEG stream in JS and
// hands each frame to `setFrame` while the owning tab is still active. On any
// stream failure it flips `live` off (callers fall back to polling) and
// retries; reconnects whenever the active consumer changes.
import { useEffect } from "react";
import { streamUrl } from "./host";

function headerEnd(b: Uint8Array, from: number): number {
  for (let i = from; i + 3 < b.length; i++)
    if (b[i] === 13 && b[i + 1] === 10 && b[i + 2] === 13 && b[i + 3] === 10) return i;
  return -1;
}

export function useScreencast(opts: {
  consumer: string;
  consumerRef: { current: string };
  liveRef: { current: boolean };
  setLive: (live: boolean) => void;
  setFrame: (blob: Blob) => void;
}) {
  const { consumer, consumerRef, liveRef, setLive, setFrame } = opts;

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
  }, [consumer, consumerRef, liveRef, setLive, setFrame]);
}
