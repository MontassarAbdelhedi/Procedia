# TASK-08 — portManager.js, wireValidator.js, dirtyFlusher.js, engine.setNodeProperty
*Procedia v4 — Eighth task. Builds on completed TASK-01 through TASK-07.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 9, 10, 12, 13 in full
2. `arch_specs.md` — Sections 3b, 3c, 6, 8, and 10 in full

Confirm both files are present at repo root before starting.

---

## Context

This task completes the last four pieces of pure graph logic before moving to canvas rendering:

| File | What it does |
|---|---|
| `graph/portManager.js` | Manages wire counts on `capacity: 'infinite'` input ports only. Called by `engine.connectWire` and `engine.disconnectWire`. |
| `graph/wireValidator.js` | Validates wire type compatibility before a connection is confirmed. Enforces blending and matte wiring rules. Used by `engine.connectWire`. |
| `flush/dirtyFlusher.js` | Debounces inspector property changes 300ms, then flushes them to AE via individual `evalBridge.dispatch` calls. |
| `graph/engine.js` | Replace `setNodeProperty` stub with real implementation. Update `connectWire` to call `wireValidator.canConnect` and `portManager`. Update secondary port resolution to use `graphState.updateNode` directly. |

All four are pure JS — no AE calls in portManager or wireValidator, minimal AE calls in dirtyFlusher. All testable in the browser console.

---

## Port Capacity Model — Read This First

The `extendable` field on port definitions is replaced in full by `capacity`. Every port declaration must use `capacity` going forward. There are exactly two values:

| Value | Meaning |
|---|---|
| `'single'` | This port accepts exactly one wire. A second wire to the same port is rejected by `wireValidator`. |
| `'infinite'` | This port accepts any number of wires. Each wire connects to the same logical port id — no slot indexing beyond what `portManager` tracks for rendering purposes. |

`capacity` applies to both input and output ports. In practice:
- All `output` ports are `capacity: 'single'` — one downstream consumer per output.
- All `mainInput` and `secondaryInput` ports are `capacity: 'single'` — one wire per static input port.
- CompNode's `layer_in` input port is `capacity: 'infinite'` — receives unlimited layer wires.

**Node definition authors:** replace every `extendable: true` with `capacity: 'infinite'` and every `extendable: false` with `capacity: 'single'`. The `extendable` field is defunct and must not appear in any port definition.

**`portManager` scope:** `portManager` only manages `capacity: 'infinite'` ports. It tracks how many wires are currently connected so the renderer knows how many port rows to draw. It does not manage secondary input ports on effector nodes — those are static once written by the schema resolution path.

**Secondary ports on effector nodes:** When `engine.js` resolves a dynamic schema (after `schemaCache.getSchema` or `introspectEffect`), it writes the resolved secondary port definitions directly onto the node via `graphState.updateNode(nodeId, { secondaryPorts: resolvedPorts })`. No `portManager` call is involved. `secondaryPorts` is a plain array of port definition objects, rendered statically by the canvas — there is no slot count, no empty trailing slot, and no wire-count tracking for these ports.

---

## What This Task Does NOT Do

- No canvas rendering
- No inspector UI wiring
- No persistence reads or writes
- No dispatcher changes
- No new node definition files

Files touched: `graph/portManager.js`, `graph/wireValidator.js`, `flush/dirtyFlusher.js`, `graph/engine.js` (stub replacement, `connectWire` update, secondary port resolution update).

---

## PHASE 1 — `graph/portManager.js`

### What it is

Tracks the wire count on `capacity: 'infinite'` input ports so the renderer knows how many port rows to draw. After a wire is connected or disconnected on an infinite-capacity port, the engine calls `portManager` to update `portSlots` on the node.

`portSlots` in `nodeMap` stores `{ portId: wireCount }` for each `capacity: 'infinite'` port. This is a simple count of how many wires are currently connected — the renderer uses it to know how many rows to display.

`portManager` has no involvement with `secondaryInput` ports on effector nodes. Those are written statically by `engine.js` during schema resolution.

