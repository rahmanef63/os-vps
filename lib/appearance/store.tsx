"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { parseImage, imageStyle, isCssImage, type ImageValue } from "@/features/image-picker";
import { usePrefsSync } from "@/lib/prefs/use-prefs-sync";
import { TWEAK_DEFAULTS, type Tweaks, type ServerConfig } from "./types";
import { ensureServerTargets } from "./server-targets";
import { fontStack } from "./fonts";
import { applyPreset, clearPreset } from "./presets/apply";

const KEY = "os-vps:tweaks";

function upgradeUnsplash(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "images.unsplash.com") {
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      u.searchParams.set("w", "2560");
      u.searchParams.set("q", "85");
      u.searchParams.delete("h");
      return u.toString();
    }
  } catch {
    /* not a URL */
  }
  return url;
}

function wallpaperCss(img: ImageValue) {
  if (isCssImage(img)) return imageStyle(img);
  const hi = upgradeUnsplash(img.value);
  const resolved = /^https?:\/\//i.test(hi) ? hi : img.value;
  return imageStyle(img, resolved);
}

function withWallpaperStyle(tweaks: Tweaks): Tweaks {
  const wallpaperImage = parseImage(tweaks.wallpaperImage ?? null);
  return {
    ...tweaks,
    wallpaperImage,
    wallpaperStyle: wallpaperImage ? wallpaperCss(wallpaperImage) : undefined,
  };
}

type Ctx = {
  tweaks: Tweaks;
  setTweaks: (patch: Partial<Tweaks>) => void;
  setServer: (patch: Partial<ServerConfig>) => void;
  setWallpaperImage: (wallpaperImage: ImageValue | null) => void;
};

const AppearanceContext = createContext<Ctx | null>(null);

// Applies the visual tweaks to <html> (data-theme + dir-* + accent) and
// persists them. Kept tiny; the actual palette lives in globals.css tokens.
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [tweaks, setState] = useState<Tweaks>(TWEAK_DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Tweaks & { server?: { token?: string } };
        // Scrub the legacy plaintext token from old caches (next persist
        // rewrites the key without it). Auth is the session cookie.
        if (parsed.server) delete parsed.server.token;
        const server = { ...TWEAK_DEFAULTS.server, ...parsed.server };
        const wallpaperImage = parseImage(parsed.wallpaperImage ?? null);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot post-hydration restore: this provider wraps SSR'd markup (login screen reads the wallpaper tweak), so a lazy initializer reading localStorage would hydration-mismatch
        setState(withWallpaperStyle({
          ...TWEAK_DEFAULTS,
          ...parsed,
          wallpaperImage,
          server: ensureServerTargets(server),
        }));
      }
    } catch {
      /* ignore corrupt cache */
    }
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = tweaks.theme;
    el.classList.toggle("reduce-glass", tweaks.reduceGlass);
    el.classList.toggle("high-contrast", tweaks.highContrast);
    // Scale drives a CSS var (globals.css: html font-size = 100% * --font-scale),
    // so the whole rem cascade reacts live — no fragile cached root font-size.
    el.style.setProperty("--font-scale", String(tweaks.fontScale));
    // Typeface: an explicit pick sets --font-ui INLINE so it wins over a color
    // preset's injected :root rule; "system" clears it → preset / Geist default.
    const stack = fontStack(tweaks.fontFamily);
    if (stack) el.style.setProperty("--font-ui", stack);
    else el.style.removeProperty("--font-ui");
    // Color is 100% theme-driven now: a preset owns every chrome token + --accent;
    // stock (no preset) falls back to the globals.css defaults. No inline accent /
    // style (dir) overrides — the preset picker is the single source of truth.
    el.style.removeProperty("--accent");
    if (tweaks.preset) void applyPreset(tweaks.preset);
    else clearPreset();
    try {
      localStorage.setItem(KEY, JSON.stringify(tweaks));
    } catch {
      /* quota / private mode */
    }
  }, [tweaks]);

  // Cross-device sync (lib/prefs): server-stored tweaks win over the local cache
  // on initial load; local edits debounce back up. wallpaperStyle is computed from
  // wallpaperImage (withWallpaperStyle), so it's stripped from the synced payload
  // and recomputed on apply — same shape as the localStorage hydrate above.
  const applyServerTweaks = useCallback((t: Omit<Tweaks, "wallpaperStyle">) => {
    setState(withWallpaperStyle({
      ...TWEAK_DEFAULTS,
      ...t,
      wallpaperImage: parseImage(t.wallpaperImage ?? null),
      server: ensureServerTargets({ ...TWEAK_DEFAULTS.server, ...t.server }),
    }));
  }, []);
  const syncedTweaks = useMemo(() => {
    const { wallpaperStyle: _computed, ...rest } = tweaks;
    return rest;
  }, [tweaks]);
  usePrefsSync({ section: "tweaks", value: syncedTweaks, apply: applyServerTweaks });

  const setTweaks = useCallback(
    (patch: Partial<Tweaks>) => setState((t) => withWallpaperStyle({ ...t, ...patch })),
    [],
  );
  const setServer = useCallback(
    (patch: Partial<ServerConfig>) =>
      setState((t) => withWallpaperStyle({ ...t, server: ensureServerTargets({ ...t.server, ...patch }) })),
    [],
  );
  const setWallpaperImage = useCallback(
    (wallpaperImage: ImageValue | null) =>
      setState((t) => withWallpaperStyle({ ...t, wallpaperImage })),
    [],
  );

  return (
    <AppearanceContext.Provider value={{ tweaks, setTweaks, setServer, setWallpaperImage }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): Ctx {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within AppearanceProvider");
  return ctx;
}
