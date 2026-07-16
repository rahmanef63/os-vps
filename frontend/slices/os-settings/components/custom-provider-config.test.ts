import { describe, it, expect } from "vitest";
import { parseCustomProviderConfig, parseModelList } from "./custom-provider-config";

describe("parseCustomProviderConfig", () => {
  it("parses field aliases + a delimited models string", () => {
    const c = parseCustomProviderConfig(
      JSON.stringify({ slug: "My LLM", endpoint: "https://h/v1", key: "sk-1", protocol: "openai", models: "a, b\nc" }),
    );
    expect(c).toMatchObject({ name: "My LLM", baseURL: "https://h/v1", apiKey: "sk-1", protocol: "openai" });
    expect(c.models).toEqual(["a", "b", "c"]);
  });

  it("throws when essentials are missing", () => {
    expect(() => parseCustomProviderConfig(JSON.stringify({ name: "x" }))).toThrow(/needs/);
  });

  it("parseModelList splits comma + newline and trims blanks", () => {
    expect(parseModelList("a, b\n c ,")).toEqual(["a", "b", "c"]);
  });
});
