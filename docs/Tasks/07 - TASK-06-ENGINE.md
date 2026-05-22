# TASK-06 — engine.js
*Procedia v4 — Sixth task. Builds on completed TASK-01 through TASK-05.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 9, 10, 12, 13 in full
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 1, 2, 3, 6, 7, and 8 in full

Confirm both files are present at repo root before starting.

---

## Context

The engine is the coordinator between the graph state and the node definitions. It is intentionally dumb — it knows none of the node types by name, contains zero type-specific conditionals, and never calls AE APIs. Its only job is to read node definitions, call the right lifecycle hook at the right time, and pass the resulting command objects to `evalBridge`.

This task implements the engine in three phases, each verified independently:

| Phase | What it builds | Depends on AE |
|---|---|---|
| 1 | `dropNode` — node creation on canvas drop | No |
| 2 | `connectWire` — wire connection with type validation and alive propagation | No |
| 3 | `deleteNode` — node deletion with ghost/delete sequence | No |

Wire deletion and cascade ghosting are **not** in this task — those belong to `cascadeAlgorithm.js` (TASK-07). The engine calls into cascade but does not implement it here.

---

## What This Task Does NOT Do

- No canvas rendering — nodes and wires appear only in `nodeMap`/`wireMap`, not on screen yet
- No `cascadeAlgorithm.js` implementation — `disconnectWire` is stubbed, not implemented
- No `portManager.js` implementation — extendable slot spawning is stubbed
- No `dirtyFlusher.js` — property change debounce is a later task
- No `dispatcher.jsx` changes
- No UI changes

The only file written in this task is `graph/engine.js`.

---

## Engine Architecture — The Contract

The engine exposes a public API. All other files (UI, wire interaction, keyboard shortcuts) call into the engine. The engine calls into `graphState`, `nodeRegistry`, and `evalBridge`. Nothing bypasses the engine to mutate graph state directly.

```
UI / input layer
      ↓
  engine.js  ←→  graphState.js (read + write via graphState API)
      ↓           nodeRegistry.js (read only)
  evalBridge.js
      ↓
  dispatcher.jsx (AE)
```

**Zero node-type conditionals.** The engine calls hooks by name: `def.onDrop(nodeData)`, `def.onAlive(nodeData, compUUID)`, etc. It never checks `if (node.type === 'core/comp')` or `switch(nodeKind)`. All type-specific behavior is in the node definition.

**One exception to the no-conditional rule:** The engine checks `nodeKind` to determine cascade behavior — `'affected'` nodes get parked, `'effector'` nodes get stripped, `'data'` nodes are ignored. This is a system-level rule, not a node-type conditional.

---

## PHASE 1 — `dropNode(type, x, y)`

### What it does

Called when the user drops a node from the palette onto the canvas. Creates a node entry in `nodeMap`, initializes its props from the node definition defaults, then calls `onDrop`. If `onDrop` returns a command (CompNode), executes it via `evalBridge` and sets state to `alive`. For all other nodes, state remains `ghost`.

### Algorithm — plain language

```
dropNode(type, x, y):

1. Get the node definition from nodeRegistry. If not found — log error, return null.

2. Build the initial nodeData object:
   - id: uuidGenerator.node()
   - type, nodeKind, dedicated: copied from def
   - state: 'ghost'
   - dirty: false
   - x, y: from arguments
   - props: built from def.params — { key: param.default } for each param
   - hostingComps: []
   - portSlots: built from def.ports — for each extendable input port, set { portId: 1 }
                (1 = one empty slot visible by default)

3. Call graphState.addNode(nodeData).

4. Call def.onDrop(nodeData).
   — If result is null: done. Node is ghost. Return nodeData.
   — If result is a command object:
       a. Call evalBridge.dispatch(command)
       b. In .then(): if res.ok — call graphState.updateNode(id, { state: 'alive' })
                      if !res.ok — log error, call graphState.updateNode(id, { state: 'error' })
       c. Return nodeData immediately (Promise resolves async — caller does not wait)
```

