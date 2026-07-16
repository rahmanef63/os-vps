// In-memory OAuth handshake state (device-code / PKCE), keyed by provider slug.
// The server is a single Node process, so a module Map persists across the
// start→poll requests of one flow. Lost on restart (the user just restarts the
// sign-in); tokens live in the host config file — this only holds the transient
// handshake (device_auth_id / user_code, or a PKCE verifier).
type Flow = { verifier?: string; deviceAuthId?: string; userCode?: string; ts: number };
const flows = new Map<string, Flow>();

export function setFlow(provider: string, state: Omit<Flow, "ts">): void {
  flows.set(provider, { ...state, ts: Date.now() });
}

export function getFlow(provider: string): Flow | undefined {
  return flows.get(provider);
}

export function clearFlow(provider: string): void {
  flows.delete(provider);
}
