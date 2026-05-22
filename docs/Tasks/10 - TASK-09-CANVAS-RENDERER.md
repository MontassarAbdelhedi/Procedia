# TASK-09 — viewport.js, renderer.js, and Live Node Card Rendering
*Procedia v4 — Ninth task. Builds on completed TASK-01 through TASK-08.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 11, 12, 13 in full
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 8 and 14 in full
3. `TASK-01-SETUP.md` — Phase 2 (Panel UI Shell) — the node card anatomy, port dot rules, and CSS variable names are already defined there and must be reused exactly

Confirm all files are present at repo root before starting.

---

## Context

Up to this point, all work has been pure JS — graph state, engine logic, cascade. This task makes it visible. When complete, dropping a node from the palette will render a live node card on the canvas driven by real `nodeMap` data. The static placeholder nodes from TASK-01's HTML are replaced by dynamically rendered cards.

**Three files in this task:**

| File | What it builds |
|---|---|
| `graph/canvas/viewport.js` | Pan, zoom, coordinate transforms between screen space and canvas space |
| `graph/canvas/renderer.js` | DOM-based node card rendering. Reads `nodeMap`, creates/updates/removes node card elements. |
| `graph/canvas/input.js` | Partial — node drag-to-reposition only. Wire drawing and port interactions are TASK-10. |

This task does **not** include wire rendering — that is `graph/wire/wireRenderer.js` in TASK-10.

---

## What This Task Does NOT Do

- No wire rendering (`wireRenderer.js` is TASK-10)
- No wire drag interaction (port click/drag is TASK-10)
- No palette drag-to-canvas (`ui/drag.js` is TASK-11)
- No inspector wiring (`ui/inspector.js` is TASK-11)
- No keyboard shortcuts (`ui/keyboard.js` is TASK-11)
- No minimap (`graph/canvas/minimap.js` is a later task)

Files written in this task: `graph/canvas/viewport.js`, `graph/canvas/renderer.js`, `graph/canvas/input.js` (partial — node drag only).

---

## Rendering Strategy — DOM, Not Canvas

Procedia uses **DOM-based rendering** for node cards, not `<canvas>` element drawing. Each node card is a `<div>` element inside `#canvas-viewport`. Wires are SVG paths in `#wire-layer`.

**Why DOM:**
- Node cards have interactive elements (port dots, drag handles, selection)
- CSS handles state visuals (ghost opacity, error pulse, selected glow) without JS redraw loops
- Port dot hit-testing is CSS pointer-events, not manual coordinate math

**The render loop is event-driven, not frame-based.** The renderer does not run on `requestAnimationFrame`. It is called explicitly whenever `nodeMap` changes — after `engine.dropNode`, `engine.deleteNode`, `engine.connectWire`, and `engine.disconnectWire`.

---

## PHASE 1 — `graph/canvas/viewport.js`

### What it is

Manages the pan and zoom state of the canvas. Provides coordinate transform functions between screen space (mouse pixel position) and canvas space (node x/y coordinates in `nodeMap`).

### State

```javascript
var _pan  = { x: 0, y: 0 };   // offset in screen pixels
var _zoom = 1.0;               // scale factor. range: 0.1 to 4.0
```

### Public API

| Function | Signature | Returns | Description |
|---|---|---|---|
| `getTransform` | `()` | `{ pan, zoom }` | Returns current pan and zoom state. |
| `setPan` | `(x, y)` | `void` | Sets pan offset. Applies CSS transform to `#canvas-viewport`. |
| `setZoom` | `(zoom, originX, originY)` | `void` | Sets zoom level clamped to 0.1–4.0. `originX/Y` is the screen-space zoom origin (e.g. mouse position). Adjusts pan to keep origin fixed. |
| `screenToCanvas` | `(screenX, screenY)` | `{ x, y }` | Converts screen pixel coords to canvas node coords. |
| `canvasToScreen` | `(canvasX, canvasY)` | `{ x, y }` | Converts canvas node coords to screen pixel coords. |
| `applyTransform` | `()` | `void` | Writes the current pan/zoom as a CSS transform on `#canvas-viewport`. |
| `reset` | `()` | `void` | Resets pan to `{ 0, 0 }` and zoom to `1.0`. Applies transform. |

