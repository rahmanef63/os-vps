"use client";
/* MSO's built-in LIVE wallpapers — TSX components registered into the
   appshell wallpaper registry (Settings → Wallpaper → Live). These are the
   code-defined ("from code") flavor; user-pasted HTML is the other flavor and
   renders sandboxed in components/wallpaper.tsx. Side-effect module imported
   once from the os-shell barrel. Both stay cheap: transform-only CSS animation
   (Drift) and one rAF canvas that pauses while the tab is hidden (Starfield). */
import { useEffect, useRef } from "react";
import { registerWallpaper, type WallpaperProps } from "@/features/appshell";

// Accent blobs floating over the graphite backdrop — colors come from the THEME
// tokens, so the wallpaper follows the active preset. Transform-only keyframes
// (wpFloatA/B in globals.css) keep it on the compositor.
function Drift() {
  return (
    <div className="wp-graphite absolute inset-0 overflow-hidden">
      <div className="absolute left-[8%] top-[12%] size-[46vmax] rounded-full bg-primary/30 blur-3xl [animation:wpFloatA_26s_ease-in-out_infinite]" />
      <div className="absolute right-[4%] top-[38%] size-[38vmax] rounded-full bg-info/25 blur-3xl [animation:wpFloatB_32s_ease-in-out_infinite]" />
      <div className="absolute bottom-[6%] left-[30%] size-[30vmax] rounded-full bg-primary/20 blur-3xl [animation:wpFloatB_40s_ease-in-out_infinite_reverse]" />
    </div>
  );
}

// Star particles drifting on a dark field; with `interactive` on, the pointer
// gently attracts nearby stars (the shells make the empty desktop click-through
// so the wallpaper actually receives the moves).
function Starfield({ interactive }: WallpaperProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let raf = 0;
    type Star = { x: number; y: number; z: number; vx: number; vy: number };
    let stars: Star[] = [];

    const seed = () => {
      const n = Math.min(360, Math.round((w * h) / 7000));
      stars = Array.from({ length: n }, () => {
        const z = Math.random();
        return { x: Math.random() * w, y: Math.random() * h, z, vx: (0.04 + z * 0.12) * (Math.random() < 0.5 ? -1 : 1), vy: 0.02 + z * 0.05 };
      });
    };
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const ptr = { x: -1e4, y: -1e4 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ptr.x = e.clientX - r.left;
      ptr.y = e.clientY - r.top;
    };
    const onLeave = () => {
      ptr.x = -1e4;
      ptr.y = -1e4;
    };
    if (interactive) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
    }

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || !w) return; // no work in background tabs
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const dx = ptr.x - s.x;
        const dy = ptr.y - s.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 32400 && d2 > 1) {
          // soft attraction within 180px
          s.vx += (dx / d2) * 5;
          s.vy += (dy / d2) * 5;
        }
        s.vx *= 0.985;
        s.vy *= 0.985;
        s.x = (s.x + s.vx + w) % w;
        s.y = (s.y + s.vy + h) % h;
        ctx.globalAlpha = 0.25 + s.z * 0.7;
        // canvas pixels, not chrome — literal white reads as starlight on the dark field
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, 0.5 + s.z * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [interactive]);

  return (
    <div className="wp-graphite absolute inset-0">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

registerWallpaper({ id: "drift", label: "Drift (accent blobs)", render: Drift });
registerWallpaper({ id: "starfield", label: "Starfield (interactive)", render: Starfield, interactive: true });
