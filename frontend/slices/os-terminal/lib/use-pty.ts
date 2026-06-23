"use client";

// PTY client for live mode. Opens a session on /api/v1/term, streams output
// over SSE (EventSource auto-reconnect + Last-Event-ID resume → seamless,
// duplicate-free recovery from drops), batches keystrokes into serialized
// POSTs so ordering survives, and closes the server session on dispose.
// Auth rides on the same-origin session cookie like every other OsApi call.

export type PtyStatus =
  | { kind: "connecting" }
  | { kind: "live" }
  | { kind: "exited"; code: number | null }
  | { kind: "error"; message: string };

export type PtyHandle = {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  /** Detach the stream AND kill the server-side shell. */
  dispose: () => void;
};

const BASE = "/api/v1/term";

function post(path: string, body: unknown, keepalive = false): Promise<Response> {
  return fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive,
  });
}

// base64 → bytes. xterm.write accepts Uint8Array, so raw VT bytes pass through
// without the split-codepoint hazards a streaming TextDecoder would invite.
function b64Bytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// Throws (with the server's curated error message) when the session can't
// open — the caller falls back to the legacy exec terminal on that path.
export async function startPty(opts: {
  cols: number;
  rows: number;
  onData: (bytes: Uint8Array) => void;
  onStatus: (s: PtyStatus) => void;
}): Promise<PtyHandle> {
  const { onData, onStatus } = opts;
  onStatus({ kind: "connecting" });

  let res: Response;
  try {
    res = await post("open", { cols: opts.cols, rows: opts.rows });
  } catch {
    throw new Error("network error opening the terminal");
  }
  if (!res.ok) {
    let msg = `terminal open failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }
  const { id } = (await res.json()) as { id: string };

  let disposed = false;
  const es = new EventSource(`${BASE}/stream?id=${encodeURIComponent(id)}`);
  es.onopen = () => {
    if (!disposed) onStatus({ kind: "live" });
  };
  es.addEventListener("data", (e) => {
    if (!disposed) onData(b64Bytes((e as MessageEvent<string>).data));
  });
  es.addEventListener("exit", (e) => {
    es.close();
    if (disposed) return;
    const code = parseInt((e as MessageEvent<string>).data, 10);
    onStatus({ kind: "exited", code: Number.isNaN(code) ? null : code });
  });
  es.onerror = () => {
    if (disposed) return;
    // CONNECTING = the browser is auto-retrying (resume makes it seamless);
    // CLOSED = fatal (session gone after a server restart, or auth lost).
    if (es.readyState === EventSource.CLOSED)
      onStatus({ kind: "error", message: "stream disconnected" });
    else onStatus({ kind: "connecting" });
  };

  // Keystroke batching: coalesce whatever arrives while a POST is in flight,
  // and never overlap requests (overlap could reorder keystrokes).
  let queue = "";
  let flushing = false;
  const flush = async () => {
    flushing = true;
    while (queue && !disposed) {
      const data = queue;
      queue = "";
      try {
        await post("input", { id, data });
      } catch {
        /* transient network error — drop the batch, the shell stays coherent */
      }
    }
    flushing = false;
  };

  return {
    write(data) {
      queue += data;
      if (!flushing) void flush();
    },
    resize(cols, rows) {
      if (!disposed) void post("resize", { id, cols, rows });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      es.close();
      void post("close", { id }, true); // keepalive: survives unmount/nav
    },
  };
}
