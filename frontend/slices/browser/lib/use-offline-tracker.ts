"use client";

// Failure-streak → offline gate for the remote-browser polls + acts. Lives in
// its own module so `use-remote-browser.ts` can stay under the 200-line cap.
// The hook tracks a consecutive-failure counter; once it crosses
// `OFFLINE_AFTER`, the `offline` flag flips ON and a one-shot toast fires so
// the user sees a system-level signal even if they're not looking at the
// browser pane. Any successful round-trip resets the streak and clears the
// flag.
//
// `offlineRef` is exposed so the poll-fallback interval can skip work
// synchronously each tick without re-subscribing on every offline toggle.
import { useCallback, useRef, useState } from "react";
import { toast } from "@/features/os-shell";

// Consecutive failed polls/acts before we declare the service offline. ~3s of a
// dead endpoint at the 320ms poll cadence — long enough to ride out a blip,
// short enough that an eternal spinner never happens.
const OFFLINE_AFTER = 8;

export type OfflineTracker = {
  /** True once the failure streak crosses `OFFLINE_AFTER`. */
  offline: boolean;
  /** Latest-value mirror of `offline` for interval/stream callbacks. */
  offlineRef: React.MutableRefObject<boolean>;
  /** Record a successful round-trip — clears the streak + flag. */
  markOk: () => void;
  /** Record a failed round-trip — flips offline once the streak crosses. */
  markFail: () => void;
  /** Manual reset (user hit Retry). Syncs the ref synchronously so the next
   *  poll tick doesn't skip work waiting on the React commit. */
  reset: () => void;
};

export function useOfflineTracker(): OfflineTracker {
  const [offline, setOffline] = useState(false);
  const failRef = useRef(0);
  const offlineRef = useRef(false);

  // eslint-disable-next-line react-hooks/refs -- latest-value ref: interval/stream callbacks read this synchronously every tick; an effect would lag a commit and keep hammering the dead endpoint
  offlineRef.current = offline;

  const markOk = useCallback(() => {
    failRef.current = 0;
    setOffline((o) => (o ? false : o));
  }, []);

  const markFail = useCallback(() => {
    failRef.current += 1;
    if (failRef.current >= OFFLINE_AFTER) {
      setOffline((o) => {
        if (!o) {
          toast("Browser service offline — Retry from the viewport", {
            tone: "error",
            appId: "browser",
          });
        }
        return true;
      });
    }
  }, []);

  const reset = useCallback(() => {
    failRef.current = 0;
    // Sync the latest-value ref BEFORE the caller kicks refresh(): a
    // setOffline(false) commit happens after refresh() reads the ref, so
    // without this the next interval tick would still skip work.
    offlineRef.current = false;
    setOffline(false);
  }, []);

  return { offline, offlineRef, markOk, markFail, reset };
}
