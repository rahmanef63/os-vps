"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Section } from "./section";
import { Row } from "./row";

type Cfg = { hasApiKey: boolean; apiKeyMasked: string; model: string };

// BYOK Anthropic config for the Alfa assistant. The raw key is write-only from
// here — GET /api/config returns only a masked preview. Empty key field on save
// keeps the stored key (the route falls back to ANTHROPIC_API_KEY if none set).
export function AiSection() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/config", { cache: "no-store" });
      if (r.ok) setCfg((await r.json()) as Cfg);
    } catch {
      /* leave null → Save stays disabled */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(key.trim() ? { anthropicApiKey: key.trim() } : {}),
        ...(model.trim() ? { model: model.trim() } : {}),
      }),
    });
    setKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    void load();
  }

  return (
    <Section icon={<Sparkles />} title="AI (Alfa)">
      <Row label="Anthropic key">
        <Input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={cfg?.hasApiKey ? cfg.apiKeyMasked : "sk-ant-…"}
          className="sm:w-56"
        />
      </Row>
      <Row label="Model">
        <Input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={cfg?.model ?? "claude-opus-4-8"}
          className="sm:w-56"
        />
      </Row>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={cfg === null}>
          {saved ? <Check className="size-3.5" /> : null}
          {saved ? "Saved" : "Save"}
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Bring your own Anthropic key (stored server-side, never shown again). If
        empty, the server&apos;s <code>ANTHROPIC_API_KEY</code> is used. Key never
        reaches the browser after saving.
      </p>
    </Section>
  );
}
