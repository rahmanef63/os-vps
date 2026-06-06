"use client";

import { useEffect, useRef, useState } from "react";
import { ImageEditor, type EditorApi } from "@/features/image-editor";
import { rawUrl } from "@/lib/os-api";
import { closeWindow, setCloseGuard, toast } from "@/features/os-shell";
import type { AppProps } from "@/features/os-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SaveImageDialog } from "./components/save-image-dialog";
import { autoName, loadSavePrefs, saveImageToHost } from "./lib/save-image";

// The OS "Image Editor" app — the portable image-editor slice + os-vps wiring:
// open host images / round-trip a saved doc, SAVE rendered images to a VPS folder,
// and guard window close on unsaved changes (Save / Don't Save / Cancel).
export default function MediaStudio({ payload, winId }: AppProps) {
  const p = payload as { path?: string; name?: string; kind?: string } | undefined;
  const [pending, setPending] = useState<string | null>(null); // PNG awaiting the Save As dialog
  const [confirmClose, setConfirmClose] = useState(false);
  const dirty = useRef(false);
  const api = useRef<EditorApi | null>(null);
  const closeAfterSave = useRef(false);

  // Register a close guard: if there are unsaved edits, veto the close and show
  // the prompt instead. Cleared on unmount.
  useEffect(() => {
    if (!winId) return;
    setCloseGuard(winId, () => {
      if (!dirty.current) return true;
      setConfirmClose(true);
      return false;
    });
    return () => setCloseGuard(winId, null);
  }, [winId]);

  const markClean = () => { dirty.current = false; api.current?.markSaved(); };
  const forceClose = () => { if (winId) { setCloseGuard(winId, null); closeWindow(winId); } };

  const onSave = (dataUrl: string) => {
    const prefs = loadSavePrefs();
    if (prefs.remember && prefs.dir) {
      saveImageToHost(dataUrl, { dir: prefs.dir, name: autoName(), format: prefs.format, quality: prefs.quality })
        .then((path) => { markClean(); toast(`Saved → ${path}`, { tone: "success" }); })
        .catch((e) => toast(e instanceof Error ? e.message : "save failed", { tone: "error" }));
    } else {
      closeAfterSave.current = false;
      setPending(dataUrl);
    }
  };
  const onSaveAs = (dataUrl: string) => { closeAfterSave.current = false; setPending(dataUrl); };

  // The prompt's "Save" → render the canvas, open the dialog, close once saved.
  const saveThenClose = () => {
    setConfirmClose(false);
    const url = api.current?.exportPng() ?? null;
    if (!url) return forceClose();
    closeAfterSave.current = true;
    setPending(url);
  };

  const onDialogSaved = () => { markClean(); if (closeAfterSave.current) { closeAfterSave.current = false; forceClose(); } };

  const common = {
    onSave,
    onSaveAs,
    onClose: () => winId && closeWindow(winId), // routes through the guard (prompts if dirty)
    onDirty: (d: boolean) => { dirty.current = d; },
    onReady: (a: EditorApi) => { api.current = a; },
  };
  const isDoc = p?.path && /\.(ie\.)?json$/i.test(p.path);

  return (
    <>
      {isDoc ? (
        <ImageEditor
          {...common}
          projectSrc={rawUrl(p!.path!)}
          onSaveDoc={(doc) => {
            void fetch("/api/v1/fs/write", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ path: p!.path, content: JSON.stringify(doc) }),
            });
          }}
        />
      ) : (
        <ImageEditor {...common} initialImage={p?.path && (!p.kind || p.kind === "image") ? rawUrl(p.path) : undefined} />
      )}

      <SaveImageDialog
        dataUrl={pending}
        open={pending !== null}
        onClose={() => { setPending(null); closeAfterSave.current = false; }}
        onSaved={onDialogSaved}
      />

      <AlertDialog open={confirmClose} onOpenChange={(o) => !o && setConfirmClose(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes before closing?</AlertDialogTitle>
            <AlertDialogDescription>Your image has unsaved edits. They’ll be lost if you don’t save.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setConfirmClose(false)}>Cancel</AlertDialogCancel>
            <Button variant="ghost" className="text-destructive" onClick={() => { setConfirmClose(false); forceClose(); }}>Don’t Save</Button>
            <AlertDialogAction onClick={saveThenClose}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
