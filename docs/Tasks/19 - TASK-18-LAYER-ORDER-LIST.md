# TASK-18 — ui/layerOrderList.js
*Procedia v4 — Eighteenth task. Builds on completed TASK-01 through TASK-17.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 11, 12, 13 in full
2. `PROCEDIA-V4-ARCHITECTURE.md` — Section 5b (`setLayerOrder` action), Section 14 (critical rule 17: layer stacking is 1-based in AE, 0-based in panel)
3. `TASK-11-UI-ENTRYPOINT.md` — Inspector structure and how `renderInspector` works

Confirm both files are present at repo root before starting.

---

## Context

When a CompNode is selected, the inspector shows its params (label, width, height, fps, duration, bgColor). This task adds a **layer order list** below those params — a drag-to-reorder list showing all alive layer nodes wired into the selected comp, in their current AE stacking order.

The user drags rows to reorder them. On drop, the new order is dispatched to AE via `setLayerOrder`. AE layers are reordered immediately.

**This task has one file:** `ui/layerOrderList.js`.

**One modification to `ui/inspector.js`** — add the layer order list below the comp params when a CompNode is selected.

**One dispatcher addition** — `setLayerOrder` was declared in the architecture but not yet implemented. Add it to `dispatcher.jsx` now.

---

## What This Task Does NOT Do

- No new node definitions
- No canvas changes
- No persistence changes
- No new graph state

---

## The Layer Order Model

### Panel side (0-based)

The layer order list in the panel is 0-based. Index 0 = topmost layer in the AE comp (AE layer index 1). The list renders top-to-bottom matching AE's layer panel order.

```
Panel index 0  →  AE layer 1  (top of stack)
Panel index 1  →  AE layer 2
Panel index 2  →  AE layer 3  (bottom of stack)
```

### How to build the order list

The panel does not poll AE for layer order on every render — that would require a bridge call on every comp selection. Instead, it derives order from `wireMap`:

- Find all `layer` wires whose `toNode` is the selected CompNode and `toPort` starts with `'layer_in_'`
- Extract the port index: `'layer_in_0'` → 0, `'layer_in_1'` → 1, etc.
- Sort by port index ascending — port 0 is the top layer (AE layer 1)
- Each item in the sorted list is the `fromNode` UUID — resolve to `nodeData` for display

This means the panel port slot order defines the stacking order. When the user reorders in the panel, the panel updates `wireMap` port assignments AND dispatches `setLayerOrder` to AE.

**Note:** This is an approximation that works for simple cases. AE layer order can drift from panel port order if the user reorders layers directly in AE. The poller does not currently sync layer order back — that is a future enhancement.

---

## PHASE 1 — `ui/layerOrderList.js`

### What it renders

A section inside the inspector, below the comp params, showing one draggable row per alive layer wired into the comp:

```
LAYER ORDER
────────────────────────────────
⠿  Text      [category accent]
⠿  Null      [category accent]
⠿  Shape     [category accent]
────────────────────────────────
Drag rows to reorder layers.
```

