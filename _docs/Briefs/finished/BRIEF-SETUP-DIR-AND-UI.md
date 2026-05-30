# TASK — Directory Setup and Panel UI Shell
*Procedia v4 — First task on an empty repository*

---

## Prerequisite Reading — Do This First

Read these files in order before touching anything:

1. `CLAUDE.md` — all 14 skills and all absolute rules
2. `PROCEDIA-V4-ARCHITECTURE.md` — Section 13 (File Structure) and Section 14 (Wire Types and Visual Language)

**Stop if either file is missing. Do not proceed.**

---

## What This Task Builds

Two things, in strict order:

1. **The full directory and file scaffold** — every folder and every file the project will ever need, created now as stubs. No logic yet, just structure.
2. **The panel UI shell** — `index.html` and `panel.css` with the complete, working visual layout. No JS behavior yet. Static HTML only.

These are the only two deliverables. Do not implement any JS logic, any graph engine behavior, or any AE calls. Those come in later tasks.

---

## PHASE 1 — Directory and File Scaffold

### What to create

Create the exact directory tree below. Every folder and every file. No additions, no omissions.

```
procedia-v4/
├── index.html
├── index.js
│
├── graph/
│   ├── graphState.js
│   ├── nodeRegistry.js
│   ├── engine.js
│   ├── cascadeAlgorithm.js
│   ├── cycleChecker.js
│   ├── portManager.js
│   ├── wireValidator.js
│   │
│   ├── nodes/
│   │   └── categories/
│   │       ├── core/
│   │       │   └── Comp.js
│   │       ├── layers/
│   │       │   ├── Text.js
│   │       │   ├── Null.js
│   │       │   ├── Shape.js
│   │       │   └── Adjustment.js
│   │       ├── effects/
│   │       ├── data/
│   │       │   ├── Color.js
│   │       │   └── Number.js
│   │       └── utility/
│   │
│   ├── canvas/
│   │   ├── viewport.js
│   │   ├── renderer.js
│   │   ├── input.js
│   │   └── minimap.js
│   │
│   └── wire/
│       ├── wire.js
│       └── wireRenderer.js
│
├── ui/
│   ├── nodeList.js
│   ├── drag.js
│   ├── inspector.js
│   ├── layerOrderList.js
│   └── keyboard.js
│
├── flush/
│   └── dirtyFlusher.js
│
├── polling/
│   └── poller.js
│
├── notifications/
│   └── notificationBar.js
│
├── bridge/
│   └── evalBridge.js
│
├── data/
│   └── uuidGenerator.js
│
└── jsx/
    ├── json.jsx
    ├── utils.jsx
    ├── persistence.jsx
    ├── polling.jsx
    └── dispatcher/
        └── dispatcher.jsx
```

---

### Stub file rules

Every `.js` and `.jsx` file must be created with a stub — not empty, not logic. A stub means exactly these three lines and nothing else:

```javascript
// {relative/path/to/file.js}
// DEPENDS ON: {list dependencies or write 'none'}
// MUST LOAD BEFORE: {list dependents or write 'index.js'}
```

**Dependency declarations for each file:**

