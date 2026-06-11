import { describe, expect, it } from "vitest";
import { getContextMenuItems, joinGroups, registerContextMenu, type MenuItem } from "./context-menu";

const ctx = (shell: "macos" | "android") =>
  ({ shell, surface: shell === "macos" ? "desktop" : "mobile", x: 10, y: 20 }) as const;

const item = (label: string): MenuItem => ({ label, onClick: () => {} });

describe("context-menu registry", () => {
  it("scopes providers to one shell or all shells", () => {
    const offAll = registerContextMenu("*", () => [item("everywhere")]);
    const offMac = registerContextMenu("macos", () => [item("mac only")]);
    const labels = (s: "macos" | "android") =>
      getContextMenuItems(ctx(s)).map((i) => (i.type === "sep" ? "—" : i.label));
    expect(labels("macos")).toEqual(["everywhere", "—", "mac only"]);
    expect(labels("android")).toEqual(["everywhere"]);
    offAll();
    offMac();
    expect(getContextMenuItems(ctx("macos"))).toEqual([]);
  });

  it("passes the open context (position + surface) to providers", () => {
    let seen: unknown;
    const off = registerContextMenu("android", (c) => {
      seen = c;
      return [item("x")];
    });
    getContextMenuItems(ctx("android"));
    expect(seen).toMatchObject({ shell: "android", surface: "mobile", x: 10, y: 20 });
    off();
  });

  it("skips empty provider results (no dangling separators)", () => {
    const offA = registerContextMenu("*", () => []);
    const offB = registerContextMenu("*", () => [item("only")]);
    expect(getContextMenuItems(ctx("macos"))).toHaveLength(1);
    offA();
    offB();
  });
});

describe("joinGroups", () => {
  it("separates non-empty groups and drops empty ones", () => {
    const out = joinGroups([[item("a")], [], [item("b"), item("c")]]);
    expect(out.map((i) => (i.type === "sep" ? "—" : i.label))).toEqual(["a", "—", "b", "c"]);
  });
  it("returns [] for all-empty input", () => {
    expect(joinGroups([[], []])).toEqual([]);
  });
});
