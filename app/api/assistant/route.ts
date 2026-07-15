import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth/require-session";
import { resolveModelRef, hostCredentialStore } from "@/lib/config/store";
import { resolveModel } from "@/lib/models";
import { streamOpenAI } from "@/lib/ai/openai-stream";
import { rateLimited } from "@/lib/host/rate-limit";

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

// Burst guard. Owner-only endpoint with BYOK billing, so this is a runaway-loop
// tripwire (not anti-abuse): a buggy client polling a tool_result loop or a stuck
// retry would otherwise quietly burn the owner's Anthropic budget. 30 req/min is
// well above any real human interaction rate.
const ASSISTANT_MAX = 30;
const ASSISTANT_WINDOW_MS = 60_000;

// App-neutral default. Callers with their own tool set (image editor, host
// agent) pass a `system` override tailored to their tools + approval contract.
const SYSTEM = [
  "You are Alfa, the assistant inside Topside — a web cockpit for a headless VPS.",
  "Be concise and direct. When tools are available, USE them to perform the user's request",
  "rather than describing the steps.",
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
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  // Per-session bucket so two browsers on different approved devices each get
  // their own quota. Falls back to "anon" only when the typed payload is missing
  // a device_id (shouldn't happen — getSession() already rejects those).
  if (rateLimited(`assistant:${session.device_id ?? "anon"}`, ASSISTANT_MAX, ASSISTANT_WINDOW_MS)) {
    return Response.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(ASSISTANT_WINDOW_MS / 1000)) } },
    );
  }

  let body: { messages?: InMsg[]; tools?: Tool[]; system?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const rawMessages = (body.messages ?? []).slice(-40);
  if (rawMessages.length === 0) return Response.json({ error: "empty" }, { status: 400 });
  const sys = typeof body.system === "string" && body.system.trim() ? body.system.slice(0, 4000) : SYSTEM;

  // Resolve model + BYOK key + host-gated endpoint through @rahmanef/models. The
  // registry pins each provider's key to its own baseUrl (key can't be redirected).
  let resolved;
  try {
    resolved = await resolveModel(await resolveModelRef(), { store: hostCredentialStore() });
  } catch {
    // resolveModel throws when no BYOK key is set for the selected provider.
    return Response.json({ error: "no_api_key" }, { status: 501 });
  }
  // Anthropic streams via its SDK; every openai-protocol provider (OpenAI + ~30
  // compatible) streams via our adapter. Both emit the same neutral
  // delta|tool_use|done|error SSE vocab, so the client is provider-agnostic.
  const anthropic = new Anthropic({ apiKey: resolved.apiKey, baseURL: resolved.baseUrl });
  const encoder = new TextEncoder();
  const sse = (event: string, data: unknown) =>
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const tools = Array.isArray(body.tools) && body.tools.length ? body.tools : undefined;

  // One upstream Anthropic stream per request. Hoisted so the stream's cancel()
  // (fired when the client aborts / the window closes) can abort the upstream
  // generation — otherwise tokens keep billing after the SSE socket is gone.
  let ai: ReturnType<typeof anthropic.messages.stream> | null = null;
  let closed = false; // guard: never enqueue/close on an already-closed controller

  const stream = new ReadableStream({
    async start(controller) {
      const safeEnqueue = (chunk: Uint8Array) => {
        if (!closed && !req.signal.aborted) controller.enqueue(chunk);
      };
      const emit = (event: string, data: unknown) => safeEnqueue(sse(event, data));
      try {
        if (resolved.protocol === "anthropic") {
          ai = anthropic.messages.stream(
            {
              model: resolved.model,
              max_tokens: 4096,
              system: [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }],
              messages: toAnthropic(rawMessages),
              ...(tools ? { tools: tools as Anthropic.Tool[] } : {}),
            },
            { signal: req.signal },
          );
          for await (const ev of ai) {
            if (req.signal.aborted) break;
            if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
              emit("delta", ev.delta.text);
            }
          }
          if (!req.signal.aborted) {
            const final = await ai.finalMessage();
            const uses = final.content.filter(
              (b: Anthropic.ContentBlock): b is Anthropic.ToolUseBlock => b.type === "tool_use",
            );
            for (const u of uses) emit("tool_use", { id: u.id, name: u.name, input: u.input });
            emit("done", { stopReason: final.stop_reason });
          }
        } else {
          // openai-protocol: the adapter POSTs {baseUrl}/chat/completions
          // {stream:true} with the host-gated BYOK key and emits the same events.
          // req.signal cancels the upstream fetch (billing cutoff on abort).
          await streamOpenAI({ resolved, messages: rawMessages, tools, system: sys, signal: req.signal, emit });
        }
      } catch (err) {
        // Abort isn't an error to report — the consumer is already gone.
        if (!req.signal.aborted)
          safeEnqueue(sse("error", err instanceof Error ? err.message : "stream_error"));
      } finally {
        if (!closed) {
          closed = true;
          try { controller.close(); } catch { /* already closed/errored */ }
        }
      }
    },
    cancel() {
      // Client closed the window / aborted: stop billing the upstream tokens.
      closed = true;
      ai?.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}
