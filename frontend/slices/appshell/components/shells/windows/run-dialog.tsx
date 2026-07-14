"use client";
/* Windows Run dialog (Win+R) — the little "Run" box that opens a program by name.
   ponytail: a web OS has no real shell PATH, so this launches REGISTERED apps by
   name (id or title), NOT arbitrary executables — and never eval()s the input.
   It resolves a single registered app and opens it through the shared store. */
import { useEffect, useRef, useState } from "react";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApps } from "../../../lib/registry";
import { openWindow } from "../../../lib/store";
import type { AppDescriptor } from "../../../lib/types";

/** Resolve typed text → a registered app, case-insensitively: exact id, then
 *  exact title, then a title prefix, then any id/title substring. Pure +
 *  vitest-covered (run-dialog.test.ts) — the only non-trivial logic here. */
export function resolveApp(
  query: string,
  apps: AppDescriptor[],
): AppDescriptor | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return (
    apps.find((a) => a.id.toLowerCase() === q) ??
    apps.find((a) => a.title.toLowerCase() === q) ??
    apps.find((a) => a.title.toLowerCase().startsWith(q)) ??
    apps.find(
      (a) => a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q),
    )
  );
}

export function RunDialog({ onClose }: { onClose: () => void }) {
  const apps = useApps();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus once the dialog paints (mount = open); restore focus to the trigger
  // on close so the next Tab doesn't restart from the top of the document.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => { cancelAnimationFrame(id); prev?.focus(); };
  }, []);

  // Escape closes — window-level so it fires even after focus leaves the input,
  // mirroring start-menu.tsx so both Windows flyouts dismiss alike.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return; // empty Open is a no-op (real Win+R), not a `cannot find ''` error
    const app = resolveApp(value, apps);
    if (!app) {
      // The authentic Win+R error — stay open so the user can fix the name.
      setError(`Cannot find '${value.trim()}'. Check the name and try again.`);
      return;
    }
    openWindow(app.id, app.title, app.defaultSize, undefined, { multi: app.multi });
    onClose();
  };

  return (
    <>
      {/* Outside-click closes. */}
      <div className="absolute inset-0 z-[6000]" onClick={onClose} />
      {/* Solid bg-card on purpose (NOT acrylic / no backdrop-blur): the real Win+R
          box is a small OPAQUE dialog. Anchored at the bottom-left corner (12px
          above the 48px taskbar, 12px from the left edge) — that corner docking
          is Win+R's signature, not a centered modal. */}
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="Run"
        className="absolute bottom-[60px] left-3 z-[6001] w-[400px] max-w-[92vw] rounded-lg border border-border bg-card p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
            <Terminal className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Run</h2>
            <p className="text-xs text-muted-foreground">
              Type the name of a program, folder, document, or Internet
              resource, and Windows will open it for you.
            </p>
          </div>
        </div>
        <label
          htmlFor="run-input"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          Open:
        </label>
        <input
          id="run-input"
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null); // clear the error as soon as they retype
          }}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}
        {/* Authentic three-button row: OK / Cancel / Browse… (Browse has no real
            filesystem picker behind it here, so it stays disabled). */}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="submit" size="sm" className="px-4">
            OK
          </Button>
          <Button type="button" variant="outline" size="sm" className="px-4" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="outline" size="sm" className="px-4" disabled>
            Browse…
          </Button>
        </div>
      </form>
    </>
  );
}
