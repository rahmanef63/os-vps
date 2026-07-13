import type { JsonSchema } from "./types";

// Tiny JSON-Schema property builders (mirror of the image-editor's schema.ts) —
// keep the tool catalog readable. Each returns a property node; `obj()` assembles
// them and tracks `required` keys (suffix a key with "!" to mark it required).
export const str = (description: string, opts: { enum?: readonly string[] } = {}) => ({
  type: "string" as const,
  description,
  ...(opts.enum ? { enum: opts.enum as string[] } : {}),
});
export const num = (description: string, opts: { min?: number; max?: number } = {}) => ({
  type: "number" as const,
  description,
  ...(opts.min !== undefined ? { minimum: opts.min } : {}),
  ...(opts.max !== undefined ? { maximum: opts.max } : {}),
});
export const bool = (description: string) => ({ type: "boolean" as const, description });

export function obj(props: Record<string, unknown>): JsonSchema {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [k, v] of Object.entries(props)) {
    const key = k.endsWith("!") ? k.slice(0, -1) : k;
    if (k.endsWith("!")) required.push(key);
    properties[key] = v;
  }
  return { type: "object", properties, required, additionalProperties: false };
}
