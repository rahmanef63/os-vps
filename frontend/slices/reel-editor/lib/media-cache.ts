// Shared media element cache for the video editor. Owns the <img>/<video>
// elements backing real clips so the preview canvas AND the offline renderer
// draw from the SAME decoded source. Video elements live in a hidden host so
// browsers actually decode them; seekTo() awaits a frame for deterministic
// render. No React — instantiated once per editor and disposed on unmount.
// Audio routing (gain/fade/duck + monitor/capture taps) lives in AudioGraph.

import type { Composition } from "./mock-timeline";
import { AudioGraph } from "./media-audio";
import { stepElement } from "./media-sync";

export { probeMedia } from "./media-probe";

export class MediaCache {
  private imgs = new Map<string, HTMLImageElement>();
  private vids = new Map<string, HTMLVideoElement>();
  private auds = new Map<string, HTMLAudioElement>();
  private host: HTMLDivElement | null = null;
  private subs = new Set<() => void>();
  private graph = new AudioGraph({
    loadAudio: (url) => this.loadAudio(url),
    loadVideo: (url) => this.loadVideo(url),
  });

  private getHost(): HTMLDivElement {
    if (this.host) return this.host;
    const d = document.createElement("div");
    d.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
    document.body.appendChild(d);
    this.host = d;
    return d;
  }

  /** Subscribe to "a tracked element decoded a new frame" — triggers a redraw. */
  onFrame(cb: () => void): () => void {
    this.subs.add(cb);
    return () => void this.subs.delete(cb);
  }
  private emit() {
    this.subs.forEach((s) => s());
  }

  image(url: string): HTMLImageElement | null {
    return this.imgs.get(url) ?? null;
  }
  video(url: string): HTMLVideoElement | null {
    return this.vids.get(url) ?? null;
  }
  audio(url: string): HTMLAudioElement | null {
    return this.auds.get(url) ?? null;
  }

  private loadImage(url: string): HTMLImageElement {
    const hit = this.imgs.get(url);
    if (hit) return hit;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => this.emit();
    img.src = url;
    this.imgs.set(url, img);
    return img;
  }

  private loadVideo(url: string): HTMLVideoElement {
    const hit = this.vids.get(url);
    if (hit) return hit;
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.addEventListener("loadeddata", () => this.emit());
    v.addEventListener("seeked", () => this.emit());
    v.src = url;
    this.getHost().appendChild(v);
    this.vids.set(url, v);
    return v;
  }

  private loadAudio(url: string): HTMLAudioElement {
    const hit = this.auds.get(url);
    if (hit) return hit;
    const a = document.createElement("audio");
    a.crossOrigin = "anonymous";
    a.muted = true; // silent in preview; unmuted only during export
    a.preload = "auto";
    a.addEventListener("loadeddata", () => this.emit());
    a.src = url;
    this.getHost().appendChild(a);
    this.auds.set(url, a);
    return a;
  }

  /** Make sure every media clip in the comp has its element created + loading. */
  ensure(comp: Composition) {
    for (const c of comp.clips) {
      const m = c.media;
      if (!m) continue;
      if (m.type === "image") this.loadImage(m.url);
      else if (m.type === "video") this.loadVideo(m.url);
      else this.loadAudio(m.url);
    }
  }

  /** Real-time playhead sync, used by BOTH preview and export. Videos play (for
   *  the visual) whenever `playing`; audio-only clips play only when `sound` is
   *  on. Inactive elements pause; while paused, video scrub-seeks to the frame.
   *  When `sound`, the audio graph is (idempotently) prepared so playing
   *  elements are audible via the monitor/capture taps. */
  syncPlayback(comp: Composition, frame: number, playing: boolean, sound: boolean) {
    if (sound && playing) this.graph.prepareSound(comp);
    for (const c of comp.clips) {
      const m = c.media;
      if (!m || (m.type !== "video" && m.type !== "audio")) continue;
      const isVideo = m.type === "video";
      const el = isVideo ? this.vids.get(m.url) : this.auds.get(m.url);
      if (!el) continue;
      const active = frame >= c.start && frame < c.start + c.len;
      // Per-clip volume/fade envelope; reversed clips are silent (browsers can't
      // play audio backwards without a decode-reverse). Auto-duck under other
      // audio. Smoothed via setTargetAtTime so duck/fade changes never click.
      this.graph.applyEnvelope(comp, c, frame, active, !!c.reverse);
      stepElement(el, c, frame, comp.fps, playing, sound, isVideo);
    }
  }

  /** Monitor (speaker) volume — 0 mutes preview without touching the capture tap. */
  setMonitor(on: boolean) {
    this.graph.setMonitor(on);
  }

  /** Wire the mix and return the recorder audio track(s). [] when comp has no audio. */
  beginAudioExport(comp: Composition): MediaStreamTrack[] {
    return this.graph.beginExport(comp);
  }

  /** Stop playback after an export (preview re-syncs on the next frame). */
  endAudioExport() {
    this.pauseAll();
  }

  /** Deterministic seek for the offline renderer — resolves once the frame at
   *  `t` seconds is decoded (or a short timeout, to never hang a render). */
  seekTo(v: HTMLVideoElement, t: number): Promise<void> {
    return new Promise((resolve) => {
      if (Math.abs(v.currentTime - t) < 0.001) return resolve();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        v.removeEventListener("seeked", finish);
        resolve();
      };
      v.addEventListener("seeked", finish);
      setTimeout(finish, 220);
      v.currentTime = t;
    });
  }

  /** Pause every media element (videos + audio). */
  pauseAll() {
    this.vids.forEach((v) => !v.paused && v.pause());
    this.auds.forEach((a) => !a.paused && a.pause());
  }

  dispose() {
    const stop = (el: HTMLMediaElement) => {
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
    this.vids.forEach(stop);
    this.auds.forEach(stop);
    this.graph.dispose();
    this.vids.clear();
    this.auds.clear();
    this.imgs.clear();
    this.subs.clear();
    this.host?.remove();
    this.host = null;
  }
}
