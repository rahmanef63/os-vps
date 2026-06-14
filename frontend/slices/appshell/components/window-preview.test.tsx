/* WindowPreview — Phase C primitive tests (vitest, node env).
   The component itself is rendered by React in the browser; here we cover the
   PURE helper (pickPreviewMeta) and the bug-fix invariant: mobile-switcher
   must NOT mount <WindowContent> per card (AUDIT-2026-06-11 P1). */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Files } from "lucide-react";
import { pickPreviewMeta } from "./window-preview";
import type { AppDescriptor, WindowState } from "../lib/types";

const app: AppDescriptor = {
  id: "files",
  title: "Files",
  icon: Files,
  gradient: "linear-gradient(180deg,#abc,#def)",
  load: async () => ({ default: () => null }),
};

const win = (over: Partial<WindowState> = {}): WindowState => ({
  id: "w1",
  app: "files",
  title: "Documents",
  x: 0, y: 0, w: 720, h: 460, z: 1,
  minimized: false,
  maximized: false,
  ...over,
});

describe("pickPreviewMeta", () => {
  it("returns title + gradient + null subline for an empty payload", () => {
    const meta = pickPreviewMeta(win(), app);
    expect(meta).toEqual({
      title: "Documents",
      subline: null,
      gradient: "linear-gradient(180deg,#abc,#def)",
    });
  });

  it("extracts a payload.path subline (file open context)", () => {
    const meta = pickPreviewMeta(win({ payload: { path: "/home/me/notes.md" } }), app);
    expect(meta?.subline).toBe("/home/me/notes.md");
  });

  it("falls back to app.title when window.title is empty", () => {
    const meta = pickPreviewMeta(win({ title: "" }), app);
    expect(meta?.title).toBe("Files");
  });

  it("returns null when the window is missing (winId hides preview)", () => {
    expect(pickPreviewMeta(undefined, app)).toBeNull();
    expect(pickPreviewMeta(win(), undefined)).toBeNull();
  });
});

describe("mobile-switcher bug-fix (AUDIT-2026-06-11 P1)", () => {
  // Source-level assertion: the switcher must NOT import WindowContent or
  // mount it per card. If a future refactor re-introduces the live mount the
  // double-PTY/screencast bug would regress — this test fails first.
  it("does not mount <WindowContent> per card", () => {
    const src = readFileSync(
      resolve(__dirname, "mobile-switcher.tsx"),
      "utf8",
    );
    // Strip block + line comments so an explanatory reference (the comment
    // we just added explaining the bug fix) doesn't trip the regex.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/<WindowContent\b/);
    expect(code).not.toMatch(/from\s+["']\.\/window-content["']/);
    // Sanity: the migration DID happen — the static preview is wired in.
    expect(code).toMatch(/<WindowPreview\b/);
  });
});
