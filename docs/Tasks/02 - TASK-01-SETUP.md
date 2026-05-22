# TASK-01 — CEP Scaffold, Directory Setup, and Panel UI Shell
*Procedia v4 — CEP plugin for Adobe After Effects 2025+ · Windows*
*Execute on an empty cloned repository.*

---

## Prerequisite Reading — Do This First

Read these two files in full before touching anything:

1. `CLAUDE.md` — all 14 skills, all absolute rules
2. `PROCEDIA-V4-ARCHITECTURE.md` — Section 13 (File Structure), Section 14 (Wire Types)

**If either file is missing from the repo root, stop immediately and report it. Do not proceed.**

---

## Overview — Three Phases in Order

| Phase | What it builds | Deliverable |
|---|---|---|
| 0 | CEP plugin scaffold | `CSXS/manifest.xml`, `.debug`, `CSInterface.js` |
| 1 | Directory and file scaffold | Every folder and stub file the project needs |
| 2 | Panel UI shell | `panel.css` + complete `index.html` with static layout |

Each phase ends with a hard stop and a verification checklist. Do not chain phases. Do not proceed to the next phase without explicit developer confirmation.

---

## PHASE 0 — CEP Plugin Scaffold

### Context

Procedia is a CEP (Common Extensibility Platform) panel for Adobe After Effects. CEP panels require a specific folder structure and manifest file for After Effects to recognize and load them. This phase creates that scaffold — nothing else.

### What to create

```
.debug
CSXS/
  manifest.xml
lib/
  CSInterface.js
```

---

### File: `.debug`

Create at repo root. This file tells AE to load the extension in debug mode so the CEP panel can be opened during development without signing.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionList>
  <Extension Id="com.uppercut.procedia">
    <HostList>
      <Host Name="AEFT" Port="8088"/>
    </HostList>
  </Extension>
</ExtensionList>
```

---

### File: `CSXS/manifest.xml`

This is the CEP manifest. It tells After Effects the extension ID, version, panel dimensions, and which AE versions it supports.

```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<ExtensionManifest Version="7.0" ExtensionBundleId="com.uppercut.procedia"
  ExtensionBundleVersion="4.0.0" ExtensionBundleName="Procedia"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <ExtensionList>
    <Extension Id="com.uppercut.procedia" Version="4.0.0"/>
  </ExtensionList>

  <ExecutionEnvironment>
    <HostList>
      <Host Name="AEFT" Version="[22.0,99.9]"/>
    </HostList>
    <LocaleList>
      <Locale Code="All"/>
    </LocaleList>
    <RequiredRuntimeList>
      <RequiredRuntime Name="CSXS" Version="11.0"/>
    </RequiredRuntime>
    </RequiredRuntimeList>
  </ExecutionEnvironment>

  <DispatchInfoList>
    <Extension Id="com.uppercut.procedia">
      <DispatchInfo>
        <Resources>
          <MainPath>./index.html</MainPath>
          <ScriptPath>./jsx/dispatcher/dispatcher.jsx</ScriptPath>
          <CEFCommandLine/>
        </Resources>
        <Lifecycle>
          <AutoVisible>true</AutoVisible>
        </Lifecycle>
        <UI>
          <Type>Panel</Type>
          <Menu>Procedia</Menu>
          <Geometry>
            <Size>
              <Height>600</Height>
              <Width>800</Width>
            </Size>
            <MinSize>
              <Height>400</Height>
              <Width>600</Width>
            </MinSize>
          </Geometry>
          <Icons/>
        </UI>
      </DispatchInfo>
    </Extension>
  </DispatchInfoList>