### Public function signature

```javascript
function dropNode(type, x, y) {
  // returns nodeData object (synchronously)
  // AE command (if any) fires async via evalBridge
}
```

---

## PHASE 2 — `connectWire(fromNodeId, fromPort, toNodeId, toPort)`

### What it does

Called when the user completes a wire drag from one port to another. Validates the connection (type compatibility, no cycles, no duplicate wires), creates a wire entry in `wireMap`, then determines if any nodes need to transition from `ghost` to `alive` as a result.

### Algorithm — plain language

```
connectWire(fromNodeId, fromPort, toNodeId, toPort):

1. Get both node definitions and both nodeData entries. If either is missing — log error, return false.

2. Determine the wire type:
   — Look up the fromPort on the fromNode definition.
   — The wire type = the port's declared type ('layer', 'data', or 'parent').
   — If the port is not found on the definition — log error, return false.

3. Validate type compatibility:
   — Get the toPort declaration from the toNode definition.
   — If toPort type does not match wire type — log error, return false.
   — Exception: extendable newborn slots (untyped) accept any 'data' wire — the picker has
     already run by the time connectWire is called, and boundParam is set on the wireData.

4. Validate no duplicate wire:
   — Scan wireMap for any existing wire with same fromNode+fromPort+toNode+toPort.
   — If found — log error, return false.

5. Validate no cycle (layer wires only):
   — Only check cycles for type 'layer'. Parent and data wires cannot create topology cycles.
   — Call cycleChecker.hasCycle(fromNodeId, toNodeId).
   — If cycle detected — log error, return false.

6. Build wireData:
   - id: uuidGenerator.wire()
   - type: wire type from step 2
   - fromNode, fromPort, toNode, toPort: from arguments
   - boundParam: null (set by caller before connectWire for data wires bound to a param)

7. Call graphState.addWire(wireData).

8. If wire type is 'parent': done. Parent wires do not affect alive/ghost state. Return true.
   If wire type is 'data': done. Data wires do not affect alive/ghost state. Return true.

9. Wire type is 'layer'. Check if toNode is a CompNode (nodeKind === 'affected' AND
   dedicated === true AND type === 'core/comp'):
   — If yes: toNode is a comp. The fromNode and its upstream chain may now have a comp path.
     Call _propagateAlive(fromNodeId, toNodeId).
   — If no: toNode is not a comp. The connection alone does not establish an alive path.
     But toNode itself might already be alive (wired to a comp downstream). Check:
     if toNode.hostingComps.length > 0 — call _propagateAlive(fromNodeId, toNode.hostingComps[0]).

10. Return true.
```

### `_propagateAlive(nodeId, hostingCompUUID)` — internal helper

```
_propagateAlive(nodeId, hostingCompUUID):

1. Get nodeData from graphState. If missing — return.

2. If node is already alive in this hostingCompUUID — return. (No double-alive.)

3. Get the node definition. Call def.onAlive(nodeData, hostingCompUUID).
   — Collect the command object (or null).

4. Update graphState: add hostingCompUUID to node.hostingComps. Set state to 'alive'.

5. If command is not null — call evalBridge.dispatch(command).
   In .then(): if !res.ok — log error, call graphState.updateNode(nodeId, { state: 'error' })

6. Traverse upstream: get all input wires of type 'layer' pointing to this node from wireMap.
   For each upstream node found — call _propagateAlive(upstreamNodeId, hostingCompUUID) recursively.
   Skip any upstream node that is already alive in this hostingCompUUID.
   Skip CompNodes — they are never propagated to as affected upstream targets.
```

---

## PHASE 3 — `deleteNode(nodeId)`

### What it does

Called when the user deletes a node (Delete/Backspace key). If the node is alive, ghosts it first (parks layers, strips effects). Then removes it from `nodeMap` entirely.

### Algorithm — plain language

