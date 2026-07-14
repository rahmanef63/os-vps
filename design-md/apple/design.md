# Apple UI/UX Design Guide — iOS & macOS

A practical design reference for building iOS and macOS interfaces that follow Apple's
Human Interface Guidelines (HIG). It documents Apple's **current design language,
Liquid Glass** (iOS 26 / iPadOS 26 / macOS 26 "Tahoe", introduced at WWDC 2025) and
includes **migration notes** from the classic pre‑2025 flat system so teams supporting
older OS versions stay oriented.

> **Scope:** Design guidance (principles, layout, type, color, materials, components,
> motion, accessibility). Not an API manual — SwiftUI/AppKit signatures are shown only
> where they clarify intent.
>
> **Status:** Reflects Apple design guidance as of mid‑2026. Apple expresses most values
> through **system components and semantic tokens**, not fixed numbers — treat the metric
> tables here as *typical defaults*, and prefer standard components + Dynamic Type + Auto
> Layout over hardcoding. Verify anything critical against the live HIG (links at the end).

---

## Table of contents

1. [Design philosophy & principles](#1-design-philosophy--principles)
2. [The two design eras (orientation)](#2-the-two-design-eras-orientation)
3. [Liquid Glass — the material system](#3-liquid-glass--the-material-system)
4. [Materials, depth & elevation](#4-materials-depth--elevation)
5. [Layout & spacing](#5-layout--spacing)
6. [Typography](#6-typography)
7. [Color](#7-color)
8. [Iconography — SF Symbols & app icons](#8-iconography--sf-symbols--app-icons)
9. [Motion & animation](#9-motion--animation)
10. [Components — iOS](#10-components--ios)
11. [Components — macOS](#11-components--macos)
12. [Platform differences: iOS vs iPadOS vs macOS](#12-platform-differences-ios-vs-ipados-vs-macos)
13. [Accessibility](#13-accessibility)
14. [Gestures & input](#14-gestures--input)
15. [Migration checklist: Classic → Liquid Glass](#15-migration-checklist-classic--liquid-glass)
16. [Design tokens (quick reference)](#16-design-tokens-quick-reference)
17. [Resources](#17-resources)

---

## 1. Design philosophy & principles

Apple's design has always rested on three enduring themes. Liquid Glass restates and
extends them but does not replace them.

**The three classic themes**

- **Clarity.** Text is legible at every size, icons are precise, and elements are
  purposeful. Negative space, color, and typography direct attention to what matters.
- **Deference.** The interface defers to content. Chrome recedes; content fills the screen.
  Fluid motion and a light, translucent UI keep the focus on the user's material.
- **Depth.** Distinct visual layers and realistic motion communicate hierarchy, convey
  vitality, and help people understand relationships between elements.

**Liquid Glass's three design pillars** (Apple's framing for the 2025 redesign)

- **Hierarchy.** Controls and interface elements *elevate and distinguish* the content
  beneath them. The UI is a functional layer that floats above content — never competing
  with it.
- **Harmony.** Software aligns with the *concentric* geometry of the hardware and of other
  on‑screen elements, creating harmony between interface, system, and device.
- **Consistency.** Adopt platform conventions so a design stays coherent and continuously
  adapts across window sizes, displays, and devices — cohesive without being uniform.

**Design principle → practice**

| Principle | What it means in practice |
|---|---|
| Content first | The UI is a thin, translucent layer; maximize content area, minimize chrome. |
| Use the system | Standard components inherit correct materials, motion, and accessibility for free. |
| Adapt, don't fix | Design with Dynamic Type, size classes, and safe areas — not fixed pixel layouts. |
| Meaningful depth | Use layering/materials to show hierarchy, not for decoration. |
| Respect the user | Honor accessibility settings, reduce cognitive load, keep interactions predictable. |

---

## 2. The two design eras (orientation)

| | **Classic** (≤ iOS 18 / macOS 15, pre‑2025) | **Liquid Glass** (iOS 26 / macOS 26 Tahoe, 2025+) |
|---|---|---|
| Surface language | Flat fills, opaque bars, subtle blur materials | Translucent **Liquid Glass** that refracts & reflects surroundings |
| Navigation chrome | Bars anchored edge‑to‑edge, opaque or blurred | Bars/controls **float above** content as a distinct glass layer |
| Motion | Spring animations, cross‑fades | Adds **lensing**, **specular highlights**, fluid **morphing** of controls |
| Tab bar (iOS) | Fixed height, opaque | Floating glass; **shrinks on scroll**, expands on scroll‑up |
| Personalization | Light/Dark app icons (from iOS 18) | Light / Dark / **Tinted** / **Clear** icons; tintable UI; clear/dark system looks |
| macOS chrome | Opaque menu bar, solid toolbars | **Transparent menu bar**, refractive sidebars, glass Dock/windows |
| Corners | Rounded, some concentric | Stronger **concentricity**; rounder windows; continuous corners throughout |

**Key takeaway:** If you build with standard components, most of the Liquid Glass look is
adopted **automatically** when compiled against the iOS 26 / macOS 26 SDKs. Custom‑drawn
chrome is what needs manual attention (see the [migration checklist](#15-migration-checklist-classic--liquid-glass)).

---

## 3. Liquid Glass — the material system

Liquid Glass is Apple's system‑wide material introduced at WWDC 2025 across iOS 26,
iPadOS 26, macOS 26 (Tahoe), watchOS 26, and tvOS 26. It "combines the optical qualities
of glass with a fluidity only Apple can achieve," using real‑time rendering to react to
movement and content.

### 3.1 What it is

A dynamic, translucent material that **reflects and refracts its surroundings** while
transforming to focus attention on content. It is a *functional navigation layer* that
sits **above** your app's content — not a background texture.

**Material behaviors**

- **Lensing.** Subtly bends/refracts the content behind it, like a real lens, rather than
  a flat blur.
- **Specular highlights.** Light edges respond to device motion, giving surfaces a lively,
  physical quality.
- **Adaptivity.** Color and contrast adapt to the content behind and to light/dark
  environments automatically.
- **Morphing.** Controls fluidly expand, contract, and reshape during interaction and
  navigation (e.g., a tab bar that shrinks while scrolling).
- **Real‑time GPU rendering.** Effects are computed live; impact on modern Apple silicon
  is negligible.

### 3.2 The two variants

| Variant | Use it for | Notes |
|---|---|---|
| **Regular** (default) | Almost all navigation controls, bars, toolbars, sheets | Adapts legibly over any background; the safe default. |
| **Clear** | Overlays on **media‑rich** content (photo/video) | Only when: content beneath is bright/bold, dimming won't hurt visibility, and legibility is preserved. More transparent, less protective. |

**Rule:** Do **not** mix Regular and Clear variants within the same interface.

### 3.3 The golden rules

1. **Glass belongs to the navigation layer, not content.** Apply it to bars, toolbars,
   tab bars, sidebars, sheets, popovers, menus, and floating controls. **Never** put glass
   on content surfaces — lists, cards, tables, or full‑screen backgrounds stay glass‑free.
2. **Never stack glass on glass.** Glass cannot correctly sample other glass; nesting
   produces muddy, low‑contrast results. Group related glass elements in a **single glass
   container** so they sample the background together and stay visually consistent.
   *(SwiftUI: `GlassEffectContainer { … }`.)*
3. **Keep text off raw glass.** Text should sit on a solid or sufficiently opaque layer,
   never floating directly on transparent glass — this preserves contrast and legibility.
4. **Tint for emphasis only.** Use tint to highlight **primary** actions/elements. If
   everything is tinted, nothing stands out. Secondary actions stay untinted.
   *(SwiftUI: `.buttonStyle(.glassProminent)` for tinted primary; `.buttonStyle(.glass)`
   for secondary.)*

### 3.4 Do / Don't

**Do**

- Let standard components adopt glass automatically; reserve manual glass for genuinely
  custom floating controls (FABs, custom control clusters).
- Group multiple custom glass elements in one container.
- Test every glass surface over your busiest, brightest, and darkest real backgrounds.
- Reserve the **Clear** variant for bright media backdrops only.

**Don't**

- Don't apply glass to scrollable content, cards, or backgrounds.
- Don't stack/nest glass layers.
- Don't tint secondary elements or over‑tint.
- Don't place body text or critical labels directly on transparent glass.
- Don't rely on glass alone to separate two busy regions — add spacing or a solid layer.

### 3.5 Accessibility behavior (built‑in)

Standard glass components respond to system settings automatically — **no extra code**:

- **Reduce Transparency** → glass becomes **frosted/opaque**, dropping refraction for solid legibility.
- **Increase Contrast** → surfaces move toward solid black/white with defined **borders**.
- **Reduce Motion** → elastic/morphing and specular motion effects are **disabled**.

Because glass over busy imagery can threaten the WCAG **4.5:1** text‑contrast minimum,
always verify legibility on real content and lean on solid layers behind text.

---

## 4. Materials, depth & elevation

Beyond Liquid Glass, Apple's material system creates depth by layering translucent
surfaces and applying **vibrancy** (foreground colors that adapt to the material and
backdrop so labels stay legible).

**System material weights** (increasing opacity/blur) — use heavier materials for surfaces
that need more separation from content:

| Material | Typical use |
|---|---|
| Ultra‑thin | Light overlays where background should read through strongly |
| Thin | Popovers, secondary overlays |
| Regular | Standard sheets, general‑purpose panels |
| Thick | Surfaces needing strong separation from busy content |
| Chrome / bar | Navigation bars, tab bars, toolbars (Liquid Glass in 26) |

**Vibrancy levels** pair with materials for text and fills: primary / secondary / tertiary
/ quaternary label vibrancy, plus separator vibrancy. Use the strongest (primary) for the
most important text.

**Elevation & shadow.** Depth is conveyed through layering and material, not heavy drop
shadows. Floating elements (menus, popovers, sheets, glass controls) carry soft, diffuse
shadows; content surfaces stay flat. Keep shadows subtle and consistent — let the material
and layering do the work.

---

## 5. Layout & spacing

### 5.1 The spacing system

- Apple layouts commonly follow an **8‑point grid** with **4‑point** subdivisions for fine
  adjustments. *(This is a widely used convention rather than a hard Apple mandate — the
  real requirement is consistent rhythm and use of system spacing.)*
- Prefer **system spacing** (SwiftUI default paddings/`Spacer`, layout margins) over
  arbitrary numbers so spacing adapts across size classes and platforms.

Recommended spacing scale: **4, 8, 12, 16, 20, 24, 32, 40, 48, 64 pt**.

### 5.2 Safe areas & margins

- Respect **safe areas** — avoid the status bar / Dynamic Island, home indicator, notch,
  and (macOS) title bar. Let backgrounds extend edge‑to‑edge, but keep interactive/critical
  content inside the safe area.
- **iPhone default screen margin:** ~16 pt (readable content often 20 pt).
- **Home‑indicator bottom inset:** 34 pt (portrait). Design bottom bars/controls to clear it.

### 5.3 Adaptivity & size classes

- Design for **size classes** (Compact / Regular width & height) rather than device models.
  A layout that reflows by size class adapts to iPhone, iPad multitasking, Split View, and
  Mac windows automatically.
- Support all orientations and dynamic window resizing on iPad/Mac. Content should reflow,
  not stretch.

### 5.4 Concentricity & corner radius

- **Continuous ("squircle") corners** — Apple uses superelliptical rounding, not simple
  circular arcs. Prefer continuous corner styles.
- **Concentricity:** nested rounded elements should share a common center so their curves
  stay parallel. A child's radius ≈ parent's radius − the gap between them. Liquid Glass
  emphasizes this alignment between controls, containers, and hardware corners.

### 5.5 Typical layout metrics

*Defaults; achieved via standard components, not hardcoding.*

| Element | iOS (pt) | macOS (pt) |
|---|---|---|
| Navigation/title bar | 44 (large title adds ~52) | ~52 unified title+toolbar |
| Tab bar | ~49 (+ bottom safe area); floating glass in 26 | — (uses sidebar/segmented) |
| Toolbar | 44 | ~38–52 |
| Standard list/table row | ≥ 44 tall | ~24–28 |
| Minimum touch target | **44 × 44** | ~28 × 28 (pointer) |
| Sidebar width | ~320 (regular) | ~150–260 |
| Menu bar | — | 24 (transparent in Tahoe) |

---

## 6. Typography

### 6.1 The San Francisco family

- **SF Pro** — the system UI font (iOS, iPadOS, macOS). Neutral, highly legible, optimized
  for screens. Optical variants: **SF Pro Text** (≤ ~19 pt) and **SF Pro Display**
  (≥ ~20 pt); modern systems switch optical sizes automatically.
- **SF Compact** — watchOS and space‑constrained contexts.
- **SF Mono** — code and monospaced needs.
- **New York** — a serif companion for editorial/reading contexts; pairs with SF.

Ship with **Dynamic Type**: use the built‑in **text styles** (Body, Headline, etc.) so text
scales with the user's chosen size, up to large accessibility sizes.

### 6.2 iOS text styles (default "Large" Dynamic Type size)

| Style | Size (pt) | Weight |
|---|---|---|
| Large Title | 34 | Regular |
| Title 1 | 28 | Regular |
| Title 2 | 22 | Regular |
| Title 3 | 20 | Regular |
| Headline | 17 | Semibold |
| Body | 17 | Regular |
| Callout | 16 | Regular |
| Subhead | 15 | Regular |
| Footnote | 13 | Regular |
| Caption 1 | 12 | Regular |
| Caption 2 | 11 | Regular |

### 6.3 macOS text styles (default sizes)

| Style | Size (pt) |
|---|---|
| Large Title | 26 |
| Title 1 | 22 |
| Title 2 | 17 |
| Title 3 | 15 |
| Headline / Body | 13 |
| Callout | 12 |
| Subheadline / Footnote | 11 / 10 |
| Caption 1 / 2 | 10 |

### 6.4 Type best practices

- Use **weight and size**, not many typefaces, to build hierarchy. One or two families max.
- Keep body text **≥ 11 pt** (macOS) / **17 pt Body** (iOS) for comfort; never rely on tiny text.
- Favor **left‑aligned** body copy; avoid justified text.
- Respect **leading/tracking** from the system styles — don't cram lines. Liquid Glass lists
  and forms use slightly increased line height and padding for legibility.
- Never hardcode font sizes where a text style will do — it breaks Dynamic Type.

---

## 7. Color

### 7.1 Philosophy: semantic & adaptive, not fixed hex

Apple's color system is built on **semantic, adaptive tokens** — not guaranteed hex values.
A token like `label` or `systemBackground` automatically resolves to the right value for
light mode, dark mode, increased contrast, and vibrancy. **Always reference roles, not raw
hex**, so your UI adapts for free.

### 7.2 System (accent) colors

`systemRed`, `systemOrange`, `systemYellow`, `systemGreen`, `systemMint`, `systemTeal`,
`systemCyan`, `systemBlue`, `systemIndigo`, `systemPurple`, `systemPink`, `systemBrown`,
`systemGray`. Each has calibrated light/dark renderings. **systemBlue** is the default
tint/accent.

Gray ramp: `systemGray`, `systemGray2` … `systemGray6` (progressively lighter in light mode,
used for backgrounds, fills, and separators).

### 7.3 Semantic roles

| Role group | Tokens | Use |
|---|---|---|
| Text ("label") | `label`, `secondaryLabel`, `tertiaryLabel`, `quaternaryLabel` | Primary → least prominent text |
| Backgrounds | `systemBackground`, `secondarySystemBackground`, `tertiarySystemBackground` | Base surfaces (and grouped variants for grouped tables) |
| Fills | `systemFill` … `quaternarySystemFill` | Fills for controls/shapes over content |
| Separators | `separator`, `opaqueSeparator` | Hairlines between rows/sections |
| Tint | accent / `tintColor` | Interactive elements, selection, primary actions |
| Link | `link` | Hyperlinks |

### 7.4 Dark mode

- Support **both** appearances from day one; test every screen in each.
- Use semantic colors and materials so surfaces, text, and separators invert correctly.
- In dark mode, **elevated** surfaces are slightly lighter than the base to signal layering.
- Don't use pure `#000000` for large areas of "dark" chrome unless intended (OLED true‑black
  is a deliberate choice); semantic backgrounds handle this correctly.

### 7.5 Reference values (community‑measured, sRGB — light mode)

> ⚠️ **Not Apple‑guaranteed.** Use for mockups/CSS approximations only. In native code, use
> the named system colors, which differ subtly and adapt automatically.

| Token | Light | Dark (approx) |
|---|---|---|
| systemBlue | `#007AFF` | `#0A84FF` |
| systemGreen | `#34C759` | `#30D158` |
| systemRed | `#FF3B30` | `#FF453A` |
| systemOrange | `#FF9500` | `#FF9F0A` |
| systemYellow | `#FFCC00` | `#FFD60A` |
| systemIndigo | `#5856D6` | `#5E5CE6` |
| systemPurple | `#AF52DE` | `#BF5AF2` |
| systemPink | `#FF2D55` | `#FF375F` |
| systemTeal | `#30B0C7` | `#40C8E0` |
| label | `#000000` | `#FFFFFF` |
| systemBackground | `#FFFFFF` | `#000000` |

### 7.6 Color best practices

- Never encode meaning in **color alone** — pair with text, icon, or shape (≈8% of men have
  a color‑vision deficiency).
- Keep the accent/tint consistent for interactivity; don't tint decorative elements.
- Verify text contrast (**4.5:1** normal, **3:1** large) in both appearances, especially over
  Liquid Glass and photos.

---

## 8. Iconography — SF Symbols & app icons

### 8.1 SF Symbols

**SF Symbols** is Apple's system icon library (thousands of symbols — 6,900+ and growing;
**SF Symbols 7** shipped alongside the 2025 releases). Symbols are designed to align
optically with San Francisco text.

- **Weights & scales.** Symbols come in the nine font weights (Ultralight → Black) and three
  scales (Small, Medium, Large). Match a symbol's weight to adjacent text.
- **Rendering modes:**
  - **Monochrome** — single color (tint). Default, most versatile.
  - **Hierarchical** — one hue, multiple opacities for depth.
  - **Palette** — two or more explicit colors you choose.
  - **Multicolor** — built‑in meaningful colors (e.g., a yellow bolt).
- **Variable Color** — represents a value/progress by filling layers (signal, volume).
- **Animation** (SF Symbols 6+/7): presets such as **Bounce, Pulse, Variable, Scale,
  Appear/Disappear, Replace**, plus newer **Draw On/Off** and **Magic Replace**; gradients
  are supported in the latest version. Use motion purposefully, and it's disabled under
  Reduce Motion.
- **Accessibility win:** SF Symbols carry proper names/labels, so VoiceOver reads them
  correctly — prefer them over custom bitmap icons.

Design custom symbols to match SF Symbols' stroke, optical alignment, and templates when the
library lacks what you need.

### 8.2 App icons

- **Shape.** iOS/iPadOS mask to Apple's **superellipse "squircle"**; design on a square canvas
  and let the system mask — don't pre‑round. macOS uses a rounded‑square with Apple's standard
  silhouette.
- **Appearances (iOS/macOS 26).** Provide **Light, Dark, and Tinted** variants (and the system
  can present **Clear** looks). In the Liquid Glass era, icons are layered and the system
  applies glass/material treatments — build them **layered** for correct depth.
- **Tooling.** Apple's **Icon Composer** produces the layered, multi‑appearance icon set from a
  single design. Keep icons simple, legible at small sizes, and free of text/photos.
- **Grid.** Follow Apple's icon grid for consistent optical weight; fill the canvas edge‑to‑edge
  (no built‑in padding — the mask handles it).

---

## 9. Motion & animation

Motion communicates hierarchy, gives feedback, and expresses vitality — always in service of
the content, never as decoration.

- **Purposeful.** Every animation should clarify a relationship or state change (navigation
  push, sheet present, selection). Avoid gratuitous movement.
- **Physics‑based.** Prefer **spring** animations for natural, interruptible motion; users
  should be able to grab and redirect an in‑flight gesture.
- **Continuity.** Animate elements from where they were to where they go (shared‑element/zoom
  transitions), so people track objects across states.
- **Liquid Glass motion.** Controls **morph** fluidly (tab bars shrink/expand, controls reshape
  during interaction) and surfaces show **specular** response to device motion. This is
  automatic for standard components.
- **Speed.** Keep transitions quick (≈0.2–0.5 s); don't make people wait on animation.
- **Reduce Motion.** When enabled, replace large motion with cross‑fades; the system disables
  glass elastic/parallax effects automatically for standard components. Honor it for custom
  motion too.

---

## 10. Components — iOS

Standard UIKit/SwiftUI components adopt Liquid Glass automatically when built against iOS 26.
This catalog mirrors the categories in Apple's iOS **Design Resources** (Sketch/Figma UI kit).

### 10.1 Bars

- **Status bar** — reflects system state; choose light/dark content to stay legible over your
  header. Never overlap critical content with the Dynamic Island.
- **Navigation bar** — title + up to a few actions; supports **large titles** that collapse to
  inline on scroll. In 26 it's a floating glass layer.
- **Tab bar** — 2–5 top‑level destinations, bottom‑anchored. In 26 it's **floating glass** that
  **shrinks on scroll** and expands on scroll‑up. Use SF Symbols + short labels.
- **Toolbar** — contextual actions for the current screen (bottom or top). Group related glass
  controls in a container.
- **Search bar** — often integrated into the navigation area; adopts glass during interaction.

### 10.2 Views & containers

Action sheets, alerts, activity view (share sheet), collection views/grids, image views,
page views, **popovers**, scroll views, **sheets** (with detents — e.g., medium/large),
split views, tables/lists (plain, grouped, inset‑grouped), text views, web views.

- **Sheets** are the primary modal surface; use **detents** so a sheet can rest partway.
- **Lists** stay on solid/grouped backgrounds — content layer, **not** glass.

### 10.3 Controls

Buttons (plain / gray / tinted / **filled**; glass & **glassProminent** styles in 26),
context menus, edit menus, labels, page controls, **date/time & wheel pickers**, progress
indicators (bar & activity), **segmented controls**, sliders, **steppers**, **switches**
(toggles), text fields.

- Use the **filled/prominent (tinted)** button for the single primary action per view;
  secondary actions stay untinted.
- Minimum hit target **44 × 44 pt** even if the visual is smaller.

### 10.4 System experiences

- **Dynamic Island** — live/system activity; don't obscure it, integrate Live Activities where
  relevant.
- **Widgets** — glanceable, in system sizes; provide Light/Dark/Tinted‑aware content; layered
  glass treatment in 26.
- **Notifications**, **Control Center** (customizable, with third‑party controls), **Lock
  Screen** (time fluidly sits behind photo subjects), **Home Screen** (layered glass icons &
  widgets, more personalization).

---

## 11. Components — macOS

Mirrors Apple's macOS **Design Resources** (Tahoe UI kit). macOS is pointer‑ and
keyboard‑driven, denser, and windowed.

### 11.1 Menus & the menu bar

- **Menu bar** — global, always at top; **transparent** in Tahoe. Organize commands into
  standard menus (App, File, Edit, View, Window, Help) plus app‑specific menus.
- **Menus** — pull‑down, pop‑up, and **contextual (right‑click)** menus; use SF Symbols and
  keyboard shortcuts; keep hierarchy shallow.

### 11.2 Windows & structure

- **Windows** — resizable, with a **unified title bar + toolbar**; rounder corners in Tahoe.
  Support full‑screen and Stage Manager.
- **Panels** — auxiliary/utility windows (inspectors, find).
- **Sidebars** — primary navigation for source lists; in Tahoe they **refract** content behind
  and reflect the wallpaper. Support collapse.
- **Toolbars** — customizable action rows in the title bar; adopt glass; group related controls.
- **Split views** — multi‑column layouts (sidebar / list / detail).

### 11.3 Controls

Push buttons, pop‑up & pull‑down buttons, checkboxes, radio buttons, **segmented controls**,
sliders, steppers, switches, disclosure triangles, **outline views** (source lists),
**table views** (multi‑column, sortable), text fields, combo boxes, color/date pickers,
level indicators, path controls, search fields, tab views, progress indicators.

- Denser than iOS: standard control height ~**20–22 pt**; smaller pointer targets are OK.
- Support **hover** states, right‑click menus, drag‑and‑drop, and full **keyboard** navigation.

### 11.4 Appearance

Users can choose Light, Dark, **tinted**, and **clear** system looks. Design toolbars, sidebars,
and controls to read correctly across all of them; rely on materials/semantic colors.

---

## 12. Platform differences: iOS vs iPadOS vs macOS

| Dimension | iOS (iPhone) | iPadOS | macOS |
|---|---|---|---|
| Primary input | Touch, gestures | Touch + pointer + keyboard + Pencil | Pointer + keyboard |
| Target size | 44×44 pt min | 44×44 pt (smaller with pointer) | ~28×28 pt (pointer) |
| Navigation | Tab bar + nav stack | Sidebar + split view; tab bar | Sidebar + source list + menus |
| Windowing | Single, full‑screen | Multitasking, Split View, Stage Manager | Multiple resizable windows |
| Density | Low (spacious) | Medium | High (compact) |
| Chrome | Floating glass bars | Glass bars + sidebars | Menu bar + toolbars + windows |
| Hover | — | Limited (pointer) | Full hover states |
| Menus | Context menus, sheets | Context menus, popovers | Menu bar + context menus |
| Text | Larger defaults (17 Body) | 17 Body | Smaller (13 Body) |

**Design once, adapt everywhere.** Use size classes and standard components so the same app
reflows appropriately: a sidebar on iPad/Mac becomes a tab bar or pushed navigation on
iPhone; a popover on iPad becomes a sheet on iPhone. Don't ship an iPhone layout scaled up,
and don't ship a Mac app that ignores the menu bar, keyboard, and pointer.

---

## 13. Accessibility

Accessibility is a **requirement**, not an add‑on. The system does a lot for free when you use
standard components, semantic colors, Dynamic Type, and SF Symbols.

**Contrast**

- Text: **4.5:1** minimum (normal), **3:1** (large ≥ ~18 pt / 14 pt bold). Aim higher for body.
- Meaningful non‑text UI (icons, control boundaries): target **3:1**.
- Re‑check contrast over **Liquid Glass** and photos — transparency can drop text below the
  threshold. Keep text on solid layers.

**Vision & motor**

- **Dynamic Type:** support it everywhere via text styles; layouts must reflow (not clip) at
  the largest accessibility sizes.
- **Touch targets:** **44 × 44 pt** minimum on touch; add spacing between adjacent targets.
- **Color independence:** never convey status by color alone — add icon/text/shape.

**Assistive tech & settings**

- **VoiceOver:** label every control and image; use SF Symbols and standard components so
  names/traits are exposed. Verify a logical focus order.
- **Reduce Transparency / Increase Contrast / Reduce Motion / Bold Text / Larger Text:** honor
  all. Standard glass components already adapt (frosted, bordered, motion‑off); mirror this in
  any custom UI.

**Test**

- Walk each screen with VoiceOver, at max Dynamic Type, in Dark Mode, and with Reduce
  Transparency + Increase Contrast on. Validate contrast with a checker on real backgrounds.

---

## 14. Gestures & input

- **Standard gestures are sacred.** Tap, long‑press (context menus), swipe, edge‑swipe back,
  pull‑to‑refresh, pinch, drag‑and‑drop, and the bottom‑edge home gesture must keep their
  system meanings. Don't override edge swipes or reassign standard gestures.
- **Discoverable + forgiving.** Provide visible affordances for key actions (don't hide the
  only path behind an obscure gesture). Make destructive gestures **reversible** (undo) or
  **confirmed**.
- **Feedback.** Pair gestures with visual (and where appropriate haptic) feedback so people
  know an action registered.
- **macOS input.** Support full keyboard navigation, shortcuts (with standard equivalents),
  right‑click menus, hover, trackpad gestures, and drag‑and‑drop.

---

## 15. Migration checklist: Classic → Liquid Glass

Adopting the iOS 26 / macOS 26 SDK gives standard components the new look automatically. Use
this list to catch the rest.

**Get for free (recompile against the 26 SDK)**

- Navigation bars, tab bars, toolbars, sheets, popovers, menus, alerts, search — glass, morph,
  and accessibility adaptation are automatic.

**Review & fix manually**

- [ ] **Custom chrome / bars** you drew yourself — replace hand‑rolled blur/opacity with the
      system glass treatment or standard bars.
- [ ] **Glass on content** — audit for glass applied to lists, cards, tables, backgrounds;
      remove it (content stays glass‑free).
- [ ] **Glass‑on‑glass** — flatten nested translucent layers; wrap custom clusters in a single
      **glass container**.
- [ ] **Text on glass** — move labels onto solid layers; re‑verify **4.5:1** contrast.
- [ ] **Tinting** — restrict tint to primary actions; de‑tint secondary/ decorative elements.
- [ ] **Clear vs Regular** — use **Clear** only over bright media; default to **Regular**;
      never mix in one view.
- [ ] **App icon** — supply **Light / Dark / Tinted** layered variants (Icon Composer); design
      for glass layering.
- [ ] **Corners & concentricity** — align nested radii; adopt continuous corners; account for
      rounder macOS windows.
- [ ] **Custom motion** — ensure it honors **Reduce Motion**; consider matching glass morph.
- [ ] **Accessibility pass** — retest with Reduce Transparency, Increase Contrast, VoiceOver,
      and max Dynamic Type on real, busy backgrounds.
- [ ] **Backward support** — if you still support ≤ iOS 18 / macOS 15, gate 26‑only styling with
      availability checks and verify the fallback look.

---

## 16. Design tokens (quick reference)

**Spacing (pt):** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64  ·  base grid 8 (4 for fine)
**Radius (pt):** small 8 · medium 12 · large 16–20 · continuous/"squircle"; keep nested radii concentric
**Touch target:** 44 × 44 pt (iOS) · ~28 × 28 pt (macOS pointer)
**iPhone screen margin:** 16 pt · **bottom safe inset:** 34 pt

**Type (iOS, default):** Large Title 34 · Title1 28 · Title2 22 · Title3 20 · Headline 17 (Semibold) · Body 17 · Callout 16 · Subhead 15 · Footnote 13 · Caption1 12 · Caption2 11
**Type (macOS, default):** Large Title 26 · Title1 22 · Title2 17 · Title3 15 · Body/Headline 13 · Callout 12 · Subhead/Footnote 11/10 · Caption 10
**Fonts:** SF Pro (UI) · SF Compact (watch) · SF Mono (code) · New York (serif)

**Color:** use semantic tokens (`label`, `secondaryLabel`, `systemBackground`, `separator`,
`*Fill`, tint) + system accents (`systemBlue` default). Support Light + Dark; don't hardcode hex.

**Material:** Liquid Glass = navigation layer only · Regular (default) / Clear (bright media) ·
no glass on content · no glass‑on‑glass · tint primary only · text on solid layers.

**Contrast:** 4.5:1 text / 3:1 large & UI. **Motion:** spring, ≤0.5 s, honor Reduce Motion.

---

## 17. Resources

**Apple — official**

- Human Interface Guidelines — https://developer.apple.com/design/human-interface-guidelines
- HIG · Materials — https://developer.apple.com/design/human-interface-guidelines/materials
- Liquid Glass (Technology Overview) — https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass
- Apple Design Resources (Sketch/Figma/Photoshop UI kits) — https://developer.apple.com/design/resources/
- SF Symbols app & guidance — https://developer.apple.com/sf-symbols/
- Newsroom: "A delightful and elegant new software design" (Liquid Glass, WWDC 2025) — https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- WWDC25 · "Meet Liquid Glass" — https://developer.apple.com/videos/play/wwdc2025/219/
- WWDC25 · "Get to know the new design system"

**Source Sketch libraries (this project)**

- Symbols library A — https://www.sketch.com/s/57153a31-3379-4737-8ac6-dbfd6525f052/symbols
- Symbols library B — https://www.sketch.com/s/04c24d8b-38fb-4afb-8836-36617e022f02/symbols

**Reference / synthesis**

- Apple design system breakdown (2026) — https://superdesign.dev/blog/apple-design-system
- Liquid Glass — hierarchy, harmony, consistency — https://www.createwithswift.com/liquid-glass-redefining-design-through-hierarchy-harmony-and-consistency/
- Liquid Glass in Swift — best practices — https://dev.to/diskcleankit/liquid-glass-in-swift-official-best-practices-for-ios-26-macos-tahoe-1coo

---

*Compiled as a design‑guidance reference. Where this document gives numeric values, they are
typical system defaults for orientation — Apple delivers them through standard components,
Dynamic Type, semantic colors, and Auto Layout. Prefer those mechanisms over hardcoded values,
and confirm anything critical against the current HIG.*


