"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/features/os-shell";

// Shared destructive confirm for both the curated app catalog and the built-in
// "Apps"/"Features" sections. Touch users get no hover affordance, so tapping
// the "Installed" pill instantly used to uninstall — this gate is what keeps
// fat-finger users from losing their dock icon by mistake. The body copy
// (current spec) reassures: their data stays on disk regardless.
export function UninstallConfirm({
  open,
  title,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <FormDrawer open={open} onOpenChange={(next) => !next && onCancel()} size="sm">
      <FormDrawer.Header>
        <FormDrawer.Title>{title ? `Uninstall ${title}?` : "Uninstall?"}</FormDrawer.Title>
        <FormDrawer.Description>
          Your data stays on disk. You can reinstall any time.
        </FormDrawer.Description>
      </FormDrawer.Header>
      <FormDrawer.Footer>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm}>
          <Trash2 className="size-4" />
          Uninstall
        </Button>
      </FormDrawer.Footer>
    </FormDrawer>
  );
}