```
deleteNode(nodeId):

1. Get nodeData from graphState. If missing — log warning, return.

2. Get the node definition from nodeRegistry.

3. If node.state === 'alive':
   — For each UUID in node.hostingComps:
       a. Call def.onGhost(nodeData, hostingCompUUID) → command object
       b. If command is not null — add to batchCommands array
   — If batchCommands has entries — call evalBridge.dispatchBatch(batchCommands)
     In .then(): proceed to step 4 regardless of ok/error
                 (if AE object is gone, we still clean up the graph)
   — Proceed to step 4 immediately (don't wait for the Promise)

4. Call def.onDelete(nodeData) → command object.
   If command is not null — call evalBridge.dispatch(command).
   (Fire and forget — do not block on this Promise)

5. Call graphState.removeNode(nodeId).
   (This also removes all wires connected to this node — graphState handles that.)

6. If getSelection() === nodeId — call graphState.setSelection(null).
```

---

## Stubbed functions — implement as no-ops for now

These functions are part of the engine's public API but are implemented in later tasks. Add them to the engine now as stubs that log a message and return immediately.

```javascript
function disconnectWire(wireId) {
  // Stub — implemented in TASK-07 (cascadeAlgorithm.js)
  console.log('[engine] disconnectWire stub — not yet implemented');
}

function setNodeProperty(nodeId, key, value) {
  // Stub — implemented in TASK-08 (dirtyFlusher.js)
  console.log('[engine] setNodeProperty stub — not yet implemented');
}
```

---

## Full file structure

```javascript
// graph/engine.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cascadeAlgorithm.js,
//             graph/portManager.js, graph/wireValidator.js, bridge/evalBridge.js,
//             data/uuidGenerator.js
// MUST LOAD BEFORE: index.js

var engine = (function() {

  // ── Internal helpers ───────────────────────────────────────

  function _buildInitialProps(params) {
    // iterate params, return { key: default } object
  }

  function _buildInitialPortSlots(ports) {
    // iterate ports, return { portId: 1 } for each extendable input port
  }

  function _propagateAlive(nodeId, hostingCompUUID) {
    // see Phase 2 algorithm above
  }

  // ── Public API ─────────────────────────────────────────────

  function dropNode(type, x, y) {
    // see Phase 1 algorithm above
  }

  function connectWire(fromNodeId, fromPort, toNodeId, toPort, boundParam) {
    // see Phase 2 algorithm above
    // boundParam: optional — only used for data wires. Default null.
  }

  function deleteNode(nodeId) {
    // see Phase 3 algorithm above
  }

  function disconnectWire(wireId) {
    console.log('[engine] disconnectWire stub — not yet implemented');
  }

  function setNodeProperty(nodeId, key, value) {
    console.log('[engine] setNodeProperty stub — not yet implemented');
  }

  return {
    dropNode:       dropNode,
    connectWire:    connectWire,
    deleteNode:     deleteNode,
    disconnectWire: disconnectWire,
    setNodeProperty: setNodeProperty
  };

})();
```

Fill every function body completely from the algorithms above.

---

## PHASE 4 — Verification

The engine cannot be fully verified without AE. All tests below run in the browser console and verify graph state only — no AE calls are made. `evalBridge` will reject (as expected in browser context) — the tests verify the graph state mutations that happen before the bridge call.

Open `index.html` in a browser tab. Reload. Open browser console. Paste and run:

