# TASK-08 — portManager.js, wireValidator.js, dirtyFlusher.js, engine.setNodeProperty
*Procedia v4 — Eighth task. Builds on completed TASK-01 through TASK-07.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 9, 10, 12, 13 in full
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 3b, 3c, 6, 8, and 10 in full

Confirm both files are present at repo root before starting.

---

## Context

This task completes the last four pieces of pure graph logic before moving to canvas rendering:

| File | What it does |
|---|---|
| `graph/portManager.js` | Manages extendable port slot counts. Called after every wire connect/disconnect to spawn or remove slots. |
| `graph/wireValidator.js` | Validates wire type compatibility before a connection is confirmed. Used by `engine.connectWire`. |
| `flush/dirtyFlusher.js` | Debounces inspector property changes 300ms, then flushes them to AE. |
| `graph/engine.js` | Replace `setNodeProperty` stub with real implementation. |

All four are pure JS — no AE calls in portManager or wireValidator, minimal AE calls in dirtyFlusher. All testable in the browser console.

---

## What This Task Does NOT Do

- No canvas rendering
- No inspector UI wiring
- No persistence reads or writes
- No dispatcher changes
- No new node definition files

Files touched: `graph/portManager.js`, `graph/wireValidator.js`, `flush/dirtyFlusher.js`, `graph/engine.js` (stub replacement only).

---

## PHASE 1 — `graph/portManager.js`

### What it is

Manages the slot count for extendable input ports. After a wire is connected or disconnected, the engine calls `portManager` to update `portSlots` on the node and determine if a new empty slot should spawn or an empty slot should be removed.

`portSlots` in `nodeMap` stores: `{ portId: currentSlotCount }` for each extendable port. The slot count represents the total number of rendered slots including the one empty slot always visible at the end.

### Public API

| Function | Signature | Returns | Description |
|---|---|---|---|
| `afterConnect` | `(nodeId, portId)` | `void` | Called after a wire is connected to an extendable slot. Spawns a new empty slot if needed. |
| `afterDisconnect` | `(nodeId, portId)` | `void` | Called after a wire is disconnected from an extendable slot. Removes the trailing empty slot if count allows. |
| `getOpenSlot` | `(nodeId, portId)` | `string` | Returns the slot name of the current empty (unoccupied) slot. e.g. `'layer_in_2'` |
| `resolveSlotName` | `(portId, index)` | `string` | Returns the slot name for a given port and index. e.g. `resolveSlotName('layer_in', 2)` → `'layer_in_2'` |
| `isExtendable` | `(nodeId, portId)` | `boolean` | Returns true if the given port is declared extendable on the node's definition. |

### Rules

**Spawning rule:** After a wire fills a slot, `portSlots[portId]` is incremented by 1. The new slot is the empty one — it will be rendered by the canvas but accepts no wire yet.

**Removal rule:** After a wire is removed from a slot, count the remaining occupied slots for this portId in `wireMap` (wires where `toNode === nodeId` and `toPort` starts with `portId + '_'`). Set `portSlots[portId]` to `occupiedCount + 1` (the +1 keeps one empty slot visible). Minimum value is 1.

**Slot naming:** Slots are named `{portId}_{index}` where index is 0-based. `layer_in_0`, `layer_in_1`, `layer_in_2`.

**`getOpenSlot`:** The open slot index = `portSlots[portId] - 1`. The open slot is always the last one.

**Only extendable input ports are managed.** `portManager` does nothing for output ports, parent ports, or non-extendable input ports.

### Implementation shape

```javascript
// graph/portManager.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/engine.js, graph/wire/wire.js

var portManager = (function() {

  function isExtendable(nodeId, portId) {
    // get node definition from nodeRegistry using nodeData.type
    // find port in def.ports where id === portId
    // return port.extendable === true
    // return false if node or port not found
  }

  function resolveSlotName(portId, index) {
    // return portId + '_' + index
  }

  function getOpenSlot(nodeId, portId) {
    // get nodeData from graphState
    // openIndex = nodeData.portSlots[portId] - 1
    // return resolveSlotName(portId, openIndex)
  }

  function afterConnect(nodeId, portId) {
    // get nodeData
    // if !isExtendable(nodeId, portId) return
    // increment portSlots[portId] by 1
    // call graphState.updateNode(nodeId, { portSlots: updatedSlots })
  }

  function afterDisconnect(nodeId, portId) {
    // get nodeData
    // if !isExtendable(nodeId, portId) return
    // count occupied slots: scan wireMap for wires where toNode === nodeId
    //   and toPort starts with portId + '_'
    // newCount = occupiedCount + 1  (minimum 1)
    // call graphState.updateNode(nodeId, { portSlots: updatedSlots })
  }

  return {
    afterConnect:    afterConnect,
    afterDisconnect: afterDisconnect,
    getOpenSlot:     getOpenSlot,
    resolveSlotName: resolveSlotName,
    isExtendable:    isExtendable
  };

})();
```