Each row shows:
- A drag handle icon (`⠿` or `≡`) on the left
- The node's label (from `nodeData.props.label`)
- A small category accent dot on the right (same color as the node card's category accent)

### Public API

```javascript
var layerOrderList = (function() {

  function render(compNodeId) {
    // Build and return the layer order section DOM element.
    // Returns null if compNodeId is not a CompNode or has no wired layers.
  }

  return { render: render };

})();
```

`render(compNodeId)` is called from `inspector.js` when a CompNode is selected. It returns a DOM element that `inspector.js` appends to the inspector body.

---

### Building the ordered layer list

```
_buildOrderedLayers(compNodeId):

1. wires = graphState.getAllWires()
2. Collect all layer wires targeting this comp:
   layerWires = [] — wires where toNode === compNodeId AND type === 'layer'

3. For each wire, extract port index:
   portIndex = parseInt(wire.toPort.replace('layer_in_', ''), 10)
   — e.g. 'layer_in_0' → 0, 'layer_in_2' → 2

4. Sort layerWires by portIndex ascending (0 = top of stack)

5. For each sorted wire, resolve to nodeData:
   nodeData = graphState.getNode(wire.fromNode)
   — Skip if nodeData is null or nodeData.state !== 'alive'

6. Return array of { nodeId, portIndex, label, category } objects
```

---

### Drag-to-reorder algorithm

HTML5 drag-and-drop on the row elements. No external library.

**On dragstart:**
```
_dragState = { fromIndex: rowIndex }
e.dataTransfer.effectAllowed = 'move'
e.dataTransfer.setData('text/plain', String(rowIndex))
```

**On dragover (each row):**
```
e.preventDefault()
e.dataTransfer.dropEffect = 'move'
Show a drop indicator (CSS class 'drag-over') on the target row
```

**On dragleave:**
```
Remove 'drag-over' class
```

**On drop (target row):**
```
1. e.preventDefault()
2. fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
3. toIndex   = target row's index
4. If fromIndex === toIndex: return (no change)

5. Reorder the layer list array:
   — Remove item at fromIndex
   — Insert at toIndex

6. Update wireMap port assignments:
   — For each item in the new order (index i):
     — Find the wire from that node to the comp
     — If wire.toPort !== 'layer_in_' + i:
       — Update wire: graphState.removeWire(wire.id), re-add with new toPort
       — (Or expose a graphState.updateWire helper — see below)

7. Call evalBridge.dispatch({ action: 'setLayerOrder', params: {
     orders: [ { nodeUUID, order }, ... ]  // array of all layers with new 0-based indices
   }})
   .then(function(res) {
     if (!res.ok) console.error('[layerOrderList] reorder failed:', res.error)
   })

8. Re-render the layer order list in place (call layerOrderList.render(compNodeId) again
   and replace the existing section element)
```

---

### `graphState.updateWire(wireId, patch)` — add to `graphState.js`

The wire reorder needs to update `wire.toPort` without removing and re-adding the wire (which would trigger cascade). Add a non-structural wire update method:

```javascript
function updateWire(wireId, patch) {
  if (!wireMap[wireId]) return;
  for (var key in patch) {
    wireMap[wireId][key] = patch[key];
  }
  // Do NOT call rebuildTempGraph here — this is called during reorder,
  // and cascade must not fire. Call rebuildTempGraph explicitly after all updates.
}
```

Add `updateWire` to the `graphState` public API.

After all port reassignments are done, call `graphState.rebuildTempGraph()` once.

---

### CSS for layer order list

Add to `panel.css`:

```css
/* Layer order section */
.layer-order-section {
  margin-top: 4px;
}

.layer-order-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.layer-order-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  cursor: grab;
  user-select: none;
  border-bottom: 1px solid transparent;
  transition: background 0.1s;
}

.layer-order-item:hover {
  background: #1C1C24;
}

.layer-order-item:active {
  cursor: grabbing;
}

.layer-order-item.drag-over {
  border-bottom: 2px solid var(--wire-layer);
}

.layer-order-handle {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.layer-order-label {
  flex: 1;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-order-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.layer-order-hint {
  font-size: 9px;
  color: var(--text-tertiary);
  padding: 4px 12px 8px;
  font-style: italic;
}

.layer-order-empty {
  font-size: 10px;
  color: var(--text-tertiary);
  padding: 8px 12px;
  font-style: italic;
}
```

---

### Complete implementation shape

```javascript
// ui/layerOrderList.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js
// MUST LOAD BEFORE: index.js

var layerOrderList = (function() {

  var _categoryColors = {
    'Core':    'var(--cat-core)',
    'Layers':  'var(--cat-layers)',
    'Effects': 'var(--cat-effects)',
    'Data':    'var(--cat-data)',
    'Utility': 'var(--cat-utility)'
  };

  function _buildOrderedLayers(compNodeId) {
    // see algorithm above — returns array of { nodeId, portIndex, label, category }
  }

  function _buildRow(item, index, orderedItems, compNodeId) {
    // create and return one .layer-order-item <li> element
    // wire dragstart, dragover, dragleave, drop events
  }

  function _commitReorder(newOrder, compNodeId) {
    // see drag-to-reorder algorithm steps 6-8
    // newOrder is the reordered array of { nodeId, portIndex, ... }
  }

  function render(compNodeId) {
    var orderedLayers = _buildOrderedLayers(compNodeId);

    var section = document.createElement('div');
    section.className = 'inspector-section layer-order-section';

    var label = document.createElement('div');
    label.className = 'inspector-section-label';
    label.textContent = 'LAYER ORDER';
    section.appendChild(label);

    if (orderedLayers.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'layer-order-empty';
      empty.textContent = 'No layers wired to this comp.';
      section.appendChild(empty);
      return section;
    }

    var list = document.createElement('ul');
    list.className = 'layer-order-list';

    for (var i = 0; i < orderedLayers.length; i++) {
      list.appendChild(_buildRow(orderedLayers[i], i, orderedLayers, compNodeId));
    }

    section.appendChild(list);

    var hint = document.createElement('div');
    hint.className = 'layer-order-hint';
    hint.textContent = 'Drag to reorder layers in AE.';
    section.appendChild(hint);

    return section;
  }

  return { render: render };

})();
```

Fill `_buildOrderedLayers`, `_buildRow`, and `_commitReorder` completely.

---

## PHASE 2 — Update `ui/inspector.js`

When a CompNode is selected, append the layer order list section after the comp params section.

Find the section in `renderInspector` where comp params are rendered. After appending all param sections, add:

```javascript
// After all param sections are appended to inspector body,
// check if this is a CompNode and add layer order list
if (def.type === 'core/comp') {
  var divider = document.createElement('div');
  divider.className = 'inspector-divider';
  body.appendChild(divider);

  var orderSection = layerOrderList.render(nodeId);
  if (orderSection) body.appendChild(orderSection);
}
```

---

## PHASE 3 — Dispatcher addition: `setLayerOrder`

Add to `jsx/dispatcher/dispatcher.jsx`.

**To `_route`:**
```jsx
if (action === 'setLayerOrder') return actionSetLayerOrder(params);
```

**Action handler:**

```
params: { hostingCompUUID, orders: [ { nodeUUID, order }, ... ] }
orders: array of { nodeUUID: string, order: number (0-based panel index) }

Algorithm:
1. comp = findCompByUUID(hostingCompUUID) — if null: return error

2. Process layers from highest panel index to lowest (bottom to top in AE):
   — Sort orders array by order DESCENDING
   — For each entry:
     a. layer = findLayerByUUID(comp, nodeUUID) — if null: skip
     b. targetAEIndex = entry.order + 1  (panel 0-based → AE 1-based)
     c. layer.moveToBeginning()  (moves to AE index 1)
     d. Then move it down to targetAEIndex by calling:
        for (var i = 1; i < targetAEIndex; i++) {
          layer.moveAfter(comp.layer(i));
        }

3. Return { ok: true, data: { reordered: orders.length } }
```

**Why process descending?** AE's layer index shifts as layers move. Processing from the highest index (bottom of stack) upward prevents index displacement from corrupting the order. Each layer is moved to position relative to already-positioned layers above it.

**Full implementation:**

```jsx
function actionSetLayerOrder(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'Comp not found: ' + params.hostingCompUUID; return result; }

    // Sort descending by panel order (process bottom-to-top)
    var orders = params.orders.slice();
    orders.sort(function(a, b) { return b.order - a.order; });

    for (var i = 0; i < orders.length; i++) {
      var entry = orders[i];
      var layer = findLayerByUUID(comp, entry.nodeUUID);
      if (!layer) continue;

      var targetAEIndex = entry.order + 1;
      layer.moveToBeginning();
      for (var j = 1; j < targetAEIndex; j++) {
        layer.moveAfter(comp.layer(j));
      }
    }

    result.ok   = true;
    result.data = { reordered: orders.length };
  } catch(e) {
    result.error = e.toString();
  }
  return result;
}
```

---

## PHASE 4 — Verification

### Console test — browser

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  // Mock evalBridge
  var _orig = evalBridge.dispatch;
  var dispatchedCmds = [];
  evalBridge.dispatch = function(cmd) {
    dispatchedCmds.push(cmd);
    return Promise.resolve({ ok: true, data: null, error: null });
  };

  graphState.clearGraph();

  // Set up a comp with 3 layers wired in
  graphState.addNode({ id: 'N-COMP', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 400, y: 200,
    props: { label: 'Main', width: 1920, height: 1080, fps: 24, duration: 10, bgColor: [0,0,0] },
    hostingComps: [], portSlots: { 'layer_in': 4 } });

  graphState.addNode({ id: 'N-TEXT', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 100, y: 100,
    props: { label: 'Headline', content: 'Hi', fontSize: 72, color: [1,1,1,1],
             position: [0,0], rotation: 0, opacity: 100 },
    hostingComps: ['N-COMP'], portSlots: {} });

  graphState.addNode({ id: 'N-NULL', type: 'layers/null', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 100, y: 200,
    props: { label: 'Root', position: [0,0], rotation: 0, opacity: 100, scale: [100,100] },
    hostingComps: ['N-COMP'], portSlots: {} });

  graphState.addNode({ id: 'N-SHAPE', type: 'layers/shape', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 100, y: 300,
    props: { label: 'BG', position: [0,0], rotation: 0, opacity: 100, scale: [100,100] },
    hostingComps: ['N-COMP'], portSlots: {} });

  graphState.addWire({ id: 'W-T', type: 'layer', fromNode: 'N-TEXT',  fromPort: 'output',
    toNode: 'N-COMP', toPort: 'layer_in_0', boundParam: null });
  graphState.addWire({ id: 'W-N', type: 'layer', fromNode: 'N-NULL',  fromPort: 'output',
    toNode: 'N-COMP', toPort: 'layer_in_1', boundParam: null });
  graphState.addWire({ id: 'W-S', type: 'layer', fromNode: 'N-SHAPE', fromPort: 'output',
    toNode: 'N-COMP', toPort: 'layer_in_2', boundParam: null });

  // render() returns a DOM element
  var section = layerOrderList.render('N-COMP');
  assert('render returns a DOM element',     section !== null && section.nodeType === 1);
  assert('render has layer-order-section class', section.className.indexOf('layer-order-section') !== -1);

  // Find list items
  var items = section.querySelectorAll('.layer-order-item');
  assert('render shows 3 layer items',     items.length === 3);

  // Order is by port index: TEXT (0), NULL (1), SHAPE (2)
  assert('first item is Headline (port 0)', items[0] && items[0].textContent.indexOf('Headline') !== -1);
  assert('second item is Root (port 1)',    items[1] && items[1].textContent.indexOf('Root')     !== -1);
  assert('third item is BG (port 2)',       items[2] && items[2].textContent.indexOf('BG')       !== -1);

  // Empty comp — no wired layers
  graphState.addNode({ id: 'N-COMP2', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'Empty', width: 1920, height: 1080, fps: 24, duration: 10, bgColor: [0,0,0] },
    hostingComps: [], portSlots: { 'layer_in': 1 } });

  var emptySection = layerOrderList.render('N-COMP2');
  assert('empty comp shows empty state', emptySection !== null &&
    emptySection.querySelectorAll('.layer-order-empty').length === 1);

  // graphState.updateWire exists
  assert('graphState.updateWire is function', typeof graphState.updateWire === 'function');

  // updateWire updates toPort without cascade
  graphState.updateWire('W-T', { toPort: 'layer_in_0' }); // no-op update
  assert('updateWire preserves wire',   graphState.getWire('W-T') !== null);
  assert('updateWire updates field',    graphState.getWire('W-T').toPort === 'layer_in_0');

  evalBridge.dispatch = _orig;
  graphState.clearGraph();

  console.log('---');
  console.log('layerOrderList:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before visual and AE verification.**

**STOP. Paste console output. Wait for confirmation.**

---

### Visual verification — browser

1. Drop a Comp, a Text, a Null, and a Shape node. Wire all three layers to the Comp.
2. Select the Comp node.
3. Inspector shows comp params (label, width, height, fps, duration, bgColor).
4. Below a divider: a `LAYER ORDER` section with three draggable rows.

**Checklist:**
- [ ] Layer order section appears below comp params when a CompNode is selected
- [ ] Shows three rows: one per wired alive layer
- [ ] Each row shows the node label and a colored category dot
- [ ] Drag handle (`⠿`) is visible on each row
- [ ] Rows have hover state (slight background lightening)
- [ ] Drag a row — drop indicator (`border-bottom` line) appears on target row during drag
- [ ] After drop, rows reorder visually
- [ ] Selecting a non-Comp node: layer order section is absent from inspector

**STOP. Describe what you see. Wait for confirmation.**

---

### AE integration verification — in After Effects

1. In AE: create the same graph (Text, Null, Shape → Comp).
2. Open AE's timeline for the comp — note the layer stacking order.
3. In Procedia inspector with Comp selected: drag the bottom row to the top.
4. In AE: the layer order updates immediately — the formerly-bottom layer is now at the top.
5. Drag it back. AE layer order restores.
6. Wire a fourth layer (Adjustment) to the comp. Verify it appears as a fourth row.
7. Unwire one layer. Verify it disappears from the list (ghost nodes are excluded).

**Checklist:**
- [ ] Dragging in panel → AE layer order updates immediately
- [ ] Reorder is bidirectional — any row can move to any position
- [ ] A newly wired layer appears in the list
- [ ] A ghosted layer (unwired from comp) disappears from the list
- [ ] No console errors during reorder

**STOP. Describe what you see in AE. Wait for confirmation.**

---

## Additional Rules for This Task

**`graphState.updateWire` must NOT call `rebuildTempGraph` or trigger cascade.** It is a silent, non-structural update used only during layer reordering. Calling `rebuildTempGraph` after each wire port reassignment would be wasteful during a batch reorder. The caller (layer order list `_commitReorder`) calls `graphState.rebuildTempGraph()` once after all wires are updated.

**Layer order in the panel is derived from wire port indices, not from polling AE.** Port `layer_in_0` = AE layer 1 (top). Port `layer_in_1` = AE layer 2. The panel list is always in port-index order. After a reorder, the port indices are updated to match the new visual order.

**`setLayerOrder` processes orders descending.** AE layer indices shift when layers move. Processing from the highest panel index (bottom of stack) upward prevents earlier moves from corrupting the target positions of later moves. The additional rules in the dispatcher implementation explain this — Claude Code must not simplify this to ascending order.

**Panel index 0 = AE layer index 1.** This is the critical rule from the architecture (Rule 17). `entry.order + 1` in the dispatcher converts from 0-based panel to 1-based AE. Never pass panel indices directly to AE layer operations.

**Only `alive` nodes appear in the layer order list.** Ghost nodes are excluded — they are in the Reserved Comp, not in the hosting comp. If a node is ghosted while the list is showing, it disappears on the next `render` call. The list is rebuilt fresh on every comp selection and after every reorder.

**`render` returns a DOM element — `inspector.js` appends it.** `layerOrderList` does not directly manipulate the inspector DOM. It returns a section element. `inspector.js` owns where it goes. This keeps the responsibilities separated.

**No ES6+** throughout `layerOrderList.js` and all modified files.

---

## On Completion

When all verification phases pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-18 COMPLETE

ui/layerOrderList.js              ✅  [N tests passed] + visual + AE verified
ui/inspector.js                   ✅  layer order section added for CompNode
graph/graphState.js               ✅  updateWire() added
jsx/dispatcher/dispatcher.jsx     ✅  setLayerOrder added
panel.css                         ✅  layer order styles added

Drag-to-reorder confirmed in AE. Layer stacking updates immediately.

Next task: TASK-19 — graph/canvas/minimap.js
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-18-LAYER-ORDER-LIST.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 11, 12, 13 — PROCEDIA-V4-ARCHITECTURE.md Sections 5b, 14 (Rule 17) — TASK-11-UI-ENTRYPOINT.md*
