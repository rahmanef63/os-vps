# image-editor — layered raster editor

Embeddable, layer-based image editor built on Konva. Consumed as a LIBRARY
slice: import `{ ImageEditor }` (or the store/model pieces) from the barrel —
it is not an app descriptor by itself (os-vps mounts it via media-studio).

## Capabilities

- Layers: raster/text/shape, blend modes, opacity, layer styles
  (drop shadow / outer glow / stroke), reorder, lock/hide.
- Edit: transforms, crop, resize, aspect presets, paint brushes,
  adjustments (per-layer), text with font choices.
- Background removal: free, fully in-browser (`@imgly/background-removal`,
  lazy-loaded ONNX model).
- Export: PNG / JPEG / WebP via `exportStage` / `stageToDataURL`.
- **AI function-calling**: every editor operation is a named, schema'd
  command (`commands/registry.ts`); `useEditorCommands` binds them to the
  live store and the in-editor chat drives them through the host AI stream.
- **Headless**: `server.ts` barrel runs the command registry against a doc
  with no DOM (used by API routes / CLI flows). Render = open the doc in
  the real editor.

## Integration seam

The ONLY host service used is the AI streaming bridge, re-exported through
**`lib/host.ts`** — swap that single file to lift the slice. UI primitives
come from `@/components/ui/*` (shadcn) + `@/lib/utils` (`cn`); the slice also
ships its own `ui/` variants (slider/tabs) where the editor needs bespoke
behavior.

See `ARCHITECTURE.md` for the full design.
