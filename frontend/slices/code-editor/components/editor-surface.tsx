"use client";
// audit-allow-hex: VS-Code-dark editor chrome palette is the slice's design, not themable tokens.

import { useMemo, useRef, type UIEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { highlight, type Lang } from "../lib/highlight";
import { lineCol } from "../lib/util";

// Classic overlay editor: a transparent <textarea> sits exactly over a
// highlighted <pre>; both share identical monospace metrics + padding so the
// caret aligns with the painted tokens. A separate gutter mirrors scrollTop.
//
// The code surface and token colours use literal hex by design (see slice
// rules): #1e1e22 / #1a1a1e dark editor chrome + the VS-Code Dark+ token
// palette. These are not theme tokens on purpose.
const TOKEN_CSS = `
.ce-pre .tok-cmt{color:#6a9955;font-style:italic}
.ce-pre .tok-str{color:#ce9178}
.ce-pre .tok-num{color:#b5cea8}
.ce-pre .tok-kw{color:#569cd6}
.ce-pre .tok-fn{color:#dcdcaa}
.ce-pre .tok-h{color:#569cd6;font-weight:600}
.ce-pre .tok-tag{color:#4ec9b0}
.ce-pre .tok-punct{color:#808080}
`;

const TAB = "  ";

export function EditorSurface({
  value,
  onChange,
  lang,
  onCursor,
}: {
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  onCursor: (pos: { ln: number; col: number }) => void;
}) {
  const preRef = useRef<HTMLPreElement>(null);
  const gutRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => highlight(value, lang), [value, lang]);
  const lineCount = useMemo(() => value.split("\n").length, [value]);

  const syncScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutRef.current)
      gutRef.current.style.transform = `translateY(${-scrollTop}px)`;
  };

  const report = (ta: HTMLTextAreaElement) =>
    onCursor(lineCol(value, ta.selectionStart));

  return (
    <div
      className="relative flex-1 overflow-hidden bg-[#1e1e22] font-mono text-[12.5px] leading-5"
    >
      <style>{TOKEN_CSS}</style>

      <div className="absolute inset-y-0 left-0 w-[54px] overflow-hidden border-r border-[#2a2a30] bg-[#1a1a1e]">
        <div ref={gutRef} className="py-2.5 will-change-transform">
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className="h-5 px-2.5 text-right tabular-nums text-[#565c66]"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-y-0 right-0 left-[54px]">
        <pre
          ref={preRef}
          aria-hidden
          className={cn(
            "ce-pre pointer-events-none absolute inset-0 m-0 overflow-hidden",
            "whitespace-pre px-3.5 py-2.5 text-[#d4d4d4]",
          )}
          style={{ tabSize: 2 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <Textarea
          value={value}
          spellCheck={false}
          wrap="off"
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onClick={(e) => report(e.currentTarget)}
          onKeyUp={(e) => report(e.currentTarget)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Tab") {
              e.preventDefault();
              const ta = e.currentTarget;
              const s = ta.selectionStart;
              const en = ta.selectionEnd;
              onChange(value.slice(0, s) + TAB + value.slice(en));
              requestAnimationFrame(() => {
                ta.selectionStart = ta.selectionEnd = s + TAB.length;
              });
            }
          }}
          className={cn(
            "absolute inset-0 m-0 h-full w-full resize-none overflow-auto rounded-none border-0 bg-transparent",
            "whitespace-pre px-3.5 py-2.5 font-mono text-[12.5px] leading-5 text-transparent caret-white",
            "shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
          )}
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}
