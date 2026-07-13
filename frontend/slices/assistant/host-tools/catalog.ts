import { obj, str } from "./schema";
import type { HostTool } from "./types";

// The v1 host-tool catalog Alfa can call. READ tools run immediately; MUTATE
// tools are gated behind per-call human approval (see use-host-commands). Each
// `run` receives the live OsApi port + the model's args and returns a short,
// model-readable summary. Deliberately small — fs + shell; delete/copy/upload,
// browser, apps.start/stop and PTY are out of v1 (see the plan doc).

const CAP = 4000;
const clip = (s: string) => (s.length > CAP ? `${s.slice(0, CAP)}\n… (truncated, ${s.length} chars)` : s);

export const HOST_TOOLS: HostTool[] = [
  // ── READ (auto-run) ──────────────────────────────────────────────────────
  {
    name: "fs.list",
    effect: "read",
    description: "List a directory's entries (name, file/dir kind, size). Inspect before writing or moving.",
    parameters: obj({ "path!": str("Absolute directory path, e.g. /home/rahman/projects") }),
    run: async (api, a) => {
      const r = await api.fs.list(String(a.path));
      const body = r.entries.map((e) => `${e.kind === "dir" ? "d" : "-"} ${e.name}${e.kind === "file" ? ` (${e.size}b)` : ""}`).join("\n");
      return `${r.path}\n${body || "(empty)"}`;
    },
  },
  {
    name: "fs.read",
    effect: "read",
    description: "Read a text file's contents (large files are truncated).",
    parameters: obj({ "path!": str("Absolute file path") }),
    run: async (api, a) => clip(await api.fs.read(String(a.path))),
  },
  {
    name: "fs.search",
    effect: "read",
    description: "Find folders by name under ~/projects. Returns matching absolute paths.",
    parameters: obj({ "query!": str("Folder-name query") }),
    run: async (api, a) => {
      const hits = await api.fs.search(String(a.query));
      return hits.length ? hits.map((h) => h.path).join("\n") : "no matches";
    },
  },
  {
    name: "sys.stats",
    effect: "read",
    description: "Current host telemetry: CPU %, memory, disk, uptime.",
    parameters: obj({}),
    run: async (api) => {
      const s = await api.sys.stats();
      const gb = (b: number) => `${(b / 1024 ** 3).toFixed(1)}GB`;
      return `CPU ${s.cpu.pct}% (${s.cpu.cores} cores) · mem ${gb(s.mem.used)}/${gb(s.mem.total)} · disk ${gb(s.disk.used)}/${gb(s.disk.total)} · up ${Math.floor(s.uptime / 3_600_000)}h`;
    },
  },
  {
    name: "apps.list",
    effect: "read",
    description: "List installed host apps (name + slug).",
    parameters: obj({}),
    run: async (api) => {
      const apps = await api.apps.list();
      return apps.length ? apps.map((x) => `${x.name} (${x.slug})`).join("\n") : "no apps installed";
    },
  },
  // ── MUTATE (approve-per-call) ────────────────────────────────────────────
  {
    name: "fs.write",
    effect: "mutate",
    description: "Create or OVERWRITE a text file with the given contents. Overwrite is silent — read first if unsure.",
    parameters: obj({ "path!": str("Absolute file path"), "content!": str("Full new file contents") }),
    run: async (api, a) => {
      const content = String(a.content ?? "");
      await api.fs.write(String(a.path), content);
      return `wrote ${content.length} bytes to ${a.path}`;
    },
  },
  {
    name: "fs.mkdir",
    effect: "mutate",
    description: "Create a directory (parents included).",
    parameters: obj({ "path!": str("Absolute directory path to create") }),
    run: async (api, a) => {
      await api.fs.mkdir(String(a.path));
      return `created ${a.path}`;
    },
  },
  {
    name: "fs.move",
    effect: "mutate",
    description: "Move or rename a file/dir to a full destination path.",
    parameters: obj({ "from!": str("Source path"), "to!": str("Destination path (full path, not just a dir)") }),
    run: async (api, a) => {
      await api.fs.move(String(a.from), String(a.to));
      return `moved ${a.from} → ${a.to}`;
    },
  },
  {
    name: "exec.run",
    effect: "mutate",
    description: "Run a one-shot shell command on the VPS (30s cap, captured stdout/stderr, no PTY). Box-wrecking commands are refused by the server.",
    parameters: obj({ "cmd!": str("Shell command to run"), cwd: str("Working directory (optional; defaults to home)") }),
    run: async (api, a) => {
      const r = await api.exec.run(String(a.cmd), a.cwd ? String(a.cwd) : undefined);
      return clip(`exit ${r.code}\n${r.stdout}${r.stderr ? `\n[stderr]\n${r.stderr}` : ""}`);
    },
  },
];