</ExtensionManifest>
```

---

### File: `lib/CSInterface.js`

Download the official Adobe CSInterface.js file from:

```
https://raw.githubusercontent.com/Adobe-CEP/CSInterface/master/src/CSInterface.js
```

Save it to `lib/CSInterface.js`.

If the download fails due to network restrictions, create `lib/CSInterface.js` as a stub with this content:

```javascript
// lib/CSInterface.js
// Adobe CEP CSInterface — download from:
// https://github.com/Adobe-CEP/CSInterface/blob/master/src/CSInterface.js
// STUB: Replace with the real file before testing in After Effects.
var CSInterface = function() {};
```

Report which path was taken (downloaded or stubbed).

---

### Phase 0 verification checklist

- [ ] `.debug` exists at repo root with correct extension ID `com.uppercut.procedia`
- [ ] `CSXS/manifest.xml` exists and contains the correct extension ID, bundle ID, and AE host entry
- [ ] `lib/CSInterface.js` exists — report whether it is the real file or a stub
- [ ] No other files were created or modified
- [ ] Run `find . -not -path './.git/*' -type f | sort` and confirm only these three files exist (plus `CLAUDE.md` and `PROCEDIA-V4-ARCHITECTURE.md` which were already present)

**STOP. Report findings. Wait for confirmation before proceeding to Phase 1.**

---

## PHASE 1 — Directory and File Scaffold

### What to create

Create the exact directory tree below. Every folder listed, every file listed. No additions, no omissions. Empty category folders (`effects/`, `utility/`) must still be created — place a `.gitkeep` file inside each to ensure git tracks them.

```
index.html
index.js
panel.css

graph/
  graphState.js
  nodeRegistry.js
  engine.js
  cascadeAlgorithm.js
  cycleChecker.js
  portManager.js
  wireValidator.js
  nodes/
    categories/
      core/
        Comp.js
      layers/
        Text.js
        Null.js
        Shape.js
        Adjustment.js
      effects/
        .gitkeep
      data/
        Color.js
        Number.js
      utility/
        .gitkeep

  canvas/
    viewport.js
    renderer.js
    input.js
    minimap.js

  wire/
    wire.js
    wireRenderer.js

ui/
  nodeList.js
  drag.js
  inspector.js
  layerOrderList.js
  keyboard.js

flush/
  dirtyFlusher.js

polling/
  poller.js

notifications/
  notificationBar.js

bridge/
  evalBridge.js

data/
  uuidGenerator.js

jsx/
  json.jsx
  utils.jsx
  persistence.jsx
  polling.jsx
  dispatcher/
    dispatcher.jsx
```

---

### Stub file rules

Every `.js` and `.jsx` file gets exactly these three lines and nothing else:

```
// {relative/path/to/file.js}
// DEPENDS ON: {see table below}
// MUST LOAD BEFORE: {see table below}
```

Use the exact dependency declarations from this table:

| File | DEPENDS ON | MUST LOAD BEFORE |
|---|---|---|
| `data/uuidGenerator.js` | none | everything |
| `bridge/evalBridge.js` | lib/CSInterface.js | graph/graphState.js |
| `graph/graphState.js` | data/uuidGenerator.js | graph/engine.js, graph/cascadeAlgorithm.js, graph/portManager.js |
| `graph/nodeRegistry.js` | none | all node category files, graph/engine.js |
| `graph/cycleChecker.js` | graph/graphState.js | graph/wire/wire.js |
| `graph/portManager.js` | graph/graphState.js, graph/nodeRegistry.js | graph/engine.js, graph/wire/wire.js |
| `graph/wireValidator.js` | graph/graphState.js, graph/nodeRegistry.js | graph/wire/wire.js |
| `graph/cascadeAlgorithm.js` | graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js | graph/engine.js |
| `graph/engine.js` | graph/graphState.js, graph/nodeRegistry.js, graph/cascadeAlgorithm.js, graph/portManager.js, graph/wireValidator.js, bridge/evalBridge.js | index.js |
| `graph/nodes/categories/core/Comp.js` | graph/nodeRegistry.js | index.js |
| `graph/nodes/categories/layers/Text.js` | graph/nodeRegistry.js | index.js |
| `graph/nodes/categories/layers/Null.js` | graph/nodeRegistry.js | index.js |
| `graph/nodes/categories/layers/Shape.js` | graph/nodeRegistry.js | index.js |
| `graph/nodes/categories/layers/Adjustment.js` | graph/nodeRegistry.js | index.js |
| `graph/nodes/categories/data/Color.js` | graph/nodeRegistry.js | index.js |
| `graph/nodes/categories/data/Number.js` | graph/nodeRegistry.js | index.js |
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
| `jsx/json.jsx` | none | all other jsx files |
| `jsx/utils.jsx` | jsx/json.jsx | jsx/dispatcher/dispatcher.jsx, jsx/persistence.jsx, jsx/polling.jsx |
| `jsx/persistence.jsx` | jsx/json.jsx, jsx/utils.jsx | nothing |
| `jsx/polling.jsx` | jsx/json.jsx, jsx/utils.jsx | nothing |
| `jsx/dispatcher/dispatcher.jsx` | jsx/json.jsx, jsx/utils.jsx | nothing |

**`index.js` is the only exception** — give it four lines:

```javascript
// index.js
// DEPENDS ON: everything
// MUST LOAD BEFORE: nothing
// Entry point. Initializes: evalBridge → reservedComp → readGraph → buildUI → startPoller
```

`panel.css` and `index.html` are created empty for now — Phase 2 fills them.

---

### Phase 1 verification checklist

- [ ] Run `find . -not -path './.git/*' -type f | sort` and paste the full output
- [ ] Output matches the tree above exactly — no missing files, no extra files
- [ ] Every `.js` / `.jsx` file contains only its three stub comment lines (four for `index.js`)
- [ ] `panel.css` exists and is empty
- [ ] `index.html` exists and is empty
- [ ] `.gitkeep` files exist in `effects/` and `utility/`
- [ ] No function declarations, variable declarations, or logic anywhere

**STOP. Paste the `find` output. Wait for confirmation before proceeding to Phase 2.**

---

## PHASE 2 — Panel UI Shell

### What to build

Fill in `panel.css` and `index.html` to produce the complete static panel layout. No JavaScript behavior beyond palette category collapse. No event listeners on inspector fields. No graph state. No AE calls.

This is a visual deliverable only. When opened in a browser tab, it must look like a fully designed, production-quality plugin panel.

---

### Layout

Three columns, full viewport height. Topbar and statusbar span all three columns.

```
┌──────────────────────────────────────────────────────────────┐
│  topbar                                              (32px)   │
├──────────────┬───────────────────────────┬───────────────────┤
│              │                           │                   │
│   Palette    │         Canvas            │    Inspector      │
│   (200px)    │      (fills rest)         │    (240px)        │
│              │                           │                   │
├──────────────┴───────────────────────────┴───────────────────┤
│  statusbar                                           (20px)   │
└──────────────────────────────────────────────────────────────┘
```

Implement with CSS Grid on `#app`:

