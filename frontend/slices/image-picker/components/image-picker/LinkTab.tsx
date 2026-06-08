"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ImageValue } from "../../types";

const URL_RX = /^https?:\/\/[^\s]+/i;

export function LinkTab({ onSelect }: { onSelect: (c: ImageValue) => void }) {
  const [url, setUrl] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const submit = async () => {
    const v = url.trim();
    if (!URL_RX.test(v)) { setErr("Paste a full https:// image URL"); return; }
    setErr(null);
    setVerifying(true);
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = v;
    });
    setVerifying(false);
    onSelect({ type: "link", value: v, positionY: 50 });
  };

  return (
    <div className="space-y-3 p-4">
      <Input
        placeholder="https://images.example.com/photo.jpg"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button onClick={submit} disabled={verifying} className="w-full">
        {verifying ? "Checking…" : "Add image"}
      </Button>
      <p className="text-[11px] text-muted-foreground">Works with any public image URL.</p>
    </div>
  );
}
