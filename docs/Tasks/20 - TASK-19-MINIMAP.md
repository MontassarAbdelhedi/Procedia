# TASK-19 — graph/canvas/minimap.js
*Procedia v4 — Nineteenth task. Builds on completed TASK-01 through TASK-18.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 11, 12, 13 in full
2. `TASK-09-CANVAS-RENDERER.md` — viewport coordinate transform formulas (Phase 1)
3. `TASK-01-SETUP.md` — CSS design tokens (Phase 2, Design tokens section)

Confirm all files are present at repo root before starting.

---

## Context

The minimap is a small thumbnail view of the entire node graph, fixed in the bottom-right corner of the canvas. It serves two purposes:

1. **Orientation** — shows the full graph at a glance, with the visible viewport region highlighted as a white rectangle overlay
2. **Navigation** — clicking or dragging on the minimap pans the main viewport to that region

The minimap renders using an HTML5 `<canvas>` element (not DOM nodes — the graph can have many nodes and canvas 2D drawing is faster for thumbnails). It is redrawn on every `renderer.render()` call and on every viewport pan/zoom.

**One file:** `graph/canvas/minimap.js`

**One HTML addition** to `index.html` — the minimap `<canvas>` element inside `#canvas-wrap`.

**One CSS addition** to `panel.css` — minimap positioning and styling.

---

## What This Task Does NOT Do

- No new node definitions
- No graph state changes
- No persistence changes
- No inspector changes

---

## Minimap Specification

### Size and position

- Fixed size: **160px × 100px**
- Position: bottom-right corner of `#canvas-wrap`, with 12px margin from edges
- Background: `#111116` (slightly lighter than canvas bg)
- Border: 1px solid `var(--panel-border)`
- Border-radius: 6px
- `pointer-events: all` — the minimap captures mouse events for navigation

### What it draws

The minimap draws a scaled-down representation of the node graph:

1. **Background** — fill the minimap canvas with `#111116`
2. **Node rectangles** — one small filled rectangle per node in `nodeMap`
   - Color by state: alive = `#06D6A0` (state-alive), ghost = `#3E3E52` (state-ghost), error = `#FF4A6A` (state-error)
   - Size: proportional to node card size in canvas space, scaled down to minimap space
   - Position: derived from `nodeData.x` and `nodeData.y`
3. **Viewport rectangle** — a white semi-transparent rectangle showing the currently visible region
   - Stroke: `rgba(255, 255, 255, 0.5)`, 1px
   - Fill: `rgba(255, 255, 255, 0.05)`

### Coordinate spaces

The minimap has its own coordinate system. Three spaces are involved:

**Canvas space** — `nodeData.x` and `nodeData.y`. Where nodes live. Potentially infinite extent.

**Minimap space** — pixels on the minimap `<canvas>`. 0–160 horizontal, 0–100 vertical.

**Screen space** — browser pixels. Used for mouse events.

**Computing the transform from canvas to minimap:**

```
1. Find the bounding box of all nodes in canvas space:
   minX = min(nodeData.x) for all nodes
   minY = min(nodeData.y) for all nodes
   maxX = max(nodeData.x + NODE_WIDTH) for all nodes   // NODE_WIDTH = 180
   maxY = max(nodeData.y + NODE_HEIGHT) for all nodes  // NODE_HEIGHT ≈ 120 (estimate)

2. Add 40px padding on all sides:
   boundsX = minX - 40
   boundsY = minY - 40
   boundsW = (maxX - minX) + 80
   boundsH = (maxY - minY) + 80

3. Scale factor:
   scaleX = MINIMAP_W / boundsW   // MINIMAP_W = 160
   scaleY = MINIMAP_H / boundsH   // MINIMAP_H = 100
   scale  = Math.min(scaleX, scaleY)  // uniform scale — preserve aspect ratio

4. Offset to center the graph in the minimap:
   offsetX = (MINIMAP_W - boundsW * scale) / 2
   offsetY = (MINIMAP_H - boundsH * scale) / 2

canvasToMinimap(cx, cy):
   mx = (cx - boundsX) * scale + offsetX
   my = (cy - boundsY) * scale + offsetY
   return { x: mx, y: my }
```

**Empty graph:** If `nodeMap` has no nodes, draw only the background. No error.

**Drawing the viewport rectangle:**

```
The viewport rectangle in canvas space:

viewLeft   = -pan.x / zoom
viewTop    = -pan.y / zoom
viewRight  = viewLeft  + (canvasWrapWidth  / zoom)
viewBottom = viewTop   + (canvasWrapHeight / zoom)

Convert all four corners to minimap space using canvasToMinimap().
Draw as a rectangle in minimap space.
Clamp to minimap bounds — the viewport may extend beyond the graph bounds.
```

---

## PHASE 1 — Add minimap HTML to `index.html`

