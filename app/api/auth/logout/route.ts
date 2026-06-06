import { NextResponse } from "next/server";
import { SESSION_COOKIE, getSessionActor } from "@/lib/auth/require-session";
import { audit } from "@/lib/host";

export const runtime = "nodejs";

export async function POST() {
  audit({ action: "auth.logout", actor: await getSessionActor(), ok: true });
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
