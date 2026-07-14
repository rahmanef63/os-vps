"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useResponsive } from "../responsive/use-responsive";

// Side-by-side master+detail on wide form factors; on compact (mobile) it shows
// ONE pane at a time and adds a back affordance — the canonical Files-sidebar /
// code-editor-tree / settings-nav pattern, factored once. Selection state is
// owned by the caller (`hasSelection` + `onBack`) so it stays data-driven.
export function MasterDetail({
  master,
  detail,
  hasSelection,
  onBack,
  masterClassName,
  detailClassName,
  className,
  backLabel = "Back",
}: {
  master: ReactNode;
  detail: ReactNode;
  /** On compact, show the detail pane when true, else the master. */
  hasSelection: boolean;
  onBack?: () => void;
  masterClassName?: string;
  detailClassName?: string;
  className?: string;
  backLabel?: string;
}) {
  const { isMobile } = useResponsive();

  if (!isMobile) {
    return (
      <div className={cn("flex h-full min-h-0", className)}>
        <div className={cn("h-full min-h-0 shrink-0 overflow-auto border-r border-border", masterClassName)}>
          {master}
        </div>
        <div className={cn("h-full min-h-0 flex-1 overflow-auto", detailClassName)}>
          {detail}
        </div>
      </div>
    );
  }

  // Compact: one pane at a time.
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {hasSelection ? (
        <div className={cn("flex h-full min-h-0 flex-col", detailClassName)}>
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              // Back label uses --info (iOS's dark-brightened link blue,
              // #0a84ff / #409cff) not --primary: primary is the fill-blue tuned
              // for white text ON it, and as a text label on a dark pane it fails
              // AA 4.5:1 — info clears it in both themes and IS the iOS tint.
              className="h-auto flex flex-none items-center gap-0.5 border-b border-border px-2 py-2 text-[15px] font-medium text-info hover:text-info"
            >
              <ChevronLeft className="size-4" />
              {backLabel}
            </Button>
          )}
          <div className="min-h-0 flex-1 overflow-auto">{detail}</div>
        </div>
      ) : (
        <div className={cn("h-full min-h-0 overflow-auto", masterClassName)}>
          {master}
        </div>
      )}
    </div>
  );
}
