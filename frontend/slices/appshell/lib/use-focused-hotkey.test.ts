import { describe, expect, it, vi } from "vitest";
import {
  attachFocusedHotkey,
  createFocusedHotkeyListener,
  inEditable,
  matchesHotkey,
  type HotkeyDef,
} from "./use-focused-hotkey";

// Minimal fake KeyboardEvent — `target` carries a {tagName, isContentEditable}
// shape so inEditable() can read it without a DOM. preventDefault() is a spy
// so the "preventDefault default" assertion can verify the call.
type FakeEl = { tagName: string; isContentEditable?: boolean };
function ev(
  key: string,
  mods: Partial<{ meta: boolean; ctrl: boolean; shift: boolean; alt: boolean }> = {},
  target: FakeEl | null = { tagName: "DIV" },
): KeyboardEvent {
  return {
    key,
    metaKey: !!mods.meta,
    ctrlKey: !!mods.ctrl,
    shiftKey: !!mods.shift,
    altKey: !!mods.alt,
    target,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

describe("matchesHotkey", () => {
  it("matches a plain key def with no modifiers", () => {
    expect(matchesHotkey("s", ev("s"))).toBe(true);
    expect(matchesHotkey("s", ev("S"))).toBe(true); // case-insensitive
  });
  it("requires omitted modifiers to be FALSE on the event", () => {
    // The classic ⌘S vs S bug: a plain "s" def must NOT match ⌘S.
    expect(matchesHotkey("s", ev("s", { meta: true }))).toBe(false);
  });
  it("matches a chord def", () => {
    const def: HotkeyDef = { key: "s", meta: true };
    expect(matchesHotkey(def, ev("s", { meta: true }))).toBe(true);
    expect(matchesHotkey(def, ev("s"))).toBe(false);
    expect(matchesHotkey(def, ev("s", { meta: true, shift: true }))).toBe(false);
  });
});

describe("inEditable", () => {
  it("flags input/textarea/contenteditable; passes through other tags", () => {
    expect(inEditable({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(inEditable({ tagName: "TEXTAREA" } as unknown as EventTarget)).toBe(true);
    expect(
      inEditable({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget),
    ).toBe(true);
    expect(inEditable({ tagName: "DIV" } as unknown as EventTarget)).toBe(false);
    expect(inEditable(null)).toBe(false);
  });
});

// Drive the bare listener (without a React renderer) — same logic that the
// hook attaches to window.
function makeListener(args: {
  winId: string;
  focused: string | null;
  defs: HotkeyDef[];
  handler: (e: KeyboardEvent) => void;
  allowInEditable?: boolean;
  preventDefault?: boolean;
}) {
  return createFocusedHotkeyListener({
    winId: args.winId,
    getFocused: () => args.focused,
    getDefs: () => args.defs,
    getHandler: () => args.handler,
    allowInEditable: args.allowInEditable ?? false,
    preventDefault: args.preventDefault ?? true,
  });
}

describe("useFocusedHotkey listener", () => {
  it("fires only when the bound winId is the focused window", () => {
    const handler = vi.fn();
    const listener = makeListener({ winId: "w1", focused: "w1", defs: ["s"], handler });
    listener(ev("s"));
    expect(handler).toHaveBeenCalledTimes(1);

    const otherFocus = makeListener({ winId: "w1", focused: "w2", defs: ["s"], handler });
    otherFocus(ev("s"));
    expect(handler).toHaveBeenCalledTimes(1); // unchanged — another window had focus

    const nothingFocused = makeListener({ winId: "w1", focused: null, defs: ["s"], handler });
    nothingFocused(ev("s"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("skips while focus is in an editable surface (default)", () => {
    const handler = vi.fn();
    const listener = makeListener({ winId: "w1", focused: "w1", defs: ["Backspace"], handler });
    listener(ev("Backspace", {}, { tagName: "INPUT" }));
    listener(ev("Backspace", {}, { tagName: "TEXTAREA" }));
    listener(ev("Backspace", {}, { tagName: "DIV", isContentEditable: true }));
    expect(handler).not.toHaveBeenCalled();

    listener(ev("Backspace", {}, { tagName: "DIV" }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("allowInEditable bypasses the editable guard (⌘S in code-editor)", () => {
    const handler = vi.fn();
    const listener = makeListener({
      winId: "w1",
      focused: "w1",
      defs: [{ key: "s", meta: true }],
      handler,
      allowInEditable: true,
    });
    listener(ev("s", { meta: true }, { tagName: "TEXTAREA" }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("calls preventDefault by default on a match; honours opt-out", () => {
    const e1 = ev("s");
    const listener1 = makeListener({
      winId: "w1",
      focused: "w1",
      defs: ["s"],
      handler: vi.fn(),
    });
    listener1(e1);
    expect(e1.preventDefault).toHaveBeenCalled();

    const e2 = ev("s");
    const listener2 = makeListener({
      winId: "w1",
      focused: "w1",
      defs: ["s"],
      handler: vi.fn(),
      preventDefault: false,
    });
    listener2(e2);
    expect(e2.preventDefault).not.toHaveBeenCalled();
  });

  it("attach + cleanup add/remove the same listener on window", () => {
    // The hook just wires `attachFocusedHotkey` to the React lifecycle, so the
    // attach/cleanup pair carries the cleanup-on-unmount contract.
    const add = vi.fn();
    const remove = vi.fn();
    const originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window: unknown }).window = {
      addEventListener: add,
      removeEventListener: remove,
    };
    try {
      const cleanup = attachFocusedHotkey({
        winId: "w1",
        getFocused: () => "w1",
        getDefs: () => ["s"],
        getHandler: () => vi.fn(),
        allowInEditable: false,
        preventDefault: true,
      });
      expect(add).toHaveBeenCalledTimes(1);
      expect(add.mock.calls[0][0]).toBe("keydown");
      const registered = add.mock.calls[0][1];
      cleanup();
      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove.mock.calls[0][0]).toBe("keydown");
      expect(remove.mock.calls[0][1]).toBe(registered);
    } finally {
      if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
      else (globalThis as { window: unknown }).window = originalWindow;
    }
  });

  it("fires the first matching def in an array; stops scanning after", () => {
    const handler = vi.fn();
    const listener = makeListener({
      winId: "w1",
      focused: "w1",
      defs: [
        { key: "z", meta: true, shift: true },
        { key: "z", meta: true },
      ],
      handler,
    });
    listener(ev("z", { meta: true, shift: true }));
    listener(ev("z", { meta: true }));
    expect(handler).toHaveBeenCalledTimes(2);
    listener(ev("z")); // no modifier → no match
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