### Transform formula

The CSS transform applied to `#canvas-viewport` is:

```
transform: translate({pan.x}px, {pan.y}px) scale({zoom})
transform-origin: 0 0
```

**`screenToCanvas`:**
```
canvasX = (screenX - pan.x) / zoom
canvasY = (screenY - pan.y) / zoom
```

**`canvasToScreen`:**
```
screenX = canvasX * zoom + pan.x
screenY = canvasY * zoom + pan.y
```

**`setZoom` — zoom toward origin:**
```
// Keep the canvas point under the mouse fixed during zoom
canvasOrigin = screenToCanvas(originX, originY)   // before zoom change
_zoom = clamp(newZoom, 0.1, 4.0)
// Recalculate pan so the same canvas point stays under the mouse
_pan.x = originX - canvasOrigin.x * _zoom
_pan.y = originY - canvasOrigin.y * _zoom
applyTransform()
```

### Implementation shape

```javascript
// graph/canvas/viewport.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: graph/canvas/renderer.js

var viewport = (function() {

  var _pan  = { x: 0, y: 0 };
  var _zoom = 1.0;
  var MIN_ZOOM = 0.1;
  var MAX_ZOOM = 4.0;

  function _clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function applyTransform() {
    var el = document.getElementById('canvas-viewport');
    if (!el) return;
    el.style.transform = 'translate(' + _pan.x + 'px, ' + _pan.y + 'px) scale(' + _zoom + ')';
  }

  function getTransform()  { return { pan: { x: _pan.x, y: _pan.y }, zoom: _zoom }; }
  function setPan(x, y)    { _pan.x = x; _pan.y = y; applyTransform(); }
  function reset()         { _pan = { x: 0, y: 0 }; _zoom = 1.0; applyTransform(); }

  function screenToCanvas(screenX, screenY) {
    return { x: (screenX - _pan.x) / _zoom, y: (screenY - _pan.y) / _zoom };
  }

  function canvasToScreen(canvasX, canvasY) {
    return { x: canvasX * _zoom + _pan.x, y: canvasY * _zoom + _pan.y };
  }

  function setZoom(newZoom, originX, originY) {
    // zoom-to-origin logic — see formula above
  }

  return {
    getTransform:   getTransform,
    setPan:         setPan,
    setZoom:        setZoom,
    screenToCanvas: screenToCanvas,
    canvasToScreen: canvasToScreen,
    applyTransform: applyTransform,
    reset:          reset
  };

})();
```

Fill `setZoom` completely. Everything else is provided — copy it exactly.

---

