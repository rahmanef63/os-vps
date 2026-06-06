// os-vps consumer compat shim. The real implementation lives inside the
// appshell slice (the shell owns its responsive contract); app slices that
// predate the framework still import `@/hooks/use-mobile`, so this re-exports
// it. Deep import (not the barrel) on purpose to avoid pulling the whole shell.
export { useIsMobile } from "@/features/appshell/responsive/use-is-mobile";
