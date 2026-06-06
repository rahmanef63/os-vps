import type { OsApi, FsEntry } from "./types";

const GiB = 1024 ** 3;
const delay = <T,>(v: T, ms = 160): Promise<T> =>
  new Promise((r) => setTimeout(() => r(v), ms + Math.random() * 120));

// In-browser simulation of the VPS daemon. Default adapter — the whole OS is
// demoable with zero backend. Mirrors os-rr's MockAdapter contract.
// The fs is a flat map of dir-path → entries; folders own a child key.
const f = (name: string, size: number, ext: string): FsEntry => ({
  name,
  kind: "file",
  size,
  ext,
});
const d = (name: string): FsEntry => ({ name, kind: "dir", size: 0 });

const MOCK_FS: Record<string, FsEntry[]> = {
  "/": [d("Projects"), d("Downloads"), d("Documents"), d("apps"),
    f("readme.md", 1840, "md"), f("notes.txt", 612, "txt")],
  "/Projects": [d("os-vps"), d("control-room"), f("TODO.md", 980, "md")],
  "/Projects/os-vps": [d("src"), f("package.json", 2_040, "json"), f("README.md", 4_120, "md")],
  "/Projects/os-vps/src": [f("index.ts", 3_200, "ts"), f("app.tsx", 5_600, "tsx"), f("server.js", 2_900, "js"), f("styles.css", 1_400, "css")],
  "/Projects/control-room": [f("deploy.sh", 1_120, "sh"), f("config.json", 860, "json")],
  "/Downloads": [f("invoice.pdf", 240_000, "pdf"), f("backup.zip", 156_000_000, "zip"),
    f("dataset.csv", 4_200_000, "csv"), f("archive.tar.gz", 64_000_000, "gz")],
  "/Documents": [d("Invoices"), f("resume.pdf", 320_000, "pdf"), f("plan.md", 2_300, "md")],
  "/Documents/Invoices": [f("2026-01.pdf", 88_000, "pdf"), f("2026-02.pdf", 91_000, "pdf")],
  "/apps": [d("nginx"), d("convex"), f("manifest.json", 1_280, "json")],
  "/apps/nginx": [],
  "/apps/convex": [],
  "/.Trash": [],
};

// "~" (home) and "" both map to the mock root "/" so the portable home token
// the UI uses works the same in mock as it does live; "~/x" maps to "/x".
const norm = (p: string) => {
  if (p === "/" || p === "~" || p === "") return "/";
  const abs = p.startsWith("~/") ? `/${p.slice(2)}` : p;
  return abs.replace(/\/+$/, "");
};
const parentOf = (p: string) => {
  const n = norm(p);
  const i = n.lastIndexOf("/");
  return i <= 0 ? "/" : n.slice(0, i);
};
const baseOf = (p: string) => norm(p).slice(norm(p).lastIndexOf("/") + 1);
const join = (base: string, name: string) =>
  base === "/" ? "/" + name : base + "/" + name;

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

// Demo media folder — real uploadable files under public/demo-media/, listed
// from its build-time manifest. Lets the (mock/demo) Files app open real
// image/video/audio (served statically, no host). See scripts/gen-demo-media.mjs.
const DEMO_MEDIA_DIR = "/demo-media";
type DemoItem = { name: string; size?: number };
async function listDemoMedia(): Promise<FsEntry[]> {
  try {
    const r = await fetch("/demo-media/manifest.json", { cache: "no-store" });
    if (!r.ok) return [];
    const items: unknown = await r.json();
    return (Array.isArray(items) ? items : [])
      .map((it): DemoItem => (typeof it === "string" ? { name: it } : (it as DemoItem)))
      .filter((it) => it && typeof it.name === "string")
      .map((it) => f(it.name, it.size ?? 0, extOf(it.name)));
  } catch {
    return [];
  }
}

