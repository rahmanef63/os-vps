// Pty bridge stub. A future host can proxy real ptys over a server-only WS
// route; secrets stay server env — NEVER NEXT_PUBLIC_. The bridge inherits
// the host's own allowlist; this app adds no new host surface.
export type AgentBridge = {
  connect: (sessionId: string) => WebSocket;
};

export const agentBridge: AgentBridge | null = null; // wire in your host
