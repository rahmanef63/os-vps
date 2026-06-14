import type { FsEntry, OsApi } from "./types";
import {
  DEMO_MEDIA_DIR,
  MOCK_ROOTS,
  baseOf,
  d,
  delay,
  extOf,
  f,
  join,
  listDemoMedia,
  norm,
  parentOf,
} from "./mock-data";

// Mock fs port — split out of mock-adapter.ts (CLAUDE.md max-200-LOC rule).
// Closes over a single `tree` map + a `persist` callback so MockAdapter()
// owns the lifecycle (load on init, mirror to localStorage on every mutate).

export function makeMockFs(
  tree: Record<string, FsEntry[]>,
  persist: () => void,
): OsApi["fs"] {
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
    upload: async (dest, files, onProgress) => {
      // Fake a few progress ticks so the demo exercises the real progress bar.
      const total = files.reduce((n, file) => n + (file.file?.size || 0), 0) || files.length;
      for (let i = 1; i <= 4 && onProgress; i++) {
        await new Promise((r) => setTimeout(r, 110));
        onProgress({ loaded: Math.round((total * i) / 4), total });
      }
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
      return delay({ written: files.length, failed: [] });
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
    usage: () => delay({ used: 289 * (1024 ** 3), total: 460 * (1024 ** 3) }),
  };
}
