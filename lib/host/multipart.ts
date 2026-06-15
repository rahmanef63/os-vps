// SERVER-ONLY. Streaming multipart/form-data parser for /api/v1/fs/upload.
//
// Why hand-rolled: Request.formData() (undici) buffers EVERY part fully into RAM
// before a handler sees it — a large authenticated upload OOM-kills the host
// process that IS the cockpit. This consumes req.body as a stream, enforces a
// running total-bytes cap (throws UploadTooLargeError BEFORE buffering past it),
// and yields each part as a byte stream so callers spool straight to disk.
//
// Scope is the upload contract only: a text `dest` field + repeated `file` parts
// whose filename carries the relPath. It is not a general RFC 7578 parser.
import { HostError } from "./host-error";

export class UploadTooLargeError extends HostError {
  constructor(limit: number) {
    super(`Upload exceeds limit (${Math.floor(limit / (1024 * 1024))} MiB)`);
    this.name = "UploadTooLargeError";
  }
}

export type MultipartPart = {
  /** form field name, e.g. "dest" or "file" */
  name: string;
  /** filename for file parts (carries relPath); undefined for plain fields */
  filename?: string;
  /** raw body bytes of this part, streamed in order */
  body: AsyncIterable<Uint8Array>;
};

const DASH = 0x2d; // "-"
const CR = 0x0d;
const LF = 0x0a;

export function boundaryFromContentType(ct: string | null): string {
  const m = /;\s*boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct ?? "");
  const b = (m?.[1] ?? m?.[2] ?? "").trim();
  if (!b) throw new HostError("expected multipart/form-data");
  return b;
}

function indexOf(hay: Bytes, needle: Bytes, from: number): number {
  outer: for (let i = from; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

type Bytes = Uint8Array<ArrayBufferLike>;

function concat(a: Bytes, b: Bytes): Bytes {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function parseHeaders(block: string): { name: string; filename?: string } {
  let name = "";
  let filename: string | undefined;
  const disp = /content-disposition:[^\r\n]*/i.exec(block)?.[0] ?? "";
  name = /;\s*name="([^"]*)"/i.exec(disp)?.[1] ?? "";
  const fn = /;\s*filename="([^"]*)"/i.exec(disp)?.[1];
  if (fn !== undefined) filename = fn;
  return { name, filename };
}

// Stream parts from a Web ReadableStream multipart body. `limit` is the running
// total-bytes cap across ALL part bodies; crossing it throws UploadTooLargeError.
// Each part's `body` MUST be fully consumed before advancing to the next part.
export async function* parseMultipart(
  stream: ReadableStream<Uint8Array>,
  boundary: string,
  limit: number,
): AsyncGenerator<MultipartPart> {
  const reader = stream.getReader();
  const delim = new TextEncoder().encode(`\r\n--${boundary}`);
  const headerEnd = new Uint8Array([CR, LF, CR, LF]);
  let buf: Bytes = new Uint8Array(0);
  let done = false;
  let total = 0; // running bytes across all part bodies (the cap subject)

  async function pull(): Promise<boolean> {
    if (done) return false;
    const { value, done: d } = await reader.read();
    if (d) {
      done = true;
      return false;
    }
    buf = concat(buf, value);
    return true;
  }

  // Skip the preamble up to the first boundary line.
  const first = new TextEncoder().encode(`--${boundary}`);
  for (;;) {
    const i = indexOf(buf, first, 0);
    if (i >= 0) {
      buf = buf.subarray(i + first.length);
      break;
    }
    if (!(await pull())) return;
  }

  for (;;) {
    // After a boundary token: "--" + CRLF = end of stream; CRLF = next part.
    while (buf.length < 2) if (!(await pull())) return;
    if (buf[0] === DASH && buf[1] === DASH) return; // closing boundary
    // consume the CRLF after the boundary token
    let nl = indexOf(buf, new Uint8Array([CR, LF]), 0);
    while (nl !== 0) {
      if (!(await pull())) return;
      nl = indexOf(buf, new Uint8Array([CR, LF]), 0);
    }
    buf = buf.subarray(2);

    // Read this part's header block (terminated by CRLFCRLF).
    let he = indexOf(buf, headerEnd, 0);
    while (he < 0) {
      if (!(await pull())) throw new HostError("malformed multipart header");
      he = indexOf(buf, headerEnd, 0);
    }
    const head = new TextDecoder().decode(buf.subarray(0, he));
    buf = buf.subarray(he + headerEnd.length);
    const { name, filename } = parseHeaders(head);

    // Stream this part's body until the next boundary delimiter.
    let ended = false;
    async function* partBody(): AsyncGenerator<Uint8Array> {
      for (;;) {
        const d = indexOf(buf, delim, 0);
        if (d >= 0) {
          if (d > 0) {
            total += d;
            if (total > limit) throw new UploadTooLargeError(limit);
            yield buf.subarray(0, d);
          }
          buf = buf.subarray(d + delim.length);
          ended = true;
          return;
        }
        // No delimiter yet: emit all but a tail that could hide a partial match.
        const safe = buf.length - delim.length;
        if (safe > 0) {
          total += safe;
          if (total > limit) throw new UploadTooLargeError(limit);
          yield buf.subarray(0, safe);
          buf = buf.subarray(safe);
        }
        if (!(await pull())) throw new HostError("unexpected end of multipart body");
      }
    }

    yield { name, filename, body: partBody() };
    // Defensive: caller must drain the body so `buf` advances past the delimiter.
    if (!ended) throw new HostError("multipart part body not consumed");
  }
}
