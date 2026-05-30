# BRIEF — Procedia V5 UI Scaffold
*Plain JS · CEP · No bundler · No framework*
*Read CLAUDE.md in full before touching any file.*

---

## Context

Procedia V5 is a full rebuild from scratch. This brief covers the UI shell only — the chrome around the canvas. The graph engine, evalBridge, nodes, and jsx files do not exist yet and are not touched in this brief. This brief produces a working, visually correct panel with no graph logic — stubs only where graph integration is needed later.

---

## Locked UI Design

Five zones in a CSS grid layout:

```
┌─────────────────────────────────────────────────────┐
│                    TOP BAR (40px)                   │
├──────────────┬──────────────────────┬───────────────┤
│              │                      │               │
│  LEFT BAR    │       CANVAS         │  RIGHT BAR    │
│  (210px)     │   (flex: 1)          │  (252px)      │
│  collapsible │                      │  collapsible  │
│              │                      │               │
├──────────────┴──────────────────────┴───────────────┤
│                   BOTTOM BAR (30px)                  │
└─────────────────────────────────────────────────────┘
```

### Top bar
- Left: logo mark (purple square, `ti-topology-star-3` icon) + wordmark "procedia"
- Center: static icons — Save (`ti-device-floppy`), Undo (`ti-arrow-back-up`), Redo (`ti-arrow-forward-up`), divider, Fit View (`ti-focus-2`)
- Right: dynamic zone — empty by default, populated on node selection with: a label badge "node selected" + Duplicate (`ti-copy`) + Lock (`ti-lock`) + Delete (`ti-trash`, coral color)
- Dynamic zone icons fade in/out via CSS `opacity` transition (0.15s) when selection changes

### Left bar — collapsible node panel
- Fixed width 210px. Collapses to 0 via CSS `width` transition (0.18s)
- **Search field**: bare `<input>` with bottom-border only (no box, no icon). Placeholder: "filter nodes…". An `×` button appears (opacity transition) only when the input has a value — clicking it clears the field and re-focuses the input
- **Node list**: scrollable. Categories are collapsible sections. Each category has a header row with category name (uppercase, 10px, muted) and a chevron (`ti-chevron-right`) that rotates 90° when open. Node items inside show a 5px color dot + node name. Hovering a node item changes name color and shows a subtle bg tint
- Category colors:
  - Layers: `#185FA5` (blue)
  - Effects: `#854F0B` (amber)
  - Data: `#0F6E56` (teal)
  - Comps: `#534AB7` (purple)
  - Utility: `#5F5E5A` (gray)
- Initial categories and nodes (stubs — no drag behavior yet):
  - **Layers** (open): Text, Null, Shape, Solid, Adjustment
  - **Effects** (open): Fill, Gaussian Blur, Stroke, Drop Shadow
  - **Data** (collapsed): Color, Number, Vector2
  - **Comps** (collapsed): Comp
  - **Utility** (collapsed): (empty for now)

### Canvas
- Background: `#111110`
- Dot grid: `radial-gradient` pattern, 24px spacing, subtle `#222220` dots
- No node rendering in this brief — canvas is empty
- Edge hover toggle handles (see Sidebar Toggles below)

### Sidebar toggle handles
- Each canvas edge (left and right) has an invisible 20px-wide hover zone spanning full height, sitting on top of the canvas as `position: absolute`
- When the user hovers inside the zone, a small handle appears (`opacity` transition, 0.15s):
  - Left handle: 14×36px, border-radius right side only, sits flush to the left edge. Icon: `ti-chevron-left` (left bar open) / `ti-chevron-right` (left bar closed)
  - Right handle: same dimensions, border-radius left side only, sits flush to the right edge. Icon: `ti-chevron-right` (right bar open) / `ti-chevron-left` (right bar closed)
- Clicking the handle toggles the corresponding bar. Chevron direction flips to always indicate the action (collapse/expand)
- Handle appearance: `background: rgba(22,22,20,0.92)`, `border: 0.5px solid #2a2a28`, icon color `#333331`, hover icon color `#888780`

### Right bar — dynamic inspector
- Fixed width 252px. Collapses to 0 via CSS `width` transition (0.18s)
- **Empty state** (nothing selected): centered icon (`ti-cursor-text`, 22px, muted) + text "select a node" below it, both very muted (`#333331`)
- **Selected state**: shows node name (13px, 500 weight, `#d4d2cc`) + a badge with a state dot + "alive · layer" text. Below: param groups with group labels and param rows
- Param row: label (left, muted) + value chip (right, slightly tinted bg, monospaced). A "wired" value chip is blue-tinted with a `⬡` prefix
- This brief renders the inspector with **hardcoded stub data** — no live selection wiring yet. Stub: show "TextNode" as selected with Transform (X, Y, Scale) and Text (Content, Size, Color=wired) groups

### Bottom bar
- Left: notification area — 5px green pip + notification text. Stub text: "ready"
- Right: Reset button (`ti-rotate`) + Reload button (`ti-refresh`) + divider + Settings button (`ti-settings`). All icon-only, 22×22px, muted color

---

## Visual Language