| File | DEPENDS ON | MUST LOAD BEFORE |
|---|---|---|
| `data/uuidGenerator.js` | none | everything |
| `bridge/evalBridge.js` | none | graph/graphState.js |
| `graph/graphState.js` | data/uuidGenerator.js | graph/engine.js, graph/cascadeAlgorithm.js, graph/portManager.js |
| `graph/nodeRegistry.js` | none | all node category files, graph/engine.js |
| `graph/cycleChecker.js` | graph/graphState.js | graph/wire/wire.js |
| `graph/portManager.js` | graph/graphState.js, graph/nodeRegistry.js | graph/engine.js, graph/wire/wire.js |
| `graph/wireValidator.js` | graph/graphState.js, graph/nodeRegistry.js | graph/wire/wire.js |
| `graph/cascadeAlgorithm.js` | graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js | graph/engine.js |
| `graph/engine.js` | graph/graphState.js, graph/nodeRegistry.js, graph/cascadeAlgorithm.js, graph/portManager.js, graph/wireValidator.js, bridge/evalBridge.js | index.js |
| All node files under `categories/` | graph/nodeRegistry.js | index.js |
| `graph/canvas/viewport.js` | graph/graphState.js | graph/canvas/renderer.js |
| `graph/canvas/renderer.js` | graph/graphState.js, graph/nodeRegistry.js, graph/canvas/viewport.js | index.js |
| `graph/canvas/input.js` | graph/graphState.js, graph/canvas/viewport.js | index.js |
| `graph/canvas/minimap.js` | graph/graphState.js, graph/canvas/viewport.js | index.js |
| `graph/wire/wireRenderer.js` | graph/graphState.js | graph/wire/wire.js |
| `graph/wire/wire.js` | graph/graphState.js, graph/wireValidator.js, graph/cycleChecker.js, graph/cascadeAlgorithm.js, graph/portManager.js | index.js |
| `ui/nodeList.js` | graph/graphState.js, graph/nodeRegistry.js | index.js |
| `ui/drag.js` | graph/graphState.js, graph/nodeRegistry.js | index.js |
| `ui/inspector.js` | graph/graphState.js, graph/nodeRegistry.js | index.js |
| `ui/layerOrderList.js` | graph/graphState.js | index.js |
| `ui/keyboard.js` | graph/graphState.js | index.js |
| `flush/dirtyFlusher.js` | graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js | index.js |
| `polling/poller.js` | bridge/evalBridge.js | index.js |
| `notifications/notificationBar.js` | none | index.js |
| `index.js` | everything | nothing |
| `jsx/json.jsx` | none | all other jsx files |
| `jsx/utils.jsx` | jsx/json.jsx | jsx/dispatcher/dispatcher.jsx, jsx/persistence.jsx, jsx/polling.jsx |
| `jsx/persistence.jsx` | jsx/json.jsx, jsx/utils.jsx | nothing |
| `jsx/polling.jsx` | jsx/json.jsx, jsx/utils.jsx | nothing |
| `jsx/dispatcher/dispatcher.jsx` | jsx/json.jsx, jsx/utils.jsx | nothing |

**`index.js` stub is the only exception** — it gets one additional comment line:

```javascript
// index.js
// DEPENDS ON: everything
// MUST LOAD BEFORE: nothing
// Entry point. Initializes: evalBridge → reservedComp → readGraph → buildUI → startPoller
```

---

### Phase 1 verification checklist

- [ ] All folders exist — including empty ones (`effects/`, `utility/`)
- [ ] Every file exists at the exact path listed
- [ ] Every file contains exactly the three stub comment lines (four for `index.js`)
- [ ] No file contains any function, variable declaration, or logic
- [ ] No file was missed, no extra file was added
- [ ] Run `find . -type f | sort` and confirm the output matches the tree above

**STOP. Report the `find` output. Wait for confirmation before proceeding to Phase 2.**

---

## PHASE 2 — Panel UI Shell

### What to build

Two files: `panel.css` and `index.html`. These files produce the complete visual layout of the panel — no JS behavior, no interactivity beyond palette category collapse. Static HTML rendered in a browser tab or CEP panel.

`index.html` must also contain all `<script>` tags in the correct load order (pointing to the stub files from Phase 1). This is the load-order source of truth.

---

### Layout specification

Three columns, full panel height:

```
┌─────────────┬────────────────────────────┬──────────────┐
│             │  topbar (32px)             │              │
│   Palette   ├────────────────────────────┤  Inspector   │
│  (200px)    │                            │  (240px)     │
│             │        Canvas              │              │
│             │                            │              │
│             ├────────────────────────────┤              │
│             │  statusbar (20px)          │              │
└─────────────┴────────────────────────────┴──────────────┘
```

- Topbar and statusbar span full width
- Palette and Inspector are fixed width. Canvas fills remaining space.
- No resizable panels in this phase.

