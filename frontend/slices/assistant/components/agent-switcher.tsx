"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AIStore } from "../lib/store";
import { toolsForAgent } from "../lib/tools";
import { GlyphTile } from "./agent-avatar";

// Active-agent selector shown in the Chat header. Picking an agent makes its
// persona the system context for the next reply; "New agent" opens the editor.
export function AgentSwitcher({ store, onNew }: { store: AIStore; onNew: () => void }) {
  const a = store.activeAgent;
  const tools = toolsForAgent(a, store.skills).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 outline-none hover:bg-accent [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]">
        <GlyphTile glyph={a.glyph} color={a.color} size={30} />
        <div className="text-left leading-tight">
          <div className="text-[13px] font-semibold">{a.name}</div>
          <div className="text-[10px] text-muted-foreground">
            {a.allTools ? "Generalist" : `${a.skills.length} skills`} · {tools} tools
          </div>
        </div>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {store.agents.map((ag) => (
          <DropdownMenuItem
            key={ag.id}
            className="gap-2.5"
            onSelect={() => store.setActiveAgentId(ag.id)}
          >
            <GlyphTile glyph={ag.glyph} color={ag.color} size={22} />
            <span className="flex-1">{ag.name}</span>
            {ag.id === a.id ? <Check className="size-3.5 opacity-60" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onNew} className="gap-2">
          <Plus className="size-3.5" /> New agent…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
