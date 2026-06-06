"use client";

// Real waveform peaks for audio clips. Decodes a source ONCE, reduces it to a
// tiny normalized peak array (BUCKETS bytes), then drops the AudioBuffer so only
// the summary survives — RAM stays flat no matter how long the track is. A
// stride scan bounds CPU on long files. One shared decode context, module-cached.

import { useEffect, useState } from "react";

const BUCKETS = 160;
const peaks = new Map<string, Uint8Array>();
const pending = new Map<string, Promise<Uint8Array | null>>();
let ctx: AudioContext | null = null;

function decodeCtx(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

export function computePeaks(url: string): Promise<Uint8Array | null> {
  const hit = peaks.get(url);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(url);
  if (inflight) return inflight;
  const job = (async () => {
    try {
      const buf = await fetch(url).then((r) => r.arrayBuffer());
      const audio = await decodeCtx().decodeAudioData(buf);
      const ch = audio.getChannelData(0);
      const n = ch.length;
      const block = Math.max(1, Math.floor(n / BUCKETS));
      const out = new Uint8Array(BUCKETS);
      for (let b = 0; b < BUCKETS; b++) {
        const start = b * block;
        const end = Math.min(n, start + block);
        const stride = Math.max(1, Math.floor((end - start) / 512));
        let peak = 0;
        for (let i = start; i < end; i += stride) {
          const a = Math.abs(ch[i]);
          if (a > peak) peak = a;
        }
        out[b] = Math.min(255, Math.round(peak * 255));
      }
      peaks.set(url, out); // `audio` AudioBuffer now unreferenced → GC'd
      return out;
    } catch {
      return null;
    } finally {
      pending.delete(url);
    }
  })();
  pending.set(url, job);
  return job;
}

/** Peaks for a clip's audio url, computed lazily; null while loading / on error. */
export function useWaveform(url: string | undefined): Uint8Array | null {
  const [pk, setPk] = useState<Uint8Array | null>(() => (url ? peaks.get(url) ?? null : null));
  useEffect(() => {
    if (!url) return void setPk(null);
    const cached = peaks.get(url);
    if (cached) return void setPk(cached);
    let alive = true;
    void computePeaks(url).then((p) => alive && setPk(p));
    return () => void (alive = false);
  }, [url]);
  return pk;
}