```css
#app {
  display: grid;
  grid-template-columns: var(--palette-width) 1fr var(--inspector-width);
  grid-template-rows: 32px 1fr 20px;
  grid-template-areas:
    "topbar   topbar    topbar"
    "palette  canvas    inspector"
    "status   status    status";
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
```

---

### Design tokens

Declare all of these as CSS custom properties on `:root` in `panel.css`. No hardcoded color values anywhere in the stylesheet.

```css
:root {
  --canvas-bg:         #111113;
  --grid-dot:          #1E1E24;

  --panel-bg:          #18181C;
  --panel-border:      #26262E;
  --panel-header-bg:   #1C1C22;

  --text-primary:      #E8E8F0;
  --text-secondary:    #7A7A90;
  --text-tertiary:     #3E3E52;

  --cat-core:          #9B6DFF;
  --cat-layers:        #4A9EFF;
  --cat-effects:       #FF7A4A;
  --cat-data:          #FFD166;
  --cat-utility:       #06D6A0;

  --wire-layer:        #4A9EFF;
  --wire-data:         #FFD166;
  --wire-parent:       #06D6A0;

  --state-alive:       #06D6A0;
  --state-ghost:       #3E3E52;
  --state-error:       #FF4A6A;

  --node-bg:           #1E1E26;
  --node-header-bg:    #16161E;
  --node-border:       #2A2A3A;
  --node-border-sel:   #5555AA;
  --node-radius:       8px;

  --port-size:         10px;
  --palette-width:     200px;
  --inspector-width:   240px;
}
```

---

### Fonts

Load from Google Fonts in `index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700&display=swap" rel="stylesheet" />
```

- **DM Mono** — all body text, param values, inspector inputs, status bar items
- **Syne** — node labels, category headers, panel section titles, logo

No other fonts. No fallback to Arial, Inter, or system fonts.

---

### Topbar

- `grid-area: topbar`
- Height: 32px, background: `--panel-header-bg`, border-bottom: 1px solid `--panel-border`
- Left side: a 6px circle dot in `--cat-core` with a soft glow, followed by the word `PROCEDIA` in Syne 700, letter-spacing 0.08em. Then a 1px vertical divider, then `v4` in 9px uppercase `--text-tertiary`.
- Right side: a 5px circle dot in `--state-alive` with a CSS `animation` that pulses opacity 1→0.3→1 over 2.4s, followed by `AE Connected` in 10px DM Mono `--text-secondary`.

