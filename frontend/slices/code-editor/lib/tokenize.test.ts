// Tests for the incremental tokenize cache (Option A). Verifies:
//   1. Identical inputs hit the full-body LRU (zero re-tokenize calls).
//   2. Single-line edit on a line-independent lang (md/css) only re-tokenizes
//      the changed line, reusing all unchanged lines.
//   3. Multi-line edit invalidates exactly the affected window.
//   4. Output HTML still matches the legacy non-cached path for correctness.
import { describe, expect, it, beforeEach } from "vitest";
import {
  highlight,
  tokenize,
  __test,
  type TokenCache,
} from "./highlight";

describe("tokenize incremental cache", () => {
  beforeEach(() => {
    __test.resetStats();
  });

  it("populates per-line cache for markdown", () => {
    const src = "# Title\n\nHello **world**\n`code` line\nfinal";
    const cache = tokenize(src, "md");
    expect(cache.lines.length).toBe(5);
    expect(cache.hashes.length).toBe(5);
    // 5 distinct lines tokenized once each.
    expect(__test.stats.lineTokenizations).toBe(5);
  });

  it("only re-tokenizes the changed line on single-line md edit", () => {
    const src = "# Title\n\nHello **world**\n`code` line\nfinal";
    const prev = tokenize(src, "md");
    __test.resetStats();
    // Edit only line 2 (0-indexed). Lines 0, 1, 3, 4 unchanged — must reuse.
    const next = src.split("\n");
    next[2] = "Goodbye **moon**";
    const updated = tokenize(next.join("\n"), "md", prev);
    expect(__test.stats.lineTokenizations).toBe(1);
    expect(updated.lines[0]).toBe(prev.lines[0]);
    expect(updated.lines[1]).toBe(prev.lines[1]);
    expect(updated.lines[3]).toBe(prev.lines[3]);
    expect(updated.lines[4]).toBe(prev.lines[4]);
    expect(updated.lines[2]).not.toBe(prev.lines[2]);
  });

  it("only re-tokenizes changed lines on multi-line css edit", () => {
    const src = ".a { color: red; }\n.b { color: blue; }\n.c { color: green; }";
    const prev = tokenize(src, "css");
    __test.resetStats();
    const lines = src.split("\n");
    lines[0] = ".a { color: black; }";
    lines[2] = ".c { color: yellow; }";
    const updated = tokenize(lines.join("\n"), "css", prev);
    // Two lines changed → exactly two re-tokenizations.
    expect(__test.stats.lineTokenizations).toBe(2);
    expect(updated.lines[1]).toBe(prev.lines[1]);
  });

  it("expands cache when lines are inserted", () => {
    const src = "line 1\nline 2";
    const prev = tokenize(src, "md");
    __test.resetStats();
    const updated = tokenize("line 1\nNEW\nline 2", "md", prev);
    expect(updated.lines.length).toBe(3);
    // Two lines moved/added → 1 new + 1 shifted slot re-tokenized; line 0 reused.
    expect(updated.lines[0]).toBe(prev.lines[0]);
    expect(__test.stats.lineTokenizations).toBeLessThanOrEqual(2);
  });

  it("hits the full-body LRU for repeated ts inputs", () => {
    const src = "const x: number = 1;\nfunction f() { return x; }";
    highlight(src, "ts"); // primes LRU
    __test.resetStats();
    // Second call with identical content → LRU hit, no tokenize.
    highlight(src, "ts");
    expect(__test.stats.bodyTokenizations).toBe(0);
  });

  it("re-tokenizes when ts content changes", () => {
    highlight("const a = 1;", "ts");
    __test.resetStats();
    highlight("const a = 2;", "ts");
    expect(__test.stats.bodyTokenizations).toBe(1);
  });

  it("preserves multi-line comment semantics in ts", () => {
    const src = "/* multi\n   line */ const x = 1;";
    const html = highlight(src, "ts");
    // /* ... */ is one comment token spanning two lines.
    expect(html).toContain('<span class="tok-cmt">/* multi\n   line */</span>');
    expect(html).toContain('<span class="tok-kw">const</span>');
  });

  it("preserves template literals across lines (no false splits)", () => {
    const src = "const t = `hello\nworld`;";
    const html = highlight(src, "ts");
    expect(html).toContain('<span class="tok-str">`hello\nworld`</span>');
  });

  it("highlight() output matches a fresh tokenize() body", () => {
    const src = "## hello\n- one\n- two";
    const a = highlight(src, "md");
    const b = tokenize(src, "md").body + "\n";
    expect(a).toBe(b);
  });

  it("returns same cache object when codeHash unchanged for ts", () => {
    const src = "const a = 1;";
    const prev: TokenCache = tokenize(src, "ts");
    const next = tokenize(src, "ts", prev);
    expect(next).toBe(prev);
  });

  it("ts single-line edit re-tokenizes only changed line + 10 below", () => {
    // Build a 50-line ts file so the window (10) is well inside it.
    const lines: string[] = [];
    for (let i = 0; i < 50; i++) lines.push(`const x${i} = ${i};`);
    const src = lines.join("\n");
    // Warm up: cold tokenize falls through to full-body (LRU populated below).
    const cold = tokenize(src, "ts");
    // Seed line cache by tokenizing once with a fake prev that has lines.
    const seeded: TokenCache = {
      lang: "ts",
      lines: lines.map((l) => l),
      hashes: lines.map((l) => __test.hash(l)),
      body: src,
      codeHash: cold.codeHash,
    };
    __test.resetStats();
    // Edit line 5 only. Window=10 → lines 5..15 re-tokenize (11 lines), the
    // other 39 lines reuse from `seeded.lines`.
    const edited = [...lines];
    edited[5] = "const x5 = 999;";
    tokenize(edited.join("\n"), "ts", seeded);
    expect(__test.stats.lineTokenizations).toBe(11);
  });

  it("ts incremental tokenize call count is bounded across edits", () => {
    const lines: string[] = [];
    for (let i = 0; i < 100; i++) lines.push(`let v${i} = ${i};`);
    const src = lines.join("\n");
    const cold = tokenize(src, "ts");
    const seeded: TokenCache = {
      lang: "ts",
      lines: lines.map((l) => l),
      hashes: lines.map((l) => __test.hash(l)),
      body: src,
      codeHash: cold.codeHash,
    };
    __test.resetStats();
    // Three sequential single-line edits, accumulated — each edit only
    // re-tokenizes its changed line + 10-line window. Total ≤ 33 (3 × 11),
    // versus the non-incremental 300 (3 × full-body).
    let prev = seeded;
    const buf = [...lines];
    for (const idx of [10, 40, 70]) {
      buf[idx] = `let v${idx} = 999;`;
      prev = tokenize(buf.join("\n"), "ts", prev);
    }
    expect(__test.stats.lineTokenizations).toBeLessThanOrEqual(33);
  });

  it("ts cold tokenize (no prev) still uses full-body path", () => {
    // Cross-line constructs require full-body on cold start.
    __test.resetStats();
    const out = tokenize("/* a\n   b */ const x = 1;", "ts");
    // No prev → full-body path → bodyTokenizations bumps, lineTokenizations 0.
    expect(__test.stats.bodyTokenizations).toBe(1);
    expect(__test.stats.lineTokenizations).toBe(0);
    expect(out.body).toContain('<span class="tok-cmt">/* a\n   b */</span>');
  });
});
