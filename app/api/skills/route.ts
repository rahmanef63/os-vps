import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { IS_DEMO } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SkillInfo = { name: string; path: string; description: string };

const home = () => os.homedir();
const roots = () => [
  path.join(home(), ".agents/skills"),
  path.join(home(), ".codex/skills"),
  path.join(home(), ".openclaw/workspace/skills"),
  path.join(home(), ".local/lib/node_modules/openclaw/skills"),
];

const demoSkills: SkillInfo[] = [
  { name: "camoufox-browse", path: "demo://camoufox-browse", description: "Browser automation playbook for Camoufox." },
  { name: "vps-alfa", path: "demo://vps-alfa", description: "Patrol and assist VPS terminal panes." },
];

function description(md: string): string {
  const yaml = /^---\n([\s\S]*?)\n---/.exec(md)?.[1];
  const fromYaml = yaml?.match(/^description:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim();
  if (fromYaml) return fromYaml;
  return md.split("\n").find((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"))?.trim() ?? "";
}

async function catalog(): Promise<SkillInfo[]> {
  const found: SkillInfo[] = [];
  for (const root of roots()) {
    const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const file = path.join(root, e.name, "SKILL.md");
      const md = await fs.readFile(file, "utf8").catch(() => "");
      if (md) found.push({ name: e.name, path: file, description: description(md) });
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (IS_DEMO) {
    const skill = name ? demoSkills.find((s) => s.name === name) : null;
    return skill
      ? NextResponse.json({ skill, content: `# ${skill.name}\n\n${skill.description}\n\nDemo mode only lists this skill; it does not run host automation.` })
      : NextResponse.json({ skills: demoSkills });
  }
  if (!(await requireSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const skills = await catalog();
  if (!name) return NextResponse.json({ skills });

  const skill = skills.find((s) => s.name === name);
  if (!skill) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const content = await fs.readFile(skill.path, "utf8");
  return NextResponse.json({ skill, content: content.slice(0, 24_000), truncated: content.length > 24_000 });
}
