import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { listModels } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Model catalog for the Settings → AI picker + the Browse dialog, sourced from the
// models.dev cache (offline-tolerant: stale cache or empty on a cold offline box).
// Session-gated. ?provider=<slug> filters to one provider to keep the payload small.
// Each row carries capability/pricing meta (context, cost, tools, reasoning); the
// model field stays free-text so an id not in the catalog still works.
export async function GET(req: NextRequest) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const provider = req.nextUrl.searchParams.get("provider");
  try {
    const all = await listModels();
    const models = (provider ? all.filter((m) => m.provider === provider) : all).map((m) => ({
      ref: m.ref,
      provider: m.provider,
      // model id = ref minus the "provider/" prefix (ids may contain "/").
      id: m.ref.slice(m.provider.length + 1),
      name: m.name,
      context: m.limit?.context,
      inputCost: m.cost?.input,
      outputCost: m.cost?.output,
      tools: !!m.tool_call,
      reasoning: !!m.reasoning,
      vision: Array.isArray(m.modalities?.input) ? m.modalities.input.includes("image") : false,
    }));
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] }); // offline + no cache → the UI just loses suggestions
  }
}