---

### Design tokens — use these exact values

All values must be declared as CSS custom properties on `:root`. No hardcoded colors anywhere in the CSS.

```css
:root {
  /* Canvas */
  --canvas-bg:          #111113;
  --grid-dot:           #1E1E24;

  /* Panel chrome */
  --panel-bg:           #18181C;
  --panel-border:       #26262E;
  --panel-header-bg:    #1C1C22;

  /* Typography */
  --text-primary:       #E8E8F0;
  --text-secondary:     #7A7A90;
  --text-tertiary:      #3E3E52;

  /* Category accent colors — left border stripe on node header */
  --cat-core:           #9B6DFF;
  --cat-layers:         #4A9EFF;
  --cat-effects:        #FF7A4A;
  --cat-data:           #FFD166;
  --cat-utility:        #06D6A0;

  /* Wire colors */
  --wire-layer:         #4A9EFF;
  --wire-data:          #FFD166;
  --wire-parent:        #06D6A0;

  /* Node state */
  --state-alive:        #06D6A0;
  --state-ghost:        #3E3E52;
  --state-error:        #FF4A6A;

  /* Node card */
  --node-bg:            #1E1E26;
  --node-header-bg:     #16161E;
  --node-border:        #2A2A3A;
  --node-border-sel:    #5555AA;
  --node-radius:        8px;

  /* Port dots */
  --port-size:          10px;

  /* Panel widths */
  --palette-width:      200px;
  --inspector-width:    240px;
}
```

---

### Typography

Load from Google Fonts:
- **`DM Mono`** — weights 300, 400, 500. Used for all body text, param values, inspector fields, status bar.
- **`Syne`** — weights 400, 600, 700. Used for node labels, category headers, section titles.

No other fonts. No system fonts. No fallback to Arial or Inter.

---

### Topbar

- Height: 32px
- Background: `--panel-header-bg`
- Bottom border: 1px solid `--panel-border`
- Left: logo — the word `PROCEDIA` in Syne 700, letter-spacing 0.08em, with a 6px circular dot to its left in `--cat-core` color
- Right of logo: a thin vertical divider, then the tag `v4` in `--text-tertiary`, 9px uppercase
- Far right: AE connection status — a 5px pulsing dot in `--state-alive` and the text `AE Connected` in `--text-secondary` 10px

---

### Palette (left panel)

- Width: `--palette-width`
- Background: `--panel-bg`
- Right border: 1px solid `--panel-border`
- Top: search input — full width, 10px DM Mono, dark background, no label
- Below: scrollable list of category groups

**Category group structure:**
- Header row: 3px accent bar in category color | category name in Syne 600 9px uppercase `--text-tertiary` | caret `▾` right-aligned
- Clicking the header toggles the group collapsed/expanded
- Items below: indented, 11px DM Mono, `--text-secondary`, draggable, hover state lightens background

**Categories and items to render (static):**

| Category | Color token | Items |
|---|---|---|
| Core | `--cat-core` | Comp |
| Layers | `--cat-layers` | Text, Null, Shape, Adjustment |
| Effects | `--cat-effects` | Fill, Gaussian Blur, Drop Shadow |
| Data | `--cat-data` | Color, Number |
| Utility | `--cat-utility` | Expression |

---

### Canvas

- Background: `--canvas-bg`
- Dot grid: `radial-gradient(circle, var(--grid-dot) 1px, transparent 1px)`, 24×24px tile, offset 12px 12px
- Position: relative. Contains an absolute inner `#canvas-viewport` div at `inset: 0` — this is the transform target for pan/zoom (not wired yet, just the DOM structure).
- An SVG element `#wire-layer` sits inside `#canvas-viewport`, `position: absolute`, `inset: 0`, `overflow: visible`, `pointer-events: none`. This is where wires will be drawn.
- A `#notification-bar` div sits `position: absolute`, `top: 0`, `left: 0`, `right: 0`, `z-index: 100`. Overlaid on the canvas.

