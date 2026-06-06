import { API_VERSION, type OsApi, type SysStats } from "./types";

// Live adapter → REST + SSE against the VPS daemon / Control Room agent at
// {baseUrl}/api/v1. Auth = the signed session cookie, sent automatically on
// same-origin requests (no Bearer token). Host actions stay allowlisted
// server-side; this is just the client.
export function HttpAdapter(cfg: { url?: string }): OsApi {
  const root = (cfg.url || "").replace(/\/$/, "") + "/api/" + API_VERSION;

  async function req<T>(
    method: string,
    path: string,
    opts: { query?: Record<string, string>; body?: unknown } = {},
  ): Promise<T> {
    let url = root + path;
    if (opts.query) {
      const q = new URLSearchParams(opts.query).toString();
      if (q) url += "?" + q;
    }
    const h: Record<string, string> = {};
    const init: RequestInit = { method, headers: h };
    if (opts.body !== undefined) {
      h["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    if (res.status === 204) return null as T;
    return res.json() as Promise<T>;
  }

  function sse(path: string, query: Record<string, string>, onEvent: (d: unknown) => void) {
    const q = new URLSearchParams(query).toString();
    // Same-origin EventSource carries the session cookie automatically.
    const es = new EventSource(root + path + (q ? "?" + q : ""));
    es.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data));
      } catch {
        onEvent(e.data);
      }
    };
    return () => es.close();
  }

  return {
    mode: "live",
    auth: {
      token: (username, password) =>
        req("POST", "/auth/token", { body: { username, password } }),
      me: () => req("GET", "/auth/me"),
    },
    fs: {
      list: (path) => req("GET", "/fs/list", { query: { path } }),
      read: (path) => req("GET", "/fs/read", { query: { path } }),
      write: (path, content) => req("POST", "/fs/write", { body: { path, content } }),
      mkdir: (path) => req("POST", "/fs/mkdir", { body: { path } }),
      remove: (path) => req("DELETE", "/fs/delete", { body: { path } }),
      move: (from, to) => req("POST", "/fs/move", { body: { from, to } }),
      copy: (from, to) => req("POST", "/fs/copy", { body: { from, to } }),
      upload: async (dest, files) => {
        if (!files.length) return { written: 0 };
        // multipart — the browser sets the boundary; relPath rides as the filename.
        const fd = new FormData();
        fd.append("dest", dest);
        for (const f of files) fd.append("file", f.file, f.relPath);
        const res = await fetch(root + "/fs/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      },
      search: (query) => req("GET", "/fs/search", { query: { q: query } }),
      usage: () => req("GET", "/fs/usage"),
    },
    exec: {
      run: (cmd, cwd) => req("POST", "/exec/run", { body: { cmd, cwd } }),
    },
    sys: {
      stats: () => req("GET", "/sys/stats"),
      statsStream: (onEvent) =>
        sse("/sys/stats/stream", {}, (d) => onEvent(d as Partial<SysStats>)),
      processes: () => req("GET", "/sys/processes"),
    },
    apps: {
      list: () => req("GET", "/apps"),
      start: (slug) => req("POST", `/apps/${slug}/start`),
      stop: (slug) => req("POST", `/apps/${slug}/stop`),
    },
  };
}