const MOCK_ROOTS = [
  { label: "Home", path: "~" },
  { label: "Media", path: DEMO_MEDIA_DIR },
  { label: "Projects", path: "/Projects" },
  { label: "Documents", path: "/Documents" },
];

// Demo persistence — the mock FS tree (folder/file STRUCTURE, not file bytes)
// is mirrored to localStorage so a visitor's sandbox survives a page reload.
// Bytes are intentionally not stored (5 MB cap + binary); reads stay mock.
const DEMO_FS_KEY = "os-vps:demo-fs";
const DEMO_FS_VERSION = 1;

function loadDemoTree(): Record<string, FsEntry[]> {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(DEMO_FS_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && saved.v === DEMO_FS_VERSION && saved.tree) return saved.tree;
    } catch {
      /* corrupt / unavailable → fall back to the seed */
    }
  }
  return structuredClone(MOCK_FS);
}

function saveDemoTree(tree: Record<string, FsEntry[]>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_FS_KEY, JSON.stringify({ v: DEMO_FS_VERSION, tree }));
  } catch {
    /* quota exceeded / private mode — sandbox just won't persist */
  }
}

export function MockAdapter(): OsApi {
  const tree: Record<string, FsEntry[]> = loadDemoTree();
  const persist = () => saveDemoTree(tree);

  const entryIn = (dir: string, name: string) =>
    (tree[dir] ?? []).find((e) => e.name === name);

  // Recursively move every key under an old dir path to a new one.
  const rekey = (oldDir: string, newDir: string) => {
    if (oldDir === newDir) return;
    for (const k of Object.keys(tree)) {
      if (k === oldDir || k.startsWith(oldDir + "/")) {
        tree[newDir + k.slice(oldDir.length)] = tree[k];
        delete tree[k];
      }
    }
  };
  const clone = (srcDir: string, destDir: string) => {
    tree[destDir] = (tree[srcDir] ?? []).map((e) => ({ ...e }));
    for (const child of tree[srcDir] ?? []) {
      if (child.kind === "dir") clone(join(srcDir, child.name), join(destDir, child.name));
    }
  };
  const dropSubtree = (dir: string) => {
    for (const k of Object.keys(tree)) {
      if (k === dir || k.startsWith(dir + "/")) delete tree[k];
    }
  };

  function transfer(from: string, to: string, mode: "move" | "copy") {
    from = norm(from);
    to = norm(to);
    const srcDir = parentOf(from);
    const destDir = parentOf(to);
    const srcName = baseOf(from);
    const destName = baseOf(to);
    const src = entryIn(srcDir, srcName);
    if (!src) throw new Error("not found: " + from);
    if (!tree[destDir]) throw new Error("no such dir: " + destDir);
    // Block moving a folder into itself/descendant.
    if (src.kind === "dir" && (to === from || to.startsWith(from + "/")))
      throw new Error("cannot move into itself");

    const moved: FsEntry = src.kind === "dir"
      ? { ...src, name: destName }
      : { ...src, name: destName, ext: extOf(destName) || src.ext };
    tree[destDir] = [...(tree[destDir] ?? []).filter((e) => e.name !== destName), moved];

    if (mode === "move") {
      tree[srcDir] = (tree[srcDir] ?? []).filter((e) => e.name !== srcName);
      if (src.kind === "dir") rekey(join(srcDir, srcName), join(destDir, destName));
    } else if (src.kind === "dir") {
      clone(join(srcDir, srcName), join(destDir, destName));
    }
  }

  return {
    mode: "mock",
    auth: {
      token: (u) => delay({ token: "mock." + btoa(u || "root"), expires_at: Date.now() + 36e5 }),
      me: () => delay({ user: { name: "root", id: "u_local" } }),
    },
    fs: {
      list: async (path) => {
        const p = norm(path);
        if (p === DEMO_MEDIA_DIR) {
          return { path: p, entries: await listDemoMedia(), parent: "/", roots: MOCK_ROOTS };
        }
        return delay({
          path: p,
          entries: tree[p] ?? [],
          parent: p === "/" ? null : parentOf(path),
          roots: MOCK_ROOTS,
        });
      },
      read: () => delay("// mock file contents\n"),
      write: (path) => {
        const dir = parentOf(path);
        const name = baseOf(path);
        if (!entryIn(dir, name)) {
          tree[dir] = [...(tree[dir] ?? []), f(name, 32, extOf(name))];
        }
        persist();
        return delay({ ok: true });
      },
      mkdir: (path) => {
        const dir = parentOf(path);
        const name = baseOf(path);
        if (!entryIn(dir, name)) {
          tree[dir] = [...(tree[dir] ?? []), d(name)];
          tree[norm(path)] = [];
        }
        persist();
        return delay({ kind: "dir" as const });
      },
      remove: (path) => {
        const dir = parentOf(path);
        const name = baseOf(path);
        const e = entryIn(dir, name);
        tree[dir] = (tree[dir] ?? []).filter((x) => x.name !== name);
        if (e?.kind === "dir") dropSubtree(norm(path));
        persist();
        return delay({ ok: true });
      },
      move: (from, to) => {
        transfer(from, to, "move");
        persist();
        return delay({ ok: true });
      },
      copy: (from, to) => {
        transfer(from, to, "copy");
        persist();
        return delay({ ok: true });
      },
      // Simulate an upload by materialising the relPath tree under `dest`.
      upload: async (dest, files) => {
        for (const { relPath } of files) {
          const segs = relPath.split("/").filter(Boolean);
          let cur = norm(dest);
          segs.forEach((name, i) => {
            const leaf = i === segs.length - 1;
            if (!entryIn(cur, name))
              tree[cur] = [...(tree[cur] ?? []), leaf ? f(name, 1024, extOf(name)) : d(name)];
            if (!leaf) cur = join(cur, name);
          });
        }
        persist();
        return delay({ written: files.length });
      },
      // Search mock dirs by name under /Projects (matches the live ~/projects scope).
      search: async (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        const hits: { name: string; path: string; kind: "dir" }[] = [];
        for (const [dir, ents] of Object.entries(tree)) {
          if (dir !== "/Projects" && !dir.startsWith("/Projects/")) continue;
          for (const e of ents)
            if (e.kind === "dir" && e.name.toLowerCase().includes(q))
              hits.push({ name: e.name, path: join(dir, e.name), kind: "dir" });
        }
        return delay(hits.slice(0, 30));
      },
      usage: () => delay({ used: 289 * GiB, total: 460 * GiB }),
    },
    exec: {
      run: (cmd) =>
        delay({
          stdout: `$ ${cmd}\n(mock shell — switch Settings → Server → Live to run on the VPS)`,
          stderr: "",
          code: 0,
        }),
    },
    sys: {
      stats: () =>
        delay(
          {
            cpu: { pct: 20 + Math.random() * 60, cores: 8 },
            mem: { used: 9 * GiB + Math.random() * 4 * GiB, total: 31 * GiB },
            disk: { used: 88 * GiB, total: 200 * GiB },
            net: { rx: Math.random() * 70, tx: Math.random() * 20 },
            uptime: 14 * 864e5,
          },
          60,
        ),
      statsStream: (onEvent) => {
        const iv = setInterval(
          () => onEvent({ cpu: { pct: 20 + Math.random() * 60, cores: 8 } }),
          900,
        );
        return () => clearInterval(iv);
      },
      processes: () =>
        delay([
          { pid: 142, name: "next-server", status: "running", cpu: 12, mem: 540 },
          { pid: 201, name: "convex-backend", status: "running", cpu: 7, mem: 142 },
          { pid: 318, name: "dockerd", status: "running", cpu: 3, mem: 88 },
        ]),
    },
    apps: {
      list: () => delay([]),
      start: (slug) => delay({ slug, state: "running" }, 400),
      stop: (slug) => delay({ ok: true }),
    },
  };
}
