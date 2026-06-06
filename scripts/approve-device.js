#!/usr/bin/env node
// Seed / list / revoke trusted login devices for os-vps (no Convex — flat JSON,
// same model as the VPS Control Room).
//
//   node scripts/approve-device.js <deviceId> [label]   # approve a device
//   node scripts/approve-device.js --list               # show approved + pending
//   node scripts/approve-device.js --revoke <deviceId>  # un-trust a device
//
// Store path = ~/.os-vps/auth-devices.json unless OS_DEVICE_STORE is set (must
// match what the os-vps service sees).

const fs = require("fs");
const os = require("os");
const path = require("path");

const STORE =
  process.env.OS_DEVICE_STORE || path.join(os.homedir(), ".os-vps", "auth-devices.json");
const DEVICE_ID_RE = /^[a-f0-9-]{16,128}$/i;

function read() {
  try {
    const p = JSON.parse(fs.readFileSync(STORE, "utf8"));
    return { approved: p.approved || {}, pending: p.pending || {} };
  } catch {
    return { approved: {}, pending: {} };
  }
}
function write(store) {
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  const tmp = `${STORE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, STORE);
}
const ts = (t) => (t ? new Date(t).toISOString() : "—");

const args = process.argv.slice(2);

if (args[0] === "--list") {
  const s = read();
  console.log(`store: ${STORE}\n\nAPPROVED:`);
  const ap = Object.entries(s.approved);
  if (!ap.length) console.log("  (none)");
  for (const [id, d] of ap) console.log(`  ${id}  "${d.label}"  approved=${ts(d.approvedAt)} lastSeen=${ts(d.lastSeen)}`);
  console.log("\nPENDING (typed correct password, awaiting approval):");
  const pd = Object.entries(s.pending);
  if (!pd.length) console.log("  (none)");
  for (const [id, d] of pd) console.log(`  ${id}  "${d.label}"  ip=${d.ip} attempts=${d.attempts} last=${ts(d.lastSeen)}`);
  process.exit(0);
}

if (args[0] === "--revoke") {
  const id = args[1];
  if (!id) { console.error("usage: --revoke <deviceId>"); process.exit(1); }
  const s = read();
  if (!s.approved[id]) { console.error(`not approved: ${id}`); process.exit(1); }
  delete s.approved[id];
  write(s);
  console.log(`revoked ${id}`);
  process.exit(0);
}

const id = args[0];
const label = args.slice(1).join(" ") || "seeded device";
if (!id || !DEVICE_ID_RE.test(id)) {
  console.error("usage: approve-device.js <deviceId> [label] | --list | --revoke <id>");
  console.error("deviceId must be 16-128 hex/uuid chars");
  process.exit(1);
}
const store = read();
const pending = store.pending[id];
store.approved[id] = {
  label: label !== "seeded device" ? label : (pending && pending.label) || label,
  approvedAt: Date.now(),
};
delete store.pending[id];
write(store);
console.log(`approved ${id}  "${store.approved[id].label}"`);
console.log("-> that device can now sign in with the password.");
