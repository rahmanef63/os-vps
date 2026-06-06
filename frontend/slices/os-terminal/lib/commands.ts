// Shell command dispatcher for the os-terminal slice. Pure-ish logic kept out of
// the React component so app.tsx stays small. `ls`/`cat` defer to the injected
// OsApi (live data) and fall back to the in-memory FsModel.
import type { TerminalOsApi, FsEntry } from "./host";
import { base, resolve, extTag, rekey, type FsModel, type Line, type LineKind } from "./fs-model";

export type { Line, LineKind } from "./fs-model";
export { seedFs, NEOFETCH } from "./fs-model";

export type RunCtx = {
  fs: FsModel;
  cwd: string;
  setCwd: (p: string) => void;
  api: TerminalOsApi;
  clear: () => void;
};

const HELP = [
  "Files:  ls · cd · pwd · cat · mkdir · touch · rm [-r] · mv · cp",
  "System: clear · echo · whoami · date · uname · df · ps · neofetch · help",
].join("\n");

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
  const exists = (n: string) => here().some((x) => x.name === n);
  const live = ctx.api.mode === "live";
  // Run a live OsApi fs op, surfacing any error as a terminal line.
  const liveFs = async (label: string, op: () => Promise<unknown>) => {
    if (!live) return;
    try {
      await op();
    } catch (e) {
      push(`${label}: ${e instanceof Error ? e.message : String(e)}`, "err");
    }
  };

  switch (c) {
    case "":
      break;
    case "help":
      push(HELP);
      break;
    case "ls": {
      const target = resolve(cwd, args.find((a) => !a.startsWith("-")));
      let entries: FsEntry[] | undefined;
      try {
        entries = (await ctx.api.fs.list(target)).entries;
        if (!entries.length && !fs[target]) entries = fs[target];
      } catch {
        entries = fs[target];
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
      if (fs[p] || p === "/") ctx.setCwd(p);
      else push(`cd: not a directory: ${args[0]}`, "err");
      break;
    }
    case "pwd":
      push(cwd);
      break;
    case "cat": {
      const nm = args[0];
      const it = here().find((x) => x.name === nm);
      if (!nm) {
        push("cat: missing operand", "err");
        break;
      }
      if (!it || it.kind === "dir") {
        push(`cat: ${nm}: No such file`, "err");
        break;
      }
      try {
        const body = await ctx.api.fs.read(resolve(cwd, nm));
        push(body.trimEnd() || "(empty)");
      } catch {
        push(`# ${nm}\n\nManaged by Topside. Open in an editor for the full view.`);
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
    case "neofetch":
      push("", "fetch");
      break;
    case "mkdir": {
      const nm = args[0];
      if (!nm) return [{ t: "err", v: "mkdir: missing operand" }];
      if (exists(nm)) return [{ t: "err", v: `mkdir: ${nm}: File exists` }];
      await liveFs("mkdir", () => ctx.api.fs.mkdir(resolve(cwd, nm)));
      fs[cwd] = [...here(), { name: nm, kind: "dir", size: 0 }];
      fs[base(cwd) + nm] = [];
      break;
    }
    case "touch": {
      const nm = args[0];
      if (!nm) return [{ t: "err", v: "touch: missing operand" }];
      if (exists(nm)) break;
      await liveFs("touch", () => ctx.api.fs.write(resolve(cwd, nm), ""));
      fs[cwd] = [...here(), { name: nm, kind: "file", size: 0, ext: extTag(nm) }];
      break;
    }
    case "rm": {
      const rec = args.some((a) => /^-\w*r/.test(a));
      const nm = args.find((a) => !a.startsWith("-"));
      const it = nm ? here().find((x) => x.name === nm) : undefined;
      if (!it) return [{ t: "err", v: `rm: ${nm ?? ""}: No such file or directory` }];
      if (it.kind === "dir" && !rec) return [{ t: "err", v: `rm: ${nm}: is a directory (use -r)` }];
      await liveFs("rm", () => ctx.api.fs.remove(resolve(cwd, nm!)));
      fs[cwd] = here().filter((x) => x.name !== nm);
      if (it.kind === "dir") {
        const k = base(cwd) + nm;
        for (const kk of Object.keys(fs)) if (kk === k || kk.startsWith(k + "/")) delete fs[kk];
      }
      break;
    }
    case "mv": {
      const [a, b] = args;
      const it = here().find((x) => x.name === a);
      if (!it || !b) return [{ t: "err", v: "mv: usage: mv <src> <dst>" }];
      const into = here().find((x) => x.name === b && x.kind === "dir");
      await liveFs("mv", () =>
        ctx.api.fs.move(resolve(cwd, a), into ? resolve(cwd, b) + "/" + a : resolve(cwd, b)),
      );
      fs[cwd] = here().filter((x) => x.name !== a);
      if (into) {
        fs[base(cwd) + b] = [...(fs[base(cwd) + b] ?? []), it];
        if (it.kind === "dir") rekey(fs, base(cwd) + a, base(cwd) + b + "/" + a);
      } else {
        fs[cwd] = [...fs[cwd], { ...it, name: b }];
        if (it.kind === "dir") rekey(fs, base(cwd) + a, base(cwd) + b);
      }
      break;
    }
    case "cp": {
      const [a, b] = args;
      const it = here().find((x) => x.name === a);
      if (!it || !b) return [{ t: "err", v: "cp: usage: cp <src> <dst>" }];
      await liveFs("cp", () => ctx.api.fs.copy(resolve(cwd, a), resolve(cwd, b)));
      fs[cwd] = [...here(), { ...it, name: b }];
      if (it.kind === "dir") {
        const kids = fs[base(cwd) + a] ?? [];
        fs[base(cwd) + b] = kids.map((k) => ({ ...k }));
      }
      break;
    }
    default: {
      if (!live) {
        push(`${c}: command not found`, "err");
        break;
      }
      // Live mode: pass the raw line straight to the host shell (one-shot exec).
      const r = await ctx.api.exec.run(cmd, cwd);
      const lines: Line[] = [];
      if (r.stdout)
        lines.push(...r.stdout.replace(/\n$/, "").split("\n").map((v) => ({ t: "out" as const, v })));
      if (r.stderr)
        lines.push(...r.stderr.replace(/\n$/, "").split("\n").map((v) => ({ t: "err" as const, v })));
      if (!r.stdout && !r.stderr && r.code !== 0) lines.push({ t: "err", v: `exit ${r.code}` });
      return lines;
    }
  }
  return out;
}
