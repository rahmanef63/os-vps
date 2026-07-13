import { describe, expect, it } from "vitest";
import { getWidgetSize, getWidgetState, moveWidget, setWidgetsOn, setWidgetSize, toggleWidget } from "./widget-registry";

// Store logic only (no localStorage in the node env — the module degrades to
// in-memory state, which is exactly what these assertions exercise). Tests run
// in file order and leave the store back at its default at the end.
describe("widget-registry store", () => {
  it("SSR/no-storage fallback is off; system trio enabled (browser defaults on)", () => {
    const s = getWidgetState();
    expect(s.on).toBe(false); // node env has no localStorage → the SSR-safe fallback
    expect(s.enabled).toEqual(["cpu", "mem", "disk"]);
  });

  it("setWidgetsOn flips the master flag", () => {
    setWidgetsOn(true);
    expect(getWidgetState().on).toBe(true);
    setWidgetsOn(false);
    expect(getWidgetState().on).toBe(false);
  });

  it("toggleWidget adds then removes a widget", () => {
    toggleWidget("clock");
    expect(getWidgetState().enabled).toContain("clock");
    toggleWidget("clock");
    expect(getWidgetState().enabled).not.toContain("clock");
  });

  it("moveWidget reorders within bounds and no-ops at the edges", () => {
    moveWidget("mem", -1);
    expect(getWidgetState().enabled).toEqual(["mem", "cpu", "disk"]);
    moveWidget("mem", -1); // already first → no-op
    expect(getWidgetState().enabled).toEqual(["mem", "cpu", "disk"]);
    moveWidget("disk", 1); // already last → no-op
    expect(getWidgetState().enabled).toEqual(["mem", "cpu", "disk"]);
    moveWidget("cpu", 1);
    expect(getWidgetState().enabled).toEqual(["mem", "disk", "cpu"]);
    // restore default order for store hygiene
    moveWidget("cpu", -1);
    moveWidget("mem", 1);
    expect(getWidgetState().enabled).toEqual(["cpu", "mem", "disk"]);
  });

  it("moveWidget ignores unknown ids", () => {
    const before = [...getWidgetState().enabled];
    moveWidget("does-not-exist", 1);
    expect(getWidgetState().enabled).toEqual(before);
  });

  it("setWidgetSize defaults to m, persists, and no-ops on the same value", () => {
    expect(getWidgetSize("cpu")).toBe("m"); // default
    setWidgetSize("cpu", "l");
    expect(getWidgetSize("cpu")).toBe("l");
    expect(getWidgetState().sizes.cpu).toBe("l");
    const ref = getWidgetState();
    setWidgetSize("cpu", "l"); // unchanged → no commit, same state object
    expect(getWidgetState()).toBe(ref);
    setWidgetSize("cpu", "m"); // restore default for store hygiene
  });
});
