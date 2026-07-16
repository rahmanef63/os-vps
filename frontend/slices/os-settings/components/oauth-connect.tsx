"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/features/os-shell";
import { Button } from "@/components/ui/button";

// "Sign in with OpenAI" (ChatGPT Codex, device-code). Starts the flow, shows the
// user code + opens the verification page, polls until the token lands, then
// onConnected() refreshes the parent (the provider becomes openai-codex, selected).
export function OAuthConnect({ onConnected }: { onConnected: () => void }) {
  const [flow, setFlow] = useState<{ userCode: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  function stop() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
    setFlow(null);
  }

  async function start() {
    setBusy(true);
    try {
      const r = await fetch("/api/oauth/openai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast(d.error || "Couldn’t start sign-in", { tone: "error" });
        setBusy(false);
        return;
      }
      setFlow({ userCode: d.userCode, url: d.verificationUrl });
      window.open(d.verificationUrl, "_blank", "noopener,noreferrer");
      schedule(Math.max(3000, d.intervalMs || 5000));
    } catch {
      toast("Couldn’t reach the server", { tone: "error" });
      setBusy(false);
    }
  }

  function schedule(intervalMs: number) {
    timer.current = window.setTimeout(async () => {
      try {
        const r = await fetch("/api/oauth/openai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "poll" }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.ok) {
          stop();
          toast("Signed in with OpenAI");
          onConnected();
          return;
        }
        if (!r.ok) {
          stop();
          toast(d.error || "Sign-in failed", { tone: "error" });
          return;
        }
      } catch {
        /* transient network blip — keep polling */
      }
      schedule(intervalMs); // still pending
    }, intervalMs);
  }

  return (
    <div>
      {!flow ? (
        <Button variant="outline" size="sm" className="[@media(pointer:coarse)]:min-h-[44px]" disabled={busy} onClick={start}>
          {busy ? "Starting…" : "Sign in with OpenAI (ChatGPT)"}
        </Button>
      ) : (
        <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
          <p>
            Enter this code at{" "}
            <a className="text-primary underline" href={flow.url} target="_blank" rel="noreferrer">
              {flow.url}
            </a>
            :
          </p>
          <p className="font-mono text-lg tracking-widest">{flow.userCode}</p>
          <p className="text-xs text-muted-foreground">Waiting for authorization…</p>
          <Button variant="ghost" size="sm" className="text-muted-foreground [@media(pointer:coarse)]:min-h-[44px]" onClick={stop}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
