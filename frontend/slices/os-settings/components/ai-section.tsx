"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { toast } from "@/features/os-shell";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SettingsSection, SettingsRow, SettingsBlock } from "@/features/shell-settings";

type Cfg = { hasApiKey: boolean; apiKeyMasked: string; model: string; provider?: string };
type CatModel = { ref: string; provider: string; id: string };

// Curated BYOK providers (the @rahmanef/models registry wires ~35; these are the
// common ones). Every non-Anthropic provider streams through the openai-protocol
// adapter. There is NO OAuth for these platform APIs — paste an API key.
const PROVIDERS: { slug: string; label: string; keyHint: string }[] = [
  { slug: "anthropic", label: "Anthropic (Claude)", keyHint: "sk-ant-…" },
  { slug: "openai", label: "OpenAI (GPT)", keyHint: "sk-…" },
  { slug: "openrouter", label: "OpenRouter", keyHint: "sk-or-…" },
  { slug: "google", label: "Google (Gemini)", keyHint: "AIza…" },
  { slug: "groq", label: "Groq", keyHint: "gsk_…" },
  { slug: "xai", label: "xAI (Grok)", keyHint: "xai-…" },
  { slug: "deepseek", label: "DeepSeek", keyHint: "sk-…" },
  { slug: "mistral", label: "Mistral", keyHint: "…" },
];

// Sensible default model per provider so switching provider never leaves a
// cross-provider model id (e.g. anthropic's default paired with openai).
const DEFAULT_MODEL: Record<string, string> = {
  anthropic: "claude-opus-4-8",
  openai: "gpt-4o",
  openrouter: "openai/gpt-4o",
  google: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
  xai: "grok-2-latest",
  deepseek: "deepseek-chat",
  mistral: "mistral-large-latest",
};

// BYOK config for the Alfa assistant. The raw key is write-only from here — GET
// /api/config returns only a masked preview. Empty key field on save keeps the
// stored key (the route falls back to the provider's env var if none set).
export function AiSection() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [provider, setProvider] = useState("anthropic");
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [catalog, setCatalog] = useState<CatModel[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchCfg = useCallback(async (): Promise<Cfg | null> => {
    try {
      const r = await fetch("/api/config", { cache: "no-store" });
      return r.ok ? ((await r.json()) as Cfg) : null;
    } catch {
      return null; /* leave null → Save stays disabled */
    }
  }, []);

  const applyCfg = useCallback((c: Cfg) => {
    setCfg(c);
    setProvider(c.provider || "anthropic");
  }, []);

  const load = useCallback(async () => {
    const c = await fetchCfg();
    if (c) applyCfg(c);
  }, [fetchCfg, applyCfg]);

  useEffect(() => {
    let alive = true;
    fetchCfg().then((c) => alive && c && applyCfg(c));
    return () => {
      alive = false;
    };
  }, [fetchCfg, applyCfg]);

  // Model suggestions for the picked provider (models.dev catalog). Offline / no
  // cache → empty; the model field stays free-text so it always works.
  useEffect(() => {
    let alive = true;
    fetch(`/api/models?provider=${encodeURIComponent(provider)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((d) => alive && setCatalog((d.models ?? []) as CatModel[]))
      .catch(() => alive && setCatalog([]));
    return () => {
      alive = false;
    };
  }, [provider]);

  async function onSave() {
    setBusy(true);
    try {
      const r = await fetch("/api/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider,
          // Empty string clears a stored key; undefined leaves it untouched.
          ...(key.trim() ? { apiKey: key.trim() } : {}),
          ...(model.trim() ? { model: model.trim() } : {}),
        }),
      });
      if (!r.ok) {
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

  const prov = PROVIDERS.find((p) => p.slug === provider);
  // Only trust the masked preview / stored model when the picked provider still
  // matches what's saved (before a save, switching provider shows placeholders).
  const onSavedProvider = provider === cfg?.provider;

  return (
    <SettingsSection
      icon={<Sparkles />}
      title="AI (Alfa)"
      footnote={
        <>
          Bring your own API key (stored server-side, never shown again). OpenAI &amp; the other
          providers use a pasted key — there is no “sign in with OpenAI” for the platform API. If
          the key field is empty, the matching server env var (e.g. <code>ANTHROPIC_API_KEY</code>,{" "}
          <code>OPENAI_API_KEY</code>) is used.
        </>
      }
    >
      <SettingsRow label="Provider">
        <Select
          value={provider}
          onValueChange={(v) => {
            setProvider(v);
            setModel(DEFAULT_MODEL[v] ?? ""); // avoid a stale cross-provider model id
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow label={`${prov?.label ?? "Provider"} key`}>
        <Input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={onSavedProvider && cfg?.hasApiKey ? cfg.apiKeyMasked : (prov?.keyHint ?? "API key")}
          className="sm:w-56"
        />
      </SettingsRow>
      <SettingsRow label="Model">
        <Input
          list="ai-model-suggestions"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={(onSavedProvider && cfg?.model) || DEFAULT_MODEL[provider] || "model id"}
          className="sm:w-56"
        />
        <datalist id="ai-model-suggestions">
          {catalog.map((m) => (
            <option key={m.ref} value={m.id} />
          ))}
        </datalist>
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
