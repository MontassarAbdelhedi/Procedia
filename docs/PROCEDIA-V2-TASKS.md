# Procedia v2 — Task Breakdown
*For Claude Code — strict sequential execution, one task at a time*
*Last updated: May 2026*

---

## Execution Rules

- Implement ONE task. Stop. Show the verification checklist. Wait for confirmation.
- Never start the next task until every checkbox in the current task is checked.
- Every `.jsx` file is ES3 strict — `var` only, named functions, string concatenation, `for` loops.
- Every `.jsx` function returns `JSON.stringify({ ok, data, error })`.
- `evalBridge.js` is the only file that calls `csInterface.evalScript()`.
- `graphState.js` is the only file that mutates nodeMap or wireMap.

---

## PHASE 1 — Shell & Layout ✅
*Goal: Empty panel open in AE with correct layout. No logic yet.*

---

### TASK 1.1 — Repo structure & manifest ✅
**What:** Create the clean folder structure and CEP manifest. Nothing runs yet.

**Files to create:**
```
procedia/
├── CSXS/manifest.xml
├── index.html
├── index.js
├── graph/
├── inspector/
├── data/
├── polling/
├── notifications/
├── bridge/
└── jsx/
```

**manifest.xml must declare:**
- Panel ID: `com.procedia.panel`
- Panel name: `Procedia`
- Host: AfterEffects, version 22.0+
- Panel size: 1200 x 800 minimum

**Verification checklist:**
- [ ] Panel appears in AE → Window → Extensions → Procedia
- [ ] Panel opens without errors in AE console
- [ ] Panel shows a blank dark background (`#1a1a1a`)
- [ ] No console errors on open

---

### TASK 1.2 — Three-column layout ✅
**What:** Build the static HTML/CSS shell. Three columns, correct proportions, no functionality.

**Layout:**
```
┌─────────────┬────────────────────────────┬─────────────┐
│  Node List  │         Canvas             │  Inspector  │
│  220px      │         flex-grow          │  260px      │
│             │                            │             │
└─────────────┴────────────────────────────┴─────────────┘
│         Notification Bar (hidden by default)            │
└─────────────────────────────────────────────────────────┘
```

**Visual rules:**
- Background: `#1a1a1a`
- Column dividers: `1px solid #2e2e2e`
- Node list bg: `#1e1e1e`
- Canvas bg: `#181818` with subtle dot grid pattern
- Inspector bg: `#1e1e1e`
- Notification bar: `#2a1a1a` (red tint), height 28px, hidden by default (`display: none`)
- Font: system monospace for all labels, 11px
- All CSS in `styles/main.css`

**Files to create/touch:**
- `index.html`
- `styles/main.css`

**Verification checklist:**
- [ ] Three columns visible with correct proportions
- [ ] Canvas has dot grid background
- [ ] Notification bar is hidden
- [ ] Layout fills the full panel, no overflow, no scrollbars on outer container
- [ ] Resizing the panel reflows correctly

---

### TASK 1.3 — Node list panel ✅
**What:** Populate the left panel with node categories and items. Drag-to-canvas not wired yet — just the visual list with search.

**Node categories and nodes:**

| Category | Color (stroke) | Nodes |
|---|---|---|
| Containers | `#5b8dd9` (blue) | Comp, Solid, Null, Adjustment, Footage |
| Layers | `#7ec98f` (green) | Text, Shape, Mask |
| Effects | `#d4a04a` (amber) | Effect |
| Graph | `#b07ed4` (purple) | GraphPosition, GraphRotation, GraphScale |
| Special | `#d46e6e` (red) | IsParent |

**UI behavior:**
- Each category is a collapsible section with a chevron toggle
- All sections open by default
- Search input at top — filters node items across all categories in real time (hides non-matching items, keeps category headers visible if any child matches)
- Each node item shows: colored left border (category stroke color) + node name label
- Hover state: `#2a2a2a` background

**Files to create/touch:**
- `index.html` — node list markup
- `styles/main.css` — node list styles
- `index.js` — search filter logic, collapse toggle logic

**Verification checklist:**
- [ ] All 5 categories render with correct colors
- [ ] Collapse/expand works per category
- [ ] Search filters correctly across categories
- [ ] Search clears on `Escape` key
- [ ] No node is draggable yet (drag will be wired in Phase 2)

