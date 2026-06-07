// Mutating fs commands (mkdir/touch/rm/mv/cp) for the os-terminal dispatcher —
// split out of commands.ts so both files stay under the 200-LOC gate. Returns
// the output lines, or null when `c` is not a mutation command.
import { base, resolve, extTag, rekey, type Line, type RunCtx } from "./fs-model";

export async function runMutation(c: string, args: string[], ctx: RunCtx): Promise<Line[] | null> {
  const { fs, cwd } = ctx;
  const out: Line[] = [];
  const push = (v: string, t: Line["t"] = "out") => out.push({ t, v });
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
    default:
      return null;
  }
  return out;
}
