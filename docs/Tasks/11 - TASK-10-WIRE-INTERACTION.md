# TASK-10 — Wire Drawing, Port Interaction, wireRenderer.js, wire.js
*Procedia v4 — Tenth task. Builds on completed TASK-01 through TASK-09.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 9, 12, 13, 14 in full
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 3b, 3c, 3d, 6, 14 in full
3. `TASK-09-CANVAS-RENDERER.md` — port dot structure and `data-*` attribute conventions

Confirm all files are present at repo root before starting.

---

## Context

This task makes wires interactive. After TASK-09, nodes render on the canvas and can be repositioned. This task adds:

- **`graph/wire/wireRenderer.js`** — SVG wire drawing. Reads `wireMap` and renders cubic bezier paths in `#wire-layer`.
- **`graph/wire/wire.js`** — Wire drag interaction. Port mousedown → drag → drop on target port → confirm or cancel. Calls `engine.connectWire` and `engine.disconnectWire`.
- **Picker UI** — inline dropdown shown when a data wire is dropped onto a newborn extendable slot. Calls `wireValidator.getPickerParams` to populate.
- **Wire deletion** — clicking an existing wire selects it, pressing Delete calls `engine.disconnectWire`.

**This task also updates `graph/canvas/input.js`** — port mousedown events were intentionally skipped in TASK-09. They are wired here.

---

## What This Task Does NOT Do

- No palette drag-to-canvas (`ui/drag.js` is TASK-11)
- No inspector wiring (`ui/inspector.js` is TASK-11)
- No keyboard shortcuts beyond wire deletion (full keyboard handler is TASK-11)
- No minimap

Files written or modified: `graph/wire/wireRenderer.js`, `graph/wire/wire.js`, `graph/canvas/input.js` (port mousedown added).

---

## PHASE 1 — `graph/wire/wireRenderer.js`

### What it is

Reads `wireMap` and renders one SVG `<path>` per wire inside `#wire-layer`. Called after every structural change to `wireMap` (same triggers as `renderer.render()`).

### Port position calculation

To draw a wire, the renderer needs the screen position of each port dot. It gets this by reading the port dot's DOM element (rendered by `renderer.js`) and calling `getBoundingClientRect()`, then converting to canvas space using `viewport.screenToCanvas()`.

**Helper — `_getPortPosition(nodeId, portId)`:**
```
1. Find the port dot element: query '#canvas-viewport .port-dot[data-node-id="{nodeId}"][data-port-id="{portId}"]'
2. If not found — return null
3. rect = el.getBoundingClientRect()
4. center = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 }
5. return viewport.screenToCanvas(center.x, center.y)
```

This approach means wire positions are always accurate even after pan/zoom.

### Bezier curve formula

All wires use cubic bezier curves. Control point offset depends on wire category:

**Layer and data wires (horizontal flow — left to right):**
```
from = output port position (right edge of source node)
to   = input port position  (left edge of target node)

dx = Math.abs(to.x - from.x) * 0.5   (minimum 60px)
cp1 = { x: from.x + dx, y: from.y }
cp2 = { x: to.x   - dx, y: to.y   }

path: M {from.x} {from.y} C {cp1.x} {cp1.y}, {cp2.x} {cp2.y}, {to.x} {to.y}
```

**Parent wires (vertical flow — top/bottom edges):**
```
from = child_of port position (top edge of child node)
to   = parent_of port position (bottom edge of parent node)

dy = Math.abs(to.y - from.y) * 0.5   (minimum 60px)
cp1 = { x: from.x, y: from.y - dy }
cp2 = { x: to.x,   y: to.y   + dy }

path: M {from.x} {from.y} C {cp1.x} {cp1.y}, {cp2.x} {cp2.y}, {to.x} {to.y}
```

### SVG path attributes per wire type

| Wire type | `stroke` | `stroke-dasharray` | `stroke-width` | `opacity` |
|---|---|---|---|---|
| `layer` | `var(--wire-layer)` | none | `1.5` | `0.8` |
| `data` | `var(--wire-data)` | none | `1.5` | `0.8` |
| `parent` | `var(--wire-parent)` | `5 3` | `1.5` | `0.8` |

All paths: `fill: none`, `stroke-linecap: round`.

Each `<path>` element must have:
- `data-wire-id="{wireId}"` — for click-to-select
- `class="wire-path {wireType}"` — matches CSS from TASK-01
- `pointer-events: stroke` — makes thin lines clickable

### Selected wire state

