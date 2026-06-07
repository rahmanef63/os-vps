import { describe, expect, it, vi } from "vitest";
import { appAccepts, deliverDrop, registerDropHandler } from "./dnd";

describe("cross-app dnd", () => {
  it("routes payloads to the first accepting handler, newest first", () => {
    const oldH = vi.fn();
    const newH = vi.fn();
    const offOld = registerDropHandler("files", { accepts: (d) => d.kind === "path", onDrop: oldH });
    const offNew = registerDropHandler("files", { accepts: (d) => d.kind === "path", onDrop: newH });

    expect(appAccepts("files", { kind: "path" })).toBe(true);
    expect(deliverDrop("files", { kind: "path", path: "~" })).toBe(true);
    expect(newH).toHaveBeenCalledOnce();
    expect(oldH).not.toHaveBeenCalled();

    offNew();
    deliverDrop("files", { kind: "path" });
    expect(oldH).toHaveBeenCalledOnce();
    offOld();
  });

  it("returns false when nothing claims the payload (throw-safe)", () => {
    const off = registerDropHandler("docs", {
      accepts: () => {
        throw new Error("boom");
      },
      onDrop: () => {},
    });
    expect(appAccepts("docs", { kind: "x" })).toBe(false);
    expect(deliverDrop("docs", { kind: "x" })).toBe(false);
    expect(deliverDrop("unknown-app", { kind: "x" })).toBe(false);
    off();
  });
});