All hardcoded colors below — do NOT use CSS variables for these (CEP does not guarantee CSS variable support across all AE versions):

```
Background:        #111110
Bar background:    rgba(15,15,13,0.9) — left and right bars
Top bar bg:        rgba(20,20,18,0.95)
Bottom bar bg:     rgba(13,13,11,0.97)
Border:            #2a2a28 (standard), #1e1e1c (inner/subtle)
Text primary:      #d4d2cc
Text secondary:    #B4B2A9
Text muted:        #888780
Text very muted:   #5F5E5A
Text ghost:        #444441
Text invisible:    #333331
Accent purple:     #534AB7
Canvas dot color:  #222220
```

Font: system-ui, -apple-system, sans-serif (no Google Fonts, no external font load)

---

## File Structure — All Files This Brief Creates

```
procedia-v5/
├── index.html           ← full shell, script load order
├── index.js             ← init() calls all UI modules
│
├── ui/
│   ├── topBar.js        ← top bar render + dynamic icon swap
│   ├── leftBar.js       ← node panel render + search + category collapse
│   ├── rightBar.js      ← inspector render + empty/selected states
│   ├── bottomBar.js     ← notification area + bottom buttons
│   └── sidebarToggle.js ← edge hover zones + handle reveal + collapse logic
│
└── css/
    ├── base.css         ← reset, layout grid, scrollbar styles
    ├── topBar.css       ← top bar styles
    ├── leftBar.css      ← node panel styles
    ├── rightBar.css     ← inspector styles
    ├── bottomBar.css    ← bottom bar styles
    ├── canvas.css       ← canvas + grid + edge zones
    └── tokens.css       ← all color/spacing constants as CSS custom properties
                           (used internally by other CSS files — not for JS)
```

**Every JS file must declare at the top:**
```javascript
// ui/topBar.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: index.js
```

---

## index.html — Exact Script Load Order

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/topBar.css">
  <link rel="stylesheet" href="css/leftBar.css">
  <link rel="stylesheet" href="css/rightBar.css">
  <link rel="stylesheet" href="css/canvas.css">
  <link rel="stylesheet" href="css/bottomBar.css">
</head>
<body>

  <!-- TOP BAR -->
  <div id="top-bar"></div>

  <!-- MIDDLE ROW -->
  <div id="mid-row">
    <div id="left-bar"></div>
    <div id="canvas-wrap">
      <div id="canvas-grid"></div>
      <div id="edge-zone-left" class="edge-zone"></div>
      <div id="edge-zone-right" class="edge-zone"></div>
    </div>
    <div id="right-bar"></div>
  </div>

  <!-- BOTTOM BAR -->
  <div id="bottom-bar"></div>

  <!-- UI modules — no dependencies on each other, load order is alphabetical -->
  <script src="ui/bottomBar.js"></script>
  <script src="ui/leftBar.js"></script>
  <script src="ui/rightBar.js"></script>
  <script src="ui/sidebarToggle.js"></script>
  <script src="ui/topBar.js"></script>

  <!-- Entry point — depends on all UI modules above -->
  <script src="index.js"></script>

</body>
</html>
```

---

## index.js — Entry Point (stub)

```javascript
// index.js
// DEPENDS ON: ui/topBar.js, ui/leftBar.js, ui/rightBar.js,
//             ui/bottomBar.js, ui/sidebarToggle.js
// MUST LOAD BEFORE: nothing (this is the entry point)

function init() {
  topBar.init();
  leftBar.init();
  rightBar.init();
  bottomBar.init();
  sidebarToggle.init();
}

document.addEventListener('DOMContentLoaded', init);
```

---

## Module Contracts

Each module exposes a global object with an `init()` function. No other public API is required for this brief.

### `topBar.js`

```
topBar.init()
  → renders logo, wordmark, center static icons into #top-bar
  → dynamic zone starts hidden (opacity: 0, pointer-events: none)
  → exposes topBar.showSelection() and topBar.clearSelection()
    showSelection() → fades in the dynamic zone icons
    clearSelection() → fades them out
  → for this brief, call showSelection() on init to show the stub selected state
```

### `leftBar.js`

```
leftBar.init()
  → renders search field + category list into #left-bar
  → wires search input: filters node items by name (case-insensitive substring)
  → wires × button: visible only when input is non-empty, clears on click
  → wires category headers: chevron rotates, items slide (height transition) on toggle
  → initial state: Layers and Effects open, Data/Comps/Utility collapsed
```

### `rightBar.js`

```
rightBar.init()
  → renders inspector shell into #right-bar
  → renders stub selected state (TextNode with hardcoded params)
  → exposes rightBar.showEmpty() and rightBar.showNode(nodeData)
    showEmpty() → shows the "select a node" empty state
    showNode(nodeData) → renders name, badge, param groups
  → for this brief, call showNode() on init with hardcoded stub data
```

### `bottomBar.js`

```
bottomBar.init()
  → renders pip + notification text + action buttons into #bottom-bar
  → exposes bottomBar.notify(message) → updates notification text
  → for this brief, notification text is hardcoded "ready"
  → Reset and Reload buttons: console.log('[Procedia] reset' / 'reload') on click
  → Settings button: console.log('[Procedia] settings') on click