Inside `#canvas-wrap`, after `#canvas-viewport`, add:

```html
<canvas id="minimap-canvas" width="160" height="100"></canvas>
```

The canvas element size is set via HTML attributes (not CSS) to match the 2D drawing context resolution.

---

## PHASE 2 — Add minimap CSS to `panel.css`

```css
#minimap-canvas {
  position:      absolute;
  bottom:        12px;
  right:         12px;
  width:         160px;
  height:        100px;
  background:    #111116;
  border:        1px solid var(--panel-border);
  border-radius: 6px;
  pointer-events: all;
  cursor:        crosshair;
  z-index:       50;
}
```

---

## PHASE 3 — `graph/canvas/minimap.js`

### Public API

```javascript
var minimap = (function() {

  function render() {
    // Full minimap redraw. Called after every renderer.render() and viewport change.
  }

  function init() {
    // Attach mouse event listeners to #minimap-canvas for click-to-pan.
  }

  return { render: render, init: init };

})();
```

### Constants

```javascript
var MINIMAP_W      = 160;
var MINIMAP_H      = 100;
var NODE_WIDTH     = 180;   // node card width in canvas space
var NODE_HEIGHT    = 120;   // approximate node card height in canvas space
var PADDING        = 40;    // graph bounds padding in canvas space
```

### `render()` — full algorithm

```
render():

1. canvas = document.getElementById('minimap-canvas')
   If not found: return.
   ctx = canvas.getContext('2d')

2. Clear: ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H)

3. Background: ctx.fillStyle = '#111116'; ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H)

4. Compute graph bounding box from nodeMap:
   nodes = graphState.getAllNodes()
   nodeCount = 0
   minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
   for each node in nodes:
     nodeCount++
     minX = Math.min(minX, node.x)
     minY = Math.min(minY, node.y)
     maxX = Math.max(maxX, node.x + NODE_WIDTH)
     maxY = Math.max(maxY, node.y + NODE_HEIGHT)

   If nodeCount === 0: draw viewport rect (step 7) and return.

5. Compute transform:
   boundsX = minX - PADDING
   boundsY = minY - PADDING
   boundsW = (maxX - minX) + PADDING * 2
   boundsH = (maxY - minY) + PADDING * 2
   scale   = Math.min(MINIMAP_W / boundsW, MINIMAP_H / boundsH)
   offsetX = (MINIMAP_W - boundsW * scale) / 2
   offsetY = (MINIMAP_H - boundsH * scale) / 2

6. Draw node rectangles:
   for each node in nodes:
     mx = (node.x - boundsX) * scale + offsetX
     my = (node.y - boundsY) * scale + offsetY
     mw = NODE_WIDTH  * scale
     mh = NODE_HEIGHT * scale

     Set fill color by state:
       alive  → '#06D6A0'
       error  → '#FF4A6A'
       ghost  → '#3E3E52'

     ctx.globalAlpha = (node.state === 'ghost') ? 0.4 : 0.85
     ctx.fillStyle   = stateColor
     ctx.fillRect(mx, my, Math.max(mw, 2), Math.max(mh, 2))
     ctx.globalAlpha = 1

     Selected node — draw a thin blue outline:
     if graphState.getSelection() === node.id:
       ctx.strokeStyle = '#5555AA'
       ctx.lineWidth   = 1
       ctx.strokeRect(mx, my, Math.max(mw, 2), Math.max(mh, 2))

7. Draw viewport rectangle:
   t = viewport.getTransform()
   pan  = t.pan
   zoom = t.zoom

   canvasWrap = document.getElementById('canvas-wrap')
   wrapW = canvasWrap ? canvasWrap.clientWidth  : 800
   wrapH = canvasWrap ? canvasWrap.clientHeight : 600

   viewLeft   = -pan.x / zoom
   viewTop    = -pan.y / zoom
   viewRight  = viewLeft  + wrapW / zoom
   viewBottom = viewTop   + wrapH / zoom

   If nodeCount > 0:
     vx = (viewLeft  - boundsX) * scale + offsetX
     vy = (viewTop   - boundsY) * scale + offsetY
     vw = (viewRight  - viewLeft)  * scale
     vh = (viewBottom - viewTop)   * scale
   Else:
     Use fixed default: vx=0, vy=0, vw=MINIMAP_W, vh=MINIMAP_H

   ctx.fillStyle   = 'rgba(255, 255, 255, 0.05)'
   ctx.fillRect(vx, vy, vw, vh)
   ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
   ctx.lineWidth   = 1
   ctx.strokeRect(vx, vy, vw, vh)
```

### `init()` — click and drag to pan

