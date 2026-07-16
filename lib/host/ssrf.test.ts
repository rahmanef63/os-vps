import { describe, it, expect } from "vitest";
import { assertSafeUrl } from "./ssrf";

describe("assertSafeUrl", () => {
  it("accepts a public https endpoint", () => {
    expect(assertSafeUrl("https://api.example.com/v1").hostname).toBe("api.example.com");
  });

  it("rejects the cloud-metadata IP", () => {
    expect(() => assertSafeUrl("http://169.254.169.254/latest/meta-data")).toThrow(/not allowed/);
  });

  it("rejects loopback / private / link-local / non-http", () => {
    for (const u of [
      "http://localhost/v1",
      "http://127.0.0.1",
      "http://10.0.0.1",
      "http://192.168.1.1",
      "http://172.16.0.1",
      "http://[::1]/",
      "https://foo.internal",
      "ftp://example.com",
      "not a url",
    ]) {
      expect(() => assertSafeUrl(u)).toThrow();
    }
  });
});
