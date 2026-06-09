// Host facade — the single import for /api/v1 route handlers. All host access
// (fs/exec/sys) is LOCAL: os-vps runs as a host process, so it touches the
// filesystem and spawns commands directly. No external agent. Bounds + auth
// live in paths.ts and the route's verifyAuth() gate.
export { listDir, readFile, writeFile, makeDir, remove, move, copy, uploadInto, searchFs, usage, statReadable, fileStream, mimeFor } from "./fs";
export { runCommand } from "./exec";
export { openPty, attachPty, writePty, resizePty, closePty, hasPty } from "./pty";
export { stats, processes } from "./sys";
export { audit } from "./audit";
export type { AuditAction, AuditEntry } from "./audit";
export { rateLimited } from "./rate-limit";
export { HostError } from "./host-error";
export { apiError, readJson, requireString, optionalString, requireInt, invalidRequest } from "./api-error";
