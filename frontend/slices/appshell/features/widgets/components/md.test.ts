import { describe, expect, it } from "vitest";
import { mdToHtml } from "./md";

describe("mdToHtml", () => {
  it("renders basic markdown", () => {
    expect(mdToHtml("# Hi")).toContain('<div class="text-lg font-bold">Hi</div>');
    expect(mdToHtml("**b**")).toContain("<strong>b</strong>");
    expect(mdToHtml("[t](https://x.com)")).toContain('href="https://x.com"');
  });

  it("escapes raw HTML (no tag injection)", () => {
    expect(mdToHtml("<script>alert(1)</script>")).not.toContain("<script>");
    expect(mdToHtml("<img src=x>")).toContain("&lt;img");
  });

  it("a link URL cannot break out of the href attribute (XSS regression)", () => {
    const out = mdToHtml('[x](https://a"onmouseover=alert//)');
    expect(out).not.toContain('"onmouseover'); // the user's quote must not close href=
    expect(out).toContain("&quot;onmouseover"); // it stays escaped INSIDE the value
  });
});
