"use client";

import { useState } from "react";
import { Lock, Globe, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isSecure } from "../lib/url";
import { BrowserMenu } from "./browser-menu";
import type { OmnibarProps } from "./omnibar";

// iOS Safari address bar: one glass bar with a single CENTERED URL pill (lock +
// url, h38 r11 --fill). The inline nav cluster (back/forward/reload/home) is
// dropped — the mock's Safari carries only the pill; nav + history live in the
// ⋯ menu. RemoteView owns the page content, so only this chrome is adapted.
export function OmnibarIos(props: OmnibarProps) {
  const { url, isNewTab, loading, bookmarked, canForward } = props;
  // Mirror the tab URL while not typing (same derivation as the desktop bar).
  const mirror = isNewTab ? "" : url;
  const [edit, setEdit] = useState<{ key: string; value: string } | null>(null);
  const draft = edit?.key === mirror ? edit.value : mirror;
  const setDraft = (value: string) => setEdit({ key: mirror, value });
  const secure = isSecure(url);
  const SchemeIcon = secure ? Lock : Globe;

  return (
    <div className="glass relative flex items-center gap-2 border-b border-border bg-[var(--glass-bar)] px-3.5 py-2">
      <div className="flex h-[38px] flex-1 items-center rounded-[11px] bg-[var(--fill)] px-3">
        <SchemeIcon className="pointer-events-none size-3 shrink-0 text-muted-foreground" />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && draft.trim()) props.onSubmit(draft);
            if (e.key === "Escape") setDraft(isNewTab ? "" : url);
          }}
          placeholder="Search or enter website"
          spellCheck={false}
          className="h-full flex-1 border-0 bg-transparent px-2 text-center text-sm shadow-none focus-visible:ring-0"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isNewTab}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark this page"}
          onClick={props.onToggleBookmark}
          className="size-6 shrink-0"
        >
          <Star className={cn("size-3.5", bookmarked && "fill-primary text-primary")} />
        </Button>
      </div>
      <BrowserMenu
        onNewTab={props.onNewTab}
        onReload={props.onReload}
        onForward={props.onForward}
        onHome={props.onHome}
        onHistory={props.onHistory}
        onCopyLink={props.onCopyLink}
        onClearHistory={props.onClearHistory}
        canReload={!isNewTab}
        canForward={canForward}
        canCopy={!isNewTab}
      />
      {loading && (
        <div className="absolute right-0 bottom-0 left-0 h-0.5 overflow-hidden">
          <div className="animate-[browser-load_1.1s_ease-in-out_infinite] absolute h-full w-2/5 rounded bg-primary" />
        </div>
      )}
    </div>
  );
}
