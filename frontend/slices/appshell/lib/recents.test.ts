import { beforeEach, describe, expect, it } from "vitest";
import { listRecents } from "./recents";
import { closeAll, openWindow } from "./store";

describe("recent apps", () => {
  beforeEach(() => closeAll());

  it("records launches newest-first and dedupes per app", () => {
    openWindow("files", "Files");
    openWindow("docs", "Docs");
    openWindow("files", "Files"); // focus existing — no new window, no re-record
    const apps = listRecents().map((r) => r.app);
    expect(apps.slice(0, 2)).toEqual(["docs", "files"]);
    expect(apps.filter((a) => a === "files")).toHaveLength(1);
  });

  it("re-records after close + reopen, moving the app to the front", () => {
    openWindow("files", "Files");
    openWindow("docs", "Docs");
    closeAll();
    openWindow("files", "Files");
    expect(listRecents()[0].app).toBe("files");
  });
});