### Public API

| Function | Signature | Returns | Description |
|---|---|---|---|
| `afterConnect` | `(nodeId, portId)` | `void` | Called by `engine.connectWire` after a wire is added to a `capacity: 'infinite'` port. Increments `portSlots[portId]` by 1. |
| `afterDisconnect` | `(nodeId, portId)` | `void` | Called by `engine.disconnectWire` after a wire is removed from a `capacity: 'infinite'` port. Decrements by counting remaining connected wires. Minimum value is 0. |
| `getWireCount` | `(nodeId, portId)` | `number` | Returns the current number of wires connected to this port. |
| `resolveSlotName` | `(portId, index)` | `string` | Returns the display slot name for a given port and index. e.g. `resolveSlotName('layer_in', 2)` → `'layer_in_2'`. Used by renderer for labelling. |

### Rules

**`afterConnect`:** Increment `portSlots[portId]` by 1. Call `graphState.updateNode`. Only acts if `port.capacity === 'infinite'` on the node definition. No-op otherwise.

**`afterDisconnect`:** Count remaining wires in `wireMap` where `toNode === nodeId` and `toPort` starts with `portId`. Set `portSlots[portId]` to that count. Minimum is 0. Call `graphState.updateNode`. Only acts if `port.capacity === 'infinite'`. No-op otherwise.

**Wire matching for `afterDisconnect`:** Because infinite-capacity ports accept wires directly to the base port id (e.g. `'layer_in'`), match wires where `toPort === portId` OR `toPort` starts with `portId + '_'`. This covers both bare and indexed references if either form appears in `wireMap`.

**`resolveSlotName`:** Pure string utility. Returns `portId + '_' + index`. No graph reads.

### Implementation shape

