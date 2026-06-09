"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useApps } from "../lib/registry";
import { useLauncherOpen } from "../hooks/use-shell";
import { openWindow, setLauncherOpen } from "../lib/store";
import { useQuickLinks } from "../registry/capabilities";
import { AppIcon } from "./app-icon";
import { QuicklinkIcon } from "./quicklink-icon";

// Launchpad — full-screen blurred app grid. Derived from the registry.
export function AppLauncher() {
  const open = useLauncherOpen();
  const apps = useApps();
  const { items: links, open: openLink } = useQuickLinks();

  return (
    <div
      className={cn(
        "glass absolute inset-0 z-[8500] grid place-items-center bg-black/30 transition-opacity",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      onClick={() => setLauncherOpen(false)}
    >
      <div
        className="grid w-full max-w-3xl grid-cols-4 gap-6 p-8 sm:grid-cols-5 md:grid-cols-6"
        onClick={(e) => e.stopPropagation()}
      >
        {apps.map((app) => (
          <Link
            key={app.id}
            href={"/" + (app.slug ?? app.id)}
            prefetch={false}
            onPointerEnter={() => void app.load?.().catch(() => {})}
            onClick={(e) => {
              if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                openWindow(app.id, app.title, app.defaultSize, undefined, { multi: app.multi });
              }
              setLauncherOpen(false);
            }}
            className="group flex flex-col items-center gap-2"
          >
            <span className="size-16 transition-transform group-hover:scale-105">
              <AppIcon app={app} />
            </span>
            <span className="text-xs font-medium text-white drop-shadow">{app.title}</span>
          </Link>
        ))}
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                openLink(link);
              }
              setLauncherOpen(false);
            }}
            className="group flex flex-col items-center gap-2"
          >
            <span className="size-16 transition-transform group-hover:scale-105">
              <QuicklinkIcon link={link} />
            </span>
            <span className="truncate text-xs font-medium text-white drop-shadow">{link.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