---

### Palette

- `grid-area: palette`
- Background: `--panel-bg`, border-right: 1px solid `--panel-border`
- Top: a search `<input>` — full width minus padding, 10px DM Mono, placeholder `search nodes…`, dark background `#111116`, border 1px solid `--panel-border`, border-radius 5px, no label, no submit button
- Below: a scrollable list of category groups

**Each category group:**
- Header row: a 3px × 12px accent bar in the category color | category name Syne 600 9px uppercase `--text-tertiary` | caret `▾` right-aligned in `--text-tertiary`
- Clicking the header toggles collapsed/expanded (JS inline in `<script>` at bottom of `<body>`)
- When collapsed: items hidden, caret rotates −90°
- Items: 11px DM Mono `--text-secondary`, indented, `draggable="true"`, hover lightens row background slightly

**Categories and items:**

| Category | Color | Items |
|---|---|---|
| Core | `--cat-core` | Comp |
| Layers | `--cat-layers` | Text, Null, Shape, Adjustment |
| Effects | `--cat-effects` | Fill, Gaussian Blur, Drop Shadow |
| Data | `--cat-data` | Color, Number |
| Utility | `--cat-utility` | Expression |

---

### Canvas

- `grid-area: canvas`, `position: relative`, `overflow: hidden`
- Background: `--canvas-bg`
- Dot grid via CSS: `background-image: radial-gradient(circle, var(--grid-dot) 1px, transparent 1px)`, `background-size: 24px 24px`, `background-position: 12px 12px`

**Inner structure — create these child elements in this order:**

```html
<main id="canvas-wrap">
  <div id="notification-bar"><!-- notification cards here --></div>
  <div id="canvas-viewport">
    <svg id="wire-layer" xmlns="http://www.w3.org/2000/svg"></svg>
    <!-- node cards here -->
    <!-- wire picker here -->
  </div>
</main>
```

- `#canvas-viewport`: `position: absolute; inset: 0; transform-origin: 0 0` — future pan/zoom target
- `#wire-layer`: `position: absolute; inset: 0; overflow: visible; pointer-events: none`
- `#notification-bar`: `position: absolute; top: 0; left: 0; right: 0; z-index: 100; pointer-events: none`

---

### Node cards

Render six static node cards inside `#canvas-viewport` as `position: absolute` divs.

**Base card structure:**

```html
<div class="node [state] [selected?]" style="left: Xpx; top: Ypx;">
  <div class="node-header">
    <div class="node-cat-bar" style="background: var(--cat-CATEGORY)"></div>
    <span class="node-label">Label</span>
    <div class="node-state-dot"></div>
  </div>
  <div class="node-body">
    <div class="node-param">
      <span class="node-param-key">key</span>
      <span class="node-param-value">value</span>
    </div>
    <!-- more params -->
  </div>
  <!-- port dots -->
</div>
```

**Card CSS rules:**
- Width: 180px
- Border-radius: `--node-radius`
- Background: `--node-bg`, border: 1px solid `--node-border`
- Header: 28px tall, background `--node-header-bg`, border-bottom: 1px solid `--node-border`, `overflow: hidden`, `border-radius: var(--node-radius) var(--node-radius) 0 0`
- Category bar: 3px wide, full header height, left edge, no radius
- Label: Syne 600 11px `--text-primary`, `flex: 1`, padding 0 8px, truncate with ellipsis
- State dot: 6px circle, 8px from right edge of header
- Param row: flex, space-between. Key: 9px DM Mono `--text-tertiary`. Value: 10px DM Mono `--text-secondary`
- Body padding: 7px 10px 9px

**State classes:**

| Class | Visual effect |
|---|---|
| `alive` | State dot: `--state-alive` with `box-shadow: 0 0 6px var(--state-alive)` |
| `ghost` | `opacity: 0.4`, `border-style: dashed` |
| `error` | `border-color: var(--state-error)`, CSS keyframe animation pulsing box-shadow |
| `selected` | `border-color: var(--node-border-sel)`, `box-shadow: 0 0 0 1px var(--node-border-sel)` |