When a wire is selected (`_selectedWireId` in `wire.js`), its path element gets an additional attribute: `stroke-width: 3` and `opacity: 1`. The renderer reads the selected wire ID from `wire.js` via `wireInteraction.getSelectedWire()`.

### Public API

```javascript
var wireRenderer = (function() {

  function _getPortPosition(nodeId, portId) { ... }
  function _buildPath(wire) { ... }   // returns SVG path element or null

  function render() {
    // clear #wire-layer
    // for each wire in wireMap: build path, append to #wire-layer
  }

  function renderDragWire(fromPos, toPos, wireType) {
    // draws a temporary wire during drag (not from wireMap)
    // replaces any existing drag wire
    // called on mousemove during wire drag
  }

  function clearDragWire() {
    // removes the temporary drag wire element
  }

  return {
    render:         render,
    renderDragWire: renderDragWire,
    clearDragWire:  clearDragWire
  };

})();
```

### Implementation shape

```javascript
// graph/wire/wireRenderer.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: graph/wire/wire.js

var wireRenderer = (function() {

  var _dragWireEl = null;
  var MIN_CP_OFFSET = 60;

  function _getPortPosition(nodeId, portId) {
    // see algorithm above
  }

  function _makePath(fromPos, toPos, wireType) {
    // build and return SVG path element
    // use bezier formula — horizontal or vertical based on wire type
  }

  function _isParentWire(wireType) {
    return wireType === 'parent';
  }

  function render() {
    var layer = document.getElementById('wire-layer');
    if (!layer) return;

    // Remove all existing wire paths (not the drag wire)
    var existing = layer.querySelectorAll('.wire-path:not(.drag-wire)');
    for (var i = 0; i < existing.length; i++) {
      layer.removeChild(existing[i]);
    }

    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      var wire = wires[wireId];
      var fromPos = _getPortPosition(wire.fromNode, wire.fromPort);
      var toPos   = _getPortPosition(wire.toNode,   wire.toPort);
      if (!fromPos || !toPos) continue;

      var path = _makePath(fromPos, toPos, wire.type);
      path.setAttribute('data-wire-id', wireId);
      path.classList.add('wire-path', wire.type);

      // Apply selected state
      if (typeof wireInteraction !== 'undefined' &&
          wireInteraction.getSelectedWire() === wireId) {
        path.setAttribute('stroke-width', '3');
        path.style.opacity = '1';
      }

      layer.appendChild(path);
    }
  }

  function renderDragWire(fromPos, toPos, wireType) {
    var layer = document.getElementById('wire-layer');
    if (!layer) return;
    clearDragWire();
    var path = _makePath(fromPos, toPos, wireType || 'layer');
    path.classList.add('wire-path', wireType || 'layer', 'drag-wire');
    path.style.opacity = '0.5';
    path.style.strokeDasharray = '6 3';
    _dragWireEl = path;
    layer.appendChild(path);
  }

  function clearDragWire() {
    if (_dragWireEl && _dragWireEl.parentNode) {
      _dragWireEl.parentNode.removeChild(_dragWireEl);
    }
    _dragWireEl = null;
  }

  return {
    render:         render,
    renderDragWire: renderDragWire,
    clearDragWire:  clearDragWire
  };

})();
```

Fill `_getPortPosition` and `_makePath` completely. The rest is provided — copy exactly.

---

### Phase 1 verification — visual

After implementing, temporarily add this to the dev bootstrap and reload:

```javascript
// After engine.connectWire(n1.id, 'output', n2.id, 'layer_in_0')
renderer.render();
wireRenderer.render();
```

**Checklist:**
- [ ] A blue bezier wire is visible between the connected nodes
- [ ] Wire curves smoothly with correct S-curve shape
- [ ] Wire has correct color (blue for layer)
- [ ] No console errors

**STOP. Describe what you see. Wait for confirmation.**

---

## PHASE 2 — `graph/wire/wire.js` — drag interaction

### What it is

Handles the complete wire drag lifecycle:
1. **Start** — user mousedowns on a port dot
2. **Drag** — temporary wire follows the mouse
3. **Drop** — user releases on a target port
4. **Confirm** — if valid: call `engine.connectWire`, update renderer
5. **Cancel** — if released on empty space or invalid target: remove drag wire

Also handles:
- **Wire click to select** — clicking an existing wire path highlights it
- **Wire delete** — when a wire is selected and Delete is pressed, call `engine.disconnectWire`

### Wire drag state