---

### Node cards — render these five example nodes as static HTML inside `#canvas-viewport`

Node cards demonstrate all visual states. They are positioned absolutely with hardcoded `left`/`top` values. They are not interactive in this phase.

**Node card anatomy:**

```
┌──────────────────────────────────────────┐
│ [3px cat bar] [label]          [state ●] │  ← header (28px)
├──────────────────────────────────────────┤
│  paramKey         paramValue             │  ← body (param rows)
│  paramKey         paramValue             │
│  paramKey         paramValue             │
└──────────────────────────────────────────┘
     ●  ← input port dots (left edge, vertically centered in body)
                                         ● → output port dot (right edge)
     ▪  ← parent port top edge (child_of)
     ▪  ← parent port bottom edge (parent_of)
```

**Node card CSS rules:**
- Width: 180px
- Border-radius: `--node-radius`
- Background: `--node-bg`
- Border: 1px solid `--node-border`
- Header: 28px tall, background `--node-header-bg`, bottom border 1px solid `--node-border`
- Category bar: 3px wide, full header height, color = category token, no border-radius
- Label: Syne 600, 11px, `--text-primary`
- State dot: 6px circle, right side of header, 8px from right edge
- Param row: flex row, space-between. Key: 9px DM Mono `--text-tertiary`. Value: 10px DM Mono `--text-secondary`
- Body padding: 7px 10px 9px

**Port dots:**
- Size: `--port-size` (10px), circular
- Input ports: absolutely positioned on left edge, centered vertically in the body area (below the header)
- Output port: right edge, vertically centered
- Parent ports: square (border-radius: 2px), top and bottom edge, horizontally centered
- Layer port color: `--wire-layer`
- Data port color: `--wire-data`
- Parent port color: `--wire-parent`
- Empty/newborn extendable slot: transparent fill, border 1.5px dashed `--text-tertiary`

**Alive state:** state dot glows `--state-alive`, box-shadow `0 0 6px var(--state-alive)`
**Ghost state:** node opacity 0.4, border-style dashed
**Error state:** border-color `--state-error`, subtle pulsing box-shadow animation
**Selected state:** border-color `--node-border-sel`, outer glow `0 0 0 1px var(--node-border-sel)`

**Five example nodes to render:**

1. **Comp node** — label: `Main Comp`, state: alive, selected, category: Core. Params: `duration / 10s`, `fps / 24`, `size / 1920×1080`. Has 2 filled input ports + 1 empty extendable slot on the left. Has a `child_of` parent port on top edge only (no `parent_of` — comps cannot be children in reverse).

2. **Null node** — label: `Scene Root`, state: alive, category: Layers. Params: `position / 960, 540`, `rotation / 0°`, `opacity / 100%`. Output port right. `child_of` top, `parent_of` bottom.

3. **Text node** — label: `Headline`, state: alive, category: Layers. Params: `content / Hello World`, `font size / 72`, `color / [white swatch]`, `opacity / 100%` (opacity param marked as wired — yellow dot + yellow text). Output port right. `child_of` top, `parent_of` bottom.

4. **Fill effect node** — label: `Fill`, state: alive, category: Effects. Params: `color / [orange swatch, marked wired]`, `opacity / 100%`, `blending / Normal`. Input ports: 1 filled layer port + 1 filled data port + 1 empty extendable slot. Output port right. No parent ports (effectors do not participate in AE parenting).

5. **Color node** — label: `Brand Orange`, state: alive, category: Data. Params: `hex / #FF7A4A`, `rgba / 255, 122, 74`. Output port right, data type (yellow). No parent ports (data nodes have no AE layer).

6. **Ghost text node** — label: `Subtitle`, state: ghost, category: Layers. Params: `content / A ghost node`, `font size / 36`. Output port right. `child_of` top, `parent_of` bottom. Apply ghost visual (opacity 0.4, dashed border).

**Positioning — use these exact `left` / `top` values:**

