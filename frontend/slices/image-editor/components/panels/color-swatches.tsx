"use client";

import { useState } from "react";
import { ArrowLeftRight, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditor } from "../../lib/store";

const HEX = /^#[0-9a-fA-F]{6}$/;

function Picker({
  color,
  onPick,
  recent,
  children,
}: {
  color: string;
  onPick: (c: string) => void;
  recent: string[];
  children: React.ReactNode;
}) {
  const [text, setText] = useState(color);

  function commit(v: string) {
    setText(v);
    if (HEX.test(v)) onPick(v);
  }

  return (
    <Popover onOpenChange={(o) => o && setText(color)}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-48 space-y-2">
        <Input
          type="color"
          value={HEX.test(text) ? text : color}
          onChange={(e) => commit(e.target.value)}
          className="h-8 w-full p-1"
        />
        <Input
          value={text}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => setText(color)}
          placeholder="#000000"
          className="h-8 font-mono text-xs"
        />
        {recent.length > 0 && (
          <div className="grid grid-cols-8 gap-1">
            {recent.map((c, i) => (
              <Button
                key={`${c}-${i}`}
                type="button"
                variant="ghost"
                onClick={() => onPick(c)}
                title={c}
                aria-label={`Use color ${c}`}
                style={{ backgroundColor: c }}
                className={cn("size-4 rounded-sm border border-border p-0 font-normal hover:bg-transparent")}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function ColorSwatches() {
  const { fg, bg, recentColors, setFg, setBg, swapColors, resetColors } = useEditor();

  return (
    <div className="relative mx-auto h-11 w-11">
      <Picker color={bg} onPick={setBg} recent={recentColors}>
        <Button
          type="button"
          variant="ghost"
          title="Background color"
          aria-label="Background color"
          style={{ backgroundColor: bg }}
          className={cn(
            "absolute bottom-0 right-0 size-[22px] rounded-sm border border-border p-0 font-normal shadow-sm hover:bg-transparent",
          )}
        />
      </Picker>
      <Picker color={fg} onPick={setFg} recent={recentColors}>
        <Button
          type="button"
          variant="ghost"
          title="Foreground color"
          aria-label="Foreground color"
          style={{ backgroundColor: fg }}
          className={cn(
            "absolute left-0 top-0 z-10 size-[22px] rounded-sm border border-border p-0 font-normal shadow-sm hover:bg-transparent",
          )}
        />
      </Picker>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Swap (X)"
        aria-label="Swap foreground and background colors"
        onClick={swapColors}
        className="absolute right-0 -top-1 size-4 rounded-sm p-0"
      >
        <ArrowLeftRight className="size-3" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Default (D)"
        aria-label="Reset to default colors"
        onClick={resetColors}
        className="absolute -bottom-1 left-0 size-4 rounded-sm p-0"
      >
        <RotateCcw className="size-3" />
      </Button>
    </div>
  );
}
