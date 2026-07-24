import { Bot, Boxes, Workflow } from "lucide-react";
import type { AppDescriptor } from "@/features/os-shell";

type ManagedSurface = "applications" | "hermes" | "openclaw";

function managedDescriptor(surface: ManagedSurface): AppDescriptor {
  if (surface === "applications") return {
    id: "managed-applications",
    title: "Applications",
    icon: Boxes,
    gradient: "linear-gradient(160deg,#0ea5e9,#2563eb)",
    load: () => import("./app"),
    defaultSize: { w: 760, h: 600 },
  };
  const hermes = surface === "hermes";
  return {
    id: surface,
    title: hermes ? "Hermes" : "OpenClaw",
    icon: hermes ? Bot : Workflow,
    gradient: hermes ? "linear-gradient(160deg,#8b5cf6,#4f46e5)" : "linear-gradient(160deg,#f97316,#dc2626)",
    load: async () => {
      const loaded = await import("./app");
      return { default: hermes ? loaded.HermesApp : loaded.OpenClawApp };
    },
    defaultSize: { w: 900, h: 640 },
  };
}

export const managedApplicationsApp = managedDescriptor("applications");
export const hermesApp = managedDescriptor("hermes");
export const openclawApp = managedDescriptor("openclaw");
