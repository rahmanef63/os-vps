"use client";

import { useEffect, useState } from "react";
import { AppFrame, useActiveShell } from "@/features/os-shell";
import { useBrowserMode } from "./lib/host";
import { useBrowserInspector } from "./lib/use-inspector";
import { MockPane } from "./components/mock-pane";
import { Omnibar } from "./components/omnibar";
import { TabBar } from "./components/tab-bar";
import { AiPanel } from "./components/ai-panel";
import { BookmarkBar } from "./components/bookmark-bar";
import { HistoryView } from "./components/history-view";
import { RemoteView } from "./components/remote-view";
import { useRemoteBrowser } from "./lib/use-remote-browser";
import { usePersistent, type Bookmark, type HistoryEntry } from "./lib/storage";
import { hostOf, toTarget } from "./lib/url";

const HOME = "https://en.wikipedia.org/wiki/Web_browser";

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { url: "https://en.wikipedia.org/wiki/Main_Page", title: "Wikipedia" },
  { url: "https://news.ycombinator.com", title: "Hacker News" },
];

// Mock/demo gate: the live view (and ALL its polling/screencast hooks) only
// mounts when the server target is live — mock mode shows a static notice
// instead of hammering endpoints that have no mock backend. Toggling
// Settings → Server remounts cleanly.
export default function Browser() {
  const { live, demo } = useBrowserMode();
  if (!live)
    return (
      <AppFrame className="bg-card" bodyClassName="overflow-hidden bg-background">
        <MockPane demo={demo} />
      </AppFrame>
    );
  return <LiveBrowser />;
}

// Single shared remote-browser view. The backend (headless Chromium) owns ONE
// page, so there are no tabs — we render its screenshot and forward input.
function LiveBrowser() {
  const rb = useRemoteBrowser();
  // iOS = Safari: single glass address bar, no desktop tab strip / bookmark row.
  const ios = useActiveShell().id === "ios";
  const [bookmarks, setBookmarks] = usePersistent<Bookmark[]>(
    "os-vps:browser.bookmarks",
    DEFAULT_BOOKMARKS,
  );
  const [history, setHistory] = usePersistent<HistoryEntry[]>(
    "os-vps:browser.history",
    [],
  );
  const [showHistory, setShowHistory] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [savingShot, setSavingShot] = useState(false);
  const [savedShotPath, setSavedShotPath] = useState<string | null>(null);

  const url = rb.state.url;
  const blank = !url;
  const bookmarked = bookmarks.some((b) => b.url === url);

  // Record visited urls (de-duped) once the remote page settles on a real url.
  useEffect(() => {
    if (!url) return;
    const entry = { url, title: rb.state.title || hostOf(url), time: Date.now() };
    setHistory((h) => [entry, ...h.filter((x) => x.url !== url)].slice(0, 120));
  }, [url, rb.state.title, setHistory]);

  // omnibar input (url-vs-search resolved) or an absolute bookmark/history url.
  const navigate = (raw: string) => {
    setShowHistory(false);
    void rb.navigate(toTarget(raw));
  };
  const home = () => navigate(HOME);

  const toggleBookmark = () => {
    if (blank) return;
    setBookmarks((bs) =>
      bookmarked
        ? bs.filter((b) => b.url !== url)
        : [...bs, { url, title: rb.state.title || hostOf(url) }],
    );
  };
  const copyLink = () => {
    if (!blank) void navigator.clipboard?.writeText(url).catch(() => {});
  };
  const saveScreenshot = async () => {
    setSavingShot(true);
    setSavedShotPath(null);
    try {
      const res = await fetch(`/api/v1/browser/save-shot?tab=${encodeURIComponent(rb.activeId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!res.ok || !data.path) throw new Error(data.error || `save failed (${res.status})`);
      setSavedShotPath(data.path);
    } catch (e) {
      setSavedShotPath(String(e));
    } finally {
      setSavingShot(false);
    }
  };

  useBrowserInspector({
    url,
    title: rb.state.title,
    bookmarked,
    bookmarkCount: bookmarks.length,
    reload: () => void rb.reload(),
    toggleBookmark,
    home,
  });

  return (
    <AppFrame
      className="bg-card"
      header={
        ios ? undefined : (
          <TabBar
            tabs={rb.tabs}
            activeId={rb.activeId}
            aiOpen={aiOpen}
            onSwitch={rb.switchTab}
            onClose={rb.closeTab}
            onNew={rb.newTab}
            onToggleAi={() => setAiOpen((o) => !o)}
          />
        )
      }
      toolbar={
        <>
          <Omnibar
            ios={ios}
            url={url}
            isNewTab={blank}
            loading={rb.busy}
            // NOTE: the remote /state only returns {url,title} — no history
            // depth — so Back/Forward can't be honestly disabled. Wire these to
            // real canGoBack/canGoForward once the browser service exposes them.
            canBack
            canForward
            bookmarked={bookmarked}
            onBack={() => void rb.back()}
            onForward={() => void rb.forward()}
            onReload={() => void rb.reload()}
            // NOTE: no stop endpoint on the browser service yet — reload is the
            // closest "interrupt the current load". Swap for a real /stop when added.
            onStop={() => void rb.reload()}
            onHome={home}
            onSubmit={navigate}
            onToggleBookmark={toggleBookmark}
            onNewTab={rb.newTab}
            onHistory={() => setShowHistory(true)}
            onCopyLink={copyLink}
            onClearHistory={() => setHistory([])}
          />
          {!ios && <BookmarkBar bookmarks={bookmarks} onOpen={navigate} />}
        </>
      }
      bodyClassName="relative overflow-hidden bg-background"
    >
      <style>{`@keyframes browser-load{0%{left:-40%}50%{left:30%}100%{left:100%}}`}</style>
      <AiPanel open={aiOpen} onOpenChange={setAiOpen} fetchLog={rb.agentLog} />
      <RemoteView
        shot={rb.shot}
        busy={rb.busy}
        live={rb.live}
        offline={rb.offline}
        onRetry={rb.retry}
        onClick={(x, y) => void rb.click(x, y)}
        onType={(t) => void rb.type(t)}
        onKey={(k) => void rb.key(k)}
        onScroll={(dy) => void rb.scroll(dy)}
        onSaveScreenshot={() => void saveScreenshot()}
        savingScreenshot={savingShot}
        savedScreenshotPath={savedShotPath}
      />
      {showHistory && (
        <HistoryView
          history={history}
          onOpen={navigate}
          onClose={() => setShowHistory(false)}
        />
      )}
    </AppFrame>
  );
}
