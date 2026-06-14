"use client";

import { useEffect, useRef } from "react";
import { shellStore } from "./store";

// Per-window scoped hotkey API. Apps register keys via this hook so a key only
// fires when THEIR window is the focused one — fixes the bug where ⌘S in
// code-editor fired while the user worked in another window, and where the
// image-editor's Backspace deleted a layer while typing into a different app.
//
// The listener attaches at `window` (so canvas/Konva keystrokes that never
// focus a DOM node are still caught), but every keydown is gated on the
// shell-store's focused-window id. The `inEditable` opt-out keeps chord keys
// (⌘I=italic, ⌘+Arrow=word-select, Backspace=delete-char) from being stolen by
// the app while the user types into an input/textarea/contenteditable.

export type HotkeyDef =
  | string
  | {
      key: string;
      meta?: boolean;
      ctrl?: boolean;
      shift?: boolean;
      alt?: boolean;
    };

export type HotkeyOptions = {
  /** Fire even when focus is in an input/textarea/contenteditable. Default false. */
  allowInEditable?: boolean;
  /** Call `e.preventDefault()` when the hotkey matches. Default true. */
  preventDefault?: boolean;
  /** Listen in capture phase. Default false. */
  capture?: boolean;
};

/** True when the target element is a text field — chord hotkeys that collide
 *  with editor bindings must stand down there. Accepts a raw element OR an
 *  EventTarget (use the keydown event's `target`). Falls back to
 *  `document.activeElement` when called with no arg so non-event callers (e.g.
 *  the legacy quick-look Space check) get the same answer. */
export function inEditable(target?: EventTarget | null): boolean {
  const el =
    target === undefined
      ? typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null
      : (target as HTMLElement | null);
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || !!el.isContentEditable;
}

/** Pure matcher — exported for tests + reuse by the help cheatsheet. */
export function matchesHotkey(
  def: HotkeyDef,
  e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">,
): boolean {
  const spec: Exclude<HotkeyDef, string> =
    typeof def === "string" ? { key: def } : def;
  if (e.key.toLowerCase() !== spec.key.toLowerCase()) return false;
  // When a modifier flag is omitted it must be FALSE — so a plain "s" def never
  // matches ⌘S. Explicit `false` works the same way.
  if (!!spec.meta !== e.metaKey) return false;
  if (!!spec.ctrl !== e.ctrlKey) return false;
  if (!!spec.shift !== e.shiftKey) return false;
  if (!!spec.alt !== e.altKey) return false;
  return true;
}

/** Builds the bare keydown listener — exposed so tests can drive it without a
 *  React renderer. The hook is a thin wrapper that wires this to React's
 *  effect lifecycle + ref-stable handler/def. */
export function createFocusedHotkeyListener(opts: {
  winId: string;
  getFocused: () => string | null;
  getDefs: () => HotkeyDef[];
  getHandler: () => (e: KeyboardEvent) => void;
  allowInEditable: boolean;
  preventDefault: boolean;
}): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (opts.getFocused() !== opts.winId) return;
    if (!opts.allowInEditable && inEditable(e.target)) return;
    for (const d of opts.getDefs()) {
      if (matchesHotkey(d, e)) {
        if (opts.preventDefault) e.preventDefault();
        opts.getHandler()(e);
        return;
      }
    }
  };
}

/** Fires `handler` ONLY when:
 *  1. the shell-store's focused window id === `winId`, AND
 *  2. unless `allowInEditable: true`, the event target is not an editable
 *     surface (input / textarea / contenteditable).
 *
 *  `def` may be a single def or an array; the handler fires once for the first
 *  match. `preventDefault` defaults to true (apps almost always want to
 *  swallow the browser's default — ⌘S, Space, ←/→, etc.). */
export function useFocusedHotkey(
  winId: string | undefined,
  def: HotkeyDef | HotkeyDef[],
  handler: (e: KeyboardEvent) => void,
  options?: HotkeyOptions,
): void {
  const allowInEditable = options?.allowInEditable ?? false;
  const preventDefault = options?.preventDefault ?? true;
  const capture = options?.capture ?? false;

  // Refs let the once-registered listener always see the latest `handler` +
  // `def` without re-binding on every render (callers don't need to memoize).
  const handlerRef = useRef(handler);
  const defRef = useRef(def);
  useEffect(() => {
    handlerRef.current = handler;
    defRef.current = def;
  });

  useEffect(() => {
    if (!winId) return;
    return attachFocusedHotkey({
      winId,
      getFocused: () => shellStore.getFocused(),
      getDefs: () =>
        Array.isArray(defRef.current) ? defRef.current : [defRef.current],
      getHandler: () => handlerRef.current,
      allowInEditable,
      preventDefault,
      capture,
    });
  }, [winId, allowInEditable, preventDefault, capture]);
}

/** Wires `createFocusedHotkeyListener` to `window` and returns a cleanup that
 *  removes the listener. Exported for tests (drive add/remove directly) and
 *  reuse by non-React contexts. */
export function attachFocusedHotkey(opts: {
  winId: string;
  getFocused: () => string | null;
  getDefs: () => HotkeyDef[];
  getHandler: () => (e: KeyboardEvent) => void;
  allowInEditable: boolean;
  preventDefault: boolean;
  capture?: boolean;
}): () => void {
  if (typeof window === "undefined") return () => {};
  const onKey = createFocusedHotkeyListener({
    winId: opts.winId,
    getFocused: opts.getFocused,
    getDefs: opts.getDefs,
    getHandler: opts.getHandler,
    allowInEditable: opts.allowInEditable,
    preventDefault: opts.preventDefault,
  });
  const capture = opts.capture ?? false;
  window.addEventListener("keydown", onKey, capture);
  return () => window.removeEventListener("keydown", onKey, capture);
}
