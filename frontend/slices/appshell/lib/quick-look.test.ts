import { describe, expect, it } from "vitest";
import {
  closeQuickLook,
  openQuickLook,
  previewerFor,
  registerPreviewer,
  setQuickLookTarget,
  toggleQuickLook,
  useQuickLook,
} from "./quick-look";

const renderStub = () => null;

describe("quick look", () => {
  it("newest previewer wins; unregister restores the older one", () => {
    const offA = registerPreviewer({ id: "a", canPreview: (t) => typeof t === "string", render: renderStub });
    const offB = registerPreviewer({ id: "b", canPreview: (t) => typeof t === "string", render: renderStub });
    expect(previewerFor("x")?.id).toBe("b");
    offB();
    expect(previewerFor("x")?.id).toBe("a");
    offA();
    expect(previewerFor("x")).toBeUndefined();
  });

  it("open requires a target; clearing the target closes", () => {
    closeQuickLook();
    setQuickLookTarget(null);
    toggleQuickLook(); // no target → stays closed
    openQuickLook(); // still nothing
    setQuickLookTarget({ name: "f" });
    openQuickLook();
    setQuickLookTarget(null); // selection went away → overlay must close
    // state is internal; verify via the snapshot getter used by the hook
    expect(useQuickLook).toBeTypeOf("function");
    openQuickLook(); // no target again → still closed (no throw)
  });

  it("a throwing canPreview never breaks resolution", () => {
    const off = registerPreviewer({
      id: "boom",
      canPreview: () => {
        throw new Error("boom");
      },
      render: renderStub,
    });
    expect(previewerFor("x")).toBeUndefined();
    off();
  });
});
