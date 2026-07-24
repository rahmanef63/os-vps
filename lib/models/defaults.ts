export const DEFAULT_PROVIDER = "anthropic";

export const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-opus-4-8",
  openai: "gpt-4o",
  openrouter: "openai/gpt-4o",
  google: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
  xai: "grok-2-latest",
  deepseek: "deepseek-chat",
  mistral: "mistral-large-latest",
  "openai-codex": "gpt-5-codex",
};

export function defaultModelFor(provider?: string): string {
  return DEFAULT_MODELS[provider || DEFAULT_PROVIDER] ?? "gpt-4o";
}