Fill every function body completely.

---

### Phase 1 verification — browser console

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  graphState.clearGraph();

  // Add a comp node with extendable layer_in port
  graphState.addNode({ id: 'N-COMP', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'C', width: 1920, height: 1080, fps: 24, duration: 10, bgColor: [0,0,0] },
    hostingComps: [], portSlots: { 'layer_in': 1 } });

  // isExtendable
  assert('layer_in is extendable on comp', portManager.isExtendable('N-COMP', 'layer_in') === true);
  assert('output is not extendable on comp', portManager.isExtendable('N-COMP', 'output') === false);

  // resolveSlotName
  assert('resolveSlotName(layer_in, 0)', portManager.resolveSlotName('layer_in', 0) === 'layer_in_0');
  assert('resolveSlotName(layer_in, 2)', portManager.resolveSlotName('layer_in', 2) === 'layer_in_2');

  // getOpenSlot — portSlots.layer_in = 1 → open slot is index 0
  assert('getOpenSlot with count 1 returns layer_in_0',
    portManager.getOpenSlot('N-COMP', 'layer_in') === 'layer_in_0');

  // afterConnect — fill slot 0, count becomes 2, open slot is now index 1
  graphState.addWire({ id: 'W-1', type: 'layer', fromNode: 'N-TEXT', fromPort: 'output',
    toNode: 'N-COMP', toPort: 'layer_in_0', boundParam: null });
  portManager.afterConnect('N-COMP', 'layer_in');

  var afterConn = graphState.getNode('N-COMP');
  assert('afterConnect increments slot count',  afterConn.portSlots['layer_in'] === 2);
  assert('getOpenSlot after connect is layer_in_1',
    portManager.getOpenSlot('N-COMP', 'layer_in') === 'layer_in_1');

  // afterConnect again — fill slot 1, count becomes 3
  graphState.addWire({ id: 'W-2', type: 'layer', fromNode: 'N-TEXT2', fromPort: 'output',
    toNode: 'N-COMP', toPort: 'layer_in_1', boundParam: null });
  portManager.afterConnect('N-COMP', 'layer_in');
  assert('afterConnect again: count is 3',
    graphState.getNode('N-COMP').portSlots['layer_in'] === 3);

  // afterDisconnect — remove W-1, occupied = 1, newCount = 1 + 1 = 2
  graphState.removeWire('W-1');
  portManager.afterDisconnect('N-COMP', 'layer_in');
  assert('afterDisconnect recalculates count',
    graphState.getNode('N-COMP').portSlots['layer_in'] === 2);

  // afterDisconnect — remove W-2, occupied = 0, newCount = 0 + 1 = 1 (minimum)
  graphState.removeWire('W-2');
  portManager.afterDisconnect('N-COMP', 'layer_in');
  assert('afterDisconnect minimum count is 1',
    graphState.getNode('N-COMP').portSlots['layer_in'] === 1);

  // Non-extendable port — afterConnect is no-op
  var slotsBefore = graphState.getNode('N-COMP').portSlots['layer_in'];
  portManager.afterConnect('N-COMP', 'output');
  assert('afterConnect non-extendable port is no-op',
    graphState.getNode('N-COMP').portSlots['layer_in'] === slotsBefore);

  graphState.clearGraph();

  console.log('---');
  console.log('portManager:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before Phase 2.**

**STOP. Paste console output. Wait for confirmation.**

---

## PHASE 2 — `graph/wireValidator.js`

### What it is

Validates whether a wire connection is permitted before it is confirmed. Called by `engine.connectWire` before adding the wire to `wireMap`. Returns either `{ valid: true }` or `{ valid: false, reason: 'string' }`.

### Public API

| Function | Signature | Returns | Description |
|---|---|---|---|
| `validate` | `(fromNodeId, fromPort, toNodeId, toPort, wireType)` | `{ valid, reason }` | Full validation check. Returns `{ valid: true }` or `{ valid: false, reason }`. |
| `getPickerParams` | `(toNodeId, wireDataType)` | `array` | Returns filtered param list for the picker — params on toNode whose type matches `wireDataType`. |

### Validation rules — check in this exact order

1. **Both nodes exist** — `graphState.getNode(fromNodeId)` and `graphState.getNode(toNodeId)` must both return non-null. Reason on fail: `'Node not found'`.

2. **From-port exists on from-node definition** — the port with `id === fromPort` must exist in `def.ports`. Reason on fail: `'Source port not found'`.

3. **To-port exists on to-node definition** — the port with `id === toPort` OR the port base id matches (for extendable slots like `layer_in_0`). Strip the trailing `_N` index to find the base port id. Reason on fail: `'Target port not found'`.

4. **Port directions are compatible** — `fromPort` must be on a port with `category: 'output'` or `category: 'parent'`. `toPort` must be on a port with `category: 'input'` or `category: 'parent'`. Reason on fail: `'Invalid port direction'`.

5. **Wire types match** — `fromPort` type must equal `toPort` type. Exception: extendable newborn slots (the open slot) accept any `data` wire type — the picker assigns the type after. Reason on fail: `'Wire type mismatch'`.

6. **No self-wire** — `fromNodeId` must not equal `toNodeId`. Reason on fail: `'Cannot wire a node to itself'`.

7. **No duplicate wire** — no existing wire in `wireMap` with the same `fromNode + fromPort + toNode + toPort` combination. Reason on fail: `'Wire already exists'`.

8. **No cycle** (layer wires only) — call `cycleChecker.hasCycle(fromNodeId, toNodeId)`. Reason on fail: `'Connection would create a cycle'`.

9. **Same-comp constraint** (parent wires only) — both nodes must share at least one entry in `hostingComps`. Reason on fail: `'Both nodes must be alive in the same comp to parent'`.

### `getPickerParams(toNodeId, wireDataType)`

Returns the subset of params on `toNodeId`'s node definition whose `type` matches `wireDataType`. Used to populate the picker dropdown when a data wire is dropped onto a newborn extendable slot.

Returns `[]` if the node is not found or no params match.

### Implementation shape

```javascript
// graph/wireValidator.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cycleChecker.js
// MUST LOAD BEFORE: graph/engine.js, graph/wire/wire.js

var wireValidator = (function() {

  function _getBasePortId(portId) {
    // strip trailing _N index: 'layer_in_0' → 'layer_in', 'output' → 'output'
    // use lastIndexOf('_') and check if remainder after _ is a number
  }

  function _findPortDef(def, portId) {
    // find port in def.ports by id === portId
    // if not found, try matching by base id (_getBasePortId(portId))
    // return port def or null
  }

  function _isNewbornSlot(toNodeId, toPort) {
    // return true if toPort is the current open/empty slot on the node
    // use portManager.getOpenSlot(toNodeId, basePortId)
  }

  function validate(fromNodeId, fromPort, toNodeId, toPort, wireType) {
    // check rules 1-9 in order
    // return { valid: true } or { valid: false, reason: '...' }
  }

  function getPickerParams(toNodeId, wireDataType) {
    // get node definition
    // filter def.params by type === wireDataType
    // return filtered array or []
  }

  return {
    validate:        validate,
    getPickerParams: getPickerParams
  };

})();
```

Fill every function body completely.

---

### Phase 2 verification — browser console

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  graphState.clearGraph();

  // Setup nodes
  graphState.addNode({ id: 'N-TX', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'T', content: 'Hi', fontSize: 72, color: [1,1,1,1],
             position: [0,0], rotation: 0, opacity: 100 },
    hostingComps: ['N-CP'], portSlots: {} });

  graphState.addNode({ id: 'N-CP', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'C', width: 1920, height: 1080, fps: 24, duration: 10, bgColor: [0,0,0] },
    hostingComps: [], portSlots: { 'layer_in': 1 } });

  // Valid layer wire
  var r1 = wireValidator.validate('N-TX', 'output', 'N-CP', 'layer_in_0', 'layer');
  assert('valid layer wire',  r1.valid === true);

  // Self-wire
  var r2 = wireValidator.validate('N-TX', 'output', 'N-TX', 'layer_in_0', 'layer');
  assert('self-wire rejected',  r2.valid === false);
  assert('self-wire reason',    r2.reason === 'Cannot wire a node to itself');

  // Unknown from-node
  var r3 = wireValidator.validate('N-GHOST', 'output', 'N-CP', 'layer_in_0', 'layer');
  assert('unknown node rejected', r3.valid === false);
  assert('unknown node reason',   r3.reason === 'Node not found');

  // Wire type mismatch — data wire to a layer port
  var r4 = wireValidator.validate('N-TX', 'output', 'N-CP', 'layer_in_0', 'data');
  assert('type mismatch rejected', r4.valid === false);

  // Duplicate wire
  graphState.addWire({ id: 'W-DUP', type: 'layer', fromNode: 'N-TX', fromPort: 'output',
    toNode: 'N-CP', toPort: 'layer_in_0', boundParam: null });
  var r5 = wireValidator.validate('N-TX', 'output', 'N-CP', 'layer_in_0', 'layer');
  assert('duplicate wire rejected', r5.valid === false);
  assert('duplicate wire reason',   r5.reason === 'Wire already exists');
  graphState.removeWire('W-DUP');

  // Cycle
  graphState.addWire({ id: 'W-CYCLE', type: 'layer', fromNode: 'N-CP', fromPort: 'output',
    toNode: 'N-TX', toPort: 'layer_in_0', boundParam: null });
  var r6 = wireValidator.validate('N-TX', 'output', 'N-CP', 'layer_in_0', 'layer');
  assert('cycle rejected', r6.valid === false);
  assert('cycle reason',   r6.reason === 'Connection would create a cycle');
  graphState.removeWire('W-CYCLE');

  // Parent wire — same comp constraint PASS
  graphState.addNode({ id: 'N-NL', type: 'layers/null', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'N', position: [0,0], rotation: 0, opacity: 100, scale: [100,100] },
    hostingComps: ['N-CP'], portSlots: {} });

  var r7 = wireValidator.validate('N-TX', 'child_of', 'N-NL', 'parent_of', 'parent');
  assert('parent wire same comp valid', r7.valid === true);

  // Parent wire — different comp constraint FAIL
  graphState.addNode({ id: 'N-CP2', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'C2', width: 1920, height: 1080, fps: 24, duration: 10, bgColor: [0,0,0] },
    hostingComps: [], portSlots: { 'layer_in': 1 } });
  graphState.addNode({ id: 'N-TX2', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'T2', content: 'Hi', fontSize: 72, color: [1,1,1,1],
             position: [0,0], rotation: 0, opacity: 100 },
    hostingComps: ['N-CP2'], portSlots: {} });

  var r8 = wireValidator.validate('N-TX', 'child_of', 'N-TX2', 'parent_of', 'parent');
  assert('parent wire different comp rejected', r8.valid === false);
  assert('parent wire different comp reason',   r8.reason === 'Both nodes must be alive in the same comp to parent');

  // getPickerParams — text node, data type 'number'
  var pickerParams = wireValidator.getPickerParams('N-TX', 'number');
  assert('getPickerParams returns array',            Array.isArray(pickerParams));
  assert('getPickerParams filters by type number',   pickerParams.length > 0);
  var allNumber = true;
  for (var i = 0; i < pickerParams.length; i++) {
    if (pickerParams[i].type !== 'number') allNumber = false;
  }
  assert('getPickerParams all results are number type', allNumber);

  // getPickerParams — unknown type returns []
  var emptyParams = wireValidator.getPickerParams('N-TX', 'vector3');
  assert('getPickerParams unknown type returns []', emptyParams.length === 0);

  graphState.clearGraph();

  console.log('---');
  console.log('wireValidator:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before Phase 3.**

**STOP. Paste console output. Wait for confirmation.**

---

## PHASE 3 — `flush/dirtyFlusher.js`

### What it is

Listens for dirty nodes in `nodeMap` and flushes their pending property changes to AE after a 300ms debounce. Property changes are never structural — they do not rebuild `tempGraph` or trigger cascade. They only update values on live AE objects.

### How it integrates

The inspector calls `engine.setNodeProperty(nodeId, key, value)` (implemented in Phase 4). The engine calls `graphState.updateProp(nodeId, key, value)` which sets `dirty: true`. Then the engine calls `dirtyFlusher.schedule()`. After 300ms of no further changes, `dirtyFlusher` flushes all dirty nodes.

### Public API

| Function | Signature | Returns | Description |
|---|---|---|---|
| `schedule` | `()` | `void` | Resets the debounce timer. Call this after any `updateProp`. |
| `flush` | `()` | `void` | Immediately flushes all dirty nodes. Bypasses the debounce. Useful for testing. |
| `cancel` | `()` | `void` | Cancels any pending debounce timer without flushing. |

### Flush algorithm

```
flush():

1. Scan nodeMap for all nodes where dirty === true.
2. For each dirty node:
   a. Get the node definition from nodeRegistry.
   b. If node.state !== 'alive' — skip. Ghost nodes have no live AE object to update.
   c. For each key in node.props:
      — Call def.onPropertyChange(key, node.props[key], nodeData, hostingCompUUID)
        where hostingCompUUID = node.hostingComps[0]
        (if hostingComps is empty — skip this node)
      — Collect command objects into a batch array (skip nulls)
   d. If batch has entries — call evalBridge.dispatchBatch(batch)
      In .then(): call graphState.clearDirty(node.id)
      In .catch(): log error, do NOT clear dirty (will retry on next flush)
3. Do not call graphState.rebuildTempGraph() — dirty flush is not structural.
```

### Implementation shape

```javascript
// flush/dirtyFlusher.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js
// MUST LOAD BEFORE: index.js

var dirtyFlusher = (function() {

  var _timer = null;
  var DEBOUNCE_MS = 300;

  function flush() {
    // see algorithm above
  }

  function schedule() {
    // cancel any existing timer
    // set a new timer: setTimeout(flush, DEBOUNCE_MS)
    // store timer id in _timer
  }

  function cancel() {
    // clearTimeout(_timer)
    // _timer = null
  }

  return {
    schedule: schedule,
    flush:    flush,
    cancel:   cancel
  };

})();
```

Fill every function body completely.

---

### Phase 3 verification — browser console

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  // Mock evalBridge
  var _orig = evalBridge.dispatchBatch;
  var batchCalls = [];
  evalBridge.dispatchBatch = function(cmds) {
    batchCalls.push(cmds);
    return Promise.resolve({ ok: true, data: null, error: null });
  };

  graphState.clearGraph();

  // Add an alive text node
  graphState.addNode({ id: 'N-FLUSH', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'T', content: 'Hello', fontSize: 72, color: [1,1,1,1],
             position: [0,0], rotation: 0, opacity: 100 },
    hostingComps: ['N-COMP'], portSlots: {} });

  // Mark dirty via updateProp
  graphState.updateProp('N-FLUSH', 'fontSize', 48);
  assert('node is dirty after updateProp',
    graphState.getNode('N-FLUSH').dirty === true);

  // Immediate flush (bypass debounce for test)
  batchCalls = [];
  dirtyFlusher.flush();

  setTimeout(function() {
    assert('flush called dispatchBatch',   batchCalls.length === 1);
    assert('batch has commands',           batchCalls[0].length > 0);

    // All commands should be setLayerProperty
    var allCorrect = true;
    for (var i = 0; i < batchCalls[0].length; i++) {
      if (batchCalls[0][i].action !== 'setLayerProperty') allCorrect = false;
    }
    assert('all commands are setLayerProperty', allCorrect);

    // Dirty flag cleared after flush
    setTimeout(function() {
      assert('dirty flag cleared after flush',
        graphState.getNode('N-FLUSH').dirty === false);

      // Ghost node is skipped
      graphState.addNode({ id: 'N-GHOST', type: 'layers/text', nodeKind: 'affected',
        dedicated: false, state: 'ghost', dirty: false, x: 0, y: 0,
        props: { label: 'G', content: 'Ghost', fontSize: 36, color: [1,1,1,1],
                 position: [0,0], rotation: 0, opacity: 100 },
        hostingComps: [], portSlots: {} });
      graphState.updateProp('N-GHOST', 'fontSize', 24);

      batchCalls = [];
      dirtyFlusher.flush();

      setTimeout(function() {
        assert('ghost node not flushed to AE', batchCalls.length === 0);

        // schedule + cancel — timer cancelled, flush not called
        batchCalls = [];
        graphState.updateProp('N-FLUSH', 'opacity', 50);
        dirtyFlusher.schedule();
        dirtyFlusher.cancel();

        setTimeout(function() {
          assert('cancel prevents scheduled flush', batchCalls.length === 0);

          // Restore
          evalBridge.dispatchBatch = _orig;
          graphState.clearGraph();

          console.log('---');
          console.log('dirtyFlusher:', PASS, 'passed,', FAIL, 'failed');
          if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
        }, 400); // wait longer than DEBOUNCE_MS
      }, 100);
    }, 100);
  }, 100);

})();
```

**Zero failures required before Phase 4.**

**STOP. Paste console output. Wait for confirmation.**

---

## PHASE 4 — `engine.setNodeProperty` — replace stub

Find the stub in `graph/engine.js`:

```javascript
function setNodeProperty(nodeId, key, value) {
  console.log('[engine] setNodeProperty stub — not yet implemented');
}
```

Replace with the real implementation:

```javascript
function setNodeProperty(nodeId, key, value) {
  var nodeData = graphState.getNode(nodeId);
  if (!nodeData) {
    console.warn('[engine] setNodeProperty: node not found:', nodeId);
    return;
  }
  graphState.updateProp(nodeId, key, value);
  dirtyFlusher.schedule();
}
```

That is the complete implementation. `graphState.updateProp` sets the value and the dirty flag. `dirtyFlusher.schedule` starts the 300ms countdown.

---

### Phase 4 verification — browser console

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  graphState.clearGraph();

  graphState.addNode({ id: 'N-PROP', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'T', content: 'Hello', fontSize: 72, color: [1,1,1,1],
             position: [0,0], rotation: 0, opacity: 100 },
    hostingComps: ['N-C'], portSlots: {} });

  engine.setNodeProperty('N-PROP', 'fontSize', 96);
  assert('setNodeProperty updates prop value',
    graphState.getNode('N-PROP').props.fontSize === 96);
  assert('setNodeProperty sets dirty flag',
    graphState.getNode('N-PROP').dirty === true);

  // Unknown node — no throw
  var noThrow = true;
  try { engine.setNodeProperty('N-DOES-NOT-EXIST', 'fontSize', 10); }
  catch(e) { noThrow = false; }
  assert('setNodeProperty unknown node is no-op', noThrow);

  dirtyFlusher.cancel(); // clean up pending timer
  graphState.clearGraph();

  console.log('---');
  console.log('engine.setNodeProperty:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before closing this task.**

**STOP. Paste console output. Wait for confirmation.**

---

## Additional Rules for This Task

**`wireValidator` is called from `engine.connectWire`, not from the UI.** The engine already calls `cycleChecker.hasCycle` directly in TASK-06. Now that `wireValidator` exists, update `engine.connectWire` to call `wireValidator.validate(...)` instead of doing the individual checks inline. If `wireValidator.validate` returns `{ valid: false }`, `connectWire` logs `res.reason` and returns `false`. This replaces steps 2–9 of the `connectWire` algorithm from TASK-06 with a single `wireValidator.validate` call.

**`portManager` is called from `engine.connectWire` and `engine.disconnectWire`.** After confirming a wire and calling `graphState.addWire`, `engine.connectWire` must call `portManager.afterConnect(toNodeId, basePortId)`. After cascade removes a wire (inside `cascadeAlgorithm`), `portManager.afterDisconnect` must be called. Add this call to `cascadeAlgorithm` step 11 — after `graphState.removeWire(deletedWireId)`, call `portManager.afterDisconnect(wire.toNode, basePortId)` where `basePortId` is the base port id stripped of its index suffix.

**`dirtyFlusher.flush` batches ALL dirty props into ONE `dispatchBatch` call.** Do not call `evalBridge.dispatch` once per prop key. Collect all `onPropertyChange` command objects for all dirty nodes into a single array and send it in one call.

**Ghost nodes are skipped during flush.** A ghost node has no live AE object. Sending a `setLayerProperty` command for a parked layer would either fail silently or update the wrong layer. The check `node.state !== 'alive'` in the flush algorithm guards against this.

**`dirtyFlusher` does not clear `dirty` synchronously.** It clears it in the `.then()` callback of `evalBridge.dispatchBatch`. If the dispatch fails, `dirty` remains `true` and the next flush will retry. This is the intended retry behavior.

**No ES6+.** `var`, `for...in`, named functions throughout all four files.

---

## On Completion

When all four phase test scripts return zero failures, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-08 COMPLETE

graph/portManager.js              ✅  [N tests passed]
graph/wireValidator.js            ✅  [N tests passed]
flush/dirtyFlusher.js             ✅  [N tests passed]
graph/engine.js (setNodeProperty) ✅  [N tests passed]

engine.setNodeProperty stub replaced with real implementation.
engine.connectWire updated to use wireValidator.validate().
cascadeAlgorithm updated to call portManager.afterDisconnect().

Next task: TASK-09 — canvas viewport, renderer, and wire drawing
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-08-PORT-VALIDATOR-FLUSH.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 9, 10, 12, 13 — PROCEDIA-V4-ARCHITECTURE.md Sections 3b, 3c, 6, 8, 10*