```javascript
var _dragState = {
  active:       false,
  fromNodeId:   null,
  fromPortId:   null,
  fromPortType: null,   // wire type: 'layer' | 'data' | 'parent'
  fromPos:      null    // canvas-space { x, y }
};

var _selectedWireId = null;
```

### Port mousedown — start drag

This is called from `graph/canvas/input.js` when a mousedown on a `.port-dot` element is detected.

```
onPortMouseDown(nodeId, portId, e):

1. Get the node definition. Find the port declaration for portId
   (strip index suffix to get base port id — use wireValidator._getBasePortId pattern).

2. Determine the drag origin:
   — If the port is an OUTPUT port (category: 'output') or a PARENT port with role 'child'
     (child_of): this is a "forward drag" — user is starting a new wire.
     fromPos = _getPortPosition(nodeId, portId)
     Set _dragState: active=true, fromNodeId=nodeId, fromPortId=portId, fromPortType=port.type
   — If the port is an INPUT port or PARENT port with role 'parent' (parent_of):
     Check if this port already has a wire connected to it.
     If yes: this is a "reroute" — disconnect the existing wire and start dragging from the
     original source port (the fromNode/fromPort of the existing wire).
     If no: do nothing (cannot start a drag from an unconnected input).

3. e.stopPropagation() — prevent canvas drag from starting.
4. e.preventDefault()
```

### Mousemove — update drag wire

```
onWireMouseMove(e) — only when _dragState.active:

1. currentPos = viewport.screenToCanvas(e.clientX, e.clientY)
2. wireRenderer.renderDragWire(_dragState.fromPos, currentPos, _dragState.fromPortType)

3. Highlight valid drop targets:
   — Find all .port-dot elements on the canvas
   — For each: check wireValidator.validate(_dragState.fromNodeId, _dragState.fromPortId,
               targetNodeId, targetPortId, _dragState.fromPortType)
   — If valid: add class 'drop-target' to the port dot element
   — If not:   remove class 'drop-target'
   — Only check ports of the correct category (input ports for output drags, etc.)
```

### Mouseup — confirm or cancel

```
onWireMouseUp(e):

1. wireRenderer.clearDragWire()
2. Clear all 'drop-target' classes from port dots

3. Find if mouse released on a port dot:
   — Use document.elementFromPoint(e.clientX, e.clientY)
   — Walk up DOM looking for .port-dot element

4. If port dot found:
   a. Get targetNodeId and targetPortId from data attributes
   b. Call wireValidator.validate(fromNodeId, fromPortId, targetNodeId, targetPortId, fromPortType)
   c. If valid:
      — Check if this is a data wire dropped onto a newborn extendable slot:
        isNewborn = portManager.getOpenSlot(targetNodeId, basePortId) === targetPortId
                    AND fromPortType === 'data'
        If isNewborn: show picker (see Picker UI below)
        Else: call engine.connectWire(fromNodeId, fromPortId, targetNodeId, targetPortId, null)
              renderer.render()
              wireRenderer.render()
   d. If not valid: log wireValidator reason, cancel silently

5. If no port found: cancel silently

6. _dragState.active = false
   _dragState.fromNodeId = null
   etc.
```

### Picker UI — shown for newborn data wire drops

When a data wire is dropped onto a newborn extendable slot, show a dropdown picker before confirming the wire.

```
showPicker(fromNodeId, fromPortId, targetNodeId, targetPortId, e):

1. params = wireValidator.getPickerParams(targetNodeId, fromPortType)
   If params is empty: cancel silently (no valid params to bind to)

2. Create a .wire-picker div (CSS from TASK-01):
   — Position at e.clientX, e.clientY (screen coords — it's outside #canvas-viewport)
   — One item per param: label + type
   — Clicking an item:
       a. Remove picker from DOM
       b. Call engine.connectWire(fromNodeId, fromPortId, targetNodeId, targetPortId, param.key)
          (param.key is the boundParam)
       c. renderer.render()
       d. wireRenderer.render()

3. Add a one-time 'mousedown' listener on document to dismiss picker if clicked outside:
   — Remove picker on next mousedown anywhere outside it
```

Append the picker to `document.body` (not `#canvas-viewport`) so it is not affected by the viewport transform.

### Wire click to select

Add a click listener to `#wire-layer`:

