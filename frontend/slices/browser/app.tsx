"use client";

import { useRef, useState } from "react";
import { AppFrame, useActiveShell } from "@/features/os-shell";
import { useBrowserInspector } from "./lib/use-inspector";
import { Omnibar } from "./components/omnibar";
import { TabBar } from "./components/tab-bar";
import { BookmarkBar } from "./components/bookmark-bar";
import { HistoryView } from "./components/history-view";
import { EmbedView } from "./components/embed-view";
import { usePersistent, type Bookmark, type HistoryEntry } from "./lib/storage";
import { hostOf, toTarget } from "./lib/url";

const HOME = "https://en.wikipedia.org/wiki/Web_browser";

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { url: "https://en.wikipedia.org/wiki/Main_Page", title: "Wikipedia" },
  { url: "https://news.ycombinator.com", title: "Hacker News" },
];

// Per-tab navigation state: a local url stack (`pos` = cursor) because a
// cross-origin iframe's history is unreachable — Back/Forward walk OUR stack.
// `epoch` bumps remount the frame to reload the same url.
type TabState = { id: number; stack: string[]; pos: number; epoch: number };

const urlOf = (t: TabState) => t.stack[t.pos] ?? "";
const blankTab = (id: number): TabState => ({ id, stack: [], pos: -1, epoch: 0 });

// Embedded browser: each tab renders its page in a sandboxed iframe. No
// backend — the headless-Chromium (os-browser) service was retired; a real
// browser runtime may return later behind this same UI.
export default function Browser() {
  const ios = useActiveShell().id === "ios";
  const [tabs, setTabs] = useState<TabState[]>([blankTab(1)]);
  const [activeId, setActiveId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const nextId = useRef(2);

  const [bookmarks, setBookmarks] = usePersistent<Bookmark[]>(
    "os-vps:browser.bookmarks",
    DEFAULT_BOOKMARKS,
  );
  const [history, setHistory] = usePersistent<HistoryEntry[]>(
    "os-vps:browser.history",
    [],
  );

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const url = urlOf(active);
  const blank = !url;
  const bookmarked = bookmarks.some((b) => b.url === url);

  const patchActive = (fn: (t: TabState) => TabState) =>
    setTabs((ts) => ts.map((t) => (t.id === active.id ? fn(t) : t)));

  // omnibar input (url-vs-search resolved) or an absolute bookmark/history url.
  const navigate = (raw: string) => {
    const target = toTarget(raw);
    setShowHistory(false);
    setLoading(true);
    patchActive((t) => ({
      ...t,
      stack: [...t.stack.slice(0, t.pos + 1), target],
      pos: t.pos + 1,
    }));
    const entry = { url: target, title: hostOf(target), time: Date.now() };
    setHistory((h) => [entry, ...h.filter((x) => x.url !== target)].slice(0, 120));
  };
  const back = () => {
    setLoading(true);
    patchActive((t) => (t.pos > 0 ? { ...t, pos: t.pos - 1 } : t));
  };
  const forward = () => {
    setLoading(true);
    patchActive((t) => (t.pos < t.stack.length - 1 ? { ...t, pos: t.pos + 1 } : t));
  };
  const reload = () => {
    setLoading(true);
    patchActive((t) => ({ ...t, epoch: t.epoch + 1 }));
  };
  const home = () => navigate(HOME);

  const newTab = () => {
    const id = nextId.current++;
    setTabs((ts) => [...ts, blankTab(id)]);
    setActiveId(id);
    setLoading(false);
  };
  const closeTab = (id: number) => {
    const left = tabs.filter((t) => t.id !== id);
    if (!left.length) {
      const fresh = blankTab(nextId.current++);
      setTabs([fresh]);
      setActiveId(fresh.id);
      return;
    }
    setTabs(left);
    if (id === activeId) setActiveId(left[left.length - 1].id);
  };
  const switchTab = (id: number) => {
    setActiveId(id);
    setLoading(false);
  };

  const toggleBookmark = () => {
    if (blank) return;
    setBookmarks((bs) =>
      bookmarked
        ? bs.filter((b) => b.url !== url)
        : [...bs, { url, title: hostOf(url) }],
    );
  };
  const copyLink = () => {
    if (!blank) void navigator.clipboard?.writeText(url).catch(() => {});
  };

  useBrowserInspector({
    url,
    title: blank ? "" : hostOf(url),
    bookmarked,
    bookmarkCount: bookmarks.length,
    reload,
    toggleBookmark,
    home,
  });

  return (
    <AppFrame
      className="bg-card"
      header={
        ios ? undefined : (
          <TabBar
            tabs={tabs.map((t) => ({
              id: t.id,
              url: urlOf(t),
              title: urlOf(t) ? hostOf(urlOf(t)) : "New Tab",
            }))}
            activeId={active.id}
            onSwitch={switchTab}
            onClose={closeTab}
            onNew={newTab}
          />
        )
      }
      toolbar={
        <>
          <Omnibar
            ios={ios}
            url={url}
            isNewTab={blank}
            loading={loading}
            canBack={active.pos > 0}
            canForward={active.pos < active.stack.length - 1}
            bookmarked={bookmarked}
            onBack={back}
            onForward={forward}
            onReload={reload}
            // An embedded frame can't be interrupted — just drop the indicator.
            onStop={() => setLoading(false)}
            onHome={home}
            onSubmit={navigate}
            onToggleBookmark={toggleBookmark}
            onNewTab={newTab}
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
      {tabs.map((t) => (
        <EmbedView
          key={t.id}
          url={urlOf(t)}
          frameKey={`${t.pos}:${t.epoch}`}
          active={t.id === active.id}
          onLoad={() => {
            if (t.id === active.id) setLoading(false);
          }}
        />
      ))}
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
