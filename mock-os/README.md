# mock/ — design reference

Drop the **`mock-os`** design folder here (you said you'll upload it).

Once it lands, Phase 1 reconciles the live shell to it **without breaking rr rules**:

- Visuals only — extract design tokens into `app/globals.css` theme vars (oklch),
  not hex literals in components.
- Layout/motion → `frontend/slices/os-shell/components/*`. shadcn primitives only;
  raw `<button>`/`<dialog>` get wrapped.
- Mobile-first: start single-column, layer `md:`/`lg:` up.
- This folder is reference material — it is **not** imported by app code and is
  excluded from the build.

Current shell is built to best-practice defaults (neutral dark theme, dock +
launcher + draggable windows) so there's a working surface to reconcile against.
See `../docs/PLAN.md` §Phase 1.