```

### `sidebarToggle.js`

```
sidebarToggle.init()
  → attaches mousemove/mouseleave listeners to #canvas-wrap
  → left edge zone: if mouseX < 20, show left handle; else hide
  → right edge zone: if mouseX > (canvasWidth - 20), show right handle; else hide
  → handle visibility via opacity transition (0.15s)
  → clicking left handle: toggles #left-bar between width 210px and 0
  → clicking right handle: toggles #right-bar between width 252px and 0
  → chevron icon direction updates on each toggle
  → exposes sidebarToggle.collapseLeft(), sidebarToggle.expandLeft(),
            sidebarToggle.collapseRight(), sidebarToggle.expandRight()
```

---

## Layout CSS Rules

```css
/* base.css — the grid that never changes */
* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: 100%; height: 100%;
  overflow: hidden;
  background: #111110;
  font-family: system-ui, -apple-system, sans-serif;
}

body {
  display: flex;
  flex-direction: column;
}

#top-bar {
  height: 40px;
  flex-shrink: 0;
}

#mid-row {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

#left-bar {
  width: 210px;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.18s ease;
}

#left-bar.collapsed { width: 0; }

#canvas-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-width: 0;
}

#right-bar {
  width: 252px;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.18s ease;
}

#right-bar.collapsed { width: 0; }

#bottom-bar {
  height: 30px;
  flex-shrink: 0;
}
```

---

## Verification Checklist

**STOP after completing all files. Verify every item before declaring done.**

### Structure
- [ ] Panel loads in CEP without any console errors
- [ ] Body fills the full panel height with no scrollbar
- [ ] Top bar is exactly 40px, visible across full width
- [ ] Middle row fills remaining height — left bar, canvas, right bar side by side
- [ ] Bottom bar is exactly 30px, visible across full width

### Top bar
- [ ] Logo mark (purple square) + wordmark "procedia" visible left
- [ ] Save, Undo, Redo, divider, Fit View icons visible center
- [ ] Dynamic zone (stub): badge + Duplicate + Lock + Delete visible right
- [ ] Delete icon is coral/red colored, others are muted gray

### Left bar
- [ ] Search input visible at top, no box — only a bottom border
- [ ] Typing in the search field shows the `×` button; clearing hides it
- [ ] Clicking `×` clears the field and refocuses the input
- [ ] Typing "fill" shows only Fill (Effects category) — other nodes hidden
- [ ] Clearing search restores all nodes
- [ ] Layers and Effects categories are open on load; Data, Comps, Utility collapsed
- [ ] Clicking a category header toggles it open/closed with chevron rotation
- [ ] Each node item shows the correct color dot for its category

### Canvas
- [ ] Canvas background is `#111110`
- [ ] Dot grid is visible (subtle `#222220` dots, 24px spacing)

### Sidebar toggles
- [ ] Moving mouse to within 20px of left canvas edge reveals the left handle
- [ ] Moving mouse away from left edge hides the left handle
- [ ] Clicking left handle collapses left bar to 0 with smooth transition
- [ ] Clicking left handle again expands left bar to 210px with smooth transition
- [ ] Chevron icon on left handle flips direction correctly on each toggle
- [ ] Same behavior for right edge and right bar
- [ ] After collapsing both bars, canvas fills the full mid-row width

### Right bar
- [ ] Inspector stub shows "TextNode" name + "alive · layer" badge
- [ ] Transform group visible: X (960), Y (540), Scale (100%)
- [ ] Text group visible: Content (Hello), Size (72px), Color (⬡ wired — blue tinted)
- [ ] "⬡ wired" chip is visually distinct (blue tint, blue text)

### Bottom bar
- [ ] Green pip visible
- [ ] "ready" notification text visible
- [ ] Reset, Reload, divider, Settings buttons visible right
- [ ] Clicking Reset logs `[Procedia] reset` to console
- [ ] Clicking Reload logs `[Procedia] reload` to console
- [ ] Clicking Settings logs `[Procedia] settings` to console

---

## What This Brief Does NOT Include

These are explicitly out of scope. Do not implement them:

- Node drag from left bar to canvas
- Canvas pan, zoom, or node rendering
- Live inspector wiring to a selected node
- Any graph engine, graphState, nodeRegistry, or evalBridge
- Settings modal
- Minimap
- Keyboard shortcuts
- Any `.jsx` files

---

## Hard Rules Reminder

1. No bundler, no ES modules. Plain `<script>` tags only.
2. Every JS file has `// DEPENDS ON:` and `// MUST LOAD BEFORE:` headers.
3. Every JS module exposes a global object (e.g. `var topBar = { init: function() {...} }`).
4. No `const`, `let`, arrow functions, or template literals in JS files (consistency with the rest of the codebase — modern JS is technically allowed in panel files but we use `var` + named functions throughout for uniformity).
5. One task, one verification, one stop. Do not proceed to the next file without confirming the previous one loads without errors.
6. If any file already exists, read it before overwriting.

---

*Procedia V5 — BRIEF-UI-SCAFFOLD — May 2026*
