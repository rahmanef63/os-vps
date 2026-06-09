"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Home,
  Lock,
  Globe,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isSecure } from "../lib/url";
import { BrowserMenu } from "./browser-menu";

type OmnibarProps = {
  url: string;
  isNewTab: boolean;
  loading: boolean;
  canBack: boolean;
  canForward: boolean;
  bookmarked: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onStop: () => void;
  onHome: () => void;
  onSubmit: (raw: string) => void;
  onToggleBookmark: () => void;
  onNewTab: () => void;
  onHistory: () => void;
  onCopyLink: () => void;
  onClearHistory: () => void;
};

export function Omnibar(props: OmnibarProps) {
  const { url, isNewTab, loading, canBack, canForward, bookmarked } = props;
  // Mirror the active tab's URL while not typing: the user's edit is keyed to
  // the tab state it started from, so a navigation (key change) derives back to
  // the mirrored URL — no effect-driven reset (react-hooks/set-state-in-effect).
  const mirror = isNewTab ? "" : url;
  const [edit, setEdit] = useState<{ key: string; value: string } | null>(null);
  const draft = edit?.key === mirror ? edit.value : mirror;
  const setDraft = (value: string) => setEdit({ key: mirror, value });

  const secure = isSecure(url);
  const SchemeIcon = secure ? Lock : Globe;

  return (
    <TooltipProvider delayDuration={400}>
      <div className="relative flex items-center gap-1 bg-card px-2 py-1.5">
        <NavButton label="Back" disabled={!canBack} onClick={props.onBack}>
          <ArrowLeft />
        </NavButton>
        {/* Compact panes keep Back + Reload only; Forward/Home live in the menu. */}
        <NavButton
          label="Forward"
          disabled={!canForward}
          onClick={props.onForward}
          className="@max-[480px]:hidden"
        >
          <ArrowRight />
        </NavButton>
        {loading ? (
          <NavButton label="Stop" onClick={props.onStop}>
            <X />
          </NavButton>
        ) : (
          <NavButton
            label="Reload"
            disabled={isNewTab}
            onClick={props.onReload}
          >
            <RotateCw />
          </NavButton>
        )}
        <NavButton
          label="Home"
          onClick={props.onHome}
          className="@max-[480px]:hidden"
        >
          <Home />
        </NavButton>

        <div className="relative flex flex-1 items-center">
          <SchemeIcon
            className={cn(
              "pointer-events-none absolute left-2.5 size-3.5",
              isNewTab
                ? "text-muted-foreground"
                : secure
                  ? "text-success"
                  : "text-muted-foreground",
            )}
          />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && draft.trim()) props.onSubmit(draft);
              if (e.key === "Escape") setDraft(isNewTab ? "" : url);
            }}
            placeholder="Search Google or type a URL"
            spellCheck={false}
            className="h-8 rounded-full pr-9 pl-8 text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isNewTab}
            title={bookmarked ? "Remove bookmark" : "Bookmark this page"}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark this page"}
            onClick={props.onToggleBookmark}
            className="absolute right-1 size-6"
          >
            <Star
              className={cn(
                "size-3.5",
                bookmarked && "fill-primary text-primary",
              )}
            />
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
    </TooltipProvider>
  );
}

function NavButton({
  label,
  children,
  disabled,
  onClick,
  className,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-7", className)}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
