import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, readConfig, writeConfig, hostCredentialStore } from "@/lib/config/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → masked config (never the raw key). POST → set provider/model + BYOK key
// (stored per-provider via the CredentialStore). Session-gated.

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfg = await readConfig();
  const provider = cfg.provider || DEFAULT_PROVIDER;
  // Masked shows only a locally-stored key; hasApiKey also honours an env fallback.
  const stored = cfg.keys?.[provider] ?? (provider === "anthropic" ? cfg.anthropicApiKey : undefined) ?? "";
  const key = stored || (await hostCredentialStore().getKey(undefined, provider)) || "";
  return NextResponse.json({
    provider,
    model: cfg.model || DEFAULT_MODEL,
    hasApiKey: key.length > 0,
    apiKeyMasked: stored ? `${stored.slice(0, 6)}…${stored.slice(-4)}` : "",
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { apiKey?: string; anthropicApiKey?: string; model?: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const provider = (body.provider || DEFAULT_PROVIDER).trim();
  const patch: { model?: string; provider?: string } = { provider };
  if (typeof body.model === "string" && body.model.trim()) patch.model = body.model.trim();
  await writeConfig(patch);

  // Key routes through the per-provider store. Empty string clears it (incl. the
  // legacy anthropicApiKey alias) so a cleared key doesn't linger.
  const apiKey = body.apiKey ?? body.anthropicApiKey;
  if (typeof apiKey === "string") {
    const store = hostCredentialStore();
    if (apiKey.trim()) {
      await store.setKey(undefined, provider, apiKey.trim());
    } else {
      await store.deleteKey(undefined, provider);
      if (provider === "anthropic") await writeConfig({ anthropicApiKey: undefined });
    }
  }
  return NextResponse.json({ ok: true });
}
