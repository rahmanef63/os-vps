import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { DEFAULT_MODEL, readConfig, writeConfig } from "@/lib/config/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → masked config (never returns the raw key). POST → set key/model.
// Session-gated; mirrors the old appConfig getConfig(masked)/setConfig.

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfg = await readConfig();
  const key = cfg.anthropicApiKey ?? "";
  return NextResponse.json({
    hasApiKey: key.length > 0,
    apiKeyMasked: key ? `${key.slice(0, 6)}…${key.slice(-4)}` : "",
    model: cfg.model || DEFAULT_MODEL,
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { anthropicApiKey?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const patch: { anthropicApiKey?: string; model?: string } = {};
  // Empty string clears the key; undefined leaves it untouched.
  if (typeof body.anthropicApiKey === "string") patch.anthropicApiKey = body.anthropicApiKey.trim();
  if (typeof body.model === "string" && body.model.trim()) patch.model = body.model.trim();
  await writeConfig(patch);
  return NextResponse.json({ ok: true });
}
