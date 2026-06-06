"use client";

import { useCallback } from "react";
import {
  addMediaClip,
  duplicateClip,
  patchClip,
  removeClip,
  setRatio,
  splitAt,
} from "./composition";
import { interpretAi } from "./ai-edit";
import {
  type Clip,
  type Composition,
  type MediaRef,
  type Track,
  type TrackKind,
  defaultComposition,
  uid,
} from "./mock-timeline";
import { clearDraft } from "./draft";
import type { AiMessage } from "../components/ai-panel";

type Apply = (fn: (c: Composition) => Composition, commit?: boolean) => void;

// Composition-mutation actions wired to the history `apply`. Pure orchestration:
// every editor command (ratio/split/delete/duplicate/add media/track, patches,
// new project, selection, AI) lives here so the app component stays thin.
export function useReelActions(opts: {
  apply: Apply;
  sel: string | null;
  setSel: (id: string | null) => void;
  frameRef: React.RefObject<number>;
  mode: string;
  selected: Clip | null;
  setShowPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setAiLog: React.Dispatch<React.SetStateAction<AiMessage[]>>;
}) {
  const { apply, sel, setSel, frameRef, mode, selected, setShowPanel, setAiLog } = opts;

  const ratio = useCallback((w: number, h: number) => apply((c) => setRatio(c, w, h), true), [apply]);
  const split = useCallback(() => apply((c) => splitAt(c, frameRef.current, sel), true), [apply, sel, frameRef]);
  const del = useCallback(() => {
    if (!sel) return;
    apply((c) => removeClip(c, sel), true);
    setSel(null);
  }, [apply, sel, setSel]);
  const dup = useCallback(() => sel && apply((c) => duplicateClip(c, sel), true), [apply, sel]);
  const addMedia = useCallback(
    (m: MediaRef, name: string) => {
      let id = "";
      apply((c) => {
        const next = addMediaClip(c, m, name, frameRef.current);
        id = next.clips[next.clips.length - 1]?.id ?? "";
        return next;
      }, true);
      if (id) setSel(id);
    },
    [apply, frameRef, setSel],
  );

  const patchSel = (patch: Partial<Clip>) => sel && apply((c) => patchClip(c, sel, patch));
  const patchTrack = useCallback(
    (id: string, patch: Partial<Track>) =>
      apply((c) => ({ ...c, tracks: c.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }), true),
    [apply],
  );
  const newProject = useCallback(() => {
    clearDraft();
    apply(() => defaultComposition(), true);
    setSel(null);
  }, [apply, setSel]);
  // New visual tracks go on TOP (front layer); audio tracks stack at the bottom.
  const addTrack = (kind: TrackKind) =>
    apply((c) => {
      const n = c.tracks.filter((t) => t.kind === kind).length + 1;
      const name = `${kind === "audio" ? "Audio" : "Video"} ${n}`;
      const t = { id: uid("t"), name, kind };
      return { ...c, tracks: kind === "audio" ? [...c.tracks, t] : [t, ...c.tracks] };
    }, true);

  const select = (id: string | null) => {
    setSel(id);
    if (id && mode === "editor") setShowPanel(true);
  };

  const runAi = (text: string) => {
    const res = interpretAi(text, frameRef.current, selected);
    if (res.transform) apply(res.transform, true);
    setAiLog((l) => [...l, { role: "user", text }, { role: "ai", text: res.reply }]);
  };

  return { ratio, split, del, dup, addMedia, patchSel, patchTrack, newProject, addTrack, select, runAi };
}
