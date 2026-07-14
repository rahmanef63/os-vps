# Windows & Android UI/UX Design Guide

A practical design reference for building **Windows** and **Android** interfaces that follow
each platform's official design system:

- **Windows** → Microsoft **Fluent Design System (Fluent 2)**, Windows 11, built with WinUI 3 /
  Windows App SDK. Signature materials: **Mica** and **Acrylic**.
- **Android** → Google **Material Design 3 (Material You)**, now updated to **Material 3
  Expressive** (announced at Google I/O, May 2025; rolled out with Android 16 QPR1, Sept 2025).

It documents each platform's **current design language** and includes **migration notes** from
the previous generation (Fluent 1 → Fluent 2; Material 2 → Material 3 → Material 3 Expressive)
so teams supporting older versions stay oriented.

> **Scope:** Design guidance (principles, layout, type, color, materials, components, motion,
> accessibility). Not an API manual — WinUI/Compose names appear only to clarify intent.
>
> **Status:** Reflects platform guidance as of mid‑2026. Both systems express most values through
> **standard components and semantic tokens**, not fixed numbers — treat the metric tables here as
> *typical defaults*, and prefer standard components + theming over hardcoding. Verify anything
> critical against the live docs (links at the end).
>
> *Companion doc: an Apple (iOS/macOS) version exists separately — this file covers Windows &
> Android only.*

---

## Table of contents

