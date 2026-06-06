import Anthropic from "@anthropic-ai/sdk";
import { requireSession } from "@/lib/auth/require-session";
import { resolveApiKey, resolveModel } from "@/lib/config/store";

// SSE streaming chat for the "Alfa" assistant. BYOK: the Anthropic key comes
// from the owner's host config file, falling back to the server env. Auth-gated
// by the signed-cookie session (same gate as /api/v1). Node runtime — the
// Anthropic SDK isn't edge-compatible.
//
// Tool-calling: the caller may pass `tools` (Anthropic input_schema shape). The
// model's tool_use blocks are streamed back as `tool_use` events; the CLIENT
// executes them (e.g. against the live image-editor store) and POSTs the
// tool_result back in a follow-up turn. State lives in the message history the
// client sends each turn — this route is stateless.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = [
  "You are Alfa, the assistant inside Topside — a web cockpit for a headless VPS.",
  "Be concise and direct. When tools are available, USE them to perform the user's request",
  "rather than describing the steps. Call doc.inspect first if you need current state.",
  "Prefer one tool call at a time when later calls depend on earlier results.",
  "After the work is done, reply with a one-line confirmation. No meta-commentary.",
].join(" ");

type ToolUse = { id: string; name: string; input: Record<string, unknown> };
type InMsg =
  | { role: "user"; text: string }
  | { role: "assistant"; text?: string; toolUses?: ToolUse[] }
  | { role: "tool"; results: { id: string; content: string; isError?: boolean }[] };

type Tool = { name: string; description: string; input_schema: Record<string, unknown> };

// Map our wire messages → Anthropic MessageParam[].
function toAnthropic(messages: InMsg[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      if (m.text?.trim()) out.push({ role: "user", content: m.text });
    } else if (m.role === "assistant") {
      const content: Anthropic.ContentBlockParam[] = [];
      if (m.text?.trim()) content.push({ type: "text", text: m.text });
      for (const t of m.toolUses ?? []) content.push({ type: "tool_use", id: t.id, name: t.name, input: t.input });
      if (content.length) out.push({ role: "assistant", content });
    } else if (m.role === "tool") {
      out.push({
        role: "user",
        content: m.results.map((r) => ({
          type: "tool_result" as const,
          tool_use_id: r.id,
          content: r.content,
          is_error: r.isError,
        })),
      });
    }
  }
  return out;
}

export async function POST(req: Request) {
  if (!(await requireSession())) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: { messages?: InMsg[]; tools?: Tool[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const messages = toAnthropic((body.messages ?? []).slice(-40));
  if (messages.length === 0) return Response.json({ error: "empty" }, { status: 400 });

  const key = await resolveApiKey();
  const model = await resolveModel();
  if (!key) return Response.json({ error: "no_api_key" }, { status: 501 });

  const anthropic = new Anthropic({ apiKey: key });
  const encoder = new TextEncoder();
  const sse = (event: string, data: unknown) =>
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const tools = Array.isArray(body.tools) && body.tools.length ? body.tools : undefined;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ai = anthropic.messages.stream({
          model: model || "claude-opus-4-8",
          max_tokens: 4096,
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          messages,
          ...(tools ? { tools: tools as Anthropic.Tool[] } : {}),
        });
        for await (const ev of ai) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            controller.enqueue(sse("delta", ev.delta.text));
          }
        }
        const final = await ai.finalMessage();
        const uses = final.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
        for (const u of uses) controller.enqueue(sse("tool_use", { id: u.id, name: u.name, input: u.input }));
        controller.enqueue(sse("done", { stopReason: final.stop_reason }));
      } catch (err) {
        controller.enqueue(sse("error", err instanceof Error ? err.message : "stream_error"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
    },
  });
}