| Node | left | top |
|---|---|---|
| Null node | 380px | 60px |
| Text node (Headline) | 100px | 108px |
| Fill effect node | 370px | 120px |
| Comp node | 630px | 108px |
| Color node | 100px | 248px |
| Ghost text node | 100px | 380px |

---

### Wires — render as SVG paths inside `#wire-layer`

Four example wires. All use `stroke-linecap: round`, `stroke-width: 1.5`, `fill: none`, `opacity: 0.8`.

| Wire | Type | From | To | CSS class |
|---|---|---|---|---|
| Text → Fill | layer | Text node output port | Fill node main input port | `wire-layer` — stroke `--wire-layer` |
| Fill → Comp | layer | Fill node output port | Comp node first input port | `wire-layer` |
| Color → Fill | data | Color node output port | Fill node data input port | `wire-data` — stroke `--wire-data` |
| Text → Null (parenting) | parent | Text node `child_of` top port | Null node `parent_of` bottom port | `wire-parent` — stroke `--wire-parent`, stroke-dasharray: `5 3` |

Compute approximate SVG coordinates from the node positions above. Use cubic bezier curves (`C` command). Layer and data wires use horizontal S-curves (control points offset horizontally). Parent wires use vertical S-curves (control points offset vertically).

---

### Wire picker dropdown — render one static example

A small dropdown card positioned near the Fill node's empty extendable port. This is static — it shows what the picker looks like when a user drops a wire onto a newborn slot.

Contents:
- Header label: `Bind to param` in 9px uppercase `--text-tertiary`
- Two items: `opacity / number`, `blending / enum`
- Each item: a 7px yellow dot, param name in 11px `--text-primary`, type in 9px `--text-tertiary` right-aligned
- Card: rounded 7px, dark background slightly lighter than `--panel-bg`, border 1px solid `#3A3A50`, box-shadow

---

### Inspector (right panel)

- Width: `--inspector-width`
- Background: `--panel-bg`
- Left border: 1px solid `--panel-border`
- Shows the selected node (Comp node) as the default state

**Inspector header:**
- Height: 32px, bottom border divider
- Left: `INSPECTOR` label in Syne 600, 10px uppercase `--text-tertiary`
- Right: a small badge showing the category dot color + `Core / Comp` in 9px

**Inspector body — render these fields for the Comp node:**

Section `IDENTITY`:
- `label` → text input, value: `Main Comp`

Section `COMPOSITION`:
- `width` → number input, value: `1920`
- `height` → number input, value: `1080`
- `fps` → number input, value: `24`
- `duration` → text input, value: `10s`
- `bg color` → color swatch (black) + text input, value: `#000000`

Section `STATE`:
- `state` → read-only text, value: `alive`, color: `--state-alive`
- `uuid` → read-only text, value: `PROC-1716…a3f2`, 9px, color: `--text-tertiary`

Section dividers are 1px lines in `--panel-border` between sections.

Field layout: label (fixed 68px, `--text-secondary` 10px) | input (flex: 1, dark background, small border-radius).

---

### Notification bar — render one static example

Inside `#notification-bar`, one notification card:

- Background: very dark red-tinted (`#1E1218`)
- Border: 1px solid `--state-error`
- Border-radius: 6px
- Content: warning icon `⚠` | text `TextNode_01 was deleted outside Procedia.` | two buttons: `Re-create in AE` and `Remove from Graph`
- Buttons: small, 9px DM Mono, dark background, subtle border, hover state

---

### Status bar

- Height: 20px
- Background: `--panel-header-bg`
- Top border: 1px solid `--panel-border`
- Items (left to right): `nodes 5`, `wires 4`, `alive 4`, `ghost 1`
- Far right: `zoom 100%`
- All items: 9px DM Mono, label in `--text-tertiary`, value in `--text-secondary`

---

### `<script>` tags in `index.html` — exact load order

Place these at the bottom of `<body>`, after all HTML. This is the load-order source of truth.

