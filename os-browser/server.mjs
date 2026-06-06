import http from "http";
import { createHash, timingSafeEqual } from "crypto";
import os from "os";
import path from "path";
import { chromium } from "playwright";

// os-browser — a REAL headless Chromium on the VPS host, driven over a tiny HTTP
// API. One persistent context (cookies/cache/localStorage saved to disk) so a
// logged-in session sticks across restarts — both the os-vps web browser app AND
// the CLI share it, so no per-site API is needed for CRUD. Renders ANY site (no
// X-Frame-Options problem — it's a browser, not an iframe). Loopback + secret;
// the os-vps container reaches it over docker_gwbridge, ufw keeps it non-public.

const PORT = Number(process.env.OS_BROWSER_PORT || 4002);
// Bind loopback by default — os-vps reaches it on 127.0.0.1 and it must never be
// internet-facing. Override OS_BROWSER_HOST=0.0.0.0 only behind a private bridge.
const HOST = process.env.OS_BROWSER_HOST || "127.0.0.1";
const SECRET = process.env.OS_BROWSER_SECRET || "";
const USER_DATA_DIR =
  process.env.OS_BROWSER_PROFILE || path.join(os.homedir(), ".os-vps", "chrome-profile");
const VIEWPORT = { width: 1280, height: 800 };

if (!SECRET || SECRET.length < 16) {
  console.error("OS_BROWSER_SECRET missing/short (>=16) — refusing to start");
  process.exit(1);
}

const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
  headless: true,
  viewport: VIEWPORT,
  userAgent:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto("about:blank").catch(() => {});

// Serialize actions: one page, avoid interleaving navigate/screenshot.
let chain = Promise.resolve();
const run = (fn) => (chain = chain.then(fn, fn)).then((v) => v);

function send(res, code, body, type = "application/json") {
  const buf = type === "application/json" ? Buffer.from(JSON.stringify(body)) : body;
  res.writeHead(code, { "content-type": type, "content-length": buf.length });
  res.end(buf);
}
function readJson(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => {
      try {
        resolve(d ? JSON.parse(d) : {});
      } catch {
        resolve({});
      }
    });
  });
}
const state = async () => ({ url: page.url(), title: await page.title().catch(() => "") });

// Constant-time secret check (hash both sides to equalize lengths) — matches
// the timingSafeEqual discipline of the main app's auth.
function secretOk(provided) {
  const a = createHash("sha256").update(String(provided ?? "")).digest();
  const b = createHash("sha256").update(SECRET).digest();
  return timingSafeEqual(a, b);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const p = u.pathname;
  if (p === "/health") return send(res, 200, { ok: true, url: page.url() });
  if (!secretOk(req.headers["x-os-browser-secret"])) return send(res, 401, { error: "unauthorized" });

  try {
    if (p === "/screenshot" && req.method === "GET") {
      const png = await run(() => page.screenshot({ type: "png" }));
      return send(res, 200, png, "image/png");
    }
    if (p === "/state") return send(res, 200, await run(state));
    if (p === "/content")
      return send(res, 200, await run(async () => ({
        ...(await state()),
        text: (await page.evaluate(() => document.body?.innerText || "")).slice(0, 200000),
      })));

    const body = req.method === "POST" ? await readJson(req) : {};
    if (p === "/navigate") {
      let target = String(body.url || "").trim();
      // http(s) only — file://, chrome://, etc. would read local/internal
      // surfaces the HTTP API should never expose. Note an http(s) target can
      // still reach LAN/metadata addresses by design (it IS a real browser on
      // the box) — keep this service loopback-bound and the box firewalled.
      if (/^[a-z]+:\/\//i.test(target) && !/^https?:\/\//i.test(target))
        return send(res, 400, { error: "scheme_not_allowed" });
      if (target && !/^[a-z]+:\/\//i.test(target))
        target = /\.\w{2,}($|\/)/.test(target) ? "https://" + target : "https://www.google.com/search?q=" + encodeURIComponent(target);
      return send(res, 200, await run(async () => {
        await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 }).catch((e) => ({ e }));
        return state();
      }));
    }
    if (p === "/click")
      return send(res, 200, await run(async () => {
        await page.mouse.click(Number(body.x) || 0, Number(body.y) || 0);
        await page.waitForTimeout(400);
        return state();
      }));
    if (p === "/type")
      return send(res, 200, await run(async () => {
        await page.keyboard.type(String(body.text || ""));
        return { ok: true };
      }));
    if (p === "/key")
      return send(res, 200, await run(async () => {
        await page.keyboard.press(String(body.key || "Enter"));
        await page.waitForTimeout(400);
        return state();
      }));
    if (p === "/scroll")
      return send(res, 200, await run(async () => {
        await page.mouse.wheel(0, Number(body.dy) || 0);
        return { ok: true };
      }));
    if (p === "/back") return send(res, 200, await run(async () => { await page.goBack().catch(() => {}); return state(); }));
    if (p === "/forward") return send(res, 200, await run(async () => { await page.goForward().catch(() => {}); return state(); }));
    if (p === "/reload") return send(res, 200, await run(async () => { await page.reload().catch(() => {}); return state(); }));

    return send(res, 404, { error: "not found" });
  } catch (e) {
    return send(res, 500, { error: String(e) });
  }
});

server.listen(PORT, HOST, () => console.log(`os-browser on ${HOST}:${PORT}, profile ${USER_DATA_DIR}`));
