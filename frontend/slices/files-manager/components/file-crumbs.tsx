"use client";

import { type DragEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronDown, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { crumbsFor } from "../lib/format";

// Path breadcrumb that stays a breadcrumb while it fits, and folds into a
// single dropdown when the trail is too long for the toolbar. An invisible
// full-width probe measures the natural width; a ResizeObserver re-checks on
// every width change so it expands back out when there's room.
export function FileCrumbs({
  path,
  dropTarget,
  onNavigate,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  path: string;
  dropTarget: string | null;
  onNavigate: (path: string) => void;
  onDragOver: (e: DragEvent, dest: string) => void;
  onDragLeave: (dest: string) => void;
  onDrop: (e: DragEvent, dest: string) => void;
}) {
  const crumbs = useMemo(() => crumbsFor(path), [path]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const probe = probeRef.current;
    if (!wrap || !probe) return;
    const check = () => setCollapsed(probe.scrollWidth > wrap.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [path]);

  const last = crumbs[crumbs.length - 1];

  return (
    <div ref={wrapRef} className="relative flex min-w-0 flex-1 items-center overflow-hidden">
      {/* Hidden probe: the breadcrumb at its natural (unconstrained) width. */}
      <div
        ref={probeRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 flex w-max items-center gap-0.5 text-xs"
      >
        {crumbs.map((c, i) => (
          <span key={c.path} className="flex items-center gap-0.5">
            {i > 0 && <ChevronRight className="size-3 opacity-50" />}
            {/* Mirrors the live crumb's coarse min-w so the fold check stays true. */}
            <span className="px-1.5 py-0.5 [@media(pointer:coarse)]:min-w-9">{c.name}</span>
          </span>
        ))}
      </div>

      {collapsed ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Path breadcrumb" className="h-7 min-w-0 max-w-full gap-1 px-1.5 text-xs [@media(pointer:coarse)]:h-9">
              <FolderOpen className="size-3.5 shrink-0" />
              <span className="truncate font-medium text-foreground">{last?.name}</span>
              <ChevronDown className="size-3 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-w-[70vw]">
            {crumbs.map((c, i) => (
              <DropdownMenuItem
                key={c.path}
                onSelect={() => onNavigate(c.path)}
                className={cn("justify-start", i === crumbs.length - 1 && "text-primary")}
              >
                <span className="flex items-center gap-1.5 truncate" style={{ paddingLeft: i * 12 }}>
                  <FolderOpen className="size-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{c.name}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <nav className="flex min-w-0 items-center gap-0.5 text-xs text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={c.path} className="flex min-w-0 items-center gap-0.5">
              {i > 0 && <ChevronRight className="size-3 shrink-0 opacity-50" />}
              <button
                onClick={() => onNavigate(c.path)}
                onDragOver={(e) => onDragOver(e, c.path)}
                onDragLeave={() => onDragLeave(c.path)}
                onDrop={(e) => onDrop(e, c.path)}
                className={cn(
                  // Coarse pointers: ≈36px hit area (taller + min-w, mirrored in the probe).
                  "truncate rounded px-1.5 py-0.5 hover:bg-accent [@media(pointer:coarse)]:min-w-9 [@media(pointer:coarse)]:py-2.5",
                  i === crumbs.length - 1 ? "font-medium text-foreground" : "",
                  dropTarget === c.path && "ring-2 ring-primary ring-inset",
                )}
              >
                {c.name}
              </button>
            </span>
          ))}
        </nav>
      )}
    </div>
  );
}