```javascript
// graph/portManager.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/engine.js, graph/wire/wire.js

var portManager = (function() {

  function _isInfinite(nodeId, portId) {
    // get nodeData from graphState, then def from nodeRegistry using nodeData.type
    // find port in def.ports where id === portId
    // return port.capacity === 'infinite'
    // return false if node, def, or port not found
  }

  function _countConnectedWires(nodeId, portId) {
    // iterate wireMap
    // count wires where toNode === nodeId
    //   AND (toPort === portId OR toPort starts with portId + '_')
    // return count
  }

  function resolveSlotName(portId, index) {
    // return portId + '_' + index
  }

  function getWireCount(nodeId, portId) {
    // get nodeData from graphState
    // return nodeData.portSlots[portId] || 0
  }

  function afterConnect(nodeId, portId) {
    // if !_isInfinite(nodeId, portId) return
    // get nodeData
    // var slots = nodeData.portSlots or {}
    // slots[portId] = (slots[portId] || 0) + 1
    // call graphState.updateNode(nodeId, { portSlots: slots })
  }

  function afterDisconnect(nodeId, portId) {
    // if !_isInfinite(nodeId, portId) return
    // var count = _countConnectedWires(nodeId, portId)
    // get nodeData
    // var slots = nodeData.portSlots or {}
    // slots[portId] = count  (minimum 0)
    // call graphState.updateNode(nodeId, { portSlots: slots })
  }

  return {
    afterConnect:    afterConnect,
    afterDisconnect: afterDisconnect,
    getWireCount:    getWireCount,
    resolveSlotName: resolveSlotName
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

  // CompNode has capacity:'infinite' on layer_in
  graphState.addNode({ id: 'N-COMP', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'C', width: 1920, height: 1080, fps: 24, duration: 10, bgColor: [0,0,0] },
    hostingComps: [], portSlots: { 'layer_in': 0 } });

  // resolveSlotName
  assert('resolveSlotName(layer_in, 0)', portManager.resolveSlotName('layer_in', 0) === 'layer_in_0');
  assert('resolveSlotName(layer_in, 2)', portManager.resolveSlotName('layer_in', 2) === 'layer_in_2');

  // getWireCount — starts at 0
  assert('getWireCount before any wires is 0',
    portManager.getWireCount('N-COMP', 'layer_in') === 0);

  // afterConnect — wire added, count becomes 1
  graphState.addWire({ id: 'W-1', type: 'layer', fromNode: 'N-TX1', fromPort: 'output',
    toNode: 'N-COMP', toPort: 'layer_in', boundParam: null });
  portManager.afterConnect('N-COMP', 'layer_in');
  assert('afterConnect increments count to 1',
    portManager.getWireCount('N-COMP', 'layer_in') === 1);

  // afterConnect again — count becomes 2
  graphState.addWire({ id: 'W-2', type: 'layer', fromNode: 'N-TX2', fromPort: 'output',
    toNode: 'N-COMP', toPort: 'layer_in', boundParam: null });
  portManager.afterConnect('N-COMP', 'layer_in');
  assert('afterConnect again: count is 2',
    portManager.getWireCount('N-COMP', 'layer_in') === 2);

  // afterDisconnect — remove W-1, remaining = 1
  graphState.removeWire('W-1');
  portManager.afterDisconnect('N-COMP', 'layer_in');
  assert('afterDisconnect after removing one wire: count is 1',
    portManager.getWireCount('N-COMP', 'layer_in') === 1);

  // afterDisconnect — remove W-2, remaining = 0
  graphState.removeWire('W-2');
  portManager.afterDisconnect('N-COMP', 'layer_in');
  assert('afterDisconnect after removing all wires: count is 0',
    portManager.getWireCount('N-COMP', 'layer_in') === 0);

  // Non-infinite port — afterConnect is no-op
  var slotsBefore = JSON.stringify(graphState.getNode('N-COMP').portSlots);
  portManager.afterConnect('N-COMP', 'output');
  assert('afterConnect on non-infinite port is no-op',
    JSON.stringify(graphState.getNode('N-COMP').portSlots) === slotsBefore);

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

Also enforces two structural rules that are type-level constraints:
- **Blending rule:** A blending node's `main_input` port only accepts wires directly from an affected node's `output` port. Wires from effector outputs are rejected.
- **Matte rule:** A matte node goes alive only when all three conditions are simultaneously met (both input wires connected, both upstream layers sharing the same first-level hosting comp, output wired to that same comp). `wireValidator` enforces this on each connection attempt and returns `{ valid: false, reason }` if any condition is unmet.

### Public API

| Function | Signature | Returns | Description |
|---|---|---|---|
| `canConnect` | `(fromNodeId, fromPort, toNodeId, toPort, wireType)` | `{ valid, reason }` | Full validation check. Returns `{ valid: true }` or `{ valid: false, reason }`. |
| `filterPickerList` | `(wireType, nodeList)` | `array` | Returns the subset of `nodeList` whose node definitions include at least one `mainInput` port compatible with `wireType`. Used to populate the wire-drop picker on empty canvas. |

### Validation rules — check in this exact order

1. **Both nodes exist** — `graphState.getNode(fromNodeId)` and `graphState.getNode(toNodeId)` must both return non-null. Reason on fail: `'Node not found'`.

2. **From-port exists on from-node definition** — the port with `id === fromPort` must exist in `def.ports`. Reason on fail: `'Source port not found'`.

3. **To-port exists on to-node definition** — the port with `id === toPort` must exist in `def.ports`. For `capacity: 'infinite'` ports, the wire connects directly to the base port id (e.g. `'layer_in'`) — no slot indexing. Reason on fail: `'Target port not found'`.

4. **Port directions are compatible** — `fromPort` must be on a port with `category: 'output'` or `category: 'parent'`. `toPort` must be on a port with `category: 'mainInput'`, `category: 'secondaryInput'`, or `category: 'parent'`. Reason on fail: `'Invalid port direction'`.

5. **Wire types match** — `fromPort.type` must equal `toPort.type`. No exceptions. Reason on fail: `'Wire type mismatch'`.

6. **Single-capacity port already occupied** — if `toPort.capacity === 'single'`, check that no existing wire in `wireMap` has `toNode === toNodeId` and `toPort === toPort`. Reason on fail: `'Port already has a connected wire'`.

7. **No self-wire** — `fromNodeId` must not equal `toNodeId`. Reason on fail: `'Cannot wire a node to itself'`.

8. **No duplicate wire** — no existing wire in `wireMap` with the same `fromNode + fromPort + toNode + toPort` combination. Reason on fail: `'Wire already exists'`.

9. **No cycle** (layer wires only) — call `cycleChecker.hasCycle(fromNodeId, toNodeId)`. Reason on fail: `'Connection would create a cycle'`.

10. **Same-comp constraint** (parent wires only) — both nodes must share at least one entry in `hostingComps`. Reason on fail: `'Both nodes must be alive in the same comp to parent'`.

11. **Blending rule** (blending node `main_input` only) — if `toNodeId` resolves to a node of `nodeKind: 'blending'` and `toPort` is `'main_input'`: verify that `fromNode.nodeKind === 'affected'`. Reject if the source node is an effector, data, blending, or matte node. Reason on fail: `'Blending node input must come directly from an affected node'`.

12. **Matte three-condition rule** (matte node ports only) — if `toNodeId` resolves to a node of `nodeKind: 'matte'`: after this wire is provisionally considered, check all three conditions simultaneously. If any condition is unmet, return `{ valid: false, reason }` with the specific unmet condition. Conditions: (a) both `top_layer` and `matte_layer` input wires would be connected; (b) both upstream layers share the same first-level hosting comp; (c) the matte node's output wire connects to that same comp. Reason on fail: `'Matte conditions not met: [specific condition]'`.

### `filterPickerList(wireType, nodeList)`

Returns the subset of `nodeList` (an array of node data objects) whose node definitions include at least one port whose `type` matches `wireType` and whose `category` is `'mainInput'`. Used to populate the picker dropdown when a wire is dropped onto empty canvas (see arch_specs §19).

Returns `[]` if `nodeList` is empty or no nodes match.

### Implementation shape

```javascript
// graph/wireValidator.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cycleChecker.js
// MUST LOAD BEFORE: graph/engine.js, graph/wire/wire.js

