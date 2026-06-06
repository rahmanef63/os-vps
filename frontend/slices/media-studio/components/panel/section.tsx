"use client";

import { Slider } from "@/components/ui/slider";

// Shared panel atoms: uppercase section label + a labelled value slider.
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

export function KSlider({
  label,
  value,
  min,
  max,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        value={value}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
