import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OsRoot } from "../os-root";

// Optional catch-all: the OS is one client shell, but every app is deep-linkable
// (`/files/home/user`, `/code`, `/terminal`). The shell reads the path on the
// client to open the right window (see appshell UrlSync); here we only set a
// per-route <title> from the first segment so shared links read well.
//
// A missing `/_next/static/*` chunk (e.g. an open tab whose old build was
// redeployed) would otherwise fall through to this catch-all and return the app
// HTML with a 200 — the browser then refuses it as the wrong MIME and can't
// recover. `_next` is never an app slug, and real static files are served before
// routing, so any `_next` request that reaches here is a genuine miss → 404,
// which lets the client router hard-reload onto the new build.
function isReserved(slug?: string[]): boolean {
  return slug?.[0] === "_next";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const first = slug?.[0];
  if (!first || isReserved(slug)) return { title: "Manef Shell OS — browser-based server control plane" };
  const name = first.charAt(0).toUpperCase() + first.slice(1);
  return { title: `${name} — MSO` };
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (isReserved(slug)) notFound();
  return <OsRoot />;
}