```
init():

1. canvas = document.getElementById('minimap-canvas')
   If not found: return.

2. var _panning = false

3. canvas.addEventListener('mousedown', function(e) {
     _panning = true
     _panToMinimap(e)
     e.stopPropagation()   // don't trigger canvas drag
   })

4. canvas.addEventListener('mousemove', function(e) {
     if (!_panning) return
     _panToMinimap(e)
   })

5. document.addEventListener('mouseup', function() { _panning = false })

_panToMinimap(e):
  Get canvas element bounding rect
  mmX = e.clientX - rect.left   // minimap-local X, 0–160
  mmY = e.clientY - rect.top    // minimap-local Y, 0–100

  Convert minimap coords back to canvas space:
  (invert the transform from render step 5)

  If nodeCount is 0 (no graph): return

  Recompute bounds (same as render step 4-5):
  canvasX = (mmX - offsetX) / scale + boundsX
  canvasY = (mmY - offsetY) / scale + boundsY

  Center the viewport on this canvas point:
  canvasWrap = document.getElementById('canvas-wrap')
  t = viewport.getTransform()
  newPanX = -(canvasX * t.zoom) + canvasWrap.clientWidth  / 2
  newPanY = -(canvasY * t.zoom) + canvasWrap.clientHeight / 2
  viewport.setPan(newPanX, newPanY)

  Redraw minimap to update viewport rectangle:
  minimap.render()
```

**Note on `_panToMinimap` state:** The bounds and transform computed in `render()` must be accessible to `_panToMinimap`. Store them as module-level variables updated on each `render()` call:

```javascript
var _lastBounds = null;    // { boundsX, boundsY, boundsW, boundsH, scale, offsetX, offsetY }
var _lastNodeCount = 0;
```

Update `_lastBounds` and `_lastNodeCount` at the end of every `render()` call. Use them in `_panToMinimap` without recomputing.

---

### Complete implementation shape

```javascript
// graph/canvas/minimap.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: index.js

var minimap = (function() {

  var MINIMAP_W  = 160;
  var MINIMAP_H  = 100;
  var NODE_WIDTH = 180;
  var NODE_HEIGHT= 120;
  var PADDING    = 40;

  var _lastBounds    = null;
  var _lastNodeCount = 0;
  var _panning       = false;

  function _computeBounds(nodes) {
    // returns { boundsX, boundsY, boundsW, boundsH, scale, offsetX, offsetY, nodeCount }
  }

  function _canvasToMinimap(cx, cy, bounds) {
    // returns { x, y } in minimap space
  }

  function render() {
    // see full algorithm above — updates _lastBounds and _lastNodeCount
  }

  function _panToMinimap(e) {
    // see click-to-pan algorithm above — uses _lastBounds
  }

  function init() {
    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) { console.warn('[minimap] canvas element not found'); return; }
    var _panning = false;

    canvas.addEventListener('mousedown', function(e) {
      _panning = true;
      _panToMinimap(e);
      e.stopPropagation();
    });
    canvas.addEventListener('mousemove', function(e) {
      if (!_panning) return;
      _panToMinimap(e);
    });
    document.addEventListener('mouseup', function() { _panning = false; });
  }

  return { render: render, init: init };

})();
```

Fill `_computeBounds`, `_canvasToMinimap`, `render`, and `_panToMinimap` completely from the algorithms above.

---

## PHASE 4 — Wire minimap into `index.js` and `engine.js`

### In `index.js` — add `minimap.init()` to initialization

Add after `canvasInput.init()`:

```javascript
minimap.init();
```

Add to the consolidated selection change callback:

```javascript
graphState.onSelectionChange(function(uuid) {
  renderer.render();
  wireRenderer.render();
  inspector.renderInspector(uuid);
  minimap.render();              // ← add this line
});
```

### In `engine.js` — add `minimap.render()` after every structural change

Add `minimap.render()` at the end of each of these functions, after the existing `renderer.render()` and `wireRenderer.render()` calls:

- `dropNode` — after `renderer.render()`
- `deleteNode` — after `renderer.render()`
- `connectWire` — after `wireRenderer.render()`
- `disconnectWire` — after `wireRenderer.render()`

### In `graph/canvas/viewport.js` — add minimap re-render after pan/zoom

Add `minimap.render()` at the end of `applyTransform()`:

```javascript
function applyTransform() {
  var el = document.getElementById('canvas-viewport');
  if (!el) return;
  el.style.transform = 'translate(' + _pan.x + 'px, ' + _pan.y + 'px) scale(' + _zoom + ')';
  if (typeof minimap !== 'undefined') minimap.render();  // guard for load order
}
```

The `typeof minimap !== 'undefined'` guard prevents errors during the initial load before `minimap.js` is evaluated.

---

## PHASE 5 — Verification