**Port dots:**

All ports are `position: absolute` on the node card. Base dot: `width: var(--port-size)`, `height: var(--port-size)`, `border-radius: 50%`.

| Port type | Position | Color | Shape |
|---|---|---|---|
| Input `layer` | Left edge, vertically centered in body | `--wire-layer` | Circle |
| Input `data` | Left edge, below layer port | `--wire-data` | Circle |
| Input empty/newborn | Left edge, last slot | transparent, border 1.5px dashed `--text-tertiary` | Circle |
| Output | Right edge, vertically centered in body | matches wire type | Circle |
| `child_of` | Top edge, horizontally centered | `--wire-parent` | Square (border-radius: 2px) |
| `parent_of` | Bottom edge, horizontally centered | `--wire-parent` | Square (border-radius: 2px) |

Ports extend slightly outside the card edge (offset by half port-size). Use negative `left`/`right`/`top`/`bottom` values.

**Color swatch in param value:** a 14px × 10px inline block with `border-radius: 2px` and `border: 1px solid rgba(255,255,255,0.08)`.

**Wired param value:** add class `is-wired` — color becomes `--wire-data`, prepend a 5px yellow dot.

---

**Six nodes to render:**

**1. Comp node** — `left: 630px; top: 108px` — classes: `alive selected`
- Category: Core (`--cat-core`)
- Params: `duration / 10s` | `fps / 24` | `size / 1920×1080`
- Ports: 2 filled layer input ports + 1 empty extendable slot on left. No output port. `child_of` top edge only — no `parent_of` (CompNode cannot be a child of another layer).

**2. Null node** — `left: 380px; top: 60px` — class: `alive`
- Category: Layers (`--cat-layers`)
- Params: `position / 960, 540` | `rotation / 0°` | `opacity / 100%`
- Ports: output right. `child_of` top, `parent_of` bottom.

**3. Text node (Headline)** — `left: 100px; top: 108px` — class: `alive`
- Category: Layers (`--cat-layers`)
- Params: `content / Hello World` | `font size / 72` | `color / [white swatch]` | `opacity / 100%` (mark `opacity` as wired — `is-wired` class)
- Ports: output right. `child_of` top, `parent_of` bottom.

**4. Fill effect node** — `left: 370px; top: 120px` — class: `alive`
- Category: Effects (`--cat-effects`)
- Params: `color / [orange swatch #FF7A4A, is-wired]` | `opacity / 100%` | `blending / Normal`
- Ports: 1 filled layer input + 1 filled data input + 1 empty extendable slot on left. Output right. No parent ports (effectors have no AE layer, cannot parent).

**5. Color node** — `left: 100px; top: 260px` — class: `alive`
- Category: Data (`--cat-data`)
- Params: `hex / #FF7A4A` | `rgba / 255, 122, 74`
- Ports: output right, data type (yellow). No parent ports (data nodes have no AE layer).

**6. Ghost text node (Subtitle)** — `left: 100px; top: 390px` — class: `ghost`
- Category: Layers (`--cat-layers`)
- Params: `content / A ghost node` | `font size / 36`
- Ports: output right. `child_of` top, `parent_of` bottom.

---

### Wires — SVG paths inside `#wire-layer`

All wires: `fill: none`, `stroke-linecap: round`, `stroke-width: 1.5`, `opacity: 0.8`.

Use cubic bezier paths (`M x1 y1 C cx1 cy1, cx2 cy2, x2 y2`). Layer and data wires use horizontal S-curves — control points offset horizontally from endpoints. Parent wires use vertical S-curves — control points offset vertically.

Compute coordinates from node positions and port placement. Input ports are on the left edge of the card (x = node left). Output ports are on the right edge (x = node left + 180). Vertical position is approximately: header height (28px) + half of body height.

| Wire | Stroke | Dash | Approximate path |
|---|---|---|---|
| Text node output → Fill input (layer) | `--wire-layer` | none | From right edge of Text node → left edge of Fill node |
| Fill output → Comp input (layer) | `--wire-layer` | none | From right edge of Fill node → left edge of Comp node |
| Color output → Fill data input (data) | `--wire-data` | none | From right edge of Color node → left data port on Fill node |
| Text `child_of` → Null `parent_of` (parent) | `--wire-parent` | `5 3` | From top-center of Text node → bottom-center of Null node — vertical S-curve |

