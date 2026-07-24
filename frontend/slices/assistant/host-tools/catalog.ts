import { obj, str } from "./schema";
import type { HostTool } from "./types";

const CAP = 4000;
const clip = (s: string) => (s.length > CAP ? `${s.slice(0, CAP)}\n… (truncated, ${s.length} chars)` : s);

export const HOST_TOOLS: HostTool[] = [
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
    name: "sys.processes",
    effect: "read",
    description: "List running host processes with pid, name, status, CPU and memory.",
    parameters: obj({}),
    run: async (api) => {
      const ps = await api.sys.processes();
      return ps.length ? ps.slice(0, 30).map((p) => `${p.pid} ${p.name} ${p.status} cpu=${p.cpu} mem=${p.mem}`).join("\n") : "no process data";
    },
  },
  {
    name: "fs.usage",
    effect: "read",
    description: "Show writable filesystem roots and current usage.",
    parameters: obj({}),
    run: async (api) => {
      const u = await api.fs.usage();
      return `${Math.round(u.used / 1024 ** 2)}MiB used / ${Math.round(u.total / 1024 ** 2)}MiB total`;
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
  {
    name: "skills.list",
    effect: "read",
    description: "List local MSO/OpenClaw/Codex skills available on this VPS. Use before asking to run a specialized skill such as camoufox.",
    parameters: obj({}),
    run: async () => {
      const data = (await fetch("/api/skills", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { skills: [] }))
        .catch(() => ({ skills: [] }))) as { skills?: { name: string; description?: string }[] };
      const skills = data.skills ?? [];
      return skills.length ? skills.map((s) => `${s.name}${s.description ? ` — ${s.description}` : ""}`).join("\n") : "no local skills found";
    },
  },
  {
    name: "skills.read",
    effect: "read",
    description: "Read one local skill's SKILL.md instructions by exact skill name.",
    parameters: obj({ "name!": str("Exact skill name from skills.list") }),
    run: async (_api, a) => {
      const name = String(a.name ?? "").trim();
      if (!name) return "missing skill name";
      const r = await fetch(`/api/skills?name=${encodeURIComponent(name)}`, { cache: "no-store" });
      if (!r.ok) return `couldn't read skill ${name}`;
      const d = (await r.json()) as { content?: string; truncated?: boolean };
      return clip(`${d.content ?? ""}${d.truncated ? "\n… (truncated)" : ""}`);
    },
  },
  {
    name: "memory.remember",
    effect: "read",
    description:
      "Save a durable fact about the user or their setup to long-term memory (recalled into future chats when relevant). Use it when the user states a lasting preference, fact, or instruction worth keeping — not for one-off task details.",
    parameters: obj({ "text!": str("The fact to remember — one concise sentence") }),
    run: async (_api, a) => {
      const text = String(a.text ?? "").trim();
      if (!text) return "nothing to remember (empty text)";
      const r = await fetch("/api/memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return r.ok ? `remembered: ${text}` : "couldn't save the memory";
    },
  },
  {
    name: "memory.forget",
    effect: "read",
    description:
      "Remove saved fact(s) from long-term memory. Give a short phrase describing what to forget; every remembered fact containing it is deleted. Use only when the user asks to forget or correct something.",
    parameters: obj({ "query!": str("A phrase identifying the fact(s) to forget") }),
    run: async (_api, a) => {
      const query = String(a.query ?? "").trim().toLowerCase();
      if (!query) return "nothing to forget (empty query)";
      const data = (await fetch("/api/memory", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { memories: [] }))
        .catch(() => ({ memories: [] }))) as { memories?: { id: string; text: string }[] };
      const hits = (data.memories ?? []).filter((m) => m.text.toLowerCase().includes(query));
      if (!hits.length) return `no saved memory matches "${a.query}"`;
      for (const m of hits) await fetch(`/api/memory?id=${encodeURIComponent(m.id)}`, { method: "DELETE" }).catch(() => {});
      return `forgot ${hits.length}: ${hits.map((m) => m.text).join("; ")}`;
    },
  },
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
    name: "fs.copy",
    effect: "mutate",
    description: "Copy a file/dir to a full destination path. Read first if unsure.",
    parameters: obj({ "from!": str("Source path"), "to!": str("Destination path (full path, not just a dir)") }),
    run: async (api, a) => {
      await api.fs.copy(String(a.from), String(a.to));
      return `copied ${a.from} → ${a.to}`;
    },
  },
  {
    name: "fs.delete",
    effect: "mutate",
    description: "Delete a file/dir recursively within writable roots. High risk: inspect first.",
    parameters: obj({ "path!": str("Absolute file or directory path") }),
    run: async (api, a) => {
      await api.fs.remove(String(a.path));
      return `deleted ${a.path}`;
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
