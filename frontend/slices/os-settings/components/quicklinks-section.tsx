"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Globe, Link2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/features/os-shell";
import { useQuicklinks, faviconUrl, normalizeUrl } from "@/lib/quicklinks";
import { Section } from "./section";

type PendingQL = { id: string; label: string };

// Manage website shortcuts. They surface (with their favicon) in the dock,
// Launchpad, mobile grid, the Today widget and the Quicklinks window; opening
// one pops a new native browser tab.
export function QuicklinksSection() {
  const { items, add, update, remove, move } = useQuicklinks();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  // Destructive confirm — losing a quicklink mid-typing is the kind of miss
  // tap that triggers a sigh, so we gate the Trash button behind a dialog.
  const [pending, setPending] = useState<PendingQL | null>(null);

  const submit = () => {
    if (!url.trim()) return;
    add(url, title);
    setUrl("");
    setTitle("");
  };

  return (
    <div className="space-y-5">
      <Section icon={<Plus />} title="Add a quicklink">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="github.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            aria-label="Website URL"
          />
          <Input
            placeholder="Label (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            aria-label="Label"
            className="sm:max-w-[38%]"
          />
          <Button type="button" onClick={submit} className="shrink-0">
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </Section>

      <Section icon={<Link2 />} title={`Shortcuts (${items.length})`}>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No quicklinks yet — add a website above.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((ql, i) => {
              const src = faviconUrl(ql.url);
              return (
                <li key={ql.id} className="flex items-center gap-2 rounded-lg border border-border bg-card/50 p-2">
                  <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-white text-zinc-500">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" width={18} height={18} loading="lazy" decoding="async" className="size-[18px] object-contain" />
                    ) : (
                      <Globe className="size-4" />
                    )}
                  </span>
                  <Input
                    value={ql.title}
                    onChange={(e) => update(ql.id, { title: e.target.value })}
                    aria-label="Label"
                    className="h-8 min-w-0 flex-1"
                  />
                  <Input
                    value={ql.url}
                    onChange={(e) => update(ql.id, { url: e.target.value })}
                    onBlur={(e) => update(ql.id, { url: normalizeUrl(e.target.value) })}
                    aria-label="URL"
                    className="h-8 min-w-0 flex-[2] font-mono text-[11px]"
                  />
                  <Button type="button" variant="ghost" size="icon" aria-label="Move up" onClick={() => move(ql.id, -1)} disabled={i === 0}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Move down" onClick={() => move(ql.id, 1)} disabled={i === items.length - 1}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove"
                    onClick={() => setPending({ id: ql.id, label: ql.title || ql.url })}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <FormDrawer open={pending !== null} onOpenChange={(open) => !open && setPending(null)} size="sm">
        <FormDrawer.Header>
          <FormDrawer.Title>Remove quick link?</FormDrawer.Title>
          <FormDrawer.Description>
            {pending ? `"${pending.label}" will be removed from your dock and Spotlight.` : ""}
          </FormDrawer.Description>
        </FormDrawer.Header>
        <FormDrawer.Footer>
          <Button type="button" variant="ghost" onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (pending) remove(pending.id);
              setPending(null);
            }}
          >
            <Trash2 className="size-4" />
            Remove
          </Button>
        </FormDrawer.Footer>
      </FormDrawer>
    </div>
  );
}
