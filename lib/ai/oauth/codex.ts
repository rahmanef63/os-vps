import type { OAuthBundle } from "@/lib/config/store";

// OpenAI "Codex" OAuth (device-code). The client id + endpoints are the public,
// reverse-engineered Codex-CLI values — no client secret, no app registration.
// The access token authenticates against the ChatGPT *consumer* backend (see
// codex-stream.ts): a ChatGPT Plus/Pro subscription is required, and this is an
// unofficial endpoint that can change without notice.
export const CODEX = {
  clientId: "app_EMoamEEZ73f0CkXaXp7hrann",
  usercodeUrl: "https://auth.openai.com/api/accounts/deviceauth/usercode",
  pollUrl: "https://auth.openai.com/api/accounts/deviceauth/token",
  tokenUrl: "https://auth.openai.com/oauth/token",
  deviceRedirect: "https://auth.openai.com/deviceauth/callback",
  verificationUrl: "https://auth.openai.com/codex/device",
  apiBase: "https://chatgpt.com/backend-api/codex",
} as const;

const REFRESH_MARGIN_MS = 120_000;

export type CodexStart = { deviceAuthId: string; userCode: string; intervalMs: number };

// Kick off the device flow → the user_code + poll credential.
export async function codexStart(): Promise<CodexStart> {
  const r = await fetch(CODEX.usercodeUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: CODEX.clientId }),
  });
  if (!r.ok) throw new Error(`codex usercode HTTP ${r.status}`);
  const j = await r.json();
  const deviceAuthId = String(j.device_auth_id ?? "");
  const userCode = String(j.user_code ?? j.usercode ?? "");
  if (!deviceAuthId || !userCode) throw new Error("codex usercode: missing device_auth_id / user_code");
  return { deviceAuthId, userCode, intervalMs: Math.max(3, parseInt(j.interval ?? "5", 10)) * 1000 };
}

// One poll tick: { pending:true } until the user authorizes, then exchange the
// device server's authorization_code + code_verifier (PKCE is server-side here).
export async function codexPoll(
  deviceAuthId: string,
  userCode: string,
): Promise<{ pending: true } | { bundle: OAuthBundle }> {
  const r = await fetch(CODEX.pollUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ device_auth_id: deviceAuthId, user_code: userCode }),
  });
  if (r.status === 403 || r.status === 404) return { pending: true };
  if (!r.ok) throw new Error(`codex poll HTTP ${r.status}`);
  const j = await r.json();
  if (!j.authorization_code || !j.code_verifier) return { pending: true };
  return { bundle: await codexExchange(String(j.authorization_code), String(j.code_verifier)) };
}

async function codexExchange(code: string, codeVerifier: string): Promise<OAuthBundle> {
  const r = await fetch(CODEX.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: CODEX.deviceRedirect,
      client_id: CODEX.clientId,
      code_verifier: codeVerifier,
    }),
  });
  if (!r.ok) throw new Error(`codex token HTTP ${r.status}`);
  const j = await r.json();
  const access = String(j.access_token);
  return {
    kind: "oauth",
    access,
    refresh: j.refresh_token ? String(j.refresh_token) : undefined,
    expires: Date.now() + (Number(j.expires_in) || 3600) * 1000,
    accountId: decodeAccountId(access),
  };
}

async function codexRefresh(bundle: OAuthBundle): Promise<OAuthBundle> {
  if (!bundle.refresh) throw new Error("codex: no refresh token — sign in again");
  const r = await fetch(CODEX.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: bundle.refresh, client_id: CODEX.clientId }),
  });
  if (!r.ok) throw new Error(`codex refresh HTTP ${r.status}`);
  const j = await r.json();
  const access = String(j.access_token);
  return {
    ...bundle,
    access,
    // the refresh token can be single-use → keep the new one when rotated.
    refresh: j.refresh_token ? String(j.refresh_token) : bundle.refresh,
    expires: Date.now() + (Number(j.expires_in) || 3600) * 1000,
    accountId: decodeAccountId(access) ?? bundle.accountId,
  };
}

// Refresh only when the access token is within the margin of expiry.
export async function ensureFreshCodex(bundle: OAuthBundle): Promise<OAuthBundle> {
  if (Date.now() < bundle.expires - REFRESH_MARGIN_MS) return bundle;
  return codexRefresh(bundle);
}

// chatgpt_account_id lives in the access-token JWT payload under the OpenAI auth
// claim; the Responses backend requires it as a header.
export function decodeAccountId(accessToken: string): string | undefined {
  try {
    const seg = accessToken.split(".")[1];
    if (!seg) return undefined;
    const payload = JSON.parse(Buffer.from(seg, "base64url").toString("utf8"));
    return payload?.["https://api.openai.com/auth"]?.chatgpt_account_id;
  } catch {
    return undefined;
  }
}

// Best-effort model list for the account; the picker falls back to a default.
export async function codexModels(bundle: OAuthBundle): Promise<string[]> {
  try {
    const r = await fetch(`${CODEX.apiBase}/models?client_version=1.0.0`, {
      headers: { authorization: `Bearer ${bundle.access}`, accept: "application/json", originator: "codex_cli_rs" },
    });
    if (!r.ok) return [];
    const j = await r.json();
    const list: unknown[] = Array.isArray(j?.models) ? j.models : Array.isArray(j?.data) ? j.data : [];
    return list
      .map((m) => (typeof m === "string" ? m : (m as { id?: string; slug?: string })?.id ?? (m as { slug?: string })?.slug))
      .filter((m): m is string => typeof m === "string" && m.length > 0);
  } catch {
    return [];
  }
}
