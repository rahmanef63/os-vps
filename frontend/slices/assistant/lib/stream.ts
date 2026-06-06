// Thin alias so components import the stream from one place. The actual
// implementation (and the configureAssistantStream seam) lives in ./host.
export { streamReply, type WireMsg } from "./host";
