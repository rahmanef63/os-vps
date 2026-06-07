import { describe, expect, it } from "vitest";
import { getBadge, setBadge } from "./badges";
import { clearNotifications, dismissNotification, markNotificationsRead, toast } from "./toast";

describe("badge store", () => {
  it("sets, replaces, and clears badges", () => {
    setBadge("files", { count: 3 });
    expect(getBadge("files")).toEqual({ count: 3 });
    setBadge("files", { progress: 40 });
    expect(getBadge("files")).toEqual({ progress: 40 });
    setBadge("files", null);
    expect(getBadge("files")).toBeUndefined();
  });
});

describe("notification → badge wiring", () => {
  it("counts unread per app, clears on read", () => {
    toast("one", { appId: "trash" });
    toast("two", { appId: "trash" });
    toast("other", { appId: "app-store" });
    toast("appless");
    expect(getBadge("trash")).toEqual({ count: 2 });
    expect(getBadge("app-store")).toEqual({ count: 1 });

    markNotificationsRead();
    expect(getBadge("trash")).toBeUndefined();
    expect(getBadge("app-store")).toBeUndefined();
  });

  it("recounts when a notification is dismissed", () => {
    const id = toast("a", { appId: "media" });
    toast("b", { appId: "media" });
    expect(getBadge("media")).toEqual({ count: 2 });
    dismissNotification(id);
    expect(getBadge("media")).toEqual({ count: 1 });
    clearNotifications();
    expect(getBadge("media")).toBeUndefined();
  });
});