---

### Wire picker dropdown — one static example

Render inside `#canvas-viewport`, positioned near the Fill node's empty extendable slot (approximately `left: 365px; top: 230px`).

```html
<div class="wire-picker">
  <div class="wire-picker-label">Bind to param</div>
  <div class="wire-picker-item">
    <div class="wire-picker-dot"></div>
    <span class="wire-picker-item-label">opacity</span>
    <span class="wire-picker-item-type">number</span>
  </div>
  <div class="wire-picker-item">
    <div class="wire-picker-dot"></div>
    <span class="wire-picker-item-label">blending</span>
    <span class="wire-picker-item-type">enum</span>
  </div>
</div>
```

Card style: `background: #1E1E28`, border 1px solid `#3A3A50`, border-radius 7px, `box-shadow: 0 8px 32px rgba(0,0,0,0.5)`, min-width 140px. Dot: 7px circle in `--wire-data`. Label: 9px uppercase `--text-tertiary`. Item label: 11px `--text-primary`. Item type: 9px `--text-tertiary` right-aligned. Add a subtle `scale(0.96→1)` CSS entry animation.

---

### Notification bar — one static example

Inside `#notification-bar`:

```html
<div class="notification">
  <span class="notification-icon">⚠</span>
  <span class="notification-text">TextNode_01 was deleted outside Procedia.</span>
  <button class="notification-btn">Re-create in AE</button>
  <button class="notification-btn">Remove from Graph</button>
</div>
```

Style: background `#1E1218`, border 1px solid `--state-error`, border-radius 6px, padding 7px 10px. Icon: `--state-error` 12px. Text: 10px DM Mono `--text-secondary`. Buttons: 9px DM Mono, dark background, subtle border, hover state. Add a slide-down CSS entry animation.

The bar itself has `pointer-events: none`. Individual notification cards have `pointer-events: all`.

---

### Inspector

- `grid-area: inspector`
- Background: `--panel-bg`, border-left: 1px solid `--panel-border`

**Header (32px):** `INSPECTOR` in Syne 600 10px uppercase `--text-tertiary` on the left. On the right: a small badge — 5px dot in `--cat-core` + `Core / Comp` in 9px `--text-tertiary`, all inside a pill with dark background and subtle border.

**Body — render fields for the selected Comp node:**

Section `IDENTITY`:
- `label` → `<input type="text" value="Main Comp">`

Section `COMPOSITION`:
- `width` → `<input type="number" value="1920">`
- `height` → `<input type="number" value="1080">`
- `fps` → `<input type="number" value="24">`
- `duration` → `<input type="text" value="10s">`
- `bg color` → color swatch (14×14px black square, border-radius 3px) + `<input type="text" value="#000000">`

Section `STATE`:
- `state` → read-only input, value `alive`, text color `--state-alive`
- `uuid` → read-only input, value `PROC-1716…a3f2`, 9px, `--text-tertiary`

**Field layout:** label fixed 68px `--text-secondary` 10px | input `flex: 1`, background `#111116`, border 1px solid `--panel-border`, border-radius 4px, 10px DM Mono `--text-primary`. Section dividers: 1px `--panel-border` with margin 6px 12px.

---

### Status bar

- `grid-area: status`
- Height: 20px, background: `--panel-header-bg`, border-top: 1px solid `--panel-border`
- Left items (9px DM Mono): `nodes` `--text-tertiary` + `5` `--text-secondary` | `wires 4` | `alive 4` | `ghost 1`
- Right: `zoom` `--text-tertiary` + `100%` `--text-secondary`

---

### `<script>` tags — exact load order in `index.html`

Place at the bottom of `<body>`, after all HTML, before the closing `</body>` tag. This block is the load-order source of truth for the entire project.

