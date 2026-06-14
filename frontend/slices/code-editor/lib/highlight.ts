// Dep-free syntax tokenizer (ex-mock-os `hlCode`). Emits HTML <span class="tok-*">
// strings consumed by <pre dangerouslySetInnerHTML>. Token classes + VS-Code
// hex colours live alongside this slice (see editor-surface.tsx).

import {
  __cacheStats,
  hash,
  lruGet,
  lruSet,
  resetStats,
} from "./highlight-cache";

export type Lang = "ts" | "js" | "py" | "sh" | "json" | "css" | "md" | "txt";

const KEYWORDS = new Set(
  (
    "const let var function return if else for while do switch case break " +
    "continue new class extends super this import from export default await " +
    "async yield typeof instanceof in of delete void try catch finally throw " +
    "null true false undefined public private protected static interface " +
    "type enum implements namespace readonly as satisfies keyof infer never " +
    "unknown any boolean string number object symbol bigint " +
    "def lambda elif except with pass raise global nonlocal None True False " +
    "and or not is print self " +
    "echo fi then esac done local source exit "
  )
    .split(/\s+/)
    .filter(Boolean),
);

const HASH_COMMENT = new Set<Lang>(["py", "sh"]);

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string,
  );
}

function span(cls: string, text: string): string {
  return `<span class="${cls}">${escapeHtml(text)}</span>`;
}

const JSON_RE = new RegExp(
  '("(?:\\\\.|[^"\\\\])*")' +
    "|(\\b-?\\d[\\d.eE+-]*\\b)" +
    "|(true|false|null)",
  "g",
);

function highlightJson(code: string): string {
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  JSON_RE.lastIndex = 0;
  while ((m = JSON_RE.exec(code))) {
    out += escapeHtml(code.slice(last, m.index));
    if (m[1]) {
      const after = code.slice(JSON_RE.lastIndex).match(/^\s*:/);
      out += span(after ? "tok-fn" : "tok-str", m[1]);
    } else if (m[2]) out += span("tok-num", m[2]);
    else if (m[3]) out += span("tok-kw", m[3]);
    last = JSON_RE.lastIndex;
  }
  return out + escapeHtml(code.slice(last));
}

function codeRe(hashCmt: boolean): RegExp {
  const cmt = hashCmt ? "#[^\\n]*" : "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
  return new RegExp(
    `(${cmt})` +
      "|(`(?:\\\\.|[^`\\\\])*`|\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*')" +
      "|(\\b\\d[\\d_.eExXa-fA-F]*\\b)" +
      "|([A-Za-z_$][\\w$]*)",
    "g",
  );
}

function highlightCode(code: string, lang: Lang): string {
  const re = codeRe(HASH_COMMENT.has(lang));
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    out += escapeHtml(code.slice(last, m.index));
    if (m[1]) out += span("tok-cmt", m[1]);
    else if (m[2]) out += span("tok-str", m[2]);
    else if (m[3]) out += span("tok-num", m[3]);
    else {
      const word = m[4];
      if (KEYWORDS.has(word)) out += span("tok-kw", word);
      else if (code[re.lastIndex] === "(") out += span("tok-fn", word);
      else out += escapeHtml(word);
    }
    last = re.lastIndex;
  }
  return out + escapeHtml(code.slice(last));
}

// Per-line CSS tokenizer. Each line is independent (block comments aren't
// handled cross-line in the original either — matches existing behaviour).
function highlightCssLine(ln: string): string {
  if (/\/\*.*\*\//.test(ln)) return span("tok-cmt", ln);
  const m = ln.match(/^(\s*)([\w-]+)(\s*:\s*)(.+?)(;?)$/);
  if (m) return escapeHtml(m[1]) + span("tok-fn", m[2]) + escapeHtml(m[3]) + span("tok-str", m[4]) + escapeHtml(m[5]);
  return span("tok-kw", escapeHtml(ln));
}

function highlightMdLine(ln: string): string {
  if (/^\s*#{1,6}\s/.test(ln)) return span("tok-h", ln);
  let s = escapeHtml(ln);
  s = s.replace(/(`[^`]+`)/g, '<span class="tok-str">$1</span>');
  s = s.replace(/(\*\*[^*]+\*\*)/g, '<span class="tok-fn">$1</span>');
  return s;
}

// Per-line incremental cache. md/css are pure line-independent. ts/js/py/sh/
// json use a per-line memo but a changed line invalidates N lines below
// (multi-line constructs: block comments, template literals). Cold tokenize
// (no `prev`) of window-incremental langs falls through to full-body to keep
// cross-line constructs correct. Pairs with `useDeferredValue` in editor.

export interface TokenCache {
  lang: Lang;
  lines: string[];
  hashes: string[];
  body: string;
  codeHash: string;
}

const LINE_INDEPENDENT = new Set<Lang>(["css", "md"]);
const WINDOW_INCREMENTAL = new Set<Lang>(["ts", "js", "py", "sh", "json"]);
const INVALIDATION_WINDOW = 10;

function tokenizeLine(ln: string, lang: Lang): string {
  __cacheStats.lineTokenizations++;
  if (lang === "css") return highlightCssLine(ln);
  if (lang === "md") return highlightMdLine(ln);
  if (lang === "json") return highlightJson(ln);
  if (WINDOW_INCREMENTAL.has(lang)) return highlightCode(ln, lang);
  return escapeHtml(ln);
}

export function tokenize(
  code: string,
  lang: Lang,
  prev?: TokenCache,
): TokenCache {
  const reusable = prev?.lang === lang;
  const useLines =
    LINE_INDEPENDENT.has(lang) ||
    (WINDOW_INCREMENTAL.has(lang) && reusable && prev!.lines.length > 0);
  if (useLines) {
    const src = code.split("\n");
    const lines: string[] = new Array(src.length);
    const hashes: string[] = new Array(src.length);
    const prevLines = reusable ? prev!.lines : [];
    const prevHashes = reusable ? prev!.hashes : [];
    const changed = new Set<number>();
    for (let i = 0; i < src.length; i++) {
      const h = hash(src[i]);
      hashes[i] = h;
      if (prevHashes[i] !== h || prevLines[i] === undefined) changed.add(i);
    }
    const win = WINDOW_INCREMENTAL.has(lang) ? INVALIDATION_WINDOW : 0;
    if (win > 0)
      for (const i of [...changed])
        for (let j = i + 1; j <= i + win && j < src.length; j++) changed.add(j);
    for (let i = 0; i < src.length; i++)
      lines[i] = changed.has(i) ? tokenizeLine(src[i], lang) : prevLines[i];
    return { lang, lines, hashes, body: lines.join("\n"), codeHash: "" };
  }
  const codeHash = hash(code);
  if (prev && prev.lang === lang && prev.codeHash === codeHash) return prev;
  __cacheStats.bodyTokenizations++;
  const body =
    lang === "json"
      ? highlightJson(code)
      : lang === "txt"
        ? escapeHtml(code)
        : highlightCode(code, lang);
  return { lang, lines: [], hashes: [], body, codeHash };
}

// Tokenise `code` for `lang` into HTML. Trailing newline keeps the highlighted
// layer height-matched to the textarea. Backed by an LRU on (lang, hash).
export function highlight(code: string, lang: Lang): string {
  const key = `${lang}:${hash(code)}`;
  const hit = lruGet(key);
  if (hit !== undefined) return hit;
  const out = tokenize(code, lang).body + "\n";
  lruSet(key, out);
  return out;
}

// Internal: exposed for tests only.
export const __test = { resetStats, hash, stats: __cacheStats };