var wireValidator = (function() {

  function _findPortDef(def, portId) {
    // find port in def.ports where id === portId
    // return port def or null
  }

  function canConnect(fromNodeId, fromPort, toNodeId, toPort, wireType) {
    // check rules 1-12 in order
    // return { valid: true } or { valid: false, reason: '...' }
  }

  function filterPickerList(wireType, nodeList) {
    // for each node in nodeList, get its definition from nodeRegistry
    // include the node if def.ports contains at least one port with
    //   type === wireType AND category === 'mainInput'
    // return filtered array or []
  }

  return {
    canConnect:       canConnect,
    filterPickerList: filterPickerList
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

  graphState.addNode({ id: 'N-TX', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'T', content: 'Hi', fontSize: 72, color: [1,1,1,1],
             position: [0,0], rotation: 0, opacity: 100 },
    hostingComps: ['N-CP'], portSlots: {} });

  graphState.addNode({ id: 'N-CP', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'C', width: 1920, height: 1080, fps: 24, duration: 10, bgColor: [0,0,0] },
    hostingComps: [], portSlots: { 'layer_in': 0 } });

  // Valid layer wire to infinite-capacity port
  var r1 = wireValidator.canConnect('N-TX', 'output', 'N-CP', 'layer_in', 'layer');
  assert('valid layer wire to infinite-capacity port', r1.valid === true);

  // Second wire to same infinite-capacity port — allowed
  graphState.addWire({ id: 'W-EXIST', type: 'layer', fromNode: 'N-TX', fromPort: 'output',
    toNode: 'N-CP', toPort: 'layer_in', boundParam: null });
  graphState.addNode({ id: 'N-TX3', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'T3', content: 'Hi', fontSize: 72, color: [1,1,1,1],
             position: [0,0], rotation: 0, opacity: 100 },
    hostingComps: ['N-CP'], portSlots: {} });
  var r1b = wireValidator.canConnect('N-TX3', 'output', 'N-CP', 'layer_in', 'layer');
  assert('second wire to infinite-capacity port is valid', r1b.valid === true);
  graphState.removeWire('W-EXIST');

  // Self-wire
  var r2 = wireValidator.canConnect('N-TX', 'output', 'N-TX', 'layer_in', 'layer');
  assert('self-wire rejected',  r2.valid === false);
  assert('self-wire reason',    r2.reason === 'Cannot wire a node to itself');

  // Unknown from-node
  var r3 = wireValidator.canConnect('N-GHOST', 'output', 'N-CP', 'layer_in', 'layer');
  assert('unknown node rejected', r3.valid === false);
  assert('unknown node reason',   r3.reason === 'Node not found');

  // Wire type mismatch — data wire to a layer port
  var r4 = wireValidator.canConnect('N-TX', 'output', 'N-CP', 'layer_in', 'data');
  assert('type mismatch rejected', r4.valid === false);
  assert('type mismatch reason',   r4.reason === 'Wire type mismatch');

  // Single-capacity port already occupied
  graphState.addNode({ id: 'N-FX', type: 'effects/fill', nodeKind: 'effector', dedicated: false,
    state: 'alive', dirty: false, x: 0, y: 0, props: {}, hostingComps: ['N-CP'], portSlots: {} });
  graphState.addWire({ id: 'W-FX', type: 'layer', fromNode: 'N-TX', fromPort: 'output',
    toNode: 'N-FX', toPort: 'main_input', boundParam: null });
  var r4b = wireValidator.canConnect('N-TX3', 'output', 'N-FX', 'main_input', 'layer');
  assert('single-capacity port already occupied rejected', r4b.valid === false);
  assert('single-capacity port reason',
    r4b.reason === 'Port already has a connected wire');
  graphState.removeWire('W-FX');

  // Duplicate wire
  graphState.addWire({ id: 'W-DUP', type: 'layer', fromNode: 'N-TX', fromPort: 'output',
    toNode: 'N-CP', toPort: 'layer_in', boundParam: null });
  var r5 = wireValidator.canConnect('N-TX', 'output', 'N-CP', 'layer_in', 'layer');
  assert('duplicate wire rejected', r5.valid === false);
  assert('duplicate wire reason',   r5.reason === 'Wire already exists');
  graphState.removeWire('W-DUP');

  // Cycle
  graphState.addWire({ id: 'W-CYCLE', type: 'layer', fromNode: 'N-CP', fromPort: 'output',
    toNode: 'N-TX', toPort: 'main_input', boundParam: null });
  var r6 = wireValidator.canConnect('N-TX', 'output', 'N-CP', 'layer_in', 'layer');
  assert('cycle rejected', r6.valid === false);
  assert('cycle reason',   r6.reason === 'Connection would create a cycle');
  graphState.removeWire('W-CYCLE');

  // Parent wire — same comp valid
  graphState.addNode({ id: 'N-NL', type: 'layers/null', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'N', position: [0,0], opacity: 100 },
    hostingComps: ['N-CP'], portSlots: {} });
  var r7 = wireValidator.canConnect('N-TX', 'child_of', 'N-NL', 'parent_of', 'parent');
  assert('parent wire same comp valid', r7.valid === true);

  // Parent wire — different comp rejected
  graphState.addNode({ id: 'N-CP2', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'C2', width: 1920, height: 1080, fps: 24, duration: 10, bgColor: [0,0,0] },
    hostingComps: [], portSlots: { 'layer_in': 0 } });
  graphState.addNode({ id: 'N-TX2', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'T2', content: 'Hi', fontSize: 72, color: [1,1,1,1],
             position: [0,0], rotation: 0, opacity: 100 },
    hostingComps: ['N-CP2'], portSlots: {} });
  var r8 = wireValidator.canConnect('N-TX', 'child_of', 'N-TX2', 'parent_of', 'parent');
  assert('parent wire different comp rejected', r8.valid === false);
  assert('parent wire different comp reason',
    r8.reason === 'Both nodes must be alive in the same comp to parent');

  // Blending rule — effector output into blending main_input rejected
  graphState.addNode({ id: 'N-BL', type: 'utility/blending', nodeKind: 'blending', dedicated: false,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'Blending', mode: 'NORMAL' }, hostingComps: ['N-CP'], portSlots: {} });
  var r9 = wireValidator.canConnect('N-FX', 'output', 'N-BL', 'main_input', 'layer');
  assert('effector → blending main_input rejected', r9.valid === false);
  assert('blending rule reason contains "affected"', r9.reason.indexOf('affected') !== -1);

  // Blending rule — affected output into blending main_input accepted
  var r10 = wireValidator.canConnect('N-TX', 'output', 'N-BL', 'main_input', 'layer');
  assert('affected → blending main_input valid', r10.valid === true);

  // filterPickerList
  var nodeList = [graphState.getNode('N-TX'), graphState.getNode('N-CP'), graphState.getNode('N-BL')];
  var filtered = wireValidator.filterPickerList('layer', nodeList);
  assert('filterPickerList returns array', Array.isArray(filtered));
  assert('filterPickerList includes nodes with layer mainInput', filtered.length > 0);

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

