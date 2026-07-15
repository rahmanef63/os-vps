"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { toast } from "@/features/os-shell";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SettingsSection, SettingsRow, SettingsBlock } from "@/features/shell-settings";

type Cfg = { hasApiKey: boolean; apiKeyMasked: string; model: string; provider?: string };

// Current Anthropic model ids (first slice is Anthropic-only; the catalog-driven
// multi-provider list lands with the openai-protocol adapter).
const ANTHROPIC_MODELS = ["claude-opus-4-8", "claude-sonnet-5", "claude-haiku-4-5-20251001", "claude-fable-5"];

// BYOK Anthropic config for the Alfa assistant. The raw key is write-only from
// here — GET /api/config returns only a masked preview. Empty key field on save
// keeps the stored key (the route falls back to ANTHROPIC_API_KEY if none set).
export function AiSection() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Pure fetch (no setState) so the mount effect can use the .then form
  // (react-hooks/set-state-in-effect).
  const fetchCfg = useCallback(async (): Promise<Cfg | null> => {
    try {
      const r = await fetch("/api/config", { cache: "no-store" });
      return r.ok ? ((await r.json()) as Cfg) : null;
    } catch {
      return null; /* leave null → Save stays disabled */
    }
  }, []);

  const load = useCallback(async () => {
    const c = await fetchCfg();
    if (c) setCfg(c);
  }, [fetchCfg]);

  useEffect(() => {
    let alive = true;
    fetchCfg().then((c) => alive && c && setCfg(c));
    return () => {
      alive = false;
    };
  }, [fetchCfg]);

  async function onSave() {
    setBusy(true);
    try {
      const r = await fetch("/api/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "anthropic",
          // Empty string clears a stored key; undefined leaves it untouched.
          ...(key.trim() ? { apiKey: key.trim() } : {}),
          ...(model.trim() ? { model: model.trim() } : {}),
        }),
      });
      if (!r.ok) {
        // Keep the field on failure so the user doesn't lose their input.
        toast(r.status === 401 ? "Session expired — sign in again" : "Couldn’t save AI config", { tone: "error" });
        return;
      }
      setKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      void load();
    } catch {
      toast("Couldn’t reach the server", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsSection
      icon={<Sparkles />}
      title="AI (Alfa)"
      footnote={
        <>
          Bring your own Anthropic key (stored server-side, never shown again). If
          empty, the server&apos;s <code>ANTHROPIC_API_KEY</code> is used. Key never
          reaches the browser after saving.
        </>
      }
    >
      <SettingsRow label="Anthropic key">
        <Input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={cfg?.hasApiKey ? cfg.apiKeyMasked : "sk-ant-…"}
          className="sm:w-56"
        />
      </SettingsRow>
      <SettingsRow label="Model">
        <Select value={model || cfg?.model || "claude-opus-4-8"} onValueChange={setModel}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANTHROPIC_MODELS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsBlock className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={cfg === null || busy}>
          {saved ? <Check className="size-3.5" /> : null}
          {saved ? "Saved" : busy ? "Saving…" : "Save"}
        </Button>
      </SettingsBlock>
    </SettingsSection>
  );
}
