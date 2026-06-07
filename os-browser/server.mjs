import http from "http";
import { createHash, timingSafeEqual } from "crypto";
import os from "os";
import path from "path";
import { chromium } from "playwright";

// os-browser — a REAL Chromium on the VPS host, driven over a tiny HTTP API.
// One persistent context (cookies/cache/localStorage saved to disk) so a
// logged-in session sticks across restarts — the os-vps web browser app AND the
// CLI/agent share it, so no per-site API is needed for CRUD. Renders ANY site
// (no X-Frame-Options problem — it's a browser, not an iframe). Loopback +
// secret; os-vps reaches it on 127.0.0.1, ufw keeps it non-public. This is the
// security boundary: an http(s) target CAN reach LAN/metadata by design, so the
// ONLY caller allowed to drive it is os-vps (session-authed) — never expose this
// port and never let an unauthenticated relay forward to it.

const PORT = Number(process.env.OS_BROWSER_PORT || 4002);
// Bind loopback by default — must never be internet-facing. Override
// OS_BROWSER_HOST=0.0.0.0 only behind a private bridge.
const HOST = process.env.OS_BROWSER_HOST || "127.0.0.1";
const SECRET = process.env.OS_BROWSER_SECRET || "";
const USER_DATA_DIR =
  process.env.OS_BROWSER_PROFILE || path.join(os.homedir(), ".os-vps", "chrome-profile");
const VIEWPORT = {
  width: Number(process.env.OS_BROWSER_WIDTH || 1280),
  height: Number(process.env.OS_BROWSER_HEIGHT || 800),
};
// 0 = never. Otherwise reset the page to about:blank after this idle window to
// free Chromium RAM (the context + profile stay, so login survives).
const IDLE_MS = Number(process.env.OS_BROWSER_IDLE_MS || 0);
// Headless by default. Loading an unpacked extension needs headed Chromium under
// Xvfb — set OS_BROWSER_HEADLESS=0 and OS_BROWSER_EXTENSION_DIR together.
const HEADLESS = process.env.OS_BROWSER_HEADLESS !== "0";
const EXT_DIR = process.env.OS_BROWSER_EXTENSION_DIR || "";

if (!SECRET || SECRET.length < 16) {
  console.error("OS_BROWSER_SECRET missing/short (>=16) — refusing to start");
  process.exit(1);
}

const args = ["--no-sandbox", "--disable-dev-shm-usage"];
if (EXT_DIR) args.push(`--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`);

const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
  headless: HEADLESS,
  viewport: VIEWPORT,
  userAgent:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  args,
});
const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto("about:blank").catch(() => {});

// Serialize actions: one page, avoid interleaving navigate/screenshot.
let chain = Promise.resolve();
const run = (fn) => (chain = chain.then(fn, fn)).then((v) => v);

// Idle reset — frees Chromium RAM after inactivity without losing the profile.
let lastTouch = Date.now();
const touch = () => (lastTouch = Date.now());
if (IDLE_MS > 0)
  setInterval(() => {
    if (Date.now() - lastTouch < IDLE_MS) return;
    if (page.url() === "about:blank") return;
    void run(() => page.goto("about:blank").catch(() => {}));
  }, Math.min(IDLE_MS, 60000)).unref();

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

// In-page scan of interactive elements with a stable selector candidate per
// hit, so an agent can act by selector (deterministic) instead of guessed
// pixel coords. Visible elements only, capped to keep the payload small.
function scanElements() {
  const sel = (el) => {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const tid = el.getAttribute("data-testid");
    if (tid) return `[data-testid="${tid}"]`;
    const name = el.getAttribute("name");
    if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
    const parts = [];
    let n = el;
    for (let d = 0; n && n.nodeType === 1 && d < 5 && n.tagName !== "BODY"; d++) {
      const t = n.tagName.toLowerCase();
      const i = Array.from(n.parentNode?.children || []).filter((c) => c.tagName === n.tagName).indexOf(n) + 1;
      parts.unshift(`${t}:nth-of-type(${i})`);
      n = n.parentElement;
    }
    return parts.join(" > ");
  };
  const q = "a,button,input,textarea,select,[role=button],[role=link],[onclick],[contenteditable=true]";
  const out = [];
  for (const el of document.querySelectorAll(q)) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.bottom < 0 || r.top > innerHeight * 3) continue;
    out.push({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type") || undefined,
      role: el.getAttribute("role") || undefined,
      text: (el.innerText || el.value || el.placeholder || el.getAttribute("aria-label") || "").trim().slice(0, 120),
      href: el.getAttribute("href") || undefined,
      selector: sel(el),
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    });
    if (out.length >= 200) break;
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const p = u.pathname;
  if (p === "/health") return send(res, 200, { ok: true, url: page.url() });
  if (!secretOk(req.headers["x-os-browser-secret"])) return send(res, 401, { error: "unauthorized" });
  touch();

  try {
    if (p === "/info")
      return send(res, 200, {
        ok: true,
        url: page.url(),
        profile: USER_DATA_DIR,
        viewport: VIEWPORT,
        headless: HEADLESS,
        extension: EXT_DIR || null,
        idleMs: IDLE_MS,
      });
    if (p === "/screenshot" && req.method === "GET") {
      const jpeg = u.searchParams.get("type") === "jpeg";
      const opts = jpeg ? { type: "jpeg", quality: Number(u.searchParams.get("q") || 60) } : { type: "png" };
      const buf = await run(() => page.screenshot(opts));
      return send(res, 200, buf, jpeg ? "image/jpeg" : "image/png");
    }
    if (p === "/state") return send(res, 200, await run(state));
    if (p === "/content")
      return send(res, 200, await run(async () => ({
        ...(await state()),
        text: (await page.evaluate(() => document.body?.innerText || "")).slice(0, 200000),
      })));
    if (p === "/elements")
      return send(res, 200, await run(async () => ({
        ...(await state()),
        elements: await page.evaluate(scanElements),
      })));

    const body = req.method === "POST" ? await readJson(req) : {};
    if (p === "/navigate") {
      let target = String(body.url || "").trim();
      // http(s) only — file://, chrome://, etc. would read local/internal
      // surfaces the HTTP API should never expose. An http(s) target CAN still
      // reach LAN/metadata addresses (it IS a real browser on the box) — that is
      // why this service is loopback-bound and only os-vps may drive it.
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
    if (p === "/click-selector")
      return send(res, 200, await run(async () => {
        await page.click(String(body.selector || ""), { timeout: 5000 }).catch((e) => ({ e: String(e) }));
        await page.waitForTimeout(400);
        return state();
      }));
    if (p === "/fill")
      return send(res, 200, await run(async () => {
        await page.fill(String(body.selector || ""), String(body.value ?? ""), { timeout: 5000 }).catch((e) => ({ e: String(e) }));
        return { ok: true };
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
