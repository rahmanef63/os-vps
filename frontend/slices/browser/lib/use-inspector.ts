"use client";

import { usePublishInspector } from "@/features/os-shell";
import { hostOf } from "./url";

type BrowserInspector = {
  url: string;
  title: string;
  bookmarked: boolean;
  bookmarkCount: number;
  reload: () => void;
  toggleBookmark: () => void;
  home: () => void;
};

// Publishes the browser's state + real handlers to the shell Inspector (⌘I)
// so the scoped Alfa chat can reason about the open page.
export function useBrowserInspector(s: BrowserInspector): void {
  const blank = !s.url;
  usePublishInspector(
    "browser",
    {
      subject: blank ? "Browser" : hostOf(s.url),
      props: [
        { label: "URL", value: blank ? "—" : s.url },
        { label: "Page title", value: s.title || "—" },
        { label: "Bookmarks", value: String(s.bookmarkCount) },
      ],
      actions: [
        { id: "reload", label: "Reload", run: s.reload },
        {
          id: "bookmark",
          label: s.bookmarked ? "Remove bookmark" : "Bookmark page",
          run: s.toggleBookmark,
        },
        { id: "home", label: "Home", run: s.home },
      ],
      context: `Browser showing ${blank ? "a blank page" : s.url}`,
      suggestions: ["Summarize this page", "Is this site safe?", "Find similar sites"],
    },
    [s.url, s.bookmarked, s.bookmarkCount],
  );
}