---

### TASK 1.4 — Canvas foundation ✅
**What:** Infinite canvas with pan and zoom. No nodes rendered yet.

**Behavior:**
- Pan: middle mouse button drag OR spacebar + left mouse drag
- Zoom: scroll wheel, range 0.2x to 4x, zoom toward cursor position
- Canvas renders via an HTML5 `<canvas>` element, full size of the center column
- Dot grid redraws on pan/zoom to give parallax depth feel
- Zoom level displayed in bottom-left corner of canvas (e.g. `100%`)

**Files to create/touch:**
- `graph/canvas.js` — pan, zoom, coordinate transform, grid draw, resize observer
- `index.html` — canvas element
- `styles/main.css` — canvas positioning

**Verification checklist:**
- [ ] Canvas fills center column at all panel sizes
- [ ] Pan works with middle mouse and spacebar+drag
- [ ] Zoom works with scroll wheel, clamped to 0.2–4x
- [ ] Zoom is toward cursor position, not canvas center
- [ ] Dot grid redraws correctly on pan and zoom
- [ ] Zoom percentage shown in corner

---

### TASK 1.5 — Minimap ✅
**What:** Small overview map in bottom-right corner of the canvas showing the full graph extent.

**Behavior:**
- Fixed size: 160px × 100px
- Position: bottom-right of canvas, 12px margin
- Background: `#111111` at 85% opacity
- Border: `1px solid #2e2e2e`
- Shows the viewport rectangle as a dim white outline within the minimap
- Clicking or dragging inside the minimap pans the canvas to that position
- Empty for now (no nodes to show) — viewport rect still renders

**Files to create/touch:**
- `graph/minimap.js` — minimap render, click-to-pan
- `index.html` — minimap canvas element overlaid on main canvas
- `styles/main.css` — minimap positioning

**Verification checklist:**
- [ ] Minimap renders in bottom-right of canvas
- [ ] Viewport rectangle updates as user pans/zooms
- [ ] Clicking minimap pans main canvas to clicked position
- [ ] Minimap does not interfere with canvas pan/zoom events

---

### TASK 1.6 — Inspector panel & notification bar ✅
**What:** Right panel shell and notification bar. No node data yet — just the empty states.

**Inspector empty state:**
- Centered label: `"Select a node"` in muted gray (`#555`)

**Notification bar:**
- Hidden by default
- When shown: full-width bar above the three columns, 28px tall
- Left side: warning icon + message text (white, 11px)
- Right side: dismiss `×` button
- `notificationBar.js` exposes `show(message)` and `hide()` functions

**Files to create/touch:**
- `notifications/notificationBar.js`
- `inspector/inspector.js` — empty state render
- `index.html` — inspector markup, notification bar markup
- `styles/main.css` — inspector styles, notification bar styles

**Verification checklist:**
- [ ] Inspector shows "Select a node" empty state
- [ ] `notificationBar.show("test message")` called from console shows the bar
- [ ] Dismiss button hides the bar
- [ ] Notification bar appears above the columns, not inside them

---

## PHASE 2 — Graph Core ✅
*Goal: Nodes can be dropped, selected, moved, and deleted on the canvas. No AE connection yet.*

---

### TASK 2.1 — Graph state module ✅
**What:** `graphState.js` — the single source of truth for all in-memory graph data.

**What it stores:**
```javascript
var graphState = {
  nodes: {},   // keyed by UUID — { id, type, state, position, properties, ports }
  wires: {},   // keyed by wire ID — { id, fromNode, fromPort, toNode, toPort }
  selection: null  // UUID of currently selected node, or null
};
```

**What it exposes:**
- `addNode(nodeData)` — adds to nodes map
- `removeNode(uuid)` — removes node and all its wires
- `updateNode(uuid, patch)` — merges patch into node data
- `addWire(wireData)` — adds to wires map
- `removeWire(wireId)` — removes from wires map
- `setSelection(uuid)` — sets selection, fires `onSelectionChange` callback
- `getNode(uuid)` — returns node data
- `getAllNodes()` — returns nodes map
- `getAllWires()` — returns wires map
- `onSelectionChange(callback)` — register a listener

**Files to create/touch:**
- `graph/graphState.js`

