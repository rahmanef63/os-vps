"use client";

import { useEffect, useState } from "react";
import { useBrowserInspector } from "./lib/use-inspector";
import { Omnibar } from "./components/omnibar";
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

// Single shared remote-browser view. The backend (headless Chromium) owns ONE
// page, so there are no tabs — we render its screenshot and forward input.
export default function Browser() {
  const rb = useRemoteBrowser();
  const [bookmarks, setBookmarks] = usePersistent<Bookmark[]>(
    "os-vps:browser.bookmarks",
    DEFAULT_BOOKMARKS,
  );
  const [history, setHistory] = usePersistent<HistoryEntry[]>(
    "os-vps:browser.history",
    [],
  );
  const [showHistory, setShowHistory] = useState(false);

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
    <div className="flex h-full flex-col bg-card">
      <style>{`@keyframes browser-load{0%{left:-40%}50%{left:30%}100%{left:100%}}`}</style>
      <Omnibar
        url={url}
        isNewTab={blank}
        loading={rb.busy}
        canBack
        canForward
        bookmarked={bookmarked}
        onBack={() => void rb.back()}
        onForward={() => void rb.forward()}
        onReload={() => void rb.reload()}
        onStop={() => void rb.refresh()}
        onHome={home}
        onSubmit={navigate}
        onToggleBookmark={toggleBookmark}
        onNewTab={home}
        onHistory={() => setShowHistory(true)}
        onCopyLink={copyLink}
        onClearHistory={() => setHistory([])}
      />
      <BookmarkBar bookmarks={bookmarks} onOpen={navigate} />

      <div className="relative min-h-0 flex-1 bg-background">
        <RemoteView
          shot={rb.shot}
          busy={rb.busy}
          onClick={(x, y) => void rb.click(x, y)}
          onType={(t) => void rb.type(t)}
          onKey={(k) => void rb.key(k)}
          onScroll={(dy) => void rb.scroll(dy)}
        />
        {showHistory && (
          <HistoryView
            history={history}
            onOpen={navigate}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>
    </div>
  );
}
