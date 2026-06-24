import { describe, expect, it } from "vitest";
import {
  faviconFor,
  hostOf,
  isSecure,
  isUrlLike,
  normalizeUrl,
  toTarget,
} from "./url";

describe("isUrlLike", () => {
  it("returns true for https:// prefix", () => {
    expect(isUrlLike("https://example.com")).toBe(true);
  });

  it("returns true for http:// prefix", () => {
    expect(isUrlLike("http://example.com")).toBe(true);
  });

  it("returns true for bare domain.tld", () => {
    expect(isUrlLike("example.com")).toBe(true);
  });

  it("returns true for subdomain.domain.tld", () => {
    expect(isUrlLike("www.example.com")).toBe(true);
  });

  it("returns true for localhost", () => {
    expect(isUrlLike("localhost")).toBe(true);
  });

  it("returns true for localhost:3000", () => {
    expect(isUrlLike("localhost:3000")).toBe(true);
  });

  it("returns true for localhost with path", () => {
    expect(isUrlLike("localhost:3000/dashboard")).toBe(true);
  });

  it("returns false for query with spaces", () => {
    expect(isUrlLike("how to fix this bug")).toBe(false);
  });

  it("returns false for single word", () => {
    expect(isUrlLike("hello")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isUrlLike("")).toBe(false);
  });

  it("returns false for whitespace only", () => {
    expect(isUrlLike("   ")).toBe(false);
  });

  it("trims leading/trailing whitespace before checking", () => {
    expect(isUrlLike("  https://example.com  ")).toBe(true);
  });
});

describe("normalizeUrl", () => {
  it("leaves https:// scheme unchanged", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("leaves http:// scheme unchanged", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("prepends https:// to a bare domain", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
  });

  it("leaves other schemes (ftp://) unchanged", () => {
    expect(normalizeUrl("ftp://files.example.com")).toBe("ftp://files.example.com");
  });

  it("trims whitespace before normalizing", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
  });
});

describe("toTarget", () => {
  it("returns normalized url for a url-like input", () => {
    expect(toTarget("example.com")).toBe("https://example.com");
  });

  it("returns normalized url for https input", () => {
    expect(toTarget("https://example.com/path")).toBe("https://example.com/path");
  });

  it("returns Google search URL for a single word", () => {
    expect(toTarget("hello")).toBe(
      "https://www.google.com/search?q=" + encodeURIComponent("hello"),
    );
  });

  it("returns Google search URL with encoded spaces for a phrase", () => {
    const query = "how to fix this bug";
    expect(toTarget(query)).toBe(
      "https://www.google.com/search?q=" + encodeURIComponent(query),
    );
  });

  it("encodes special characters in search queries", () => {
    const query = "what is 2+2?";
    expect(toTarget(query)).toBe(
      "https://www.google.com/search?q=" + encodeURIComponent(query),
    );
  });

  it("returns Google search for empty string", () => {
    expect(toTarget("")).toBe(
      "https://www.google.com/search?q=" + encodeURIComponent(""),
    );
  });
});

describe("hostOf", () => {
  it("strips www. prefix from https URL", () => {
    expect(hostOf("https://www.example.com/path")).toBe("example.com");
  });

  it("returns hostname without www for non-www https", () => {
    expect(hostOf("https://example.com")).toBe("example.com");
  });

  it("returns hostname for http URL", () => {
    expect(hostOf("http://www.example.com")).toBe("example.com");
  });

  it("falls through and returns raw string for non-http input", () => {
    expect(hostOf("example.com")).toBe("example.com");
  });

  it("falls through and returns raw string for malformed URL", () => {
    expect(hostOf("https://[invalid")).toBe("https://[invalid");
  });

  it("strips www only from the start of the hostname", () => {
    expect(hostOf("https://notwww.example.com")).toBe("notwww.example.com");
  });
});

describe("faviconFor", () => {
  it("returns s2 favicon URL for https input", () => {
    const url = "https://example.com";
    expect(faviconFor(url)).toBe(
      `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`,
    );
  });

  it("returns s2 favicon URL for http input", () => {
    const url = "http://example.com";
    expect(faviconFor(url)).toBe(
      `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`,
    );
  });

  it("returns null for a bare domain (non-http)", () => {
    expect(faviconFor("example.com")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(faviconFor("")).toBeNull();
  });

  it("returns null for a single word", () => {
    expect(faviconFor("hello")).toBeNull();
  });
});

describe("isSecure", () => {
  it("returns true for https:// URL", () => {
    expect(isSecure("https://example.com")).toBe(true);
  });

  it("returns true for HTTPS:// (case-insensitive)", () => {
    expect(isSecure("HTTPS://example.com")).toBe(true);
  });

  it("returns false for http:// URL", () => {
    expect(isSecure("http://example.com")).toBe(false);
  });

  it("returns false for a bare domain", () => {
    expect(isSecure("example.com")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSecure("")).toBe(false);
  });
});