```
On click on #wire-layer:
  target = e.target
  if target has data-wire-id:
    wireId = target.getAttribute('data-wire-id')
    if _selectedWireId === wireId:
      _selectedWireId = null  // deselect on second click
    else:
      _selectedWireId = wireId
    wireRenderer.render()  // re-render to apply selected styling
    e.stopPropagation()    // don't deselect node
  else:
    _selectedWireId = null
    wireRenderer.render()
```

### Wire delete — keyboard

When `_selectedWireId` is set and Delete or Backspace is pressed:

```javascript
document.addEventListener('keydown', function(e) {
  if ((e.key === 'Delete' || e.key === 'Backspace') && _selectedWireId) {
    engine.disconnectWire(_selectedWireId);
    _selectedWireId = null;
    renderer.render();
    wireRenderer.render();
    e.preventDefault();
  }
});
```

Note: Full keyboard handling (node delete, etc.) is `ui/keyboard.js` in TASK-11. Only wire delete lives in `wire.js`.

### Public API

```javascript
var wireInteraction = (function() {

  // ... internal state ...

  function onPortMouseDown(nodeId, portId, e) { ... }
  function onWireMouseMove(e) { ... }
  function onWireMouseUp(e) { ... }
  function showPicker(fromNodeId, fromPortId, targetNodeId, targetPortId, e) { ... }
  function getSelectedWire() { return _selectedWireId; }

  function init() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    wrap.addEventListener('mousemove', onWireMouseMove);
    wrap.addEventListener('mouseup',   onWireMouseUp);

    var wireLayer = document.getElementById('wire-layer');
    if (wireLayer) wireLayer.addEventListener('click', _onWireLayerClick);

    document.addEventListener('keydown', _onKeyDown);
  }

  return {
    onPortMouseDown: onPortMouseDown,
    getSelectedWire: getSelectedWire,
    init:            init
  };

})();
```

### Implementation shape

```javascript
// graph/wire/wire.js
// DEPENDS ON: graph/graphState.js, graph/wireValidator.js, graph/cycleChecker.js,
//             graph/cascadeAlgorithm.js, graph/portManager.js, graph/canvas/viewport.js,
//             graph/canvas/renderer.js, graph/wire/wireRenderer.js, graph/engine.js
// MUST LOAD BEFORE: index.js

var wireInteraction = (function() {

  var _dragState = {
    active: false, fromNodeId: null, fromPortId: null,
    fromPortType: null, fromPos: null
  };
  var _selectedWireId = null;

  function _getPortPosition(nodeId, portId) {
    // same logic as wireRenderer._getPortPosition — read from DOM
    // (do not call wireRenderer's private function — duplicate the lookup here)
  }

  function _getBasePortId(portId) {
    // same logic as wireValidator — strip trailing _N index
  }

  function _clearDropTargets() {
    var dots = document.querySelectorAll('.port-dot.drop-target');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.remove('drop-target');
    }
  }

  function onPortMouseDown(nodeId, portId, e) { ... }
  function onWireMouseMove(e) { ... }
  function onWireMouseUp(e) { ... }
  function showPicker(fromNodeId, fromPortId, targetNodeId, targetPortId, e) { ... }
  function _onWireLayerClick(e) { ... }
  function _onKeyDown(e) { ... }
  function getSelectedWire() { return _selectedWireId; }

  function init() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) { console.error('[wireInteraction] canvas-wrap not found'); return; }
    wrap.addEventListener('mousemove', onWireMouseMove);
    wrap.addEventListener('mouseup',   onWireMouseUp);
    var wireLayer = document.getElementById('wire-layer');
    if (wireLayer) wireLayer.addEventListener('click', _onWireLayerClick);
    document.addEventListener('keydown', _onKeyDown);
  }

  return { onPortMouseDown: onPortMouseDown, getSelectedWire: getSelectedWire, init: init };

})();
```

Fill every function body completely from the algorithms above.

---

## PHASE 3 — Update `graph/canvas/input.js` — port mousedown routing

In TASK-09, `input.js` detected port dot clicks but did nothing with them. Now route them to `wireInteraction`:

Find the mousedown handler in `graph/canvas/input.js`. In the section where `portEl` is detected, add:

```javascript
if (portEl) {
  var nodeId = portEl.getAttribute('data-node-id');
  var portId = portEl.getAttribute('data-port-id');
  if (nodeId && portId) {
    wireInteraction.onPortMouseDown(nodeId, portId, e);
  }
  return; // don't start node drag
}
```

This is the only change to `input.js`.

---

## PHASE 4 — Add CSS for drop-target and picker states

Add these rules to `panel.css`. They are new — not in TASK-01.

