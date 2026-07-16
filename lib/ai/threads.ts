import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse, stringify } from "yaml";

// Persistent Alfa chat threads — one YAML file per thread under ~/.os-vps/threads/.
// YAML (not JSON) so the session files stay human-readable (owner's call). `messages`
// = the display bubbles; `history` = the wire turns needed to CONTINUE the chat.
// Both are opaque to the server (stored/restored verbatim); the client owns the shape.
export interface ChatThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: unknown[];
  history: unknown[];
}

export type ThreadSummary = Pick<ChatThread, "id" | "title" | "createdAt" | "updatedAt">;

const DIR = process.env.OS_THREADS_DIR || path.join(os.homedir(), ".os-vps", "threads");
// ids are app-generated but jail them anyway (path-traversal guard): alnum + -_ only.
const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
const fileFor = (id: string) => path.join(DIR, `${safeId(id)}.yml`);

export async function listThreads(): Promise<ThreadSummary[]> {
  let names: string[];
  try {
    names = await fs.readdir(DIR);
  } catch {
    return [];
  }
  const out: ThreadSummary[] = [];
  for (const n of names) {
    if (!n.endsWith(".yml")) continue;
    try {
      const t = parse(await fs.readFile(path.join(DIR, n), "utf8")) as ChatThread;
      if (t?.id) out.push({ id: t.id, title: t.title || "Untitled", createdAt: t.createdAt || 0, updatedAt: t.updatedAt || 0 });
    } catch {
      /* skip corrupt file */
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getThread(id: string): Promise<ChatThread | null> {
  try {
    return parse(await fs.readFile(fileFor(id), "utf8")) as ChatThread;
  } catch {
    return null;
  }
}

export async function saveThread(t: ChatThread): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  const dest = fileFor(t.id);
  const tmp = `${dest}.tmp`;
  await fs.writeFile(tmp, stringify(t), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, dest);
}

export async function deleteThread(id: string): Promise<void> {
  try {
    await fs.unlink(fileFor(id));
  } catch {
    /* already gone */
  }
}
