// Barrel — the app layer imports the gate + session from here.
export { AuthGate } from "./components/auth-gate";
export { LoginScreen, LoginCard } from "./components/login-screen";
export { DevicesPanel } from "./components/devices-panel";
export { SessionProvider, useSession, type SessionStatus } from "./lib/use-session";