```html
<!-- CEP interface -->
<script src="lib/CSInterface.js"></script>

<!-- Infrastructure — no dependencies -->
<script src="data/uuidGenerator.js"></script>
<script src="bridge/evalBridge.js"></script>
<script src="graph/graphState.js"></script>
<script src="graph/nodeRegistry.js"></script>

<!-- Node definitions — depend on nodeRegistry -->
<script src="graph/nodes/categories/core/Comp.js"></script>
<script src="graph/nodes/categories/layers/Text.js"></script>
<script src="graph/nodes/categories/layers/Null.js"></script>
<script src="graph/nodes/categories/layers/Shape.js"></script>
<script src="graph/nodes/categories/layers/Adjustment.js"></script>
<script src="graph/nodes/categories/data/Color.js"></script>
<script src="graph/nodes/categories/data/Number.js"></script>

<!-- Graph engine — depends on graphState, nodeRegistry, all nodes -->
<script src="graph/cycleChecker.js"></script>
<script src="graph/portManager.js"></script>
<script src="graph/wireValidator.js"></script>
<script src="graph/cascadeAlgorithm.js"></script>
<script src="graph/engine.js"></script>

<!-- Canvas — depends on engine -->
<script src="graph/canvas/viewport.js"></script>
<script src="graph/canvas/renderer.js"></script>
<script src="graph/canvas/input.js"></script>
<script src="graph/canvas/minimap.js"></script>
<script src="graph/wire/wireRenderer.js"></script>
<script src="graph/wire/wire.js"></script>

<!-- UI — depends on graphState, nodeRegistry -->
<script src="ui/nodeList.js"></script>
<script src="ui/drag.js"></script>
<script src="ui/inspector.js"></script>
<script src="ui/layerOrderList.js"></script>
<script src="ui/keyboard.js"></script>

<!-- Services -->
<script src="flush/dirtyFlusher.js"></script>
<script src="polling/poller.js"></script>
<script src="notifications/notificationBar.js"></script>

<!-- Entry point — depends on everything -->
<script src="index.js"></script>
```

---

### Palette collapse — the only JS behavior in this phase

Add this inline `<script>` block immediately before the closing `</body>` tag, after all `<script src="...">` tags:

```html
<script>
  document.querySelectorAll('.palette-category-header').forEach(function(header) {
    header.addEventListener('click', function() {
      header.parentElement.classList.toggle('collapsed');
    });
  });
</script>
```

This is the only JavaScript written in this phase. No other event listeners. No other logic.

---

### Phase 2 verification checklist

- [ ] Panel opens in a browser tab (`open index.html`) with zero console errors
- [ ] Three-column layout renders — palette left, canvas center, inspector right
- [ ] Topbar spans full width, logo and status visible
- [ ] Statusbar spans full width with node/wire counts
- [ ] Canvas shows the dot grid
- [ ] All six node cards are visible at the correct positions
- [ ] Alive state: state dot glows green
- [ ] Ghost state: Subtitle node is dimmed and has dashed border
- [ ] Selected state: Comp node has blue border glow
- [ ] All port dots visible — blue circles (layer), yellow circles (data), green squares (parent), dashed circle (empty slot)
- [ ] Four SVG wires are visible and correctly colored — blue, blue, yellow, green-dashed
- [ ] Wire picker dropdown is visible near the Fill node
- [ ] Notification bar is visible at top of canvas with both buttons
- [ ] Inspector shows Comp node fields with section labels and dividers
- [ ] Palette categories collapse and expand on header click, caret rotates
- [ ] DM Mono and Syne fonts are loading (check Network tab — both should be `200 OK`)
- [ ] No hardcoded hex color values anywhere in `panel.css` — all reference CSS variables
- [ ] All `<script>` tags present in `index.html` in the exact order listed above
- [ ] No JS logic anywhere except the inline palette collapse script

**STOP. Describe what you see or share a screenshot. Wait for confirmation.**

---

## What This Task Explicitly Does Not Do

If you find yourself doing any of the following, stop immediately — it is out of scope:

- Writing any function or variable declaration in any `.js` file (stubs only)
- Wiring up drag-and-drop from palette to canvas
- Implementing wire drawing by mouse
- Adding event listeners to inspector inputs
- Connecting to AE or calling `csInterface`
- Implementing `graphState`, `nodeRegistry`, or any engine file
- Implementing any node definition file

---

## On Completion

When all three phase checklists pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-01 COMPLETE

Phase 0: CEP scaffold          ✅
Phase 1: Directory scaffold    ✅
Phase 2: Panel UI shell        ✅

Files created: [count]
Next task: graphState.js + nodeRegistry.js implementation.
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-01-SETUP.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md (all 14 skills), PROCEDIA-V4-ARCHITECTURE.md (Sections 13–14)*
*Extension ID: com.uppercut.procedia*
