// Mock seed "disk" so the editor feels populated before any live FS read.
// SEED_FILES holds the initial contents keyed by absolute path; the live tree
// (components/shared/file-tree) now provides the directory listing via OsApi.

export const SEED_FILES: Record<string, string> = {
  "/readme.md":
    "# os-vps\n\nA cloud desktop OS that drives your VPS from the browser.\n\n" +
    "- **Files** — manage your storage\n- **Code** — this editor\n" +
    "- **Alfa** — AI agents that operate the whole OS\n\n" +
    "Connect a VPS in Settings → Server to go live.\n",
  "/Documents/roadmap.md":
    "# Roadmap\n\n## Now\n- [x] Browser shell\n- [x] Code editor\n\n" +
    "## Next\n- [ ] Live VPS daemon\n- [ ] Collaborative editing\n",
  "/Projects/hello.ts":
    '// hello.ts — sample slice\nimport { greet } from "./greet";\n\n' +
    "type User = { id: number; name: string };\n\n" +
    "export function welcome(user: User): string {\n" +
    "  const msg = greet(user.name); // friendly hello\n" +
    "  return `${msg} (#${user.id})`;\n}\n\n" +
    'welcome({ id: 1, name: "ada" });\n',
  "/Projects/styles.css":
    "/* card surface */\n.card {\n  background: #1e1e22;\n" +
    "  border-radius: 12px;\n  padding: 16px;\n}\n",
  "/apps/scraper.py":
    "import requests\nfrom bs4 import BeautifulSoup\n\n" +
    "def scrape(url):\n    r = requests.get(url, timeout=10)\n" +
    '    soup = BeautifulSoup(r.text, "html.parser")\n' +
    '    return [a.get("href") for a in soup.find_all("a")]\n\n' +
    'if __name__ == "__main__":\n' +
    '    for link in scrape("https://example.com"):\n        print(link)\n',
  "/apps/backup.sh":
    "#!/usr/bin/env bash\nset -euo pipefail\n\n" +
    'SRC="/Media"\nDEST="/backups/$(date +%F)"\n\n' +
    'mkdir -p "$DEST"\nrsync -a --delete "$SRC/" "$DEST/"\n' +
    'echo "Backup complete -> $DEST"\n',
  "/apps/manifest.json":
    '{\n  "name": "color-picker",\n  "runtime": "html",\n' +
    '  "entry": "index.html",\n  "window": { "width": 360, "height": 480 }\n}\n',
};