```css
/* Drop target highlight — shown during wire drag over valid ports */
.port-dot.drop-target {
  transform: scale(1.5);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
  transition: transform 0.1s, box-shadow 0.1s;
}

/* Wire selected state — applied directly via stroke-width in wireRenderer */
.wire-path.selected {
  stroke-width: 3;
  opacity: 1;
}
```

---

## PHASE 5 — Verification

### Visual verification checklist

Test all interactions manually in the browser after completing all four phases.

**Wire drawing:**
- [ ] Mousedown on an output port dot starts a drag — a dashed preview wire follows the mouse
- [ ] Valid drop target ports highlight (scale up) as the wire approaches them
- [ ] Invalid ports do not highlight (e.g. output-to-output, same node, wrong type)
- [ ] Dropping on a valid input port: wire appears, nodes update state (text → alive if comp downstream)
- [ ] Dropping on empty canvas: drag wire disappears, no wire created
- [ ] Layer wire is blue, correctly curved (horizontal S-curve)

**Picker:**
- [ ] Dropping a data wire (from a future Color/Number node) onto a newborn extendable slot shows the picker dropdown
- [ ] Picker lists params matching the wire's data type
- [ ] Clicking a param confirms the wire with that boundParam
- [ ] Clicking outside the picker dismisses it without creating a wire

**Wire reroute:**
- [ ] Mousedown on an occupied input port starts a reroute — the existing wire is tentatively removed and a new drag starts from the original source

**Wire select and delete:**
- [ ] Clicking a wire path highlights it (thicker stroke)
- [ ] Clicking the same wire again deselects it
- [ ] Clicking canvas background deselects wire
- [ ] With a wire selected, pressing Delete removes the wire
- [ ] After wire deletion, disconnected nodes ghost correctly (cascade runs)

**Parent wires:**
- [ ] Dragging from a `child_of` port (top edge) starts a vertical drag wire
- [ ] Dropping on a `parent_of` port (bottom edge) of a node in the same comp creates a green dashed wire
- [ ] Dropping on a node in a different comp is rejected (same-comp constraint)

**STOP. Describe all interactions. Wait for confirmation.**

---

## Additional Rules for This Task

**`_getPortPosition` is duplicated between `wireRenderer.js` and `wire.js`.** Both files need to read port dot positions from the DOM. Do not try to share this function — it creates a circular dependency. Keep them as identical private copies in each file.

**`_getBasePortId` is also duplicated from `wireValidator.js`.** Same reason — private copy in `wire.js`. Three copies of the same 3-line function across the codebase is acceptable to avoid circular dependencies.

**Port drag starts from output and `child_of` only.** Users can only begin a wire drag from an output port or a `child_of` parent port. Input ports and `parent_of` ports trigger reroute if occupied, or do nothing if empty. This is intentional — wires flow in one direction.

**The reroute behaviour removes the wire from `wireMap` immediately.** When the user drags from an occupied input port, call `engine.disconnectWire` synchronously before starting the drag. The cascade may ghost nodes. The drag then continues from the original source port as if starting fresh.

**`showPicker` appends to `document.body`, not `#canvas-viewport`.** If the picker were inside the viewport element, it would be affected by the CSS transform (pan/zoom). Appending to `body` ensures it appears at the correct screen position regardless of zoom level. Position it using `e.clientX` and `e.clientY` directly.

**Wire deletion key listener lives in `wire.js`, not `ui/keyboard.js`.** The keyboard handler in TASK-11 handles node deletion and other shortcuts. Wire deletion is coupled to `_selectedWireId` state which lives in `wire.js` — keep it here.

**Drop target highlighting must be cleared on every mouseup** regardless of whether a wire was committed. Call `_clearDropTargets()` at the start of `onWireMouseUp`.

**No ES6+** throughout all files.

---

## On Completion

When all phase 5 checks pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-10 COMPLETE

graph/wire/wireRenderer.js    ✅  visual verified
graph/wire/wire.js            ✅  visual verified
graph/canvas/input.js         ✅  port routing added
panel.css                     ✅  drop-target styles added

Wire draw, select, delete, picker, and parent wires verified.
Cascade confirmed: deleting a wire ghosts disconnected nodes.

Next task: TASK-11 — palette drag, inspector, keyboard shortcuts
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-10-WIRE-INTERACTION.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 9, 12, 13, 14 — PROCEDIA-V4-ARCHITECTURE.md Sections 3b, 3c, 3d, 6, 14 — TASK-09-CANVAS-RENDERER.md*
