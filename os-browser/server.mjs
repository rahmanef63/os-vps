import http from "http";
import { createHash, timingSafeEqual } from "crypto";
import os from "os";
import path from "path";
import { chromium } from "playwright";

// os-browser — a REAL Chromium on the VPS host, driven over a tiny HTTP API.
// ONE persistent context (cookies/cache/localStorage saved to disk, so logins
// stick across restarts) but ONE PAGE PER CONSUMER: the human viewer ("ui") and
// the agent ("agent") each get their own tab, so they never fight over the same
// page — while still SHARING the login/profile (a tab is cheap; a second
// Chromium would not be). Loopback + secret; os-vps is the only caller. An
// http(s) target CAN reach LAN/metadata by design, so never expose this port and
// never let an unauthenticated relay forward here.

const PORT = Number(process.env.OS_BROWSER_PORT || 4002);
const HOST = process.env.OS_BROWSER_HOST || "127.0.0.1";
const SECRET = process.env.OS_BROWSER_SECRET || "";
const USER_DATA_DIR =
  process.env.OS_BROWSER_PROFILE || path.join(os.homedir(), ".os-vps", "chrome-profile");
const VIEWPORT = {
  width: Number(process.env.OS_BROWSER_WIDTH || 1280),
  height: Number(process.env.OS_BROWSER_HEIGHT || 800),
};
const IDLE_MS = Number(process.env.OS_BROWSER_IDLE_MS || 0);
// Hard cap on concurrent consumer tabs so a runaway can't spawn unbounded pages.
const MAX_PAGES = Number(process.env.OS_BROWSER_MAX_PAGES || 6);
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

// Per-consumer state: page + serialized action chain + last-touch timestamp. The
// first existing tab is adopted as the "default" consumer's page.
const sessions = new Map();
function sanitize(c) {
  return String(c || "default").replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "default";
}
async function getSession(consumer) {
  const key = sanitize(consumer);
  let s = sessions.get(key);
  if (s && !s.page.isClosed()) {
    s.touch = Date.now();
    return s;
  }
  // Evict the least-recently-used tab when at the cap (never the live "default").
  if (sessions.size >= MAX_PAGES) {
    const victim = [...sessions.entries()]
      .filter(([k]) => k !== "default")
      .sort((a, b) => a[1].touch - b[1].touch)[0];
    if (victim) {
      await victim[1].page.close().catch(() => {});
      sessions.delete(victim[0]);
    }
  }
  const page = key === "default" && ctx.pages()[0] ? ctx.pages()[0] : await ctx.newPage();
  await page.goto("about:blank").catch(() => {});
  s = { page, chain: Promise.resolve(), touch: Date.now() };
  sessions.set(key, s);
  return s;
}
// Serialize per page so navigate/screenshot for one consumer never interleave.
function run(s, fn) {
  s.chain = s.chain.then(fn, fn);
  return s.chain.then((v) => v);
}

