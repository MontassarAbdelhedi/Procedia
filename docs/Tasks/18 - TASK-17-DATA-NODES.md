# TASK-17 — Color.js + Number.js Data Node Definitions
*Procedia v4 — Seventeenth task. Builds on completed TASK-01 through TASK-16.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 9, 10, 12 in full
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 1a (`data` nodeKind), 3b (port declaration), 3c (extendable ports and picker) in full

Confirm both files are present at repo root before starting.

---

## Context

Data nodes are the simplest nodes in the system. They have no AE presence, no lifecycle beyond `onDrop`, and are never part of cascade. Their sole purpose is to output a typed value that drives a param on another node via the extendable port picker.

**The complete data node lifecycle:**
- Drop on canvas → state is immediately `alive` (no comp needed — data nodes have no AE object)
- Wire to a newborn extendable slot → picker assigns a `boundParam` → the param is now driven by this node's output value
- Wire deleted → param reverts to its last manual inspector value — no AE call needed
- Delete node → remove from `nodeMap`, disconnect all wires — no AE call needed

**Two data nodes in this task:**

| Node | Output type | Drives |
|---|---|---|
| ColorNode | `color` — RGBA `[r,g,b,a]` range 0–1 | Color params on effects (Fill color, Drop Shadow color) |
| NumberNode | `number` — float | Number params on effects (blur amount, opacity, distance, etc.) |

---

## What This Task Does NOT Do

- No dispatcher changes — data nodes make no AE calls
- No engine changes — data nodes are already handled correctly (no `onAlive` command to dispatch, cascade skips them)
- No canvas or UI changes

Files written: `graph/nodes/categories/data/Color.js`, `graph/nodes/categories/data/Number.js`.

---

## Data Node Contract — Different From All Previous Nodes

Data nodes deviate from the standard contract in exactly these ways:

| Hook | Standard affected/effector | Data node |
|---|---|---|
| `onDrop` | Returns `null` | Returns `null` — but engine sets state to `alive` immediately after drop |
| `onAlive` | Returns a create/apply command | Returns `null` — data nodes are always alive, no AE object to create |
| `onGhost` | Returns a park/remove command | Returns `null` — cascade never calls this (data wires don't trigger cascade) |
| `onDelete` | Returns a delete/remove command | Returns `null` — no AE object to clean up |
| `onPropertyChange` | Returns a setLayerProperty/setEffectProperty command | Returns `null` — data nodes output their value, don't write to AE |

**All five hooks return `null`.** The value output by a data node is read from `nodeData.props` by the dirty flusher when the downstream node flushes. The data node itself never dispatches anything.

### How data wire values reach AE

When a data wire binds a ColorNode's output to a FillEffect's `color` param (via the picker), the `boundParam` on the wire is set to `'color'`. On every `dirtyFlusher` flush for the FillEffect node, the flusher checks: for each param in `nodeData.props`, is there a data wire with `toNode === fillEffectId AND boundParam === paramKey`? If yes, the value comes from the source node (`fromNode`'s props), not from FillEffect's own props.

This means data node value changes must mark the **downstream** node dirty, not the data node itself. When the user changes a ColorNode's color in the inspector:

1. `engine.setNodeProperty(colorNodeId, 'color', newValue)` → updates ColorNode's props, sets ColorNode dirty
2. But ColorNode has no AE object — its dirty flush returns `null`
3. The downstream FillEffect's flush reads the wire and sources the value from ColorNode's props

**Engine update required:** After `graphState.updateProp(nodeId, key, value)`, if the node is a data node (`nodeKind === 'data'`), also find all downstream nodes connected via data wires and set them dirty too.

Add to `engine.setNodeProperty`:

```javascript
function setNodeProperty(nodeId, key, value) {
  var nodeData = graphState.getNode(nodeId);
  if (!nodeData) {
    console.warn('[engine] setNodeProperty: node not found:', nodeId);
    return;
  }
  graphState.updateProp(nodeId, key, value);

  // If this is a data node, propagate dirty to all downstream nodes connected via data wires
  if (nodeData.nodeKind === 'data') {
    var allWires = graphState.getAllWires();
    for (var wId in allWires) {
      var w = allWires[wId];
      if (w.fromNode === nodeId && w.type === 'data') {
        var downstreamData = graphState.getNode(w.toNode);
        if (downstreamData && downstreamData.state === 'alive') {
          graphState.updateNode(w.toNode, { dirty: true });
        }
      }
    }
  }

  dirtyFlusher.schedule();
}
```

**Dirty flusher update required:** When flushing a dirty node's props, for each param key check if a data wire is bound to it. If so, read the value from the wire's source node instead of from the node's own props.

Add to `dirtyFlusher.flush()`, inside the param-building loop:

```javascript
// For each param key in nodeData.props:
function _resolveParamValue(nodeData, paramKey) {
  // Check if a data wire is bound to this param
  var allWires = graphState.getAllWires();
  for (var wId in allWires) {
    var w = allWires[wId];
    if (w.toNode === nodeData.id && w.type === 'data' && w.boundParam === paramKey) {
      // Value comes from the source data node
      var sourceNode = graphState.getNode(w.fromNode);
      if (sourceNode) {
        // Data nodes output through their first (and only) output param
        // By convention the value key matches the node's primary param key
        // ColorNode outputs props.color, NumberNode outputs props.value
        var def = nodeRegistry.getDefinition(sourceNode.type);
        if (def && def.params.length > 0) {
          // Return the value of the first non-label param of the source node
          for (var p = 0; p < def.params.length; p++) {
            if (def.params[p].key !== 'label') {
              return sourceNode.props[def.params[p].key];
            }
          }
        }
      }
    }
  }
  // No data wire bound — use the node's own prop value
  return nodeData.props[paramKey];
}
```

Call `_resolveParamValue(nodeData, key)` instead of `nodeData.props[key]` when building the `onPropertyChange` command params.

---

## PHASE 1 — `graph/nodes/categories/data/Color.js`

### Identity and classification

| Field | Value |
|---|---|
| `type` | `'data/color'` |
| `label` | `'Color'` |
| `category` | `'Data'` |
| `version` | `'1.0.0'` |
| `nodeKind` | `'data'` |
| `dedicated` | `false` |

### Ports

Data nodes have only an output port. No input ports (they source values, not receive them). No parent ports (no AE layer to parent). The output port type is `'data'` — not `'layer'`.

```javascript
ports: [
  { id: 'output', category: 'output', type: 'data', extendable: false }
]
```

**Port count: 1. Exactly 1.**

### Params

```javascript
params: [
  { key: 'label', type: 'string', default: 'Color',      label: 'Label' },
  { key: 'color', type: 'color',  default: [1, 1, 1, 1], label: 'Color' }
]
```

The `color` param is what the node outputs. Its value is read by downstream nodes via the wire binding mechanism described above.

### Lifecycle hooks — all return `null`

```javascript
onDrop:           function(nodeData)                                    { return null; },
onAlive:          function(nodeData, hostingCompUUID)                   { return null; },
onGhost:          function(nodeData, hostingCompUUID)                   { return null; },
onDelete:         function(nodeData)                                    { return null; },
onPropertyChange: function(key, value, nodeData, hostingCompUUID)       { return null; }
```

### State on drop

ColorNode goes `alive` immediately on drop — no comp path needed. This requires a **one-line engine addition** in `engine.dropNode`. After building `nodeData` and calling `graphState.addNode(nodeData)`, check:

```javascript
// Data nodes are always alive — they have no AE dependency
if (def.nodeKind === 'data') {
  graphState.updateNode(nodeData.id, { state: 'alive' });
}
```

This is the second permitted node-type conditional in the engine (after the CompNode `onDrop` check and the effector `upstreamNodeUUID` resolution). It is architecturally necessary.

### Self-registration

```javascript
nodeRegistry.register(ColorNode);
```

---

## PHASE 2 — `graph/nodes/categories/data/Number.js`

### Identity and classification

| Field | Value |
|---|---|
| `type` | `'data/number'` |
| `label` | `'Number'` |
| `category` | `'Data'` |
| `version` | `'1.0.0'` |
| `nodeKind` | `'data'` |
| `dedicated` | `false` |

### Ports

Identical to ColorNode — one output port, type `'data'`.

```javascript
ports: [
  { id: 'output', category: 'output', type: 'data', extendable: false }
]
```

### Params

```javascript
params: [
  { key: 'label', type: 'string', default: 'Number', label: 'Label'                       },
  { key: 'value', type: 'number', default: 0,        label: 'Value', min: -999999, max: 999999 }
]
```

The `value` param is what the node outputs. Wide min/max range — a Number node can drive blur amounts, opacities, distances, angles, etc.

### Lifecycle hooks — all return `null`

Identical to ColorNode — all five hooks return `null`.

### State on drop

Same as ColorNode — `nodeKind === 'data'` check in `engine.dropNode` covers both.

### Self-registration

```javascript
nodeRegistry.register(NumberNode);
```

---

## PHASE 3 — Engine and DirtyFlusher updates

### `graph/engine.js`

**1. In `dropNode`** — add data node alive-on-drop:

```javascript
// After graphState.addNode(nodeData):
if (def.nodeKind === 'data') {
  graphState.updateNode(nodeData.id, { state: 'alive' });
}

// Then call onDrop as usual:
var dropCmd = def.onDrop(nodeData);
// dropCmd is null for data nodes — no dispatch needed
```

**2. In `setNodeProperty`** — propagate dirty to downstream nodes (full implementation in Context section above).

**3. In `deleteNode`** — data nodes have no ghost step. Update the delete sequence:

```javascript
// In deleteNode, before calling onGhost:
if (nodeData.nodeKind === 'data') {
  // Skip onGhost entirely — data nodes have no AE presence
  // Just call onDelete (returns null) and remove from graph
  graphState.removeNode(nodeId);
  if (graphState.getSelection() === nodeId) graphState.setSelection(null);
  return;
}
// ... existing ghost + delete sequence for affected and effector nodes ...
```

### `flush/dirtyFlusher.js`

Add `_resolveParamValue` helper and use it when building `onPropertyChange` command params. Full implementation in Context section above.

The resolved value is passed as `value` in the `onPropertyChange` call:

```javascript
// In flush(), inside the dirty node loop, for each param key:
var resolvedValue = _resolveParamValue(nodeData, key);
var cmd = def.onPropertyChange(key, resolvedValue, nodeData, hostingCompUUID, upstreamNodeUUID);
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

  function testDataNode(defType, expectedLabel, expectedOutputParamKey, expectedOutputParamType) {
    var def = nodeRegistry.getDefinition(defType);
    assert(defType + ': registered',             def !== null);
    assert(defType + ': label correct',          def && def.label === expectedLabel);
    assert(defType + ': category is Data',       def && def.category === 'Data');
    assert(defType + ': nodeKind is data',       def && def.nodeKind === 'data');
    assert(defType + ': dedicated is false',     def && def.dedicated === false);
    assert(defType + ': version is 1.0.0',       def && def.version === '1.0.0');

    // Ports — exactly 1, output only
    assert(defType + ': has exactly 1 port',     def && def.ports.length === 1);
    assert(defType + ': port is output',         def && def.ports[0].category === 'output');
    assert(defType + ': port type is data',      def && def.ports[0].type === 'data');
    assert(defType + ': no input ports',         def && def.ports[0].category !== 'input');
    assert(defType + ': no parent ports',        (function() {
      for (var i = 0; i < def.ports.length; i++) {
        if (def.ports[i].category === 'parent') return false;
      }
      return true;
    })());

    // Params
    var params = {};
    for (var p = 0; p < def.params.length; p++) params[def.params[p].key] = def.params[p];
    assert(defType + ': has label param',        params['label'] !== undefined);
    assert(defType + ': has output param',       params[expectedOutputParamKey] !== undefined);
    assert(defType + ': output param type',      params[expectedOutputParamKey] &&
                                                 params[expectedOutputParamKey].type === expectedOutputParamType);
    var missingDefault = false;
    for (var q = 0; q < def.params.length; q++) {
      if (def.params[q].default === undefined) missingDefault = true;
    }
    assert(defType + ': all params have defaults', missingDefault === false);

    // All hooks return null
    var fakeNode = { id: 'D-001', props: {}, state: 'alive', hostingComps: [] };
    assert(defType + ': onDrop returns null',           def.onDrop(fakeNode) === null);
    assert(defType + ': onAlive returns null',          def.onAlive(fakeNode, 'C-001') === null);
    assert(defType + ': onGhost returns null',          def.onGhost(fakeNode, 'C-001') === null);
    assert(defType + ': onDelete returns null',         def.onDelete(fakeNode) === null);
    assert(defType + ': onPropertyChange returns null', def.onPropertyChange('x', 1, fakeNode, 'C-001') === null);
  }

  testDataNode('data/color',  'Color',  'color', 'color');
  testDataNode('data/number', 'Number', 'value', 'number');

  // ColorNode: color default is [1,1,1,1]
  var colorDef = nodeRegistry.getDefinition('data/color');
  var colorParams = {};
  for (var i = 0; i < colorDef.params.length; i++) colorParams[colorDef.params[i].key] = colorDef.params[i];
  assert('data/color: color default has 4 channels',
    Array.isArray(colorParams['color'].default) && colorParams['color'].default.length === 4);
  assert('data/color: color default is white',
    colorParams['color'].default[0] === 1 && colorParams['color'].default[3] === 1);

  // NumberNode: value default is 0
  var numDef = nodeRegistry.getDefinition('data/number');
  var numParams = {};
  for (var j = 0; j < numDef.params.length; j++) numParams[numDef.params[j].key] = numDef.params[j];
  assert('data/number: value default is 0',    numParams['value'].default === 0);
  assert('data/number: value has wide range',  numParams['value'].min <= -999 && numParams['value'].max >= 999);

  // engine.dropNode — data nodes go alive immediately (mock evalBridge)
  var _orig = evalBridge.dispatch;
  evalBridge.dispatch = function() { return Promise.resolve({ ok: true }); };
  graphState.clearGraph();

  var colorNode = engine.dropNode('data/color', 100, 100);
  assert('dropNode data/color returns nodeData',    colorNode !== null);
  assert('dropNode data/color goes alive on drop',  graphState.getNode(colorNode.id).state === 'alive');

  var numberNode = engine.dropNode('data/number', 200, 100);
  assert('dropNode data/number goes alive on drop', graphState.getNode(numberNode.id).state === 'alive');

  evalBridge.dispatch = _orig;
  graphState.clearGraph();

  // All node types now registered
  var types = nodeRegistry.listTypes();
  var found = {};
  for (var t = 0; t < types.length; t++) found[types[t]] = true;
  assert('data/color registered',  found['data/color']  === true);
  assert('data/number registered', found['data/number'] === true);

  console.log('---');
  console.log('Data nodes:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before AE verification.**

**STOP. Paste console output. Wait for confirmation.**

---

### AE integration verification — in After Effects

1. Drop a Text node → wire to Comp node. Text goes alive.
2. Drop a Fill effect node → wire Fill `layer_in` to Text `output`.
   - Fill applies to text layer in AE.
3. Drop a Color node from the palette.
   - Color node appears on canvas immediately in `alive` state (no wire needed — data nodes are always alive).
4. Drag a wire from Color node's output port → drop on Fill node's extendable newborn slot.
   - Picker appears. Select `color` param.
   - Wire committed. Fill's color param shows locked (yellow `is-wired` indicator in inspector).
5. Change Color node's color param in the inspector to pure red `[1, 0, 0, 1]`.
   - After 300ms debounce, Fill effect's color in AE updates to red.
6. Drop a Number node. Wire its output → Fill node's next newborn slot.
   - Picker appears. Select `opacity` param.
   - Wire committed. Fill's opacity param locked.
7. Change Number node's value to `50`.
   - Fill effect opacity in AE updates to 50 after debounce.
8. Disconnect the Color node wire from Fill.
   - Fill's color param unlocks in inspector (no longer `is-wired`).
   - Color param reverts to the Fill node's own stored color value.
   - No AE call needed — the next Fill dirty flush sends its own color value.
9. Delete the Number node.
   - Removed from canvas. No AE errors. Fill's opacity unlocks.

**Checklist:**
- [ ] Color node appears alive immediately on canvas drop (no wiring needed)
- [ ] Number node appears alive immediately on canvas drop
- [ ] Picker appears when wiring Color → Fill newborn slot
- [ ] `color` param listed in picker for Color wire
- [ ] `opacity`, `blendingMode` listed in picker for Number wire (number type match)
- [ ] Changing Color node color drives Fill effect color in AE after debounce
- [ ] Changing Number node value drives Fill effect opacity in AE after debounce
- [ ] Disconnecting data wire unlocks the param in inspector
- [ ] Deleting a data node causes no AE errors and no cascade

**STOP. Describe what you see in AE. Wait for confirmation.**

---

## Additional Rules for This Task

**Data nodes are always `alive` after drop — no comp path required.** The `nodeKind === 'data'` check in `engine.dropNode` is the third and final permitted node-type conditional in the engine (after CompNode's `onDrop` command and effector `upstreamNodeUUID` resolution). It is architecturally necessary because the standard alive/ghost lifecycle does not apply to data nodes.

**All five lifecycle hooks return `null`.** Data nodes never dispatch any AE call. `onAlive` returns `null` because there is no AE object to create. `onGhost` returns `null` because cascade never reaches data nodes (data wires don't trigger cascade — TASK-07 rule). `onDelete` returns `null` because there is nothing to clean up in AE.

**`deleteNode` in the engine must skip the ghost step for data nodes.** The existing `deleteNode` calls `onGhost` before `onDelete` for alive nodes. Data nodes have no ghost step — skip straight to `graphState.removeNode`. The brief specifies the exact guard to add.

**`_resolveParamValue` reads from the source node's first non-label param.** This is a convention: ColorNode outputs its `color` param, NumberNode outputs its `value` param. The resolver finds the first param whose key is not `'label'` — this works for both current data nodes and any future data nodes that follow the same convention (one meaningful output param after the label).

**Data wire disconnection does not reset the downstream node's prop.** When the Color wire to Fill is disconnected, Fill's own `props.color` is still there unchanged — the last value the user set in Fill's inspector. On the next flush, `_resolveParamValue` finds no bound wire and returns `nodeData.props['color']` — Fill's own value. No explicit reset needed.

**The picker shows only params whose type matches the wire's data type.** `wireValidator.getPickerParams` already filters by type. A Color node output (type `'color'`) only shows `color` params in the picker. A Number node output (type `'number'`) shows `opacity`, `blurriness`, `distance`, etc. This filtering was built in TASK-08 — verify it works correctly for these new data types.

**No ES6+** throughout both node definition files and the engine/flusher updates.

---

## On Completion

When both verification phases pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-17 COMPLETE

graph/nodes/categories/data/Color.js     ✅  [N tests passed]
graph/nodes/categories/data/Number.js    ✅  [N tests passed]
graph/engine.js                          ✅  data node alive-on-drop + dirty propagation
flush/dirtyFlusher.js                    ✅  _resolveParamValue + data wire value sourcing

AE integration verified:
  Color → Fill color wire drives AE effect in real time.
  Number → Fill opacity wire drives AE effect in real time.
  Disconnect + delete both clean up correctly.

Next task: TASK-18 — ui/layerOrderList.js
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-17-DATA-NODES.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 9, 10, 12 — PROCEDIA-V4-ARCHITECTURE.md Sections 1a, 3b, 3c*
