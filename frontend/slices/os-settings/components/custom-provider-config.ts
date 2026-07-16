// Pure parse of a pasted custom-provider JSON config → the add-provider payload.
// Accepts common field aliases (base_url/endpoint, api_key/key, slug/name) and
// models as array or delimited string. Throws on bad JSON or missing essentials;
// the caller surfaces the message. No React — importable + testable in isolation.
// Ported from models-rahmanef-com; the /api/config route re-validates server-side.
export type CustomConfig = { name: string; baseURL: string; apiKey: string; protocol?: string; models?: string[] };

export const parseModelList = (s: string): string[] => s.split(/[\n,]/).map((m) => m.trim()).filter(Boolean);

export function parseCustomProviderConfig(json: string): CustomConfig {
  const o = JSON.parse(json);
  const name = o.name ?? o.slug,
    baseURL = o.baseURL ?? o.base_url ?? o.endpoint,
    apiKey = o.apiKey ?? o.api_key ?? o.key;
  if (!name || !baseURL || !apiKey) throw new Error("JSON needs name, baseURL and apiKey.");
  const models = Array.isArray(o.models)
    ? o.models.map((m: unknown) => String(m))
    : typeof o.models === "string"
      ? parseModelList(o.models)
      : undefined;
  return { name: String(name), baseURL: String(baseURL), apiKey: String(apiKey), protocol: o.protocol ? String(o.protocol) : undefined, models };
}