The key call flow from `structure.md` is:

```
ui/inspector.js
  └─ graphState.updateProp(uuid, key, value)
       └─ dirtyFlusher.schedule()
            └─ [300ms debounce] dirtyFlusher.flush()
                 ├─ node.onPropertyChange(key, value, nodeData, hostingCompUUID)
                 └─ evalBridge.dispatch(commandObj)
                      └─ dispatcher.jsx: actionSetLayerProperty() → AE API
```

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
   c. If node.hostingComps is empty — skip.
   d. hostingCompUUID = node.hostingComps[0]
   e. For each key in node.props:
      — Call def.onPropertyChange(key, node.props[key], nodeData, hostingCompUUID)
        [for effectors: also pass upstreamNodeUUID as 3rd arg — resolve from wireMap]
      — If the returned command is non-null, call evalBridge.dispatch(command)
      — In .then(): call graphState.clearDirty(node.id) once all props are dispatched
      — In .catch(): log error, do NOT clear dirty (will retry on next flush)
3. Do not call graphState.rebuildTempGraph() — dirty flush is not structural.
```

Note: `dirtyFlusher` calls `evalBridge.dispatch` (single dispatch) per node, not `dispatchBatch`. One `dispatch` call per dirty node, dispatching the commands for all changed props in sequence. This matches the declared dependency in `structure.md`: `Calls: nodeRegistry.getDefinition(), evalBridge.dispatch()`.

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
    // use for...in to iterate nodeMap — no Object.keys(), no forEach()
    // use var declarations throughout — no const or let
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

  // Mock evalBridge.dispatch
  var _orig = evalBridge.dispatch;
  var dispatchCalls = [];
  evalBridge.dispatch = function(cmd) {
    dispatchCalls.push(cmd);
    return Promise.resolve({ ok: true, data: null, error: null });
  };

  graphState.clearGraph();

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
  dispatchCalls = [];
  dirtyFlusher.flush();

  setTimeout(function() {
    assert('flush called dispatch at least once', dispatchCalls.length > 0);

    var allCorrect = true;
    for (var i = 0; i < dispatchCalls.length; i++) {
      if (dispatchCalls[i].action !== 'setLayerProperty') allCorrect = false;
    }
    assert('all dispatch commands are setLayerProperty', allCorrect);

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

      dispatchCalls = [];
      dirtyFlusher.flush();

      setTimeout(function() {
        assert('ghost node not flushed to AE', dispatchCalls.length === 0);

        // schedule + cancel
        dispatchCalls = [];
        graphState.updateProp('N-FLUSH', 'opacity', 50);
        dirtyFlusher.schedule();
        dirtyFlusher.cancel();

        setTimeout(function() {
          assert('cancel prevents scheduled flush', dispatchCalls.length === 0);

          evalBridge.dispatch = _orig;
          graphState.clearGraph();

          console.log('---');
          console.log('dirtyFlusher:', PASS, 'passed,', FAIL, 'failed');
          if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
        }, 400);
      }, 100);
    }, 100);
  }, 100);

})();
```

