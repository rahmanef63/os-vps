// Single integration seam between this slice and the host app (os-vps): the
// AI streaming bridge is the ONLY host service the editor uses. Lifting the
// slice to the rr catalog = swap this file for an injected `streamAgentTurn`
// capability (UI primitives `@/components/ui/*` + `@/lib/utils` excepted).

export { streamAgentTurn, type AgentMsg, type AiTool } from "@/lib/ai/stream";

// Hidden-input file picker primitive (rr's audit:templates forbids raw
// native file inputs in slice source — the picker owns the hidden input).
export { FilePicker, type FilePickerHandle } from "@/components/ui/file-picker";
