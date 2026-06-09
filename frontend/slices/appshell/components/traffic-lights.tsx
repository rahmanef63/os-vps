"use client";

import { Button } from "@/components/ui/button";

// macOS window controls. Glyphs fade in on hover of the cluster (os-rr).
export function TrafficLights({
  onClose,
  onMinimize,
  onMaximize,
}: {
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}) {
  return (
    <div className="group/lights flex gap-2">
      <Light color="#ff5f57" stroke="#7a0a00" label="Close window" onClick={onClose}>
        <path d="M1.6 1.6l4.8 4.8M6.4 1.6l-4.8 4.8" strokeWidth="1.2" strokeLinecap="round" />
      </Light>
      <Light color="#febc2e" stroke="#7a4b00" label="Minimize window" onClick={onMinimize}>
        <path d="M1.4 4h5.2" strokeWidth="1.4" strokeLinecap="round" />
      </Light>
      <Light color="#28c840" stroke="#0a5200" label="Maximize window" onClick={onMaximize}>
        <path d="M2 6V2h4M6 2L2 6" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Light>
    </div>
  );
}

function Light({
  color,
  stroke,
  label,
  onClick,
  children,
}: {
  color: string;
  stroke: string;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="h-auto w-auto hover:bg-transparent grid size-3 place-items-center rounded-full shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.18)]"
      style={{ background: color }}
    >
      <svg
        viewBox="0 0 8 8"
        className="size-2 opacity-0 group-hover/lights:opacity-60"
        stroke={stroke}
      >
        {children}
      </svg>
    </Button>
  );
}