**Zero failures required before Phase 4.**

**STOP. Paste console output. Wait for confirmation.**

---

## PHASE 4 — `engine.js` updates

### 4a — Replace `setNodeProperty` stub

Find the stub in `graph/engine.js`:

```javascript
function setNodeProperty(nodeId, key, value) {
  console.log('[engine] setNodeProperty stub — not yet implemented');
}
```

Replace with:

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

`graphState.updateProp` sets the value and the dirty flag. `dirtyFlusher.schedule` starts the 300ms countdown.

### 4b — Update `connectWire` to use `wireValidator.canConnect`

The existing `engine.connectWire` performs individual validation checks inline. Replace those inline checks with a single call:

```javascript
// Inside engine.connectWire, replace inline validation with:
var validation = wireValidator.canConnect(fromNodeId, fromPort, toNodeId, toPort, wireType);
if (!validation.valid) {
  console.warn('[engine] connectWire rejected:', validation.reason);
  return false;
}
// proceed with graphState.addWire, portManager.afterConnect, _firePathCreation, etc.
```

After `graphState.addWire` succeeds, call `portManager.afterConnect(toNodeId, toPort)` — but only if the target port has `capacity: 'infinite'`. `portManager.afterConnect` already performs this check internally, so the call is unconditional.

### 4c — Update `disconnectWire` to call `portManager.afterDisconnect`