### Console test — browser

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  assert('minimap exists',          typeof minimap === 'object');
  assert('minimap.render function', typeof minimap.render === 'function');
  assert('minimap.init function',   typeof minimap.init === 'function');

  // render does not throw on empty graph
  graphState.clearGraph();
  var noThrow = true;
  try { minimap.render(); } catch(e) { noThrow = false; }
  assert('render no-throw on empty graph', noThrow);

  // canvas element exists
  var canvas = document.getElementById('minimap-canvas');
  assert('minimap-canvas element exists',   canvas !== null);
  assert('minimap-canvas width is 160',     canvas && canvas.width === 160);
  assert('minimap-canvas height is 100',    canvas && canvas.height === 100);

  // render with nodes — no throw
  graphState.addNode({ id: 'N-MM1', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 100, y: 100,
    props: { label: 'T' }, hostingComps: [], portSlots: {} });
  graphState.addNode({ id: 'N-MM2', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 400, y: 100,
    props: { label: 'C' }, hostingComps: [], portSlots: {} });

  var noThrow2 = true;
  try { minimap.render(); } catch(e) { noThrow2 = false; }
  assert('render no-throw with nodes', noThrow2);

  graphState.clearGraph();

  console.log('---');
  console.log('minimap:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before visual verification.**

**STOP. Paste console output. Wait for confirmation.**

---

### Visual verification — browser

1. Drop several nodes on the canvas (Text, Comp, Null, Shape). Wire some together.
2. Look at the bottom-right corner of the canvas.

**Checklist:**
- [ ] Minimap is visible — small thumbnail in bottom-right corner of canvas
- [ ] Node rectangles are visible in the minimap (green for alive, gray for ghost)
- [ ] Selected node has a blue outline in the minimap
- [ ] The viewport rectangle (white) is visible overlaid on the minimap
- [ ] Panning the canvas: the white rectangle moves within the minimap
- [ ] Zooming the canvas: the white rectangle grows/shrinks within the minimap
- [ ] Clicking the minimap: main viewport pans to center on the clicked point
- [ ] Dragging on the minimap: viewport pans continuously while dragging
- [ ] Adding a new node: minimap updates immediately to include it
- [ ] Deleting a node: minimap updates immediately to remove it
- [ ] Ghost nodes appear dimmed (gray) in the minimap
- [ ] Error nodes appear red in the minimap

**STOP. Describe what you see. Wait for confirmation.**

---

## Additional Rules for This Task

**The minimap uses `<canvas>` 2D drawing, not DOM.** Unlike the main canvas which uses DOM-based node cards, the minimap redraws completely on every `render()` call using `ctx.clearRect` → `ctx.fillRect` per node. This is appropriate for a small thumbnail that has no interactive elements within it (no per-node hit testing).

**`_lastBounds` must be updated at the end of every `render()`.** The `_panToMinimap` function uses `_lastBounds` to invert the minimap-to-canvas transform. If `_lastBounds` is stale (from a previous render with different node positions), clicking the minimap will pan to the wrong canvas location.

**`applyTransform` in `viewport.js` must guard against `minimap` being undefined.** `viewport.js` loads before `minimap.js`. On first load, `applyTransform` is called during `viewport.reset()` before minimap has been defined. The `typeof minimap !== 'undefined'` guard prevents a `ReferenceError`.

**Node height is an estimate.** The minimap uses `NODE_HEIGHT = 120` as a fixed estimate for all node cards. Real node card heights vary based on param count (more params = taller card). The minimap does not measure actual DOM element heights — that would require expensive `getBoundingClientRect` calls on every render. The 120px estimate is a reasonable approximation and sufficient for thumbnail purposes.

**Viewport rectangle clamping is not required but recommended.** If the user pans very far from the graph, the viewport rectangle may extend far outside the minimap bounds. The brief does not require clamping — the rectangle simply draws outside the minimap canvas area and is clipped by the canvas element bounds naturally. If Claude Code adds clamping, it must clamp only the draw call, not the pan values.

**`e.stopPropagation()` on minimap mousedown is required.** Without it, clicking the minimap triggers the canvas background click handler in `input.js`, which clears the node selection. The stop propagation prevents this.

**No ES6+** throughout `minimap.js` and all modified files.

---

## On Completion

When all verification phases pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-19 COMPLETE

graph/canvas/minimap.js    ✅  [N tests passed] + visual verified
index.html                 ✅  minimap-canvas element added
panel.css                  ✅  minimap positioning styles added
index.js                   ✅  minimap.init() + minimap.render() in selection callback
graph/engine.js            ✅  minimap.render() after dropNode, deleteNode, connectWire, disconnectWire
graph/canvas/viewport.js   ✅  minimap.render() in applyTransform()

Minimap navigation confirmed. Click-to-pan and viewport rectangle verified.

Next task: TASK-20 — index.js AE lifecycle events + full init sequence
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-19-MINIMAP.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 11, 12, 13 — TASK-09-CANVAS-RENDERER.md Phase 1 — TASK-01-SETUP.md design tokens*
