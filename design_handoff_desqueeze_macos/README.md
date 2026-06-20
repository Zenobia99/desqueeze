# Handoff: Desqueeze for macOS — Main / Start Window

## Overview
Desqueeze is a macOS desktop app that batch-resizes and converts photos for output. The primary user is a developer / web person optimizing image assets. This handoff covers the **start page** (the app's main window): a three-column layout for picking source photos from the Photos library, reviewing a batch queue with per-file output, and configuring output settings (format, dimensions, resize mode, local AI upscaling, crop/rotate, quality, naming) before export.

This is the first and only screen designed so far. Planned-but-not-yet-designed: dark mode, preset library manager, crop/rotate editor, export progress, settings/preferences.

## About the Design Files
The file in this bundle (`Desqueeze.dc.html`) is a **design reference created in HTML** — a prototype showing the intended look and behavior. It is **not production code to copy directly**. The HTML uses a small internal templating runtime (a `<x-dc>` custom element plus a `Component` logic class); ignore that machinery.

The task is to **recreate this design in the target codebase's environment**. For a native macOS app the natural target is **SwiftUI/AppKit**; if this is being built as a cross-platform/Electron app, recreate it in that stack (React, etc.) using the project's established patterns and component libraries. Match the visuals precisely (this is hi-fi) but use native controls where they exist (e.g. real `NSToolbar`, segmented controls, sidebar source list, sliders).

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, iconography, and interaction states are specified. Recreate the UI pixel-accurately using the codebase's native controls and patterns. Exact hex values, sizes, and copy are given below.

## Window Shell
- **Window size designed at:** 1280 × 820 px, 11px corner radius (use the standard macOS window; the rounding/shadow is just the prototype frame).
- **Vertical structure (top → bottom):** Toolbar (52px) · Body (fills) · Export bar (58px).
- **Body is 3 columns:** Sidebar (236px, fixed) · Queue (fills) · Inspector (328px, fixed).
- **Font:** system font — `-apple-system` / SF Pro Text. Monospace runs (all numeric dimensions/sizes) use SF Mono / `ui-monospace`.

## Screens / Views

### Screen: Main Window (Start Page)
**Purpose:** Select photos, review the resize batch, configure output, export.

#### Region 1 — Toolbar (height 52px)
Background `linear-gradient(#fbfbfc,#f1f1f3)`, bottom border `0.5px #d8d8db`. Horizontal flex, padding `0 14px 0 18px`, gap 14px.
- **Traffic lights** (left): three 12px circles — `#ff5f57`, `#febc2e`, `#28c840`, each `inset 0 0 0 0.5px rgba(0,0,0,.12)`. (In a real app these are provided by the OS window.)
- Vertical divider `1px × 22px #e0e0e3`.
- **"Add Photos" button:** height 30px, padding `0 13px`, border `0.5px #d2d2d6`, radius 7px, bg `linear-gradient(#ffffff,#f4f4f6)`, font 500/13px `#1d1d1f`; leading `+` glyph icon (stroke `#1d1d1f`).
- **"Recents" popup button:** same chrome; trailing down-chevron (stroke `#8a8a8e`). This selects the Photos library source.
- Flex spacer.
- **View segmented control** (List / Grid): container bg `#e7e7ea`, radius 7px, 2px padding. Each segment 30×26px, radius 6px. Selected segment: white bg, `0 1px 2px rgba(0,0,0,.12)`, icon `#1d1d1f`. Unselected: transparent, icon `#9a9aa0`. Icons: list = 3 horizontal lines w/ leading dots; grid = 4 rounded squares.
- **Search field:** width 184px, height 30px, bg white, border `0.5px #d6d6da`, radius 7px; leading magnifier (stroke `#a0a0a5`); placeholder "Search photos" (`#1d1d1f` text, gray placeholder).
- **Adjustments button:** 30×30px, same button chrome, sliders icon (stroke `#5a5a5f`).

#### Region 2 — Sidebar (width 236px)
Background `#f4f4f6`, right border `0.5px #dcdce0`, vertical scroll, padding `12px 10px 18px`.

**Section header label style** (used for "Library" and "Presets"): font 600/11px, letter-spacing .04em, uppercase, color `#9a9aa0`, padding `6px 8px 5px`.

**Library group** (rows are 30px tall, radius 6px, 9px gap, 13.5px label):
- **Recents** — SELECTED state: bg `#1473e6`, white text & icon, trailing count "248" at `rgba(255,255,255,.8)`. Icon = clock-in-circle.
- **Favourites** — icon is the colorful Apple Photos flower (see Assets → `photos-icon.png`, rendered 17×17). Label `#1d1d1f`, trailing count "37" `#a8a8ad`. (This "Photos Favourites" source is a key differentiator — most pickers omit it.)
- **Last Import** — image-mountain icon (stroke `#0a84ff`), count "12".
- **Albums** — albums icon (stroke `#8a8a8e`).

**Presets group** (header has trailing total "42" at `#b6b6bb`, normal-case):
- **Filter field:** 28px tall, bg `#e9e9ec`, radius 6px, leading magnifier, placeholder "Filter presets".
- **Grouped preset list.** Group sub-labels: font 600/10.5px uppercase `#b0b0b5`. Preset row: padding `6px 8px`, radius 6px, 8px gap; two-line — name (500/13px) over dimensions (400/11px monospace `#a8a8ad`). SELECTED preset: bg `#1473e6`, name white, dim `rgba(255,255,255,.8)`, trailing white check.
- Groups & items currently shown (representative of the full 42):
  - **Web:** Web 1× — 800w (`800 px wide`), **Web 2× — 1600w** (`1600 px wide`, selected by default), Web 3× — 2400w (`2400 px wide`), OG Image (`1200 × 630`).
  - **Social:** Instagram Square (`1080 × 1080`), Instagram Story (`1080 × 1920`), X / Twitter (`1600 × 900`), YouTube Thumb (`1280 × 720`).
  - **App Icons:** App Icon (`1024 × 1024`), Favicon (`32 × 32`).

#### Region 3 — Queue (center, fills)
Background white.

**Queue header (40px):** bottom border `0.5px #ededf0`, padding `0 18px`, 10px gap.
- "12 Photos" (600/13px `#1d1d1f`) · "·" (`#8a8a8e`) · "{N} selected" (400/13px `#1473e6`).
- Spacer.
- "Select All" link button (500/12.5px `#0a84ff`).
- "Date Added" sort popup (400/12.5px `#8a8a8e`) + down-chevron.

**List view (default):**
- **Column header row (28px):** bg `#fafafb`, bottom border `0.5px #ededf0`, padding `0 18px`, font 600/11px uppercase `#a4a4a9`. Columns (all `flex:none` except Photo): spacer 54px · **Photo** (flex, fills) · **Source** 122px · arrow-gap 24px · **Output** 150px · **Scale** 60px (right-aligned) · **Est. Size** 74px (right-aligned).
- **Data rows (46px):** padding `0 18px`, bottom border `0.5px #f2f2f4`. Default bg transparent; **SELECTED row bg `#1473e6` with all text white.**
  - Thumbnail: 44×30px, radius 4px, `inset 0 0 0 0.5px rgba(0,0,0,.12)`. (In the prototype thumbnails are CSS gradients standing in for real photos — use actual image thumbnails.) If favourited, a white heart in a `rgba(0,0,0,.35)` 13px circle, bottom-right.
  - Photo cell: filename (500/13px; `#1d1d1f`, white if selected) + format badge + optional "custom" badge.
    - **Format badge** (the photo's *source* format, e.g. HEIC/JPEG): font 600/9.5px, padding `2px 5px`, radius 4px; unselected bg `#ececef` text `#7a7a80`; selected bg `rgba(255,255,255,.22)` text white.
    - **"custom" badge** (row has a per-file override): same metrics; unselected bg `#e8f1fd` text `#1473e6`; selected white-on-translucent.
  - Source cell: 12.5px monospace, e.g. `3,840 × 2,160`; color `#9a9aa0` (selected `rgba(255,255,255,.78)`).
  - Arrow: right-arrow glyph, `#c8c8cd` (selected `rgba(255,255,255,.6)`).
  - Output cell: 12.5px monospace **600 weight**, e.g. `1,600 × 900`; `#1d1d1f` (selected white). If the target is larger than source, append an **"↑ Upscaly" badge**: font 600/9.5px, padding `2px 5px`, radius 4px, bg `linear-gradient(135deg,#f0eaff,#eef4ff)` text `#7b5cff` (violet — the upscale/AI accent).
  - Scale cell: 12.5px monospace 500, right-aligned; `#5a5a5f`, but **`#1473e6` when ≥100%** (i.e. upscaling); selected `rgba(255,255,255,.92)`. Format: `42%`, or `+142%` when upscaling.
  - Est. Size cell: 12.5px monospace, right-aligned, `#9a9aa0` (selected translucent white). e.g. `238 KB`, `1.7 MB`.

**Grid view:** 3-column CSS grid, gap 14px, padding `16px 18px`. Card: radius 9px, 6px padding; SELECTED card bg `rgba(20,115,230,.10)` + `0 0 0 2px #1473e6`. Thumbnail 16:9, radius 7px. Favourite heart bottom-right (white heart in dark circle). Selection check: top-left, 20px `#1473e6` circle, white check, `0 1px 3px rgba(0,0,0,.3)`. Below thumbnail: output dims (600/12.5px) + source format badge; sub-line `{source} · {est size}` (11.5px `#a0a0a5`).

**Sample data (12 items; mostly 3840×2160 sources).** Default selection = 2 items. Representative rows: a HEIC + JPEG mix; item 5 has a per-file override (output 2048×1152, **PNG**, "custom" badge, 1.7 MB); item with a 1129×604 source upscales to 1600×856 → shows `↑ Upscaly` and `+142%`; one 6720×2160 panorama. Favourited items show the heart.

#### Region 4 — Inspector (width 328px)
Background `#f7f7f9`, left border `0.5px #dcdce0`, vertical scroll. Section group-labels reuse the 600/11px uppercase `#9a9aa0` style.

- **Header:** "Output" (600/16px `#1d1d1f`) with trailing "{N} selected" (400/12.5px `#8a8a8e`).
- **Preset chip button:** full width, 42px, border `0.5px #d8d8dc`, radius 9px, white bg, `0 1px 2px rgba(0,0,0,.04)`. Leading 26px rounded-square icon, bg `linear-gradient(180deg,#3b86f2,#1366d6)` + `inset 0 1px 0 rgba(255,255,255,.35)`, white "stack/preset" glyph. Two-line label: preset name (600/13.5px) over dimensions (400/11.5px `#8a8a8e`). Trailing right-chevron.
- **Format** (group): wrapping row of pill buttons, 5px gap. Each: 30px tall, padding `0 12px`, radius 7px, font 600/12px. Options: `Auto`, `PNG`, `JPEG` (selected default), `TIFF`, `HEIC`, `WebP`. Unselected: border `0.5px #d8d8dc`, white bg, text `#3a3a3f`. Selected: border + bg `#1473e6`, white text.
- **Dimensions** (group): a row of — W field (flex) · aspect-lock button · H field (flex) · orientation-swap button.
  - Fields: 34px tall, white, border `0.5px #d8d8dc`, radius 8px; value 600/14px monospace `#1d1d1f`; trailing tiny "W"/"H" label `#b0b0b5`. Default `1,600` × `900`.
  - **Aspect-lock button:** 34×34px, radius 8px; LOCKED (default): border + text `#1473e6`, bg `rgba(20,115,230,.08)`; unlocked: border `#d8d8dc`, icon `#a8a8ad`. Padlock icon.
  - **Orientation-swap button:** 34×34px, white, border `0.5px #d8d8dc`; diagonal swap arrows icon (stroke `#5a5a5f`).
- **Resize Mode** (group): 3 equal segments, 6px gap, each 54px tall, radius 9px, icon-over-label (label 500/11.5px). SELECTED: border `#1473e6`, bg `rgba(20,115,230,.08)`, color `#1473e6`. Unselected: border `#d8d8dc`, white, `#5a5a5f`.
  - **Fill** (default selected) — filled-square glyph `▦`.
  - **Fit** — outline-square glyph `□` (same visual size as Fill's square).
  - **Stretch** — long horizontal double-arrow glyph `⟷`.
  - (Glyphs are placeholders; in the real app use proper vector icons matching these meanings — fill = crop-to-fill, fit = letterbox/contain, stretch = distort to exact W×H.)
- **Upscaly Engine** card (group; the local AI upscaler — distinct violet accent):
  - Card: border `0.5px` (`#dcdce0`; when ON `rgba(123,92,255,.40)`), radius 10px, bg white (when ON `rgba(123,92,255,.06)`).
  - Row: 28px rounded-square icon `linear-gradient(135deg,#7b5cff,#b44cff)` w/ white star/sparkle glyph; title "Upscaly Engine" (600/13.5px) over "Runs locally · on-device" (400/11px `#8a8a8e`); trailing **toggle switch** (40×24px; OFF track `#d4d4d9`, ON track `#34c759`; 20px white knob with `0 1px 3px rgba(0,0,0,.3)`).
  - When ON, reveals: a 3-segment model picker (`Standard` / `Photo` (default) / `Art`) — 28px tall pills, selected = `#7b5cff`? *(in prototype selected uses the blue accent `#1473e6`; keep model picker consistent with the Upscaly violet if you prefer — designer's call)* — and a "Max factor … 4×" row (11.5px).
- **Crop & Rotate** (group): 4 equal buttons, 6px gap, 38px tall, white, border `0.5px #d8d8dc`, radius 8px, icons stroke `#3a3a3f`:
  - Rotate counterclockwise — **curved circular arrow** (polyline arrowhead + arc), counterclockwise.
  - Rotate clockwise — mirrored curved circular arrow.
  - Flip horizontal — flip icon.
  - Aspect crop — text "16:9" (500/12px) + down-chevron.
- **Quality** (group): label row — "Quality" + value "{q}%" (600/12px monospace). Range slider, `accent-color:#1473e6`, default 82. Below: a "Target max size … 500 KB" row in a white bordered box.
- **Filename** (group): a box (34px, white, border `0.5px #d8d8dc`, radius 8px) showing a token pattern in monospace: `{name}` (`#1d1d1f`) `@{w}w` (`#0a84ff`) … trailing `.{ext}` (`#b0b0b5`). Helper line below: "e.g. IMG_4821@1600w.jpg" (11px `#a0a0a5`).

#### Region 5 — Export bar (height 58px)
Background `linear-gradient(#fbfbfc,#f1f1f3)`, top border `0.5px #d8d8db`, padding `0 18px`, gap 14px.
- **Left summary (two lines):** "12 photos queued" (600/13px `#1d1d1f`) over "Est. output {total} · saves ~{percent}" (400/11.5px `#8a8a8e`). `{total}` and `{percent}` are computed from the queue.
- Spacer.
- **Destination button:** 34px tall, padding `0 20px`, white, border `0.5px #d2d2d6`, radius 8px, font 600/13.5px `#1d1d1f`. Label "Optimised" + down-chevron only (no leading icon, no path/tilde). This is the output-folder picker; sized to visually match the Export button.
- **Export button (primary):** 34px tall, padding `0 20px`, radius 8px, bg `linear-gradient(180deg,#4a91f5,#1366d6)`, `inset 0 1px 0 rgba(255,255,255,.4), 0 1px 3px rgba(19,102,214,.45)`, font 600/13.5px white, leading download-tray icon. Label "Export 12 Photos".

## Interactions & Behavior
- **Row/card selection:** clicking a queue item toggles it in/out of the selection set (multi-select). Selected rows fill solid blue `#1473e6` (white text); selected grid cards get a blue ring + check. "Select All" selects every item. The header "{N} selected" and inspector "{N} selected" reflect the count.
- **View toggle:** toolbar segmented control switches the queue between List and Grid; both render the same dataset.
- **Format pills:** clicking sets the global output format for the (non-overridden) batch. Per-file overrides (the "custom" rows) keep their own format/size.
- **Aspect lock:** toggles linked W/H. Orientation-swap flips W↔H.
- **Resize mode:** Fill / Fit / Stretch single-select.
- **Upscaly toggle:** reveals model picker + max-factor when ON. Rows whose target exceeds source size are flagged `↑ Upscaly` / `+NNN%` regardless, indicating they require the engine.
- **Quality slider:** live percentage; should feed the est-size recompute.
- **Computed values:** for each item, target dimensions preserve source aspect from the chosen width (override width wins); scale% = target/source width; est. size is a function of output pixels × per-format weight. The export-bar total sums all items; "saves ~%" = 1 − (total output ÷ total source bytes).
- No navigation/secondary screens are designed yet; Export, Add Photos, the preset chip, sort, and destination are entry points to flows not yet specced.

## State Management
- `selected`: set/array of item ids (default 2 selected).
- `viewMode`: `list` | `grid` (default `list`).
- `format`: output format string (default `JPEG`).
- `fit`: `Fill` | `Fit` | `Stretch` (default `Fill`).
- `targetW` + derived `targetH` (default 1600 → 900 at 16:9); `aspectLocked` (default true).
- `preset` id + name + dim (default `web-2x` / "Web 2× — 1600w" / "1600 px wide").
- `upscale` on/off (default off) + `upModel` (default `Photo`).
- `quality` (default 82).
- Each photo has fixed metadata: id, name, source w/h, source format, favourite flag, and optional per-file override `{ w, fmt }`.
- Data fetching (real app): enumerate the Photos library (Recents, **Favourites**, Last Import, Albums) via PhotoKit; generate thumbnails; compute output on settings change.

## Design Tokens
**Colors**
- Primary accent (selection, primary actions): `#1473e6`; gradient `linear-gradient(180deg,#4a91f5,#1366d6)` / chip `linear-gradient(180deg,#3b86f2,#1366d6)`; tints `rgba(20,115,230,.10)`, `rgba(20,115,230,.08)`; badge tint bg `#e8f1fd`.
- Upscale/AI accent (violet): `#7b5cff`; icon gradient `linear-gradient(135deg,#7b5cff,#b44cff)`; badge bg `linear-gradient(135deg,#f0eaff,#eef4ff)`; tint border `rgba(123,92,255,.40)`, bg `rgba(123,92,255,.06)`.
- Secondary/system blue (links, Last Import, filename token): `#0a84ff`.
- Toggle ON / success: `#34c759`.
- Text: primary `#1d1d1f`; secondary `#8a8a8e`; tertiary/muted `#9a9aa0`, `#a8a8ad`, `#b0b0b5`; mono-muted `#5a5a5f`.
- Surfaces: white `#ffffff`; sidebar `#f4f4f6`; inspector `#f7f7f9`; header strip `#fafafb`; field/pill fills `#e7e7ea` / `#e9e9ec` / `#ececef`.
- Borders/hairlines (use 0.5px): `#d8d8dc`, `#dcdce0`, `#d2d2d6`, `#ededf0`, `#f2f2f4`, `#e0e0e3`.
- Toolbar/export-bar gradient: `linear-gradient(#fbfbfc,#f1f1f3)`; button chrome `linear-gradient(#ffffff,#f4f4f6)`.
- Traffic lights: `#ff5f57`, `#febc2e`, `#28c840`.

**Spacing:** common paddings 8 / 10 / 12 / 14 / 18 / 20px; column/section gaps 5 / 6 / 7 / 14px.

**Radii:** 4 (badges/thumb) · 6 (sidebar rows, segmented inner) · 7 (toolbar buttons, pills) · 8 (fields, crop buttons, export buttons) · 9 (cards, chip, resize segments) · 10 (Upscaly card) · 11 (window).

**Typography:** system (`-apple-system`/SF Pro) for UI; `ui-monospace`/SF Mono for all numeric dimension/size values. Key sizes: 16/600 (Output title), 13.5/600, 13/500–600, 12.5, 12, 11.5, 11/600-uppercase (section labels, letter-spacing .04em), 10.5/600-uppercase (preset sub-labels), 9.5/600 (badges).

**Shadows:** hairline insets `inset 0 0 0 0.5px rgba(0,0,0,.12)`; button-top highlight `inset 0 1px 0 rgba(255,255,255,.35–.4)`; card `0 1px 2px rgba(0,0,0,.04)`; selected segment `0 1px 2px rgba(0,0,0,.12)`; primary button `0 1px 3px rgba(19,102,214,.45)`.

## Assets
- **`assets/photos-icon.png`** — the Apple Photos colorful flower logo, background and white tile removed (transparent, 176×193). Used as the **Favourites** sidebar icon (rendered 17×17). In a native build, prefer the system Photos symbol/asset if available; otherwise this PNG works.
- **Thumbnails** in the prototype are CSS gradients standing in for real photos — replace with actual generated thumbnails from the user's library.
- **All other icons** (toolbar, sidebar, inspector, crop/rotate, traffic lights) are inline SVG / Unicode glyphs in the prototype. Re-implement with SF Symbols (or the codebase's icon set). Notable specifics: Favourites = Photos flower; Crop&Rotate rotate buttons = **curved circular arrows** (CCW + CW); Resize-mode = filled square / outline square (same size) / long horizontal arrow.

## Screenshots
Reference renders of the designed states (in `screenshots/`):
- `01-main-list.png` — full window, **List view**, default selection (2 rows selected, blue). Shows source→output columns, scale %, est. size, the "custom" override row, and the "↑ Upscaly / +142%" upscaling row.
- `02-grid-view.png` — full window, **Grid view** of the same batch (selection rings + checks, favourite hearts).
- `03-upscaly-on.png` — inspector with the **Upscaly Engine toggled ON** (green switch, Standard/Photo/Art model picker, "Max factor 4×").

## Files
- `Desqueeze.dc.html` — the full hi-fi prototype of the start window (all five regions, sample data, and interactions). Open in a browser to inspect live; view source for exact inline styles and the `Component` logic (computation of target size, scale %, est. size, totals).
- `assets/photos-icon.png` — Favourites (Photos) icon, transparent.
- `screenshots/` — reference renders (see above).