**Verification checklist:**
- [ ] `addNode` and `getNode` work correctly in browser console
- [ ] `removeNode` also removes all wires referencing that UUID
- [ ] `setSelection` fires the registered callback
- [ ] No other file mutates `graphState.nodes` or `graphState.wires` directly

---

### TASK 2.2 — Node registry ✅ *(refactored May 2026)*
**What:** `nodeRegistry.js` — thin registry loader. Each node type lives in its own file under `graph/nodes/categories/`.

**Architecture (post-refactor):**
```
graph/
  nodes/
    nodeRegistry.js                      ← thin registry (register/lookup only)
    node.js                              ← node rendering, hit-testing
    categories/
      core/
        Comp.js                          ← ✅
      layers/
        Text.js                          ← ✅ (added May 2026)
      effects/                           ← ready for future nodes
      generators/                        ← ready for future nodes
      utility/                           ← ready for future nodes
```

**Registry public API:**
```javascript
nodeRegistry.getDefinition(type)         // returns one definition or null
nodeRegistry.getAllDefinitions()         // returns full registry map
nodeRegistry.getByCategory(category)    // returns array of definitions
nodeRegistry.listTypes()                // returns array of type strings
// Backward-compat aliases (used by legacy drag code):
nodeRegistry.getByType(type)
nodeRegistry.getAll()
```

**Node definition contract** (see `docs/SKILL-NODE-AUTHORING.md` for full spec):
```javascript
// graph/nodes/categories/{category}/{NodeName}.js
nodeRegistry.register({
  type:     'category/node-name',   // kebab-case, unique
  label:    'Human Label',
  category: 'Category',            // must match folder name
  version:  '1.0.0',
  inputs:   [ { name, type, required } ],
  outputs:  [ { name, type } ],
  params:   [ { key, label, type, default, min?, max?, options? } ],
  apply:    function(nodeData) { return 'extendScriptFnCall(...)'; }
});
```

**Adding a new node:** create one file, add one `<script>` tag in `index.html` after `nodeRegistry.js`. No other file changes needed. Read `docs/SKILL-NODE-AUTHORING.md` before authoring.

**Registered nodes:**
- `core/comp` ✅ (`graph/nodes/categories/core/Comp.js`)
- `TextNode` ✅ (`graph/nodes/categories/layers/Text.js`)
- All other node types: to be added one per session as needed

**Verification checklist:**
- [x] `nodeRegistry.js` is a thin registry with no inline node definitions
- [x] `register()` warns on duplicate type, does not throw
- [x] All four public API functions exist and work
- [x] `Comp.js` self-registers on load via `nodeRegistry.register()`
- [x] `nodeRegistry.getDefinition('core/comp')` returns the Comp definition
- [x] Backward-compat aliases `getByType` / `getAll` preserved for `index.js`

---

### TASK 2.3 — UUID generator ✅
**What:** `uuidGenerator.js` — one function, one format.

**Format:** `PROC-{timestamp}-{rand4}` for nodes, `WIRE-{timestamp}-{rand4}` for wires.

```javascript
// uuidGenerator.js
function generateNodeId() {
  var rand = Math.random().toString(36).substr(2, 4);
  return 'PROC-' + Date.now() + '-' + rand;
}
function generateWireId() {
  var rand = Math.random().toString(36).substr(2, 4);
  return 'WIRE-' + Date.now() + '-' + rand;
}
```

**Files to create/touch:**
- `data/uuidGenerator.js`

**Verification checklist:**
- [ ] Two calls to `generateNodeId()` always return different values
- [ ] Format is exactly `PROC-{13digits}-{4chars}`
- [ ] Same for `generateWireId()` with `WIRE-` prefix

---

### TASK 2.4 — Node rendering on canvas ✅
**What:** Draw nodes on the canvas. Drop not wired yet — just render a hardcoded test node.

**Node visual anatomy:**
```
┌─────────────────────────┐  ← rounded rect, fill: #252525, stroke: category color (2px)
│  ● TextNode             │  ← dot = state indicator, label = node type
│  ─────────────────────  │  ← divider line
│  content: "Hello"       │  ← first property preview (truncated)
└─────────────────────────┘
     ○                        ← output port dot (bottom center)
```

**State colors (fill of the state dot and border opacity):**
- `ghost`: border opacity 40%, dot color `#555`
- `alive`: border opacity 100%, dot color `#7ec98f`
- `error`: border opacity 100%, dot color `#d46e6e`, red glow on border