After `graphState.removeWire(wireId)` completes in `engine.disconnectWire`, call `portManager.afterDisconnect(wire.toNode, wire.toPort)`. `portManager.afterDisconnect` no-ops if the port is not `capacity: 'infinite'`.

`cascadeAlgorithm` has no dependency on `portManager` and must not be modified in this task.

### 4d — Update secondary port resolution to use `graphState.updateNode` directly

Find the location in `engine.js` where dynamic schema resolution writes secondary ports onto effector nodes (the path that fires after `schemaCache.getSchema` or `introspectEffect` resolves). Replace any `portManager.spawnSlot` calls in that path with a direct `graphState.updateNode` call:

```javascript
// After schema is resolved for an effector node:
// schema.properties is an array of { matchName, label, type, defaultValue }

var secondaryPorts = [];
var initialProps = {};
for (var i = 0; i < schema.properties.length; i++) {
  var prop = schema.properties[i];
  secondaryPorts.push({
    id:       prop.matchName,
    category: 'secondaryInput',
    type:     'data',
    capacity: 'single',
    label:    prop.label
  });
  initialProps[prop.matchName] = prop.defaultValue;
}

graphState.updateNode(nodeId, {
  secondaryPorts: secondaryPorts,
  dynamicSchema:  schema,
  props:          initialProps
});

// No portManager call. No slot count tracking. secondaryPorts is rendered statically.
```

