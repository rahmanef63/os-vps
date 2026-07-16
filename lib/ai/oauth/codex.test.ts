import { describe, it, expect } from "vitest";
import { decodeAccountId } from "./codex";

describe("decodeAccountId", () => {
  it("reads chatgpt_account_id from the token JWT payload", () => {
    const payload = { "https://api.openai.com/auth": { chatgpt_account_id: "acct_123" } };
    const seg = Buffer.from(JSON.stringify(payload)).toString("base64url");
    expect(decodeAccountId(`header.${seg}.sig`)).toBe("acct_123");
  });

  it("returns undefined on a malformed / empty token", () => {
    expect(decodeAccountId("not-a-jwt")).toBeUndefined();
    expect(decodeAccountId("")).toBeUndefined();
  });
});
