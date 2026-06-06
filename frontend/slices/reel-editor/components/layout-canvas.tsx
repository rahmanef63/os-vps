"use client";

import { Fragment, useEffect } from "react";
import { type PanelImperativeHandle, usePanelRef } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import type { LayoutNode, PaneId } from "../lib/layout";

// Renders a layout split-tree into draggable, resizable panels. Each leaf pulls
// its pane node from `panes` by id, so panes stay position-agnostic. The single
// "properties" pane is collapsible and bound to `collapsed` (toggled from the
// menu/toolbar) — collapsing/expanding by drag syncs back via onCollapsedChange.
export function LayoutCanvas({
  root,
  panes,
  collapsed,
  onCollapsedChange,
}: {
  root: LayoutNode;
  panes: Record<PaneId, React.ReactNode>;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}) {
  const propsRef = usePanelRef();

  useEffect(() => {
    const p = propsRef.current;
    if (!p) return;
    if (collapsed && !p.isCollapsed()) p.collapse();
    else if (!collapsed && p.isCollapsed()) p.expand();
  }, [collapsed, propsRef]);

  return <Group node={root} panes={panes} propsRef={propsRef} onCollapsedChange={onCollapsedChange} />;
}

function Group({
  node,
  panes,
  propsRef,
  onCollapsedChange,
}: {
  node: LayoutNode;
  panes: Record<PaneId, React.ReactNode>;
  propsRef: React.RefObject<PanelImperativeHandle | null>;
  onCollapsedChange: (v: boolean) => void;
}) {
  if (node.type !== "split") return null;
  return (
    <ResizablePanelGroup orientation={node.dir === "row" ? "horizontal" : "vertical"} className="min-h-0 min-w-0">
      {node.children.map((ch, i) => {
        const isProps = ch.type === "pane" && ch.pane === "properties";
        return (
          <Fragment key={i}>
            {i > 0 && <ResizableHandle withHandle />}
            <ResizablePanel
              defaultSize={ch.size ?? 100 / node.children.length}
              minSize={ch.minSize ?? 8}
              collapsible={isProps}
              collapsedSize={0}
              panelRef={isProps ? propsRef : undefined}
              onResize={isProps ? (s) => onCollapsedChange(s.asPercentage <= 0.5) : undefined}
              className="min-h-0 min-w-0"
            >
              {ch.type === "pane" ? (
                <div className="h-full w-full overflow-hidden">{panes[ch.pane]}</div>
              ) : (
                <Group node={ch} panes={panes} propsRef={propsRef} onCollapsedChange={onCollapsedChange} />
              )}
            </ResizablePanel>
          </Fragment>
        );
      })}
    </ResizablePanelGroup>
  );
}