```javascript
(function() {
  var PASS = 0; var FAIL = 0;

  function assert(label, condition) {
    if (condition) { console.log('[PASS]', label); PASS++; }
    else           { console.error('[FAIL]', label); FAIL++; }
  }

  // Suppress expected evalBridge rejections in this test
  var _origDispatch = evalBridge.dispatch;
  var _origBatch    = evalBridge.dispatchBatch;
  evalBridge.dispatch      = function() { return Promise.resolve({ ok: true, data: null, error: null }); };
  evalBridge.dispatchBatch = function() { return Promise.resolve({ ok: true, data: null, error: null }); };

  // Clean slate
  graphState.clearGraph();

  // ── dropNode ───────────────────────────────────────────────

  // Drop a text node
  var textNode = engine.dropNode('layers/text', 100, 200);
  assert('dropNode returns nodeData',            textNode !== null && typeof textNode === 'object');
  assert('dropNode assigns a UUID',              textNode.id && textNode.id.indexOf('PROC-') === 0);
  assert('dropNode sets correct type',           textNode.type === 'layers/text');
  assert('dropNode sets state ghost',            textNode.state === 'ghost');
  assert('dropNode sets x',                      textNode.x === 100);
  assert('dropNode sets y',                      textNode.y === 200);
  assert('dropNode initializes props',           textNode.props !== null && typeof textNode.props === 'object');
  assert('dropNode sets content default',        textNode.props.content === 'New Text');
  assert('dropNode sets fontSize default',       textNode.props.fontSize === 72);
  assert('dropNode initializes hostingComps',    Array.isArray(textNode.hostingComps) && textNode.hostingComps.length === 0);
  assert('dropNode adds to nodeMap',             graphState.getNode(textNode.id) !== null);
  assert('dropNode node in nodeMap has correct type', graphState.getNode(textNode.id).type === 'layers/text');

  // Drop a comp node — should go alive immediately (mocked evalBridge)
  var compNode = engine.dropNode('core/comp', 400, 200);
  assert('dropNode comp returns nodeData',       compNode !== null);
  assert('dropNode comp assigned UUID',          compNode.id && compNode.id.indexOf('PROC-') === 0);

  // Drop unknown type — should return null
  var badNode = engine.dropNode('does/not/exist', 0, 0);
  assert('dropNode unknown type returns null',   badNode === null);

  // ── connectWire ────────────────────────────────────────────

  graphState.clearGraph();

  var srcNode  = engine.dropNode('layers/text', 100, 200);
  var compNode2 = engine.dropNode('core/comp', 400, 200);

  // Force comp to alive so propagation works
  graphState.updateNode(compNode2.id, { state: 'alive', hostingComps: [] });

  // Valid layer wire: text output → comp layer_in_0
  var wireResult = engine.connectWire(srcNode.id, 'output', compNode2.id, 'layer_in_0');
  assert('connectWire returns true on valid wire',   wireResult === true);
  assert('connectWire adds wire to wireMap',
    Object.keys(graphState.getAllWires()).length === 1);

  var wire = Object.values ? Object.values(graphState.getAllWires())[0] :
    graphState.getAllWires()[Object.keys(graphState.getAllWires())[0]];
  assert('wire has correct fromNode',  wire.fromNode === srcNode.id);
  assert('wire has correct toNode',    wire.toNode === compNode2.id);
  assert('wire type is layer',         wire.type === 'layer');
  assert('wire has a UUID',            wire.id && wire.id.indexOf('WIRE-') === 0);

  // Text node should now be alive (propagated from comp)
  setTimeout(function() {
    var updatedSrc = graphState.getNode(srcNode.id);
    assert('text node alive after wire to comp',
      updatedSrc.state === 'alive');
    assert('text node hostingComps includes comp',
      updatedSrc.hostingComps.indexOf(compNode2.id) !== -1);

    // Duplicate wire rejected
    var dupResult = engine.connectWire(srcNode.id, 'output', compNode2.id, 'layer_in_0');
    assert('connectWire rejects duplicate wire', dupResult === false);

    // Wrong type rejected: try wiring output (layer) to a data-type port (hypothetical)
    // We test this indirectly by trying to wire a node to itself (cycle)
    var cycleResult = engine.connectWire(srcNode.id, 'output', srcNode.id, 'layer_in_0');
    assert('connectWire rejects self-wire cycle', cycleResult === false);

    // ── deleteNode ──────────────────────────────────────────

    var nodeToDelete = engine.dropNode('layers/null', 50, 50);
    assert('dropNode null added to nodeMap', graphState.getNode(nodeToDelete.id) !== null);
    assert('dropNode null dedicated is true', graphState.getNode(nodeToDelete.id).dedicated === true);

    engine.deleteNode(nodeToDelete.id);
    assert('deleteNode removes from nodeMap', graphState.getNode(nodeToDelete.id) === null);

    // Delete unknown node — should be no-op, no throw
    var noThrow = true;
    try { engine.deleteNode('PROC-DOES-NOT-EXIST'); } catch(e) { noThrow = false; }
    assert('deleteNode unknown id is no-op', noThrow);

    // deleteNode clears selection
    graphState.clearGraph();
    var selNode = engine.dropNode('layers/text', 0, 0);
    graphState.setSelection(selNode.id);
    assert('selection set before delete',  graphState.getSelection() === selNode.id);
    engine.deleteNode(selNode.id);
    assert('deleteNode clears selection',  graphState.getSelection() === null);

    // ── Stubs reachable ────────────────────────────────────
    assert('disconnectWire stub exists',   typeof engine.disconnectWire === 'function');
    assert('setNodeProperty stub exists',  typeof engine.setNodeProperty === 'function');

    // Restore evalBridge
    evalBridge.dispatch      = _origDispatch;
    evalBridge.dispatchBatch = _origBatch;

    console.log('---');
    console.log('engine:', PASS, 'passed,', FAIL, 'failed');
    if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
    else console.log('Note: AE integration (alive state after dispatch) verified in TASK-07.');
  }, 100);

})();
```

