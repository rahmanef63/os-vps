// Tiny dependency-free syntax tokenizer. Re-authored from the mock-os
// `hlCode` prototype as typed best-practice TS, extended to a small family
// of languages. Emits HTML strings of <span class="tok-*"> wrappers consumed
// by a <pre>; token classes (.tok-cmt/str/num/kw/fn/h/tag/punct) are defined
// alongside this slice with literal VS-Code colours (see editor-surface.tsx)
// — those hex values are the one sanctioned exception to "tokens not hex".

export type Lang = "ts" | "js" | "py" | "sh" | "json" | "css" | "md" | "txt";

const KEYWORDS = new Set(
  (
    // JS / TS
    "const let var function return if else for while do switch case break " +
    "continue new class extends super this import from export default await " +
    "async yield typeof instanceof in of delete void try catch finally throw " +
    "null true false undefined public private protected static interface " +
    "type enum implements namespace readonly as satisfies keyof infer never " +
    "unknown any boolean string number object symbol bigint " +
    // Python
    "def lambda elif except with pass raise global nonlocal None True False " +
    "and or not is print self " +
    // shell
    "echo fi then esac done local source exit "
  )
    .split(/\s+/)
    .filter(Boolean),
);

// Languages whose line comments start with '#'.
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
  '("(?:\\\\.|[^"\\\\])*")' + // 1: string
    "|(\\b-?\\d[\\d.eE+-]*\\b)" + // 2: number
    "|(true|false|null)", // 3: literal
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
    } else if (m[2]) {
      out += span("tok-num", m[2]);
    } else if (m[3]) {
      out += span("tok-kw", m[3]);
    }
    last = JSON_RE.lastIndex;
  }
  return out + escapeHtml(code.slice(last));
}

function codeRe(hash: boolean): RegExp {
  const cmt = hash ? "#[^\\n]*" : "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
  return new RegExp(
    `(${cmt})` + // 1: comment
      "|(`(?:\\\\.|[^`\\\\])*`|\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*')" + // 2: string
      "|(\\b\\d[\\d_.eExXa-fA-F]*\\b)" + // 3: number
      "|([A-Za-z_$][\\w$]*)", // 4: identifier
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

function highlightCss(code: string): string {
  return code
    .split("\n")
    .map((ln) => {
      const cmt = ln.match(/\/\*.*\*\//);
      if (cmt) return span("tok-cmt", ln);
      const m = ln.match(/^(\s*)([\w-]+)(\s*:\s*)(.+?)(;?)$/);
      if (m)
        return (
          escapeHtml(m[1]) +
          span("tok-fn", m[2]) +
          escapeHtml(m[3]) +
          span("tok-str", m[4]) +
          escapeHtml(m[5])
        );
      return span("tok-kw", escapeHtml(ln));
    })
    .join("\n");
}

function highlightMd(code: string): string {
  return code
    .split("\n")
    .map((ln) => {
      if (/^\s*#{1,6}\s/.test(ln)) return span("tok-h", ln);
      let s = escapeHtml(ln);
      s = s.replace(/(`[^`]+`)/g, '<span class="tok-str">$1</span>');
      s = s.replace(/(\*\*[^*]+\*\*)/g, '<span class="tok-fn">$1</span>');
      return s;
    })
    .join("\n");
}

/**
 * Tokenise `code` for `lang` into an HTML string of escaped text + <span>
 * wrappers. Caller drops it into a <pre dangerouslySetInnerHTML>. A trailing
 * newline keeps the highlighted layer height-matched to the textarea.
 */
export function highlight(code: string, lang: Lang): string {
  let body: string;
  if (lang === "json") body = highlightJson(code);
  else if (lang === "css") body = highlightCss(code);
  else if (lang === "md") body = highlightMd(code);
  else if (lang === "txt") body = escapeHtml(code);
  else body = highlightCode(code, lang);
  return body + "\n";
}
