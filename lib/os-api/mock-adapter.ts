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
          stdout: [
            `$ ${cmd}`,
            "demo-server: mock shell only — no command ran on a real host.",
            "warning: background worker restarted 2 minutes ago",
          ].join("\n"),
          stderr: "",
          code: 0,
        }),
    },
    sys: {
      stats: () =>
        delay(
          {
            cpu: { pct: 32, cores: 2 },
            mem: { used: 1.4 * GiB, total: 4 * GiB },
            disk: { used: 41 * GiB, total: 100 * GiB },
            net: { rx: 12, tx: 3 },
            uptime: 2 * 864e5 + 4 * 3600e3,
          },
          60,
        ),
      statsStream: (onEvent) => {
        const iv = setInterval(
          () => onEvent({ cpu: { pct: 32, cores: 2 } }),
          900,
        );
        return () => clearInterval(iv);
      },
      processes: () =>
        delay([
          { pid: 142, name: "demo-server", status: "running", cpu: 12, mem: 540 },
          { pid: 201, name: "background-worker", status: "restarted 2m ago", cpu: 7, mem: 142 },
          { pid: 318, name: "preview-proxy", status: "running", cpu: 3, mem: 88 },
        ]),
    },
    apps: {
      list: () => delay([]),
      start: (slug) => delay({ slug, state: "running" }, 400),
      stop: (slug) => delay({ ok: true }),
    },
  };
}