1. [Design philosophy — both platforms](#1-design-philosophy--both-platforms)
2. [Design eras (orientation)](#2-design-eras-orientation)

**Part A — Windows (Fluent Design System)**
3. [Windows: principles](#3-windows-principles)
4. [Windows: materials & elevation](#4-windows-materials--elevation)
5. [Windows: layout, spacing & geometry](#5-windows-layout-spacing--geometry)
6. [Windows: typography](#6-windows-typography)
7. [Windows: color](#7-windows-color)
8. [Windows: iconography](#8-windows-iconography)
9. [Windows: motion](#9-windows-motion)
10. [Windows: components](#10-windows-components)
11. [Windows: accessibility](#11-windows-accessibility)

**Part B — Android (Material Design 3 / Expressive)**
12. [Android: principles](#12-android-principles)
13. [Android: Material 3 Expressive (what's new)](#13-android-material-3-expressive-whats-new)
14. [Android: color (dynamic color & roles)](#14-android-color-dynamic-color--roles)
15. [Android: typography](#15-android-typography)
16. [Android: shape](#16-android-shape)
17. [Android: elevation](#17-android-elevation)
18. [Android: layout & spacing](#18-android-layout--spacing)
19. [Android: iconography](#19-android-iconography)
20. [Android: motion](#20-android-motion)
21. [Android: components](#21-android-components)
22. [Android: accessibility](#22-android-accessibility)

**Part C — Shared**
23. [Platform comparison: Windows vs Android](#23-platform-comparison-windows-vs-android)
24. [Migration checklists](#24-migration-checklists)
25. [Design tokens (quick reference)](#25-design-tokens-quick-reference)
26. [Resources](#26-resources)

---

## 1. Design philosophy — both platforms

**Fluent (Windows)** is built to feel *natural on every device* and is expressed through five
foundational qualities: **Light, Depth, Motion, Material, and Scale**. In practice Fluent 2
emphasizes: coherent use of **material** (Mica/Acrylic) for depth, an **accent‑driven** color
system that celebrates personalization, restrained **motion** that guides continuity, and
components that **scale** across form factors (desktop, tablet, Xbox, Surface Hub).

**Material (Android)** rests on the idea of a tangible, print‑inspired UI with consistent
**surfaces, shadows, and motion**. Material 3 (Material You) added **personalization** through
**dynamic color** derived from the user's wallpaper. **Material 3 Expressive** (2025) doubles
down on **emotion and usability** — bolder typography, a richer shape system with morphing, and
**spring‑based motion** — backed by large‑scale usability research.

**Common ground:** use the system components (they carry correct material, motion, and
accessibility for free), theme with **semantic tokens** rather than raw values, design
**adaptively** for many window sizes, and honor user accessibility settings.

---

## 2. Design eras (orientation)

| | **Windows — Fluent** | **Android — Material** |
|---|---|---|
| Previous gen | Fluent 1 (Windows 10): heavier Acrylic, sharp corners, Segoe UI | Material 2 (2018): fixed brand color, uniform shadows, Roboto |
| Current gen | **Fluent 2** (Windows 11): **Mica** base, softer Acrylic, **rounded corners (8/4px)**, Segoe UI Variable | **Material 3 / You** (2021+): **dynamic color**, tonal elevation, larger shape scale |
| Latest update | Fluent 2 refinements; per‑element Acrylic; WinUI 3 / Windows App SDK | **Material 3 Expressive** (2025): springy motion, morphing shapes, new components, bolder type |
| Personalization | Accent color + Mica wallpaper tint; light/dark | **Dynamic color** from wallpaper; light/dark; system‑wide theming |
| Corners | 8px containers / 4px controls / 0px snapped | Shape scale 0/4/8/12/16/28/full + morphing |
| Framework | WinUI 3 (XAML), Windows App SDK; WPF/WinForms legacy | Jetpack Compose (Material 3), Views (legacy) |

**Takeaway:** On both platforms, standard components adopt the current look automatically when you
build against the modern framework (WinUI 3 / Material 3 Compose). Custom‑drawn UI is what needs
manual attention (see [migration checklists](#24-migration-checklists)).

---

# Part A — Windows (Fluent Design System)

## 3. Windows: principles

- **Light** — subtle highlights (e.g., *reveal*) draw attention and show interactivity.
- **Depth** — layered materials establish hierarchy between background and foreground.
- **Motion** — connected, purposeful transitions maintain context as users navigate.
- **Material** — Mica and Acrylic add a physical, tactile quality and celebrate the desktop.
- **Scale** — one design adapts across screens and input (mouse, touch, pen, gamepad).

Fluent 2 layers these into practical guidance: **use one backdrop material per window**, keep
content on defined **layers**, lean on the **accent color** for interactivity, and prefer
**WinUI 3 controls** which encode all of the above.

---

## 4. Windows: materials & elevation

Fluent 2 defines **four materials**. Choose by surface purpose:

| Material | What it is | Use for |
|---|---|---|
| **Solid** | Opaque; uses color + elevation to separate regions | The most common material; content areas and controls |
| **Mica** | Opaque backdrop tinted **once** from the desktop wallpaper; neutral when window inactive | The **base layer** of a long‑lived window (incl. the title bar) |
| **Acrylic** | Translucent "frosted glass" (blur + tint + noise) | **Transient** surfaces: flyouts, menus, context menus, popups |
| **Smoke** | Translucent black scrim | Dimming behind **modal** dialogs |

### 4.1 Mica

The recommended backdrop for app windows. It samples the wallpaper **once** (so it's performant
for long‑lived windows), tints with the user's light/dark theme, and becomes neutral when the
window is inactive — giving a subtle focus cue. **Mica Alt** tints more strongly for apps with
**tabbed title bars** that need extra contrast.

Rules: apply the backdrop **only once** per app, on a **transparent** base layer; extend it into
the **title bar**; place content on `LayerFillColorDefault` layers/cards above it. Don't apply a
backdrop directly to individual controls.

### 4.2 Acrylic

Two blends: **Background Acrylic** (reveals wallpaper/desktop behind the app — for transient UI)
and **In‑App Acrylic** (blurs the app's own content — for supporting panes). Recipe = background +
blur + exclusion‑blend + tint + noise. Reserve Acrylic for **transient/contextual** surfaces;
don't cover large backgrounds or place accent‑colored text/hyperlinks on it (contrast fails).

### 4.3 Layering & elevation

Fluent uses a **layer model** rather than heavy shadows: **Base** (Mica) → **Layer** (content
fill) → **Card** (raised content) → **Flyout** (transient, with soft shadow). Depth comes from
material + subtle shadow on transient surfaces, not drop shadows on everything.

### 4.4 Material fallbacks (automatic)

Mica and Acrylic **degrade to a solid color** when: High Contrast is on, transparency is disabled,
Battery Saver is active, on low‑end hardware, or the window is inactive. Always ensure the solid
fallback looks correct.

---

## 5. Windows: layout, spacing & geometry

- **Grid / spacing:** 4px base unit; common steps **4, 8, 12, 16, 20, 24, 32, 40**. Use control
  defaults and layout panels rather than arbitrary gaps.
- **Corner radius (Windows 11):**

  | Radius | Applies to |
  |---|---|
  | **8px** | Top‑level containers: windows, dialogs, flyouts, menus (`OverlayCornerRadius`) |
  | **4px** | In‑page controls: buttons, text boxes, list items, sliders, progress/scrollbars (`ControlCornerRadius`) |
  | **0px** | Straight edges meeting straight edges; maximized/snapped windows; where elements touch |

- **Window size breakpoints (responsive):** **Small** < 640px · **Medium** 641–1007px ·
  **Large** ≥ 1008px. Reflow navigation (e.g., `NavigationView` collapses to a hamburger/`Top`
  mode) by breakpoint.
- **Pointer + touch targets:** design for mouse precision **and** touch — minimum recommended
  interactive size ~**40×40px** (touch), controls default to comfortable heights (~32px standard
  button). Provide adequate spacing for touch and pen.
- **Title bar:** prefer a custom, transparent title bar so Mica shows through; keep caption
  buttons and drag region intact.

---

## 6. Windows: typography

**Font: Segoe UI Variable** (the Windows 11 system font; a variable font with optical sizing —
"Small" optical for captions, "Display" optical for large text). Legacy: Segoe UI.

**Fluent 2 type ramp:**

| Style | Size / Line height | Weight |
|---|---|---|
| Caption | 12 / 16 px | Regular (Small optical) |
| Body | 14 / 20 px | Regular |
| Body Strong | 14 / 20 px | Semibold |
| Body Large | 18 / 24 px | Regular |
| Subtitle | 20 / 28 px | Semibold (Display optical) |
| Title | 28 / 36 px | Semibold |
| Large Title | 40 / 52 px | Semibold |
| Display | 68 / 92 px | Semibold |

**Best practices:** **sentence case** (avoid all‑caps for emphasis); **left‑align** for LTR
languages; use size/weight for hierarchy; meet contrast (**4.5:1** body, **3:1** large ≥ 18.5px
bold / 24px regular).

---

## 7. Windows: color

- **Accent color** drives interactivity (selection, primary buttons, links, focus). It's set by
  the user in Windows Settings and can be pulled from the wallpaper; your app should use the
  **system accent** by default and provide light/dark shades of it.
- **Neutral / layer colors** are semantic fills: `SolidBackgroundFillColorBase`, `…Secondary`,
  `…Tertiary`; `LayerFillColorDefault`; `CardBackgroundFillColorDefault`; text brushes
  `TextFillColorPrimary/Secondary/Tertiary/Disabled`; `ControlFillColor*`; `DividerStrokeColor*`.
- **Theme:** support **Light** and **Dark**; use the theme resource brushes so surfaces, text,
  and strokes invert correctly. Support **High Contrast** themes (system‑defined palettes).
- **Semantic status:** use system colors for success/warning/error/info consistently; never rely
  on color alone.

*Use the named theme brushes, not hardcoded hex — they adapt to theme, high contrast, and accent.*

---

## 8. Windows: iconography

- **Segoe Fluent Icons** is the Windows 11 system icon font (the modern successor to Segoe MDL2
  Assets), covering ~1,600+ glyphs aligned to the Fluent style. Use it for standard command/system
  icons so they match the OS and scale crisply.
- **Fluent UI System Icons** (open‑source) provide a broader cross‑platform set in **Regular** and
  **Filled** weights.
- Keep icons simple and consistent in stroke/optical size; pair with text labels for clarity;
  ensure icons meet non‑text contrast (**3:1**).
- **App icons** follow the Windows 11 icon style (rounded‑square, subtle depth); provide the full
  size set and light/dark tile variants.

---

## 9. Windows: motion

Fluent motion is **purposeful and connected**, not decorative:

- **Connected animations** carry an element across a navigation boundary so users keep context.
- **Implicit/entrance animations** (fade + subtle offset) introduce content gently.
- **Reveal / pointer feedback** highlights interactivity on hover/press.
- Keep durations short (~150–300 ms) and easing natural; respect the **"Animation effects"** and
  **"Show animations"** system settings (reduce/remove motion when disabled).

---

## 10. Windows: components

Standard **WinUI 3 / Windows App SDK** controls encode Fluent 2 materials, geometry, and
accessibility. Core catalog:

- **Navigation & command:** `NavigationView` (left/top), `TabView`, `BreadcrumbBar`, `CommandBar`,
  `MenuBar`, `AppBarButton`, `PipsPager`.
- **Surfaces:** windows, `ContentDialog`, `Flyout`/`MenuFlyout`, `TeachingTip`, `InfoBar`,
  `Expander`, cards.
- **Collections:** `ListView`, `GridView`, `TreeView`, `ItemsView`, `DataGrid` (community).
- **Buttons & input:** `Button`, `SplitButton`, `DropDownButton`, `ToggleButton`,
  `HyperlinkButton`, `RepeatButton`.
- **Selection & value:** `CheckBox`, `RadioButton`/`RadioButtons`, `ToggleSwitch`, `Slider`,
  `ComboBox`, `NumberBox`, `CalendarDatePicker`/`DatePicker`/`TimePicker`, `RatingControl`.
- **Text:** `TextBox`, `RichEditBox`, `AutoSuggestBox`, `PasswordBox`.
- **Status:** `ProgressBar`, `ProgressRing`, `InfoBadge`, `ToolTip`.

Use `NavigationView` as the primary app shell; put transient commands in flyouts/menus (Acrylic);
keep window content on Mica‑backed layers.

---

## 11. Windows: accessibility

- **Contrast:** text **4.5:1** (normal), **3:1** (large); non‑text/UI **3:1**. Verify text over
  Acrylic; avoid accent‑colored text on Acrylic.
- **High Contrast:** support system High Contrast themes; materials fall back to solids
  automatically — confirm the result is legible.
- **Keyboard:** full keyboard operability, visible focus (Fluent focus rectangle), logical tab
  order, and access keys (`Alt`) / accelerators (`Ctrl`+…).
- **Narrator / UI Automation:** use standard controls (they expose correct name/role/state); set
  `AutomationProperties` names/labels on custom UI.
- **Targets & motion:** comfortable hit targets and spacing for touch/pen; honor "show animations"
  and reduce‑motion settings.
- **Scaling:** respect display scaling and text scaling; layouts must reflow, not clip.

---

# Part B — Android (Material Design 3 / Expressive)

## 12. Android: principles

Material Design models a UI of tangible **surfaces** arranged in space, unified by consistent
**color, type, shape, elevation, and motion**. Material 3 adds:

- **Personal** — **dynamic color** derives a full theme from the user's wallpaper (Material You).
- **Adaptive** — one design responds across phones, foldables, tablets, desktop (ChromeOS), Wear,
  and Auto via **window size classes**.
- **Expressive** (2025) — deliberate use of color, shape, type, and motion to create **emotion,
  hierarchy, and delight**, validated by large‑scale usability research (46 studies, 18,000+
  participants).

Use **semantic tokens** (color roles, type scale, shape scale, elevation levels) rather than raw
values, and let **Material components** (Jetpack Compose Material 3) carry the system for you.

---

## 13. Android: Material 3 Expressive (what's new)

Material 3 Expressive is an **evolution of Material 3 / You** (not "Material 4"). It ships with
Android 16 (QPR1, Sept 2025), Pixel first. Highlights:

- **Spring‑based motion.** A new physics motion system replaces fixed easing/duration for
  interactions that feel "alive, fluid, and natural" (with haptics on key actions like dismiss).
- **Expanded shape system.** ~**35 new shapes** plus **shape morphing** (e.g., a square easing
  into a squircle on press); corner‑radius tokens refined; "full" corners use true full values for
  better harmony with type.
- **Bolder typography.** Larger headlines and heavier weights strengthen hierarchy and
  scannability.
- **Refined dynamic color.** Clearer separation between primary/secondary/tertiary tones; theming
  syncs across Google apps.
- **New components:** **Button groups**, **FAB menu** (replaces speed‑dial), **loading
  indicator**, **split button** — plus updates to top app bars, toolbars, carousels, navigation,
  and progress indicators (≈15 components new or updated).
- **Depth cues:** subtle blur/layering (e.g., notification shade).

**Adopt it as a token/motion upgrade, not a reskin** — components pick it up when you build on
Material 3 (Compose Material3 ≥ the Expressive release; updated Figma kits & Material Theme
Builder).

---

## 14. Android: color (dynamic color & roles)

### 14.1 Dynamic color (Material You)

From a source color (usually the wallpaper), Material generates **tonal palettes** — Primary,
Secondary, Tertiary, Neutral, Neutral‑Variant, plus Error — each spanning **tones 0–100**. Roles
are then mapped from those tones, and swapped automatically for light/dark. Users get a personal
theme; you keep brand identity by seeding from a **brand color** when you don't use wallpaper.

### 14.2 Color roles (semantic — use these, not hex)

For each accent (Primary/Secondary/Tertiary) you get a set:

| Role | Purpose |
|---|---|
| `primary` | Main components (filled buttons, active states) |
| `onPrimary` | Content on top of `primary` |
| `primaryContainer` | Standout fills needing less emphasis than `primary` |
| `onPrimaryContainer` | Content on `primaryContainer` |
| `secondary*` / `tertiary*` | Same pattern for supporting & contrasting accents |
| `error` / `onError` / `errorContainer` | Errors & validation |
| `surface`, `surfaceContainerLowest…Highest` | Backgrounds & layered surfaces (M3 surface containers) |
| `onSurface`, `onSurfaceVariant` | Text/icons on surfaces |
| `outline`, `outlineVariant` | Borders, dividers |
| `inverseSurface`, `inversePrimary` | Snackbars, inverse contexts |

Always pair a color role with its `on…` role to guarantee contrast.

### 14.3 Themes

Support **Light** and **Dark**. In M3, dark surfaces get lighter with elevation via **tonal
elevation** (a surface‑tint overlay), not just shadow. Provide a non‑dynamic fallback theme for
older devices / when dynamic color is unavailable.

---

## 15. Android: typography

**Type:** **Roboto** (default) and **Roboto Flex** (variable). Material 3 Expressive favors larger,
heavier headlines. The **M3 type scale** has 5 roles × 3 sizes:

| Role / size | Font size (sp) | Weight |
|---|---|---|
| Display Large / Medium / Small | 57 / 45 / 36 | Regular |
| Headline Large / Medium / Small | 32 / 28 / 24 | Regular (heavier in Expressive) |
| Title Large / Medium / Small | 22 / 16 / 14 | Regular / Medium / Medium |
| Body Large / Medium / Small | 16 / 14 / 12 | Regular |
| Label Large / Medium / Small | 14 / 12 / 11 | Medium |

Use **sp** (scale‑independent pixels) so text respects the user's font‑size setting. Map each UI
text to a **role**, don't hardcode sizes. Left‑align for LTR; keep line length comfortable.

---

## 16. Android: shape

Material uses a **shape scale** applied per component category (e.g., buttons=full, cards=medium,
dialogs=extra‑large):

| Token | Corner radius (dp) | Typical use |
|---|---|---|
| None | 0 | Edge‑to‑edge, tables |
| Extra‑small | 4 | Small chips, snackbars |
| Small | 8 | Text fields, small cards |
| Medium | 12 | Cards |
| Large | 16 | FAB, large cards, bottom sheets |
| Extra‑large | 28 | Dialogs, large FAB, containers |
| Full | 50% / full | Buttons, chips, pills |

**Expressive** adds many more shapes and **morphing** between them for state changes and emphasis —
use morph transitions purposefully, not everywhere.

---

## 17. Android: elevation

M3 expresses elevation with **tonal color + shadow** (tonal elevation tints the surface with the
primary hue as it rises). Six levels:

| Level | Elevation (dp) | Common use |
|---|---|---|
| 0 | 0 | Base surface |
| 1 | 1 | Cards (resting), search bar |
| 2 | 3 | Top app bar (scrolled), chips |
| 3 | 6 | FAB, menus, snackbar |
| 4 | 8 | Navigation drawer |
| 5 | 12 | Modal surfaces (rare) |

Prefer tonal elevation for hierarchy; keep shadows subtle. Don't over‑elevate.

---

## 18. Android: layout & spacing

- **Grid:** **4dp/8dp** base; components align to an 8dp grid, icons/fine details to 4dp.
- **Spacing steps:** 4, 8, 12, 16, 24, 32, 48 dp; standard screen margins **16dp** (compact),
  **24dp+** on wider windows.
- **Window size classes (adaptive):** **Compact** < 600dp · **Medium** 600–839dp · **Expanded**
  840–1199dp · **Large** 1200–1599dp · **Extra‑large** ≥ 1600dp. Switch navigation by class:
  **bottom navigation bar** (compact) → **navigation rail** (medium) → **navigation drawer**
  (expanded+). Support foldables and multi‑window.
- **Touch targets:** minimum **48 × 48 dp** with ≥ 8dp spacing.
- **System bars / insets:** design **edge‑to‑edge** and apply **window insets** so content avoids
  the status bar, navigation bar, and display cutouts.

---

## 19. Android: iconography

- **Material Symbols** is the current icon system — a **variable font** with three styles
  (**Outlined, Rounded, Sharp**) and four adjustable axes: **Weight**, **Fill**, **Grade**, and
  **Optical size** — so icons match your type and can animate (e.g., fill on selection). Succeeds
  the older Material Icons set.
- Use a consistent style across the app; align icon weight/optical size to adjacent text; meet
  **3:1** non‑text contrast.
- **App icons:** provide **adaptive icons** (separate foreground/background layers the launcher
  masks to any shape) and **themed icons** (monochrome layer tinted to the user's Material You
  palette).

---

## 20. Android: motion

- **Physics first (Expressive):** spring‑based motion for natural, interruptible transitions; tune
  spring **damping/stiffness** rather than fixed curves for interactive gestures.
- **Standard easing/duration tokens** still apply for simple transitions (emphasized vs standard
  easing sets; short/medium/long duration tokens).
- **Shared‑axis / container transform / fade‑through** patterns express navigational
  relationships; **shape morphing** signals state changes.
- **Feedback:** pair key actions with subtle motion + haptics.
- **Respect "Remove animations"** (reduce motion) — fall back to fades/instant changes.

---

## 21. Android: components

Build with **Jetpack Compose Material 3** (or Views + Material Components). Core catalog:

- **Navigation:** navigation bar (bottom), navigation rail, navigation drawer, top app bars
  (small/center/medium/large), tabs, **FAB / extended FAB / FAB menu**, search bar/view.
- **Actions:** buttons — **elevated, filled, filled‑tonal, outlined, text**; **icon buttons**;
  **segmented buttons**; **button groups** & **split button** (Expressive); chips (assist, filter,
  input, suggestion).
- **Selection & input:** switches, checkboxes, radio buttons, sliders (+ range), text fields
  (filled/outlined), menus, date/time pickers.
- **Containers:** cards (elevated/filled/outlined), lists, dividers, carousels.
- **Communication:** dialogs, bottom sheets (standard/modal), side sheets, snackbars, badges,
  tooltips, **loading & progress indicators** (linear/circular; new Expressive loading indicator).

Use one primary FAB per screen for the main action; put top‑level destinations in the
bar/rail/drawer that fits the window size class.

---

## 22. Android: accessibility

- **Contrast:** text **4.5:1** (normal), **3:1** (large); non‑text/UI **3:1**. The `on…` color
  roles are designed to pass — verify custom combinations, and offer a high‑contrast theme.
- **Touch targets:** **48 × 48 dp** minimum, adequately spaced.
- **Dynamic text:** use **sp**; support the largest font‑scale and **bold text** without clipping;
  layouts must reflow.
- **TalkBack / screen readers:** provide `contentDescription` for images/icons; use semantic
  components; ensure logical focus order and state announcements.
- **Color independence:** never encode meaning in color alone — add icon/text/shape.
- **Reduce motion:** honor "Remove animations."
- **Test** with TalkBack, large font/display size, dark theme, and Accessibility Scanner.

---

# Part C — Shared

## 23. Platform comparison: Windows vs Android

| Dimension | **Windows (Fluent 2)** | **Android (Material 3 Expressive)** |
|---|---|---|
| Design system | Fluent Design System | Material Design 3 / You |
| Framework | WinUI 3 / Windows App SDK (XAML) | Jetpack Compose Material 3 |
| Signature material | **Mica** (base) + **Acrylic** (transient) | Surfaces + **tonal elevation** (surface tint) |
| Personalization | Accent color + Mica wallpaper tint | **Dynamic color** from wallpaper (full theme) |
| System font | **Segoe UI Variable** | **Roboto / Roboto Flex** |
| Units | px (effective pixels) | **dp** (layout) / **sp** (text) |
| Base grid | 4px | 4dp / 8dp |
| Corner radius | 8px containers / 4px controls | Shape scale 0/4/8/12/16/28/full (+ morph) |
| Touch target | ~40×40px (touch) | **48×48dp** |
| Primary nav | `NavigationView` (left/top) | Bottom bar → rail → drawer (by size class) |
| Icons | Segoe Fluent Icons / Fluent UI System Icons | **Material Symbols** (variable font) |
| Elevation | Layer model + soft shadow on transient | **Tonal** elevation + shadow (6 levels) |
| Motion | Connected animations, reveal | **Spring/physics** (Expressive) + easing tokens |
| Adaptivity | Breakpoints 640/1008px | Window size classes 600/840/1200/1600dp |
| Input focus | Mouse + touch + pen + gamepad | Touch first + keyboard/pointer on large screens |

**Design once, adapt per platform.** Keep information architecture and content parity, but respect
each platform's **native** navigation, materials, type, and iconography — don't ship a Material app
on Windows or a Fluent app on Android. Use each platform's standard components so users get the OS
behaviors they expect.

---

## 24. Migration checklists

### 24.1 Windows — Fluent 1 (Win10) → Fluent 2 (Win11)

Building against **WinUI 3 / Windows App SDK** gets most of this automatically.

- [ ] Adopt **Mica** as the window base layer; extend it into a **transparent custom title bar**.
- [ ] Apply the backdrop **only once**; move content onto Layer/Card brushes.
- [ ] Reserve **Acrylic** for **transient** surfaces (flyouts/menus); remove it from large backgrounds.
- [ ] Update corners to **8px** (containers) / **4px** (controls); 0px where elements touch.
- [ ] Switch to **Segoe UI Variable** and the Fluent 2 type ramp; use sentence case.
- [ ] Use **system accent** + theme brushes (light/dark/high‑contrast) instead of hardcoded colors.
- [ ] Replace Segoe MDL2 with **Segoe Fluent Icons**.
- [ ] Verify **material fallbacks** (High Contrast, transparency off, Battery Saver) look correct.
- [ ] Recheck accessibility: focus visuals, keyboard/access keys, Narrator names, contrast on Acrylic.

### 24.2 Android — Material 2 → Material 3 → Expressive

- [ ] Move to **Material 3** components (Compose Material3) and **color roles** (primary/…/surface).
- [ ] Enable **dynamic color** (with a branded fallback theme for older devices).
- [ ] Replace fixed shadows with **tonal elevation** where appropriate.
- [ ] Adopt the **M3 type scale** (Display→Label) in **sp**; lean into bolder headlines (Expressive).
- [ ] Apply the **shape scale** per component; consider **shape morphing** for emphasis (Expressive).
- [ ] Upgrade motion to **spring‑based** schemes for interactions; keep easing tokens for simple ones.
- [ ] Swap Material Icons for **Material Symbols**; add **themed app icons**.
- [ ] Add new components where they help: **button groups, split button, FAB menu, loading indicator**.
- [ ] Go **edge‑to‑edge** with window insets; validate **window size classes** (bar → rail → drawer).
- [ ] Recheck accessibility: 48dp targets, `on…` contrast, TalkBack, large font scale, reduce motion.

---

## 25. Design tokens (quick reference)

**Windows (Fluent 2)**
- Grid 4px · spacing 4/8/12/16/20/24/32/40 · corners **8px containers / 4px controls / 0px snapped**
- Breakpoints **640 / 1008 px** · touch target ~40×40px
- Font **Segoe UI Variable** — Caption 12 · Body 14 · Body Strong 14 (Semibold) · Body Large 18 ·
  Subtitle 20 · Title 28 · Large Title 40 · Display 68
- Color: **system accent** + theme brushes (`SolidBackgroundFillColorBase`, `LayerFillColorDefault`,
  `CardBackgroundFillColorDefault`, `TextFillColorPrimary`, …); Light/Dark/High‑Contrast
- Material: **Mica** (base, once) · **Acrylic** (transient) · **Smoke** (modal) · **Solid** (content)
- Contrast 4.5:1 / 3:1 · motion 150–300 ms, honor reduce‑motion

**Android (Material 3 / Expressive)**
- Grid 4/8dp · spacing 4/8/12/16/24/32/48dp · margins 16dp (compact)
- Shape 0/4/8/12/16/28/full (+ morphing) · touch target **48×48dp**
- Size classes **600 / 840 / 1200 / 1600 dp** (bottom bar → rail → drawer)
- Font **Roboto / Roboto Flex** — Display 57/45/36 · Headline 32/28/24 · Title 22/16/14 ·
  Body 16/14/12 · Label 14/12/11 (**sp**)
- Color: **dynamic color** → tonal palettes (0–100) → roles (`primary`/`onPrimary`/
  `primaryContainer`/`surface`/`surfaceContainer*`/`outline`…); Light/Dark + **tonal elevation**
- Elevation levels 0/1/3/6/8/12 dp · icons **Material Symbols** (Weight/Fill/Grade/Optical)
- Motion **spring‑based** (Expressive) + easing/duration tokens · contrast 4.5:1 / 3:1

---

## 26. Resources

**Windows — Fluent**
- Fluent 2 Design System — https://fluent2.microsoft.design/
- Fluent 2 · Materials — https://fluent2.microsoft.design/material
- Fluent 2 · Typography — https://fluent2.microsoft.design/typography
- Windows apps design (Microsoft Learn) — https://learn.microsoft.com/windows/apps/design/
- Materials (Mica, Acrylic) — https://learn.microsoft.com/windows/apps/design/signature-experiences/materials
- Mica — https://learn.microsoft.com/windows/apps/design/style/mica
- Acrylic — https://learn.microsoft.com/windows/apps/design/style/acrylic
- Geometry / corner radius — https://learn.microsoft.com/windows/apps/design/signature-experiences/geometry
- WinUI 3 Gallery (interactive control samples) — Microsoft Store
- Fluent UI System Icons — https://github.com/microsoft/fluentui-system-icons

**Android — Material**
- Material Design 3 — https://m3.material.io/
- Material 3 Expressive (blog) — https://blog.google/products-and-platforms/platforms/android/material-3-expressive-android-wearos-launch/
- Material color system / dynamic color — https://m3.material.io/styles/color/system/overview
- Type scale — https://m3.material.io/styles/typography/type-scale-tokens
- Shape — https://m3.material.io/styles/shape/overview
- Elevation — https://m3.material.io/styles/elevation/overview
- Material Symbols — https://fonts.google.com/icons
- Android design (adaptive UI, large screens) — https://developer.android.com/design
- Material Theme Builder — https://material-foundation.github.io/material-theme-builder/

**Reference / synthesis**
- Material 3 Expressive — components/motion/shapes — https://supercharge.design/blog/material-3-expressive
- Material 3 Expressive deep dive — https://www.androidauthority.com/google-material-3-expressive-features-changes-availability-supported-devices-3556392/

---

*Compiled as a design‑guidance reference. Numeric values are typical system defaults for
orientation — both platforms deliver them through standard components and semantic tokens. Prefer
those mechanisms over hardcoded values, and confirm anything critical against the current Fluent /
Material documentation.*