### Phase 1 verification — browser console

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  viewport.reset();

  // Initial state
  var t = viewport.getTransform();
  assert('initial pan is 0,0',   t.pan.x === 0 && t.pan.y === 0);
  assert('initial zoom is 1.0',  t.zoom === 1.0);

  // screenToCanvas at identity transform
  var c = viewport.screenToCanvas(100, 200);
  assert('screenToCanvas identity: x', c.x === 100);
  assert('screenToCanvas identity: y', c.y === 200);

  // canvasToScreen at identity transform
  var s = viewport.canvasToScreen(100, 200);
  assert('canvasToScreen identity: x', s.x === 100);
  assert('canvasToScreen identity: y', s.y === 200);

  // setPan then screenToCanvas
  viewport.setPan(50, 100);
  var c2 = viewport.screenToCanvas(150, 300);
  assert('screenToCanvas with pan: x', c2.x === 100);
  assert('screenToCanvas with pan: y', c2.y === 200);

  // canvasToScreen with pan
  var s2 = viewport.canvasToScreen(100, 200);
  assert('canvasToScreen with pan: x', s2.x === 150);
  assert('canvasToScreen with pan: y', s2.y === 300);

  // setZoom clamping
  viewport.reset();
  viewport.setZoom(10, 0, 0);
  assert('zoom clamped to MAX 4.0', viewport.getTransform().zoom === 4.0);
  viewport.setZoom(-1, 0, 0);
  assert('zoom clamped to MIN 0.1', viewport.getTransform().zoom === 0.1);

  // setZoom toward origin — canvas point under mouse stays fixed
  viewport.reset();
  viewport.setZoom(2.0, 400, 300); // zoom to 2x with origin at screen 400,300
  var t2 = viewport.getTransform();
  // At zoom=2, origin at canvas 400,300 (identity pan=0):
  // pan.x = 400 - 400 * 2 = -400
  // pan.y = 300 - 300 * 2 = -300
  assert('zoom-to-origin pan.x correct', t2.pan.x === -400);
  assert('zoom-to-origin pan.y correct', t2.pan.y === -300);
  // The canvas point 400,300 should still map to screen 400,300
  var screenCheck = viewport.canvasToScreen(400, 300);
  assert('canvas origin stays at screen origin after zoom', 
    Math.abs(screenCheck.x - 400) < 0.01 && Math.abs(screenCheck.y - 300) < 0.01);

  viewport.reset();

  console.log('---');
  console.log('viewport:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before Phase 2.**

**STOP. Paste console output. Wait for confirmation.**

---

## PHASE 2 — `graph/canvas/renderer.js`

### What it is

Reads `nodeMap` and maintains a corresponding set of DOM elements inside `#canvas-viewport`. When `nodeMap` changes, `renderer.render()` is called to reconcile the DOM — adding new node cards, updating existing ones, and removing deleted ones.

### Rendering model — reconciliation

The renderer maintains an internal map: `{ nodeId: domElement }`. On each `render()` call:

1. For each node in `nodeMap` — if no DOM element exists, create one. If one exists, update it.
2. For each DOM element in the internal map — if its nodeId is no longer in `nodeMap`, remove the element and delete the map entry.

This is a minimal reconciliation — not a virtual DOM. It is sufficient for Procedia's node counts (typically under 50 nodes per graph).

### Public API

| Function | Signature | Description |
|---|---|---|
| `render` | `()` | Full reconciliation pass. Call after any structural change to `nodeMap`. |
| `updateNode` | `(nodeId)` | Updates a single node card's content and state classes. Call after `updateProp` or state change. |
| `removeNode` | `(nodeId)` | Removes a single node card from the DOM immediately. |
| `getNodeElement` | `(nodeId)` | Returns the DOM element for a given node UUID, or `null`. |

### Node card DOM structure

Every node card must use this exact structure and class names. These must match the CSS defined in `panel.css` from TASK-01.

```html
<div class="node [nodeKind] [state] [selected?]" 
     data-node-id="{uuid}" 
     style="left: {x}px; top: {y}px;">

  <div class="node-header">
    <div class="node-cat-bar" style="background: var(--cat-{categoryToken})"></div>
    <span class="node-label">{label}</span>
    <div class="node-state-dot"></div>
  </div>

  <div class="node-body">
    <!-- one .node-param div per param, built from def.params -->
    <div class="node-param">
      <span class="node-param-key">{param.label}</span>
      <span class="node-param-value [is-wired?]">{displayValue}</span>
    </div>
  </div>

  <!-- Input ports — one per slot in portSlots, left edge -->
  <div class="ports-input">
    <!-- layer_in_0, layer_in_1, ... -->
    <div class="port-dot [type] [empty?]" 
         data-node-id="{uuid}" 
         data-port-id="{slotName}">
    </div>
  </div>

  <!-- Output port — right edge (if node has output port) -->
  <div class="ports-output">
    <div class="port-dot [type]" 
         data-node-id="{uuid}" 
         data-port-id="output">
    </div>
  </div>

  <!-- Parent ports — top and bottom edges (if node has parent ports) -->
  <div class="port-parent-top">
    <div class="port-dot parent" 
         data-node-id="{uuid}" 
         data-port-id="child_of">
    </div>
  </div>
  <div class="port-parent-bottom">
    <div class="port-dot parent" 
         data-node-id="{uuid}" 
         data-port-id="parent_of">
    </div>
  </div>

</div>
```

### Category token mapping

Maps `node.category` to the CSS variable suffix:

| category | token |
|---|---|
| `'Core'` | `core` |
| `'Layers'` | `layers` |
| `'Effects'` | `effects` |
| `'Data'` | `data` |
| `'Utility'` | `utility` |

### State class rules

| Condition | Class added to `.node` |
|---|---|
| `node.state === 'alive'` | `alive` |
| `node.state === 'ghost'` | `ghost` |
| `node.state === 'error'` | `error` |
| `graphState.getSelection() === node.id` | `selected` |

### Port rendering rules

**Input ports** — built from the node definition's ports array combined with `portSlots`:
- For each extendable input port: render `portSlots[portId]` number of dot elements
  - Slots 0 through `portSlots[portId] - 2` are filled (type class = port type)
  - The last slot (`portSlots[portId] - 1`) is the open slot — add class `empty`
- For non-extendable input ports: render exactly one dot with the port's type class

**Output port** — one dot, type class from port definition. Only if the node has a port with `category: 'output'`.

**Parent ports** — only if the node definition has a port with `id: 'child_of'` and/or `id: 'parent_of'`.
- `child_of` → `.port-parent-top` wrapper
- `parent_of` → `.port-parent-bottom` wrapper

**`data-node-id` and `data-port-id`** must be set on every port dot. These are used by the wire interaction system in TASK-10 to identify which port was clicked.

### Param display values

| param type | display format |
|---|---|
| `string` | raw value, truncated at 18 chars with `…` |
| `number` | value as-is (e.g. `72`, `100`) |
| `color` | a 14×10px inline swatch div + hex string |
| `vector2` | `{x}, {y}` format (e.g. `960, 540`) |

**Wired params:** A param is wired if any wire in `wireMap` has `toNode === nodeId` AND `boundParam === param.key`. If wired, add class `is-wired` to the `.node-param-value` span — the CSS handles the yellow color and dot indicator.

### Implementation shape

```javascript
// graph/canvas/renderer.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: index.js

var renderer = (function() {

  var _nodeElements = {}; // { nodeId: domElement }

  var _categoryTokens = {
    'Core':    'core',
    'Layers':  'layers',
    'Effects': 'effects',
    'Data':    'data',
    'Utility': 'utility'
  };

  function _getViewport() {
    return document.getElementById('canvas-viewport');
  }

  function _isParamWired(nodeId, paramKey) {
    // scan wireMap for wire where toNode === nodeId AND boundParam === paramKey
  }

  function _formatParamValue(param, value) {
    // return display string or element based on param type
    // color: return a swatch + hex string
    // vector2: return 'x, y'
    // string: truncate at 18 chars
    // number: return String(value)
  }

  function _buildPortsInput(nodeId, def, nodeData) {
    // build and return the .ports-input div element
    // use def.ports and nodeData.portSlots
  }

  function _buildPortsOutput(nodeId, def) {
    // build and return the .ports-output div element (or null if no output port)
  }

  function _buildParentPorts(nodeId, def) {
    // build and return { top: element|null, bottom: element|null }
    // based on child_of and parent_of port presence in def.ports
  }

  function _buildNodeCard(nodeId, nodeData, def) {
    // create and return the complete node card div element
    // use the DOM structure specified above
  }

  function _updateNodeCard(el, nodeId, nodeData, def) {
    // update an existing node card element in place
    // update: position (left/top), state classes, label, param values, port slots
    // do not recreate the element — update its contents
  }

  function _getStateClasses(nodeData) {
    var classes = ['node', nodeData.nodeKind];
    classes.push(nodeData.state);
    if (graphState.getSelection() === nodeData.id) classes.push('selected');
    return classes.join(' ');
  }

  function render() {
    var vp = _getViewport();
    if (!vp) return;
    var nodes = graphState.getAllNodes();

    // Remove deleted nodes
    for (var id in _nodeElements) {
      if (!nodes[id]) {
        removeNode(id);
      }
    }

    // Add new or update existing
    for (var nodeId in nodes) {
      var nodeData = nodes[nodeId];
      var def = nodeRegistry.getDefinition(nodeData.type);
      if (!def) continue;

      if (_nodeElements[nodeId]) {
        _updateNodeCard(_nodeElements[nodeId], nodeId, nodeData, def);
      } else {
        var el = _buildNodeCard(nodeId, nodeData, def);
        vp.appendChild(el);
        _nodeElements[nodeId] = el;
      }
    }
  }

  function updateNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;
    if (_nodeElements[nodeId]) {
      _updateNodeCard(_nodeElements[nodeId], nodeId, nodeData, def);
    }
  }

  function removeNode(nodeId) {
    var el = _nodeElements[nodeId];
    if (el && el.parentNode) el.parentNode.removeChild(el);
    delete _nodeElements[nodeId];
  }

  function getNodeElement(nodeId) {
    return _nodeElements[nodeId] || null;
  }

  return {
    render:         render,
    updateNode:     updateNode,
    removeNode:     removeNode,
    getNodeElement: getNodeElement
  };

})();
```

Fill every private function completely. The `render`, `updateNode`, `removeNode`, and `getNodeElement` functions are provided — do not change their signatures or return values.

---

### Phase 2 verification

This phase is verified visually in the browser, not with a console test script.

**Steps:**

1. Temporarily add this block to the bottom of `index.html`, just before `</body>`:

```html
<script>
(function devBootstrap() {
  graphState.clearGraph();

  // Register nodes (they self-register on load — just verify they're there)
  var types = nodeRegistry.listTypes();
  console.log('[dev] registered node types:', types);

  // Drop a text node
  var n1 = engine.dropNode('layers/text', 120, 140);
  console.log('[dev] dropped text node:', n1 && n1.id);

  // Drop a comp node
  var n2 = engine.dropNode('core/comp', 400, 140);
  console.log('[dev] dropped comp node:', n2 && n2.id);

  // Drop a null node
  var n3 = engine.dropNode('layers/null', 120, 320);
  console.log('[dev] dropped null node:', n3 && n3.id);

  // Render
  renderer.render();

  console.log('[dev] render complete. Check canvas for 3 node cards.');
})();
</script>
```

2. Open `index.html` in a browser tab. Reload.

**Visual checklist:**
- [ ] Three node cards are visible on the canvas (Text, Comp, Null)
- [ ] Each card shows the correct header color accent for its category (blue for Layers, purple for Core)
- [ ] Each card shows param key-value pairs in the body
- [ ] Text node shows `ghost` visual (dimmed, dashed border) — it has no comp path yet
- [ ] Comp node shows `alive` visual (state dot glows green) — CompNode goes alive on drop
- [ ] Null node shows `ghost` visual
- [ ] Input port dots are visible on the Comp node's left edge (extendable `layer_in` slot)
- [ ] Output port dots are visible on the right edge of Text and Null nodes
- [ ] Parent port dots (green squares) are visible on top/bottom edges of Text and Null nodes
- [ ] No console errors

3. Remove the `devBootstrap` script block after verification.

**STOP. Describe what you see. Wait for confirmation before Phase 3.**

---

## PHASE 3 — `graph/canvas/input.js` — node drag to reposition

### What it is

Handles mouse events on the canvas for the single interaction in scope for this task: **dragging a node card to reposition it on the canvas**.

Wire interactions (port click, wire drag) are TASK-10. Canvas pan (middle mouse / space+drag) and zoom (scroll wheel) are also implemented here but in Phase 4.

### Node drag algorithm

```
On mousedown on a .node element (but NOT on a .port-dot):

1. Record the starting mouse position in canvas space:
   dragStartCanvas = viewport.screenToCanvas(e.clientX, e.clientY)

2. Record the node's starting position:
   nodeStartPos = { x: nodeData.x, y: nodeData.y }

3. Set dragState = { active: true, nodeId, dragStartCanvas, nodeStartPos }

4. Select the node: graphState.setSelection(nodeId)
   renderer.updateNode(nodeId) — refresh selection class

On mousemove (when drag is active):

1. currentCanvas = viewport.screenToCanvas(e.clientX, e.clientY)
2. dx = currentCanvas.x - dragState.dragStartCanvas.x
   dy = currentCanvas.y - dragState.dragStartCanvas.y
3. newX = dragState.nodeStartPos.x + dx
   newY = dragState.nodeStartPos.y + dy
4. graphState.updateNode(dragState.nodeId, { x: newX, y: newY })
5. Update the node card's CSS directly (do not call renderer.render() — too slow):
   el.style.left = newX + 'px'
   el.style.top  = newY + 'px'

On mouseup:

1. Clear dragState.active = false
2. No graphState call needed — position was already updated in mousemove
```

**Important:** During drag, update the DOM directly via `el.style.left/top`. Do not call `renderer.render()` on every mousemove — it would recreate the DOM and lose the drag state.

**Mousedown target detection:**

```javascript
// Check if the click was on a node (but not on a port dot)
var target = e.target;
var nodeEl = null;
var portEl = null;

// Walk up the DOM to find .node and check for .port-dot
while (target && target !== document.getElementById('canvas-viewport')) {
  if (target.classList.contains('port-dot')) { portEl = target; break; }
  if (target.classList.contains('node')) { nodeEl = target; break; }
  target = target.parentElement;
}
// If portEl found — this is a port interaction (handled in TASK-10), skip drag
// If nodeEl found — start drag
```

### Canvas click to deselect

Clicking on the canvas background (not on any node or port) clears selection:

```javascript
// In mousedown handler, if no nodeEl and no portEl found:
graphState.setSelection(null);
renderer.render(); // refresh selection on all nodes
```

### Implementation shape

```javascript
// graph/canvas/input.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js, graph/canvas/renderer.js
// MUST LOAD BEFORE: index.js

var canvasInput = (function() {

  var _dragState = {
    active:           false,
    nodeId:           null,
    dragStartCanvas:  null,
    nodeStartPos:     null
  };

  function _onMouseDown(e) {
    // detect node vs port vs background
    // start drag or deselect
  }

  function _onMouseMove(e) {
    // if drag active: update position
  }

  function _onMouseUp(e) {
    // end drag
  }

  function init() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    wrap.addEventListener('mousedown', _onMouseDown);
    wrap.addEventListener('mousemove', _onMouseMove);
    wrap.addEventListener('mouseup',   _onMouseUp);
  }

  return { init: init };

})();
```

Fill `_onMouseDown`, `_onMouseMove`, `_onMouseUp` completely from the algorithm above.

---

### Phase 3 verification

Add a temporary test to the dev bootstrap script and test manually in the browser:

**Checklist:**
- [ ] Clicking a node card selects it — selected glow appears (blue border)
- [ ] Clicking and dragging a node card moves it on the canvas smoothly
- [ ] After drag, the node's new position persists (check `graphState.getNode(id).x`)
- [ ] Clicking canvas background deselects the node
- [ ] Clicking on a port dot does not start a drag (wire interaction TASK-10)
- [ ] Dragging near canvas edges does not break layout

**STOP. Describe what you see. Wait for confirmation before Phase 4.**

---

## PHASE 4 — Canvas pan and zoom (add to `input.js`)

### Pan — middle mouse button drag or Space + left drag

```
On mousedown:
  if e.button === 1 (middle mouse) OR (e.button === 0 AND spacebarHeld):
    panState = { active: true, startScreen: { x: e.clientX, y: e.clientY },
                 startPan: viewport.getTransform().pan }
    e.preventDefault()

On mousemove (when panState.active):
  dx = e.clientX - panState.startScreen.x
  dy = e.clientY - panState.startScreen.y
  viewport.setPan(panState.startPan.x + dx, panState.startPan.y + dy)

On mouseup:
  panState.active = false
```

Track spacebar state:

```javascript
var _spaceHeld = false;
document.addEventListener('keydown', function(e) { if (e.code === 'Space') _spaceHeld = true; });
document.addEventListener('keyup',   function(e) { if (e.code === 'Space') _spaceHeld = false; });
```

### Zoom — scroll wheel

```
On wheel event on #canvas-wrap:
  e.preventDefault()
  var delta = e.deltaY > 0 ? 0.9 : 1.1   // scroll down = zoom out, up = zoom in
  var currentZoom = viewport.getTransform().zoom
  viewport.setZoom(currentZoom * delta, e.clientX, e.clientY)
```

Add wheel listener in `init()`:
```javascript
wrap.addEventListener('wheel', _onWheel, { passive: false });
```

---

### Phase 4 verification — manual browser check

**Checklist:**
- [ ] Scroll wheel zooms in and out, centered on the mouse cursor position
- [ ] Middle mouse drag pans the canvas
- [ ] Space + left mouse drag pans the canvas
- [ ] Zooming in past 4× is clamped
- [ ] Zooming out past 10% is clamped
- [ ] Node positions are stable during pan and zoom (they move correctly with the viewport transform)
- [ ] After pan/zoom, node drag still works correctly in the new coordinate space

**STOP. Describe what you see. Wait for confirmation.**

---

## Wiring the renderer into the engine

After completing all four phases, add `renderer.render()` calls to `engine.js` at the end of each state-mutating function:

- `dropNode` — add `renderer.render()` after `graphState.addNode(nodeData)`
- `deleteNode` — add `renderer.render()` after `graphState.removeNode(nodeId)`
- `connectWire` — add `renderer.render()` after `graphState.addWire(wireData)`
- `disconnectWire` — add `renderer.render()` after `cascadeAlgorithm.cascadeGhost(wireId)` resolves

Also wire selection changes to the renderer. In `graphState.onSelectionChange`, register a callback:

```javascript
// In index.js (or at the bottom of renderer.js init):
graphState.onSelectionChange(function(uuid) {
  renderer.render(); // reapply selected class across all nodes
});
```

---

## Additional Rules for This Task

**Never call `renderer.render()` inside a drag mousemove handler.** Render is for reconciling `nodeMap` with the DOM — it creates/removes elements. During drag, only update `el.style.left` and `el.style.top` directly. Calling `render()` on every mouse move would tear the drag state.

**`data-node-id` and `data-port-id` on every port dot are mandatory.** TASK-10's wire system reads these attributes to know which node and port the user clicked. If they are missing, wire drawing will not work.

**`_isParamWired` scans `wireMap` at render time.** It reads `graphState.getAllWires()` and checks `wire.boundParam === paramKey`. This means wired param highlighting is always current as of the last render call — no separate wired state tracking needed.

**Do not use `innerHTML` for node card construction.** Build the DOM using `document.createElement` and `appendChild`. `innerHTML` makes `data-*` attribute setting error-prone and is harder to update incrementally.

**Color param display:** For a `color` type param, create a small `<div>` element with `class="node-param-swatch"` and inline `background` set to the CSS rgb value. Append the swatch before the hex string in the `.node-param-value` span.

**No ES6+.** `var`, named functions, `for...in` loops throughout.

---

## On Completion

When all phase checklists pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-09 COMPLETE

graph/canvas/viewport.js    ✅  [N console tests passed]
graph/canvas/renderer.js    ✅  [visual verification passed]
graph/canvas/input.js       ✅  [visual verification passed]

engine.js updated: renderer.render() calls added.
graphState.onSelectionChange wired to renderer.render().

Next task: TASK-10 — wire drawing and port interaction
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-09-CANVAS-RENDERER.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 11, 12, 13 — PROCEDIA-V4-ARCHITECTURE.md Sections 8 and 14 — TASK-01-SETUP.md Phase 2*
