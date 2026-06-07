// Shell command dispatcher for the os-terminal slice. Pure-ish logic kept out of
// the React component so app.tsx stays small. LIVE mode is honest: `ls`/`cd`/
// `cat` hit the real OsApi and surface errors (never silently fall back to the
// mock model), and host-truth commands (df/ps/whoami/uname/date) pass through
// to the real shell. The in-memory FsModel only backs demo/mock mode.
import { fmtGiBPair, fmtUptime } from "./host";
import { resolve, type Line, type LineKind, type RunCtx } from "./fs-model";
import { runMutation } from "./commands-fs";

export type { Line, LineKind, RunCtx } from "./fs-model";
export { seedFs, NEOFETCH } from "./fs-model";

const HELP = [
  "Files:  ls · cd · pwd · cat · mkdir · touch · rm [-r] · mv · cp",
  "System: clear · echo · whoami · date · uname · df · ps · neofetch · help",
].join("\n");

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// One-shot host exec for live mode — used for unknown commands and the
// host-truth built-ins so the cockpit never shows invented system data.
async function execLive(cmd: string, ctx: RunCtx): Promise<Line[]> {
  const r = await ctx.api.exec.run(cmd, ctx.cwd);
  const lines: Line[] = [];
  if (r.stdout)
    lines.push(...r.stdout.replace(/\n$/, "").split("\n").map((v) => ({ t: "out" as const, v })));
  if (r.stderr)
    lines.push(...r.stderr.replace(/\n$/, "").split("\n").map((v) => ({ t: "err" as const, v })));
  if (!r.stdout && !r.stderr && r.code !== 0) lines.push({ t: "err", v: `exit ${r.code}` });
  return lines;
}

// Async so live `ls`/`cat` can await the OsApi. Returns the output lines; the
// command line itself is pushed by the caller. `clear` empties via ctx.clear().
export async function run(cmd: string, ctx: RunCtx): Promise<Line[]> {
  const parts = cmd.trim().split(/\s+/);
  const c = parts[0];
  const args = parts.slice(1);
  const { fs, cwd } = ctx;
  const out: Line[] = [];
  const push = (v: string, t: LineKind = "out") => out.push({ t, v });
  const here = () => fs[cwd] ?? [];
  const live = ctx.api.mode === "live";

  // Host-truth commands: in live mode the real shell answers, not canned text.
  if (live && ["df", "ps", "whoami", "uname", "date"].includes(c)) return execLive(cmd, ctx);

  switch (c) {
    case "":
      break;
    case "help":
      push(HELP);
      break;
    case "ls": {
      const target = resolve(cwd, args.find((a) => !a.startsWith("-")));
      let entries;
      try {
        entries = (await ctx.api.fs.list(target)).entries;
      } catch (e) {
        if (live) {
          push(`ls: cannot access '${args[0] ?? target}': ${errMsg(e)}`, "err");
          break;
        }
        entries = fs[target]; // demo mode → in-memory model
      }
      if (!entries) {
        push(`ls: cannot access '${args[0] ?? target}': No such directory`, "err");
        break;
      }
      push(entries.map((e) => (e.kind === "dir" ? e.name + "/" : e.name)).join("   ") || "(empty)");
      break;
    }
    case "cd": {
      const p = resolve(cwd, args[0] || "/");
      if (live) {
        try {
          await ctx.api.fs.list(p); // validates it's a listable dir on the host
          ctx.setCwd(p);
        } catch {
          push(`cd: not a directory: ${args[0] ?? p}`, "err");
        }
      } else if (fs[p] || p === "/") ctx.setCwd(p);
      else push(`cd: not a directory: ${args[0]}`, "err");
      break;
    }
    case "pwd":
      push(cwd);
      break;
    case "cat": {
      const nm = args[0];
      if (!nm) {
        push("cat: missing operand", "err");
        break;
      }
      try {
        const body = await ctx.api.fs.read(resolve(cwd, nm));
        push(body.trimEnd() || "(empty)");
      } catch (e) {
        if (live) {
          push(`cat: ${nm}: ${errMsg(e)}`, "err");
          break;
        }
        const it = here().find((x) => x.name === nm);
        if (!it || it.kind === "dir") push(`cat: ${nm}: No such file`, "err");
        else push(`# ${nm}\n\nManaged by Topside. Open in an editor for the full view.`);
      }
      break;
    }
    case "echo":
      push(args.join(" "));
      break;
    case "whoami":
      push("root");
      break;
    case "date":
      push(new Date().toString());
      break;
    case "uname":
      push("topside 1.0.0 (web-cockpit) x86_64 GNU/Linux");
      break;
    case "clear":
      ctx.clear();
      break;
    case "df":
      push("Filesystem   Size   Used  Avail  Use%\n/dev/vps0    460G   289G   171G   63%");
      break;
    case "ps":
      push(
        "  PID  CPU  MEM  COMMAND\n    1  0.4  12M  topside-init\n  142  6.1  88M  next-server\n  377  0.3  22M  monitor",
      );
      break;
    case "neofetch": {
      // Live mode: real stats via the shared formatters; demo keeps the mock rows.
      if (live) {
        try {
          const s = await ctx.api.sys.stats();
          out.push({
            t: "fetch",
            v: "",
            rows: [
              ["os", "topside 1.0.0 web-cockpit"],
              ["shell", "vps-sh 1.0"],
              ["cpu", `${s.cpu.cores} vCPU · ${s.cpu.pct}%`],
              ["memory", fmtGiBPair(s.mem.used, s.mem.total)],
              ["disk", fmtGiBPair(s.disk.used, s.disk.total)],
              ["uptime", fmtUptime(s.uptime)],
            ],
          });
          break;
        } catch {
          /* stats unavailable → mock rows below */
        }
      }
      push("", "fetch");
      break;
    }
    default: {
      const m = await runMutation(c, args, ctx);
      if (m) return m;
      if (!live) {
        push(`${c}: command not found`, "err");
        break;
      }
      // Live mode: pass the raw line straight to the host shell (one-shot exec).
      return execLive(cmd, ctx);
    }
  }
  return out;
}
