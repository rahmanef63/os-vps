"use client";

import {
  MoreVertical,
  Plus,
  RotateCw,
  ArrowRight,
  Home,
  History,
  Link2,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type BrowserMenuProps = {
  onNewTab: () => void;
  onReload: () => void;
  onForward: () => void;
  onHome: () => void;
  onHistory: () => void;
  onCopyLink: () => void;
  onClearHistory: () => void;
  canReload: boolean;
  canForward: boolean;
  canCopy: boolean;
};

function Row({
  icon: Icon,
  label,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", danger && "text-destructive")}>
      <Icon className="size-4" />
      {label}
    </span>
  );
}

export function BrowserMenu({
  onNewTab,
  onReload,
  onForward,
  onHome,
  onHistory,
  onCopyLink,
  onClearHistory,
  canReload,
  canForward,
  canCopy,
}: BrowserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" title="Menu" aria-label="Browser menu">
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onNewTab}>
          <Row icon={Plus} label="New tab" />
          <DropdownMenuShortcut>⌘T</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onReload} disabled={!canReload}>
          <Row icon={RotateCw} label="Reload" />
          <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
        </DropdownMenuItem>
        {/* Mirrors the toolbar buttons hidden on compact panes. */}
        <DropdownMenuItem onSelect={onForward} disabled={!canForward}>
          <Row icon={ArrowRight} label="Forward" />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onHome}>
          <Row icon={Home} label="Home" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onHistory}>
          <Row icon={History} label="History…" />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCopyLink} disabled={!canCopy}>
          <Row icon={Link2} label="Copy link" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onClearHistory}>
          <Row icon={Trash2} label="Clear history" danger />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