```html
<!-- Infrastructure -->
<script src="data/uuidGenerator.js"></script>
<script src="bridge/evalBridge.js"></script>
<script src="graph/graphState.js"></script>
<script src="graph/nodeRegistry.js"></script>

<!-- Node definitions -->
<script src="graph/nodes/categories/core/Comp.js"></script>
<script src="graph/nodes/categories/layers/Text.js"></script>
<script src="graph/nodes/categories/layers/Null.js"></script>
<script src="graph/nodes/categories/layers/Shape.js"></script>
<script src="graph/nodes/categories/layers/Adjustment.js"></script>
<script src="graph/nodes/categories/data/Color.js"></script>
<script src="graph/nodes/categories/data/Number.js"></script>

<!-- Graph engine -->
<script src="graph/cycleChecker.js"></script>
<script src="graph/portManager.js"></script>
<script src="graph/wireValidator.js"></script>
<script src="graph/cascadeAlgorithm.js"></script>
<script src="graph/engine.js"></script>

<!-- Canvas -->
<script src="graph/canvas/viewport.js"></script>
<script src="graph/canvas/renderer.js"></script>
<script src="graph/canvas/input.js"></script>
<script src="graph/canvas/minimap.js"></script>
<script src="graph/wire/wireRenderer.js"></script>
<script src="graph/wire/wire.js"></script>

<!-- UI -->
<script src="ui/nodeList.js"></script>
<script src="ui/drag.js"></script>
<script src="ui/inspector.js"></script>
<script src="ui/layerOrderList.js"></script>
<script src="ui/keyboard.js"></script>

<!-- Services -->
<script src="flush/dirtyFlusher.js"></script>
<script src="polling/poller.js"></script>
<script src="notifications/notificationBar.js"></script>

<!-- Entry point -->
<script src="index.js"></script>
```

---

### Phase 2 verification checklist

- [ ] Panel opens in a browser tab without any console errors
- [ ] Three-column layout renders correctly — palette left, canvas center, inspector right
- [ ] Topbar and statusbar span full width
- [ ] Canvas shows the dot grid
- [ ] All six example node cards are visible at the correct positions
- [ ] Node states are visually distinct — alive glows, ghost is dimmed and dashed, selected has blue glow
- [ ] All port dots are visible — layer (blue), data (yellow), parent (green square), empty (dashed)
- [ ] Four SVG wires are visible and correctly colored
- [ ] Parent wire is dashed
- [ ] Wire picker dropdown is visible near the Fill node
- [ ] Notification bar is visible at the top of the canvas
- [ ] Inspector shows the Comp node fields
- [ ] Palette categories collapse and expand on header click
- [ ] No hardcoded color values in CSS — all colors reference CSS custom properties
- [ ] `DM Mono` and `Syne` fonts are loading correctly (check Network tab)
- [ ] All `<script>` tags are present in `index.html` in the correct order
- [ ] Opening browser console shows no errors from any stub file

**STOP. Share a screenshot or describe what you see. Wait for confirmation before any further work.**

---

## What This Task Does NOT Do

Be explicit about scope. These things are intentionally out of scope for this task:

- No JS logic in any file. Stubs only.
- No node dragging from palette to canvas.
- No wire drawing by mouse.
- No inspector field interaction (no event listeners).
- No AE connection. No `csInterface`. No evalBridge calls.
- No graph state. No `nodeMap`. No `wireMap`.
- No `graphState.js` implementation.
- No `nodeRegistry.js` implementation.
- No node definition files implemented.

If you find yourself writing a function, a variable declaration, or an event listener — stop. That is a future task.

---

## On Completion

When both phase checklists are confirmed, output this message verbatim:

```
─────────────────────────────────────────────────────────
TASK COMPLETE — Directory Setup and Panel UI Shell

Phase 1: Directory scaffold    ✅
Phase 2: Panel UI shell        ✅

Files created: [count]
Ready for next task: graphState.js implementation.
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-SETUP-DIR-AND-UI.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md, PROCEDIA-V4-ARCHITECTURE.md (Sections 13 and 14)*