**Zero failures required before closing this task.**

**STOP. Paste console output. Wait for confirmation.**

---

## Additional Rules for This Task

**`_propagateAlive` is recursive — guard against infinite loops.** Before recursing into an upstream node, always check if that node is already alive in the given `hostingCompUUID`. If it is, skip it. Without this guard, two nodes wired to each other in any configuration will stack overflow.

**`evalBridge.dispatch` is async — never block on it.** `dropNode` and `deleteNode` return synchronously. The `evalBridge` call fires and the `.then()` updates state when it resolves. The caller gets the nodeData object back immediately and does not wait for AE.

**`deleteNode` does not call `disconnectWire` on its wires.** `graphState.removeNode(nodeId)` already removes all wires referencing the node. There is no need to individually disconnect each wire. Do not call `disconnectWire` from inside `deleteNode`.

**`connectWire` accepts an optional fifth argument `boundParam`.** This is only used for data wires that the picker has already assigned to a param. Default is `null`. It must be stored on the wire entry in `wireMap` via the `boundParam` field.

**CompNode detection in `connectWire` step 9.** The check `type === 'core/comp'` is the one acceptable place in the engine where a specific node type string appears. It is necessary to identify the terminal comp node in a chain. All other type checks are forbidden.

**`portSlots` initial value is `{ portId: 1 }` for each extendable input port.** This means one empty slot is visible on the node immediately after drop, before any wires connect. The slot count increments when wires fill slots — that is `portManager.js` work (TASK-08). The engine only sets the initial value here.

**No ES6+.** `var`, named functions, `for` loops throughout. `Object.values` is used in the test script only (test runs in Chromium where it is available) — do not use it in the engine itself.

---

## On Completion

When the test script returns zero failures, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-06 COMPLETE

graph/engine.js    ✅  [N tests passed]

Verified in browser console. Zero failures.
Note: AE alive/ghost integration pending TASK-07 (cascadeAlgorithm + dispatcher).

Stubs in place:
  - engine.disconnectWire  (TASK-07)
  - engine.setNodeProperty (TASK-08)

Next task: TASK-07 — cascadeAlgorithm.js
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-06-ENGINE.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 9, 10, 12, 13 — PROCEDIA-V4-ARCHITECTURE.md Sections 1, 2, 3, 6, 7, 8*
