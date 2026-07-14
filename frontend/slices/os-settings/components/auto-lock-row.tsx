"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { autoLockMinutes, setAutoLockMinutes } from "@/features/appshell";
import { SettingsRow as Row } from "@/features/shell-settings";

// The appshell lock-screen already owns the idle timer (reads autoLockMinutes()).
// This is the missing UI to configure it — persists to sv:autolock. A VPS cockpit
// left unattended auto-locks behind the password/device guard.
const OPTIONS = [
  { value: "0", label: "Off" },
  { value: "1", label: "After 1 minute" },
  { value: "5", label: "After 5 minutes" },
  { value: "15", label: "After 15 minutes" },
  { value: "30", label: "After 30 minutes" },
];

export function AutoLockRow() {
  const [value, setValue] = useState(() => String(autoLockMinutes() ?? 0));
  return (
    <Row label="Auto-lock when idle">
      <Select
        value={value}
        onValueChange={(v) => {
          setValue(v);
          setAutoLockMinutes(Number(v) || null);
        }}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Row>
  );
}
