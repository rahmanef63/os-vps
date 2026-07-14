// Minimal, SAFE markdown → HTML for the Markdown widget. Escape FIRST (including
// the double-quote, so a link URL can't break out of href="…" and inject an
// event-handler attribute), THEN apply a fixed set of transforms. Links are
// restricted to http(s) — no javascript:/data:. The output is rendered via
// dangerouslySetInnerHTML, so the escaping here is load-bearing (see md.test.ts).
// ponytail: headings/bold/italic/code/links/bullets — no tables/nested lists.
export function mdToHtml(src: string): string {
  return src
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/^### (.+)$/gm, '<div class="text-sm font-semibold">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="text-base font-bold">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="text-lg font-bold">$1</div>')
    .replace(/^[-*] (.+)$/gm, "• $1")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/`([^`\n]+)`/g, '<code class="rounded bg-black/20 px-1">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>')
    .replace(/\n/g, "<br/>");
}
