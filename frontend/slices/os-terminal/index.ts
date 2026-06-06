import { SquareTerminal } from "lucide-react";
import type { AppDescriptor } from "@/features/os-shell";

export const osTerminalApp: AppDescriptor = {
  id: "os-terminal",
  title: "Terminal",
  icon: SquareTerminal,
  gradient: "linear-gradient(160deg,#3a3a40,#111114)",
  load: () => import("./app"),
  defaultSize: { w: 640, h: 400 },
};