// Idle reaper: reset "default" to about:blank, CLOSE other idle tabs to free RAM.
if (IDLE_MS > 0)
  setInterval(() => {
    const now = Date.now();
    for (const [key, s] of sessions) {
      if (now - s.touch < IDLE_MS) continue;
      if (key === "default") {
        if (s.page.url() !== "about:blank") void run(s, () => s.page.goto("about:blank").catch(() => {}));
      } else {
        void s.page.close().catch(() => {});
        sessions.delete(key);
      }
    }
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
const stateOf = async (page) => ({ url: page.url(), title: await page.title().catch(() => "") });

function secretOk(provided) {
  const a = createHash("sha256").update(String(provided ?? "")).digest();
  const b = createHash("sha256").update(SECRET).digest();
  return timingSafeEqual(a, b);
}

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
  if (p === "/health") return send(res, 200, { ok: true, consumers: sessions.size });
  if (!secretOk(req.headers["x-os-browser-secret"])) return send(res, 401, { error: "unauthorized" });

  const consumer = sanitize(req.headers["x-os-browser-consumer"] || u.searchParams.get("consumer"));
  if (p === "/info")
    return send(res, 200, {
      ok: true,
      consumers: [...sessions.keys()],
      profile: USER_DATA_DIR,
      viewport: VIEWPORT,
      headless: HEADLESS,
      extension: EXT_DIR || null,
      idleMs: IDLE_MS,
      maxPages: MAX_PAGES,
    });

  const s = await getSession(consumer);
  const page = s.page;
  try {
    if (p === "/screenshot" && req.method === "GET") {
      const jpeg = u.searchParams.get("type") === "jpeg";
      const opts = jpeg ? { type: "jpeg", quality: Number(u.searchParams.get("q") || 60) } : { type: "png" };
      const buf = await run(s, () => page.screenshot(opts));
      return send(res, 200, buf, jpeg ? "image/jpeg" : "image/png");
    }
    if (p === "/state") return send(res, 200, await run(s, () => stateOf(page)));
    if (p === "/content")
      return send(res, 200, await run(s, async () => ({
        ...(await stateOf(page)),
        text: (await page.evaluate(() => document.body?.innerText || "")).slice(0, 200000),
      })));
    if (p === "/elements")
      return send(res, 200, await run(s, async () => ({
        ...(await stateOf(page)),
        elements: await page.evaluate(scanElements),
      })));

    const body = req.method === "POST" ? await readJson(req) : {};
    if (p === "/navigate") {
      let target = String(body.url || "").trim();
      if (/^[a-z]+:\/\//i.test(target) && !/^https?:\/\//i.test(target))
        return send(res, 400, { error: "scheme_not_allowed" });
      if (target && !/^[a-z]+:\/\//i.test(target))
        target = /\.\w{2,}($|\/)/.test(target) ? "https://" + target : "https://www.google.com/search?q=" + encodeURIComponent(target);
      return send(res, 200, await run(s, async () => {
        await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 }).catch((e) => ({ e }));
        return stateOf(page);
      }));
    }
    if (p === "/click")
      return send(res, 200, await run(s, async () => {
        await page.mouse.click(Number(body.x) || 0, Number(body.y) || 0);
        await page.waitForTimeout(400);
        return stateOf(page);
      }));
    if (p === "/click-selector")
      return send(res, 200, await run(s, async () => {
        await page.click(String(body.selector || ""), { timeout: 5000 }).catch((e) => ({ e: String(e) }));
        await page.waitForTimeout(400);
        return stateOf(page);
      }));
    if (p === "/fill")
      return send(res, 200, await run(s, async () => {
        await page.fill(String(body.selector || ""), String(body.value ?? ""), { timeout: 5000 }).catch((e) => ({ e: String(e) }));
        return { ok: true };
      }));
    if (p === "/type")
      return send(res, 200, await run(s, async () => {
        await page.keyboard.type(String(body.text || ""));
        return { ok: true };
      }));
    if (p === "/key")
      return send(res, 200, await run(s, async () => {
        await page.keyboard.press(String(body.key || "Enter"));
        await page.waitForTimeout(400);
        return stateOf(page);
      }));
    if (p === "/scroll")
      return send(res, 200, await run(s, async () => {
        await page.mouse.wheel(0, Number(body.dy) || 0);
        return { ok: true };
      }));
    if (p === "/back") return send(res, 200, await run(s, async () => { await page.goBack().catch(() => {}); return stateOf(page); }));
    if (p === "/forward") return send(res, 200, await run(s, async () => { await page.goForward().catch(() => {}); return stateOf(page); }));
    if (p === "/reload") return send(res, 200, await run(s, async () => { await page.reload().catch(() => {}); return stateOf(page); }));

    return send(res, 404, { error: "not found" });
  } catch (e) {
    return send(res, 500, { error: String(e) });
  }
});

server.listen(PORT, HOST, () => console.log(`os-browser on ${HOST}:${PORT}, profile ${USER_DATA_DIR}, max-pages ${MAX_PAGES}`));
