import type { OAuthBundle } from "@/lib/config/store";
import { CODEX } from "./oauth/codex";
import type { OaMsg } from "./openai-stream";

// Stream a chat via the ChatGPT "Codex" backend Responses API. Unlike the OpenAI
// platform (/chat/completions), this is the consumer backend: the OAuth bearer +
// the account id from the token, the Responses request shape, and SSE events named
// `response.output_text.delta`. Chat-only — no tools. Emits the same delta|done vocab
// the other streamers do, so the client stays provider-agnostic.
export async function streamCodex(opts: {
  bundle: OAuthBundle;
  model: string;
  messages: OaMsg[];
  system: string;
  signal: AbortSignal;
  emit: (event: "delta" | "tool_use" | "done", data: unknown) => void;
}): Promise<void> {
  const { bundle, model, messages, system, signal, emit } = opts;
  if (signal.aborted) return;

  const input = messages
    .filter((m): m is Extract<OaMsg, { role: "user" | "assistant" }> => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      type: "message" as const,
      role: m.role,
      content: [{ type: m.role === "assistant" ? "output_text" : "input_text", text: ("text" in m && m.text) || "" }],
    }))
    .filter((m) => m.content[0].text.trim());

  const res = await fetch(`${CODEX.apiBase}/responses`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${bundle.access}`,
      originator: "codex_cli_rs",
      "user-agent": "codex_cli_rs/0.0.0 (os-vps)",
      "chatgpt-account-id": bundle.accountId ?? "",
      "openai-beta": "responses=experimental",
      accept: "text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, store: false, stream: true, instructions: system, input }),
    signal,
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`openai-codex HTTP ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    if (signal.aborted) {
      await reader.cancel().catch(() => {});
      return;
    }
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let ev: { type?: string; delta?: string };
      try {
        ev = JSON.parse(data);
      } catch {
        continue;
      }
      if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") emit("delta", ev.delta);
    }
  }
  emit("done", { stopReason: "end_turn" });
}