`secondaryPorts` on a node is a plain array of port definition objects. The renderer reads it directly — there is no `portSlots` entry for these ports.

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

  // setNodeProperty
  engine.setNodeProperty('N-PROP', 'fontSize', 96);
  assert('setNodeProperty updates prop value',
    graphState.getNode('N-PROP').props.fontSize === 96);
  assert('setNodeProperty sets dirty flag',
    graphState.getNode('N-PROP').dirty === true);

  var noThrow = true;
  try { engine.setNodeProperty('N-DOES-NOT-EXIST', 'fontSize', 10); }
  catch(e) { noThrow = false; }
  assert('setNodeProperty unknown node is no-op', noThrow);

  // connectWire calls portManager.afterConnect on infinite-capacity port
  graphState.addNode({ id: 'N-CP', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'C', width: 1920, height: 1080, fps: 24, duration: 10, bgColor: [0,0,0] },
    hostingComps: [], portSlots: { 'layer_in': 0 } });

  var countBefore = portManager.getWireCount('N-CP', 'layer_in');
  engine.connectWire('N-PROP', 'output', 'N-CP', 'layer_in', 'layer');
  assert('connectWire calls portManager.afterConnect on infinite port',
    portManager.getWireCount('N-CP', 'layer_in') === countBefore + 1);

  // Self-wire rejected
  var selfResult = engine.connectWire('N-PROP', 'output', 'N-PROP', 'layer_in', 'layer');
  assert('connectWire rejects self-wire via wireValidator', selfResult === false);

  dirtyFlusher.cancel();
  graphState.clearGraph();

  console.log('---');
  console.log('engine.setNodeProperty + connectWire:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before closing this task.**

**STOP. Paste console output. Wait for confirmation.**

---

## Additional Rules for This Task

**`capacity` replaces `extendable` everywhere.** Any port definition in any node file still using `extendable: true` or `extendable: false` must be updated to `capacity: 'infinite'` or `capacity: 'single'` respectively before this task is considered complete. Scan all node definition files and update them.

**`portManager` only manages `capacity: 'infinite'` ports.** It has no role in secondary port tracking. `afterConnect` and `afterDisconnect` both no-op silently if the named port is not `capacity: 'infinite'`.

**Secondary ports are static once written.** After `graphState.updateNode` writes `secondaryPorts` onto an effector node during schema resolution, those ports are rendered as fixed rows by the canvas. No slot count, no empty trailing slot, no `portSlots` entry.

**`wireValidator` rule 3 — no slot indexing for infinite-capacity ports.** Wires connect to the base port id (e.g. `'layer_in'`), not to an indexed variant. The port lookup in rule 3 uses the port id as-is.

**`wireValidator` rule 5 — no newborn-slot exception.** Wire type matching is strict. `fromPort.type` must equal `toPort.type`. No exceptions.

**`wireValidator.canConnect` is called from `engine.connectWire`, not from the UI.**

**`portManager.afterConnect` and `portManager.afterDisconnect` are called from `engine.connectWire` and `engine.disconnectWire` respectively.** `cascadeAlgorithm` is not modified in this task and has no dependency on `portManager`.

**`dirtyFlusher.flush` calls `evalBridge.dispatch` once per dirty node.** Do not use `dispatchBatch` in `dirtyFlusher`.

**Ghost nodes are skipped during flush.** Check `node.state !== 'alive'` before dispatching.

**`dirtyFlusher` clears `dirty` in the `.then()` callback.** If dispatch fails, `dirty` remains `true` and the next flush retries.

**No ES6+.** `var`, `for...in`, named functions throughout all files. No `Object.keys`, no `forEach`, no `const`, no `let`, no arrow functions, no template literals.

---

## On Completion

When all four phase test scripts return zero failures, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-08 COMPLETE

graph/portManager.js              ✅  [N tests passed]
graph/wireValidator.js            ✅  [N tests passed]
flush/dirtyFlusher.js             ✅  [N tests passed]
graph/engine.js (all updates)     ✅  [N tests passed]

engine.setNodeProperty stub replaced with real implementation.
engine.connectWire updated to call wireValidator.canConnect().
engine.connectWire calls portManager.afterConnect() after wire confirmed.
engine.disconnectWire calls portManager.afterDisconnect() after wire removed.
engine secondary port resolution updated: graphState.updateNode() replaces portManager.spawnSlot().
All node port definitions updated: extendable replaced by capacity.

Next task: TASK-09 — canvas viewport, renderer, and wire drawing
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-08-PORT-VALIDATOR-FLUSH.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 9, 10, 12, 13 — arch_specs.md Sections 3b, 3c, 6, 8, 10*
