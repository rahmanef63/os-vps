import type { OsApi } from "./types";
import { GiB, delay, loadDemoTree, saveDemoTree } from "./mock-data";
import { makeMockFs } from "./mock-fs";

// In-browser simulation of the VPS daemon. Default adapter — the whole OS is
// demoable with zero backend. Mirrors os-rr's MockAdapter contract.
// Split: mock-data.ts owns the seed/fixtures + persistence, mock-fs.ts owns
// the fs port (CLAUDE.md max-200-LOC). This file is the assembly point.
export function MockAdapter(): OsApi {
  const tree = loadDemoTree();
  const persist = () => saveDemoTree(tree);

  return {
    mode: "mock",
    auth: {
      token: (u) => delay({ token: "mock." + btoa(u || "root"), expires_at: Date.now() + 36e5 }),
      me: () => delay({ user: { name: "root", id: "u_local" } }),
    },
    fs: makeMockFs(tree, persist),
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