**Node dimensions:** 160px wide × 60px tall (in canvas units, before zoom)

**Selected state:** additional outer glow ring `2px` in white at 30% opacity

**Files to create/touch:**
- `graph/node.js` — `drawNode(ctx, nodeData, transform)` function
- `graph/canvas.js` — render loop calls `drawNode` for each node in graphState

**Verification checklist:**
- [ ] Hardcoded test node renders at canvas center
- [ ] State dot and border reflect ghost/alive/error correctly
- [ ] Node scales and translates correctly with pan and zoom
- [ ] Selected node shows glow ring
- [ ] Category stroke color matches nodeRegistry definition

---

### TASK 2.5 — Drag node from list to canvas ✅
**What:** User drags a node from the left panel list and drops it onto the canvas. Node appears at drop position with ghost state.

**Behavior:**
- `mousedown` on a node list item → start drag, show a ghost drag preview following the cursor
- `mouseup` over the canvas → calculate canvas coordinates from screen position → call `graphState.addNode()` → canvas redraws
- `mouseup` outside canvas → cancel drag, no node created
- On drop: assign UUID, set state `ghost`, set position to drop coordinates, set defaultProperties from nodeRegistry
- Minimap updates to show new node dot

**Files to create/touch:**
- `index.js` — drag initiation from node list
- `graph/canvas.js` — drop detection, coordinate conversion
- `graph/graphState.js` — already built in 2.1

**Verification checklist:**
- [ ] Dragging any node from the list shows a drag preview
- [ ] Dropping on canvas creates the node at the correct position
- [ ] Dropping outside canvas cancels without creating a node
- [ ] Node renders immediately after drop in ghost state
- [ ] Minimap shows a dot for the new node
- [ ] Multiple nodes can be dropped independently

---

### TASK 2.6 — Node interaction: select, move, delete ✅
**What:** Click to select, drag to move, Delete key to remove.

**Select:**
- `mousedown` on a node → `graphState.setSelection(uuid)` → inspector updates (empty for now, shows node type)
- `mousedown` on empty canvas → `graphState.setSelection(null)` → inspector shows empty state

**Move:**
- `mousedown` on selected node + drag → update `node.position` in graphState → canvas redraws
- Position updates live during drag (no snap to grid for now)

**Delete:**
- `Delete` or `Backspace` key while a node is selected → `graphState.removeNode(uuid)` → canvas redraws
- If node is alive: warn in console (AE cleanup not yet implemented — Phase 3 handles this)

**Files to create/touch:**
- `graph/canvas.js` — mouse event handling for select, move
- `index.js` — keyboard event for delete
- `graph/graphState.js` — already built

**Verification checklist:**
- [ ] Clicking a node selects it (glow ring appears)
- [ ] Clicking empty canvas deselects
- [ ] Dragging a selected node moves it smoothly
- [ ] Moved position persists (node does not snap back)
- [ ] Delete key removes the selected node from canvas
- [ ] Inspector panel shows selected node type after selection

---

## PHASE 3 — Wire System ✅
*Goal: Nodes can be wired together. Port system and ghost cascade logic implemented.*

---

### TASK 3.1 — evalBridge ✅
**What:** `evalBridge.js` — the only file that touches `csInterface.evalScript()`.

```javascript
// evalBridge.js
function evalScript(fnCall) {
  return new Promise(function(resolve, reject) {
    csInterface.evalScript(fnCall, function(result) {
      try {
        var parsed = JSON.parse(result);
        resolve(parsed);
      } catch (e) {
        reject(new Error('Bridge parse error: ' + result));
      }
    });
  });
}
```

**Files to create/touch:**
- `bridge/evalBridge.js`

**Verification checklist:**
- [ ] `evalScript('$.about()')` resolves with a parsed object (or parse error — that's fine for now)
- [ ] No other file calls `csInterface.evalScript()` directly
- [ ] Promise rejects cleanly on malformed JSON

---

### TASK 3.2 — Dynamic port rendering ✅
**What:** Input ports appear on a node when the user hovers it while dragging a wire. Output port is always visible.

**Output port:** always rendered as a small circle at the bottom-center of the node.

**Input ports:** rendered dynamically on the top-center of the node only when:
- A wire drag is in progress AND
- The cursor is hovering the node

Each input port is a small circle. Port label appears on hover (e.g. `"data_fontSize"`). Ports are laid out evenly across the top edge.

**Port circle colors:**
- `layer` port: `#5b8dd9` (blue)
- `data` port: `#d4a04a` (amber)

**Files to create/touch:**
- `graph/nodes/node.js` — port rendering
- `graph/canvas/renderer.js` — track wire-drag state, pass to node renderer

**Verification checklist:**
- [ ] Output port circle always visible at bottom-center of every node
- [ ] Input ports only appear when a wire drag is active AND cursor is over the node
- [ ] Port colors match their type (layer vs data)
- [ ] Port label appears on hover

---

### TASK 3.3 — Wire drawing ✅
**What:** User drags from an output port to an input port. Bezier wire renders during drag and snaps on drop.

**Drag behavior:**
- `mousedown` on output port → begin wire drag, store `fromNode` UUID and `fromPort`
- During drag: draw a bezier curve from output port to cursor
- On hover over a valid input port: port highlights, wire end snaps to port center
- On `mouseup` over a valid input port: confirm wire
- On `mouseup` over invalid target or empty canvas: cancel wire drag, no wire created

**Bezier curve control points:**
- Start: output port position (bottom-center of from-node)
- CP1: start + (0, +80px) in canvas units
- CP2: end + (0, -80px) in canvas units
- End: input port position (top of to-node)

**Wire colors:**
- `layer` wire: `#5b8dd9` (blue), 2px
- `data` wire: `#d4a04a` (amber), 1.5px, dashed

**Type enforcement:** if wire type (determined by toPort type from nodeRegistry) does not match what the fromNode can output for that port — do not highlight port, do not confirm wire. Silent rejection.

**Cycle check:** before confirming, traverse downstream from `toNode`. If `fromNode` is found → reject silently.

**On confirm:**
- Generate wire ID via `generateWireId()`
- Call `graphState.addWire(wireData)`
- Canvas redraws with wire rendered

**Files to create/touch:**
- `graph/Wire/wire.js` — drag state, commit/delete logic, cycle check
- `graph/Wire/wireRenderer.js` — bezier draw, wire color, type check
- `graph/canvas/input.js` — wire drag event handling
- `graph/canvas/renderer.js` — render all wires from graphState

**Verification checklist:**
- [x] Dragging from output port shows live bezier curve to cursor
- [x] Valid input port highlights on hover during drag
- [x] Invalid type port does not highlight
- [x] Confirmed wire renders persistently between nodes
- [x] Cycle is detected and rejected silently (no wire created, no error shown)
- [x] Wire color matches port type
- [x] Wires redraw correctly on node move

---

### TASK 3.4 — Ghost cascade logic ✅
**What:** Implement the downstream traversal algorithm. When a wire is deleted, determine which nodes go ghost.

**Algorithm (panel JS only — no AE calls yet):**

```
onWireDelete(wireId):
  wire = graphState.getWire(wireId)
  portType = getPortType(wire.toNode, wire.toPort)  // 'layer' or 'data'

  if portType == 'data':
    ghost(wire.fromNode) only — isolated ghost
    return

  if portType == 'layer':
    graphState.removeWire(wireId)
    evaluateNodeState(wire.fromNode)
    evaluateNodeState(wire.toNode)

evaluateNodeState(uuid):
  if hasCompDownstream(uuid):
    node stays alive (or becomes alive if was ghost)
  else:
    node goes ghost
    for each upstream layer-port wire feeding this node:
      evaluateNodeState(upstreamNode)

hasCompDownstream(uuid):
  // DFS — traverse all output wires recursively
  // return true if any path reaches a CompNode
```

**Wire deletion trigger:** double-click within 6px of a wire. Single-click selects (highlights) the wire.

**Files to create/touch:**
- `graph/Wire/wire.js` — wire delete logic
- `graph/Wire/nodeState.js` — cascade algorithm (hasCompDownstream, evaluateNodeState)
- `graph/canvas/input.js` — wire click/double-click detection

**Verification checklist:**
- [x] Clicking within 6px of a wire selects it (wire highlights)
- [x] Double-clicking within 6px of a wire deletes it
- [x] Deleting a data wire only ghosts the upstream node
- [x] Deleting a layer wire cascades ghost upstream correctly
- [x] A node with two comp paths stays alive when one path is broken
- [x] CompNode never goes ghost regardless of wire deletions

---

## PHASE 4 — AE Bridge
*Goal: Node lifecycle events trigger real ExtendScript commands. AE objects are created and destroyed.*

---

### TASK 4.1 — Reserved comp init (ExtendScript) ✅
**What:** `jsx/init.jsx` — creates the Reserved comp and two locked text layers on first node drop.

**ExtendScript function:** `initReservedComp()`

**Steps:**
1. Find or create `"DO NOT DELETE - Procedia"` folder
2. Find or create `"__PROCEDIA_RESERVED__"` comp inside it (1x1px, 1fps, 1 frame — invisible)
3. Find or create text layer `"__PROCEDIA_DATA__"` — lock it, set text to `'{"version":"2.0","ghost":[],"project":{}}'`
4. Find or create text layer `"__PROCEDIA_WIRES__"` — lock it, set text to `'{"version":"2.0","wires":[]}'`
5. Lock the comp itself
6. Return `{ ok: true, data: "initialized" }`

**Called from panel JS:** on the first node drop, before `writeGhostEntry`.

**Files to create/touch:**
- `jsx/init.jsx`
- `bridge/evalBridge.js` — already built

**Verification checklist:**
- [x] After first node drop: `"DO NOT DELETE - Procedia"` folder appears in AE project
- [x] `"__PROCEDIA_RESERVED__"` comp appears inside it
- [x] Two text layers exist inside the comp, both locked
- [x] Both text layers contain valid JSON
- [x] Running `initReservedComp()` twice does not create duplicates
- [x] Panel loads without console errors

---

### TASK 4.2 — writeGhostEntry (ExtendScript) ✅
**What:** `jsx/persistence.jsx` — appends a ghost entry to dataLayer when a node is dropped.

**ExtendScript function:** `writeGhostEntry(uuid, nodeType)`

**Steps:**
1. Read current text from `"__PROCEDIA_DATA__"` layer
2. Parse JSON
3. Check if UUID already exists in ghost list → skip if yes
4. Append `{ "id": uuid, "type": nodeType }` to `ghost` array
5. Unlock layer → write JSON back → re-lock layer
6. Return `{ ok: true }`

**Panel JS calls this:** inside `onDrop`, after graphState.addNode(), only after `initReservedComp()` has been confirmed.

**Files to create/touch:**
- `jsx/persistence.jsx`

**Verification checklist:**
- [x] Dropping a node: ghost entry appears in `"__PROCEDIA_DATA__"` text layer JSON
- [x] Dropping 3 nodes: 3 entries in ghost array, all different UUIDs
- [x] Dropping same UUID twice does not duplicate the entry
- [x] Text layer remains locked after write

---

### TASK 4.3 — makeNodeAlive (ExtendScript) ✅
**What:** `jsx/nodeLifecycle.jsx` — creates AE objects when a node goes alive.

**ExtendScript function:** `makeNodeAlive(uuid, nodeType, hostingCompUUID, propertiesJSON)`

**Steps:**
1. Find hosting comp by UUID (search all CompItems for `.comment === hostingCompUUID`)
2. Switch on `nodeType`:
   - `CompNode`: find or create CompItem, set `.comment = uuid`
   - `SolidNode`: create solid FootageItem, then add as AVLayer
   - `NullNode`: add NullLayer to hosting comp
   - `AdjustmentNode`: add AVLayer, set adjustment flag
   - `TextNode`: add TextLayer to hosting comp
   - `ShapeNode`: add ShapeLayer to hosting comp
3. Set `layer.comment = uuid` on the created layer (this is the UUID link)
4. Apply properties from `propertiesJSON` to the layer using match names
5. Move node entry from ghost list to comp tree in dataLayer JSON
6. Return `{ ok: true, data: { layerIndex: n } }`

**Files to create/touch:**
- `jsx/nodeLifecycle.jsx`

**Verification checklist:**
- [x] Wiring a TextNode to a CompNode: TextLayer appears in the AE comp
- [x] `layer.comment` equals the node UUID
- [x] Node entry moves from ghost list to comp tree in dataLayer JSON
- [ ] Wiring a NullNode: NullLayer appears in AE — needs NullNode registry definition (same pattern as Text.js)
- [ ] Properties from inspector are reflected on the AE layer — deferred to Task 5.1

---

### TASK 4.4 — makeNodeGhost (ExtendScript)
**What:** `jsx/nodeLifecycle.jsx` — deletes AE layer when a node goes ghost.

**ExtendScript function:** `makeNodeGhost(uuid, hostingCompUUID)`

**Steps:**
1. Find hosting comp by UUID
2. Find layer where `layer.comment === uuid`
3. Read all keyframe data from the layer into a JSON structure
4. Delete the layer
5. Move node entry from comp tree back to ghost list in dataLayer JSON — store keyframes in a `keyframes` field on the ghost entry
6. Return `{ ok: true, data: { keyframesJSON: '...' } }`

**Files to create/touch:**
- `jsx/nodeLifecycle.jsx` — add to existing file

**Verification checklist:**
- [ ] Removing wire from alive TextNode: TextLayer disappears from AE comp
- [ ] Node reappears in ghost state on canvas (dim)
- [ ] Ghost entry in dataLayer contains keyframes field
- [ ] Re-wiring the node to a comp: layer is recreated with keyframes restored

---

### TASK 4.5 — updateNodeProperty (ExtendScript) ✅
**What:** `jsx/properties.jsx` — updates a single property on an alive AE layer from inspector input.

**ExtendScript function:** `updateNodeProperty(uuid, hostingCompUUID, propertyMatchName, valueJSON)`

**Steps:**
1. Find hosting comp by UUID
2. Find layer where `layer.comment === uuid`
3. Navigate to property via match name string (e.g. `"ADBE Transform Group"` → `"ADBE Position"`)
4. Parse `valueJSON` and set the property value
5. Update the property in the comp tree in dataLayer JSON
6. Return `{ ok: true }`

**Files to create/touch:**
- `jsx/properties.jsx`

**Verification checklist:**
- [ ] Changing font size in inspector updates the TextLayer in AE immediately — verify in Task 5.1
- [ ] Changing position updates the layer transform in AE — verify in Task 5.1
- [ ] dataLayer JSON reflects the new value after update — verify in Task 5.1
- [ ] Ghost node property change: inspector updates panel memory only, no AE call — verify in Task 5.1

---

## PHASE 5 — Inspector
*Goal: Inspector shows real node properties and writes changes back.*

---

### TASK 5.1 — Inspector node view
**What:** When a node is selected, inspector renders its properties as editable fields.

**Layout per property:**
```
label          [input field]
font size      [72        ]
color          [■ #ffffff  ]
```

**Field types to support:**
- `number` → `<input type="number">`
- `string` → `<input type="text">`
- `color` → color swatch + hex input
- `boolean` → toggle switch

**Header shows:** node type label + state badge (`ghost` / `alive` / `error`)

**On change:** if node is alive → call `updateNodeProperty` via evalBridge → update graphState. If node is ghost → update graphState only.

**Files to create/touch:**
- `inspector/inspector.js`
- `styles/main.css` — inspector field styles

**Verification checklist:**
- [ ] Selecting a TextNode shows its properties (content, fontSize, color)
- [ ] Changing a value on an alive node updates AE immediately
- [ ] Changing a value on a ghost node updates panel memory only
- [ ] State badge shows correct state
- [ ] Selecting a different node updates the inspector immediately

---

### TASK 5.2 — CompNode layer order list
**What:** CompNode inspector shows a drag-to-reorder list of connected input nodes.

**Behavior:**
- Lists all nodes currently wired into the CompNode as layer inputs
- User drags rows to reorder
- On reorder: call `setLayerOrder(hostingCompUUID, orderedUUIDs)` via evalBridge
- ExtendScript calls `layer.moveTo(index)` for each layer (1-based)

**Files to create/touch:**
- `inspector/layerOrderList.js`
- `jsx/properties.jsx` — add `setLayerOrder` function

**Verification checklist:**
- [ ] Selecting a CompNode shows connected layers as a list
- [ ] Dragging to reorder updates AE layer stacking immediately
- [ ] AE layer order matches the list order after reorder
- [ ] List updates when a new node is wired to the comp

---

## PHASE 6 — Polling & Error States
*Goal: Panel detects AE changes made outside Procedia and surfaces errors.*

---

### TASK 6.1 — pollAliveNodes (ExtendScript)
**What:** `jsx/polling.jsx` — checks all alive node UUIDs in one evalScript call.

**ExtendScript function:** `pollAliveNodes(uuidListJSON)`

**Steps:**
1. Parse `uuidListJSON` as array of UUIDs
2. For each UUID: search all CompItems for `.comment === uuid`
3. If found: return current `{ name, width, height, duration, frameRate }`
4. If not found: return `{ missing: true }`
5. Return `{ ok: true, data: [ { uuid, exists, properties } ] }`

**Files to create/touch:**
- `jsx/polling.jsx`

**Verification checklist:**
- [ ] Polling with 3 alive node UUIDs returns 3 results
- [ ] Deleting a comp in AE and polling returns `{ missing: true }` for that UUID
- [ ] Renaming a comp in AE returns updated `name` in properties

---

### TASK 6.2 — Adaptive poller
**What:** `polling/poller.js` — runs `pollAliveNodes` on an adaptive interval.

**Behavior:**
- Track last user activity timestamp via `mousemove` and `keydown` on the panel
- If last activity < 5s ago: poll every 1000ms
- If last activity ≥ 5s ago: poll every 5000ms
- On each tick: collect all alive node UUIDs from `graphState`, call `pollAliveNodes`
- On result:
  - Property changed → update graphState, update inspector if selected
  - `missing: true` → set node state to `error`, call `notificationBar.show()`
- `poller.start()` and `poller.stop()` are exposed for lifecycle management

**Files to create/touch:**
- `polling/poller.js`

**Verification checklist:**
- [ ] Poller starts on panel init
- [ ] Poll interval is 1s when user is active, 5s when idle
- [ ] Deleting a Procedia comp in AE: node shows error badge within one poll cycle
- [ ] Notification bar shows message with node label
- [ ] Renaming a comp in AE: node properties update in panel within one poll cycle

---

### TASK 6.3 — Error state visuals
**What:** Error state renders on the node and in the notification bar.

**Node error visuals:**
- State dot: `#d46e6e` (red)
- Border: red, full opacity, dashed stroke
- Red glow on border (`shadowColor: #d46e6e, shadowBlur: 8`)

**Notification bar message format:**
`"[NodeLabel] — AE object not found. Recreate or delete the node."`

**Files to create/touch:**
- `graph/node.js` — error state render (extend existing drawNode)
- `notifications/notificationBar.js` — already built in 1.6

**Verification checklist:**
- [ ] Error node renders with red dashed border and glow
- [ ] Notification bar message includes node label
- [ ] Multiple errors: notification bar shows the most recent, earlier ones queued
- [ ] Resolving error (deleting node) dismisses its notification

---

## Summary — Task Order

```
PHASE 1 — Shell & Layout ✅
  1.1 Repo structure & manifest           ✅
  1.2 Three-column layout                 ✅
  1.3 Node list panel                     ✅
  1.4 Canvas foundation                   ✅
  1.5 Minimap                             ✅
  1.6 Inspector panel & notification bar  ✅

PHASE 2 — Graph Core ✅
  2.1 Graph state module                  ✅
  2.2 Node registry                       ✅
  2.3 UUID generator                      ✅
  2.4 Node rendering on canvas            ✅
  2.5 Drag node from list to canvas       ✅
  2.6 Node interaction: select, move, delete ✅

PHASE 3 — Wire System
  3.1 evalBridge                          ✅
  3.2 Dynamic port rendering              ✅
  3.3 Wire drawing                        ✅
  3.4 Ghost cascade logic                 ✅

PHASE 4 — AE Bridge
  4.1 Reserved comp init (ExtendScript)   ✅
  4.2 writeGhostEntry                     ✅
  4.3 makeNodeAlive                        ✅
  4.4 makeNodeGhost
  4.5 updateNodeProperty                   ✅

PHASE 5 — Inspector
  5.1 Inspector node view
  5.2 CompNode layer order list

PHASE 6 — Polling & Error States
  6.1 pollAliveNodes (ExtendScript)
  6.2 Adaptive poller
  6.3 Error state visuals
```

**Total: 20 tasks across 6 phases.**
Each task is independently verifiable before the next begins.
AE is not touched until Phase 4. Everything before that is pure panel JS and CSS.

---

*Procedia v2 — Task Breakdown — May 2026*
*This document is consumed by Claude Code. One task at a time. Stop and verify after every task.*
