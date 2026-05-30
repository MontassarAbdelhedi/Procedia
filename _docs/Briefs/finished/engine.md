# TASK-06 — engine.js

> **Revision note — conflicts resolved against `arch_specs.md` and `structure.md`.**
> Seven conflicts were present in the original brief. All are listed in the
> "Conflicts Resolved" section below. Do not implement the original brief.
> Implement this file only.

---

## Conflicts Resolved

The following conflicts with `arch_specs.md` and `structure.md` existed in the
original brief and are corrected here. Each correction cites the authority source.

| # | Original (wrong) | Corrected | Authority |
|---|---|---|---|
| 1 | `dropNode(type, x, y)` — receives a type string, looks up def internally | `dropNode(nodeDef, x, y)` — caller resolves def from registry; engine receives the object | `arch_specs.md §6`, `structure.md` call flow |
| 2 | Initial `nodeData` missing `hasParkedLayer` and `dynamicSchema` fields | Both fields required: `hasParkedLayer: false`, `dynamicSchema: null` | `arch_specs.md §8a` |
| 3 | `onDrop` returning `null` leaves data/blending/matte nodes as `ghost` | These three nodeKinds must be set to `alive` immediately on drop — before `onDrop` is called | `arch_specs.md` state transition table |
| 4 | `_firePathCreation` absent from public API and not implemented | Must be implemented and exposed; it stamps `_pathLayerUUID` and drives alive propagation | `arch_specs.md §6`, `structure.md` engine API |
| 5 | `_propagateAlive` calls `def.onAlive(nodeData, hostingCompUUID)` for all nodeKinds | Effector and blending nodes require a 3rd arg `pathLayerUUID`; engine must inject `params.layerUUID` into affected-node commands | `arch_specs.md §4` effector/blending hook signatures; `CLAUDE.md` Skill 10 |
| 6 | `connectWire` has no handling for blending or matte node activation | Must detect `nodeKind === 'blending'` and `nodeKind === 'matte'` in step 9 and trigger appropriate activation | `arch_specs.md §12b`, `§13b` |
| 7 | Dependency header missing `graph/schemaCache.js`; `dropNode` has no `params === 'dynamic'` hook | Dependency added; hook point added as a stub pending TASK-schemaCache | `arch_specs.md §20g`, `structure.md` |

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md`
2. `arch_specs.md`

Confirm both files are present at repo root before starting.

---

## Context

The engine is the coordinator between the graph state and the node definitions. It
is intentionally dumb — it knows none of the node types by name, contains zero
type-specific conditionals, and never calls AE APIs. Its only job is to read node
definitions, call the right lifecycle hook at the right time, and pass the resulting
command objects to `evalBridge`.

This task implements the engine in three phases, each verified independently.

| Phase | What it builds | Depends on AE |
|-------|----------------|---------------|
| 1 | `dropNode` — node creation on canvas drop | No |
| 2 | `connectWire` — wire connection with type validation and alive propagation | No |
| 3 | `deleteNode` — node deletion with ghost/delete sequence | No |

Wire deletion and cascade ghosting are **not** in this task — those belong to
`cascadeAlgorithm.js` (TASK-07). The engine calls into cascade but does not
implement it here.

---

## What This Task Does NOT Do

- No canvas rendering — nodes and wires appear only in `nodeMap`/`wireMap`, not on screen yet
- No `cascadeAlgorithm.js` implementation — `disconnectWire` is stubbed, not implemented
- No `portManager.js` implementation — extendable slot spawning is stubbed
- No `dirtyFlusher.js` — property change debounce is a later task
- No `schemaCache.js` integration — the `params === 'dynamic'` hook is stubbed with a comment; full integration is a later task
- No `dispatcher.jsx` changes
- No UI changes

The only file written in this task is `graph/engine.js`.

---

## Engine Architecture — The Contract

The engine exposes a public API. All other files (UI, wire interaction, keyboard
shortcuts) call into the engine. The engine calls into `graphState`, `nodeRegistry`,
and `evalBridge`. Nothing bypasses the engine to mutate graph state directly.

```
UI / input layer
      ↓
  engine.js  ←→  graphState.js (read + write via graphState API)
      ↓           nodeRegistry.js (read only)
  evalBridge.js
      ↓
  dispatcher.jsx (AE)
```

**Zero node-type conditionals.** The engine calls hooks by name:
`def.onDrop(nodeData)`, `def.onAlive(nodeData, compUUID)`, etc. It never checks
`if (node.type === 'core/comp')` or `switch(nodeKind)`. All type-specific behavior
is in the node definition.

**One acceptable exception — `type === 'core/comp'` check in `connectWire`.**
This is the only place in the engine where a specific node type string appears. It
is necessary to identify the terminal comp node in a path chain. All other type
checks are forbidden.

**One acceptable class of exception — `nodeKind` checks.** The engine uses
`nodeKind` to determine system-level lifecycle behavior (which nodes go alive on
drop, which skip the ghost sequence on delete). These are system rules, not
node-type conditionals.

---

## PHASE 1 — `dropNode(nodeDef, x, y)`

### What it does

Called when the user drops a node from the palette onto the canvas. `drag.js`
resolves the node definition from `nodeRegistry` and passes it here. The engine
creates a node entry in `nodeMap`, initializes its props from the node definition
defaults, then calls `onDrop`. Certain `nodeKind` values go `alive` immediately on
drop without requiring a downstream wire.

### Algorithm — plain language

```
dropNode(nodeDef, x, y):

1. If nodeDef is null or undefined — log error, return null.

2. Build the initial nodeData object:
   - id: uuidGenerator.generateNodeId()
   - type:        nodeDef.type
   - nodeKind:    nodeDef.nodeKind
   - dedicated:   nodeDef.dedicated
   - state:       'ghost'    ← initial value; may be overridden in step 4
   - dirty:       false
   - x, y:        from arguments
   - props:       built from nodeDef.params — { key: param.default } for each param
                  If params === 'dynamic' — set props to {} (populated after schema resolution)
   - hostingComps:   []
   - hasParkedLayer: false
   - dynamicSchema:  null
   - portSlots:   built from nodeDef.ports — for each port where extendable is not false
                  and category is 'mainInput' or 'secondaryInput', set { portId: 1 }
                  (1 = one empty slot visible by default)

3. Call graphState.addNode(nodeData).

4. Immediately-alive nodeKinds — check BEFORE calling onDrop:
   - If nodeDef.nodeKind === 'data'     → graphState.updateNode(id, { state: 'alive' }). Done. Return nodeData.
   - If nodeDef.nodeKind === 'blending' → graphState.updateNode(id, { state: 'alive' }). Done. Return nodeData.
   - If nodeDef.nodeKind === 'matte'    → graphState.updateNode(id, { state: 'alive' }). Done. Return nodeData.
   These three nodeKinds never call onDrop and never enter the ghost/alive cycle.
   They are alive from the moment they exist in the graph.

5. [STUB — schemaCache integration, TASK-schemaCache]
   If nodeDef.params === 'dynamic':
   - Log: '[engine] dynamic params detected — schemaCache not yet connected'
   - Proceed normally (node will have empty props until schemaCache task)

6. Call def.onDrop(nodeData).
   — If result is null: done. Node is ghost. Return nodeData.
   — If result is a command object:
       a. Call evalBridge.dispatch(command)
       b. In .then():
            - if res.ok  — call graphState.updateNode(id, { state: 'alive' })
            - if !res.ok — log '[engine] onDrop dispatch failed:' + res.error
                           call graphState.updateNode(id, { state: 'error' })
       c. Return nodeData immediately (Promise resolves async — caller does not wait)
```

**CompNode behavior note:** CompNode's `onDrop` returns a `createComp` command. The
engine dispatches it and sets state `alive` in the `.then()`. This is the only
`affected` or `effector` nodeKind that goes alive on drop rather than on wire
connection.

### Public function signature

```javascript
function dropNode(nodeDef, x, y) {
  // nodeDef: node definition object from nodeRegistry.getDefinition()
  // x, y: canvas position
  // Returns nodeData object synchronously.
  // AE command (if any) fires async via evalBridge.
}
```

---

## PHASE 2 — `connectWire(fromNodeId, fromPort, toNodeId, toPort, boundParam)`

### What it does

Called when the user completes a wire drag from one port to another. Validates the
connection (type compatibility, no cycles, no duplicate wires), creates a wire entry
in `wireMap`, then determines if any nodes need to transition from `ghost` to `alive`
as a result.

`boundParam` is an optional fifth argument used only for data wires that the picker
has already assigned to a named param. Default is `null`. It is stored on the wire
entry in `wireMap`.

### Algorithm — plain language

```
connectWire(fromNodeId, fromPort, toNodeId, toPort, boundParam):

1. Get both nodeData entries from graphState. Get both node definitions from nodeRegistry.
   If either is missing — log error, return false.

2. Determine the wire type:
   - Find the fromPort declaration on the fromNode definition (iterate nodeDef.ports).
   - The wire type = the port's declared `type` field ('layer', 'data', or 'parent').
   - If the port is not found on the definition — log error, return false.

3. Validate type compatibility:
   - Find the toPort declaration on the toNode definition.
   - If toPort type does not match wire type — log error, return false.
   - Exception: a secondaryInput port slot spawned for extendable data wires is
     already filtered by the picker — boundParam will be set, accept the wire.

4. Validate no duplicate wire:
   - Scan wireMap for any existing wire with the same fromNode + fromPort + toNode + toPort.
   - If found — log error, return false.

5. Validate no cycle (layer wires only):
   - Only check cycles for type 'layer'. Parent and data wires cannot create topology cycles.
   - Call cycleChecker.hasCycle(fromNodeId, toNodeId).
   - If cycle detected — log error, return false.

6. Build wireData:
   - id:         uuidGenerator.generateWireId()
   - type:       wire type from step 2
   - fromNode:   fromNodeId
   - fromPort:   fromPort
   - toNode:     toNodeId
   - toPort:     toPort
   - boundParam: boundParam || null
   - _pathLayerUUID: null    ← always null initially; stamped by _firePathCreation

7. Call graphState.addWire(wireData).

8. If wire type is 'parent': done. Parent wires never affect alive/ghost state. Return true.
   If wire type is 'data':   done. Data wires never affect alive/ghost state. Return true.

9. Wire type is 'layer'. Determine downstream consequence:

   9a. Check if toNode is a CompNode:
       — Condition: toNodeData.type === 'core/comp'
       — If yes: this wire is a terminal wire. The fromNode and its upstream chain may
         now have a live comp path. Call _firePathCreation(wireData.id). Return true.

   9b. toNode is not a CompNode. Check if toNode already participates in a live comp path:
       — If toNode.hostingComps.length > 0:
           - Find the pathLayerUUID for the existing live path through toNode by calling
             _findPathLayerUUID(toNodeId).
           - If pathLayerUUID is found: call _propagateAlive(fromNodeId,
             toNode.hostingComps[0], pathLayerUUID).
       — If toNode.hostingComps.length === 0: fromNode has no comp path yet. No alive
         transition occurs. Return true.

   9c. toNode is a matte node (toNodeData.nodeKind === 'matte'):
       — After step 7, call _checkMatteActivation(toNodeId).
       — See _checkMatteActivation spec below.

   Return true.
```

---

### `_firePathCreation(terminalWireId)` — stamps path and propagates alive

This function is the entry point for establishing a new live comp path. It is also
part of the engine's **public API** (exposed for use by `drag.js` during wire-insertion).

```
_firePathCreation(terminalWireId):

1. Get wireData from wireMap. If missing — log error, return.

2. Stamp wireData._pathLayerUUID = terminalWireId.
   Call graphState.updateWire(terminalWireId, { _pathLayerUUID: terminalWireId }).

3. Get the toNode (CompNode). Its id is wireData.toNode. This is the hostingCompUUID.

4. Get the fromNode (the node feeding into the comp). Its id is wireData.fromNode.

5. Call _propagateAlive(wireData.fromNode, wireData.toNode, terminalWireId).

6. [STUB — dirtyFlusher integration, TASK-dirtyFlusher]
   After propagation completes, call dirtyFlusher.flush() if available.
   Log: '[engine] _firePathCreation: dirtyFlusher not yet connected — skipping flush'
```

---

### `_propagateAlive(nodeId, hostingCompUUID, pathLayerUUID)` — internal helper

```
_propagateAlive(nodeId, hostingCompUUID, pathLayerUUID):

1. Get nodeData from graphState. If missing — return.

2. If node is already alive in this hostingCompUUID (node.hostingComps contains
   hostingCompUUID) — return. (Infinite loop guard.)

3. Get the node definition from nodeRegistry.

4. Build the onAlive call based on nodeKind:
   - 'affected':
       command = def.onAlive(nodeData, hostingCompUUID)
       If command is not null:
         Inject params.layerUUID = pathLayerUUID into command before dispatching.
         (This is how the dispatcher knows what UUID to stamp into AE layer.comment.)
   - 'effector':
       command = def.onAlive(nodeData, hostingCompUUID, pathLayerUUID)
       (pathLayerUUID is the upstreamNodeUUID — the terminal wire UUID identifying
        the AE layer this effector will modify.)
   - 'blending':
       command = def.onAlive(nodeData, hostingCompUUID, pathLayerUUID)
       (Same pattern as effector.)
   - 'data', 'matte', 'comp' (already alive): return. These are never propagated to.

5. Update graphState:
   - Add hostingCompUUID to node.hostingComps (if not already present).
   - Set node.state to 'alive'.
   Call graphState.updateNode(nodeId, { state: 'alive', hostingComps: updatedArray }).

6. If command is not null:
   Call evalBridge.dispatch(command).
   In .then(): if !res.ok — log '[engine] onAlive failed for ' + nodeId + ':' + res.error
               call graphState.updateNode(nodeId, { state: 'error' })

7. Traverse upstream: scan wireMap for all wires where:
   - wire.toNode === nodeId
   - wire.type === 'layer'    (skip 'parent' and 'data' wires always)
   For each upstream node found:
   - If upstreamNode.hostingComps contains hostingCompUUID — skip (already alive here).
   - If upstreamNode.nodeKind === 'data' — skip (always alive, never propagated to).
   - If upstreamNode.nodeKind === 'matte' — skip (special conditions, not propagated).
   - Otherwise: call _propagateAlive(upstreamNodeId, hostingCompUUID, pathLayerUUID).
```

---

### `_findPathLayerUUID(nodeId)` — internal helper

Traverses downstream from `nodeId` to find a terminal wire with a non-null
`_pathLayerUUID`. Returns the UUID string or `null` if none is found.

```
_findPathLayerUUID(nodeId):

1. Scan wireMap for all wires where wire.fromNode === nodeId AND wire.type === 'layer'.

2. For each such wire:
   - If wire._pathLayerUUID !== null — return wire._pathLayerUUID.
   - Otherwise — recurse: result = _findPathLayerUUID(wire.toNode).
     If result !== null — return result.

3. Return null.
```

---

### `_checkMatteActivation(matteNodeId)` — internal helper

Enforces the three-condition rule for matte node activation (arch_specs.md §13b).
Called from `connectWire` step 9c whenever a layer wire connects to a matte node's
port.

```
_checkMatteActivation(matteNodeId):

1. Get matteNodeData from graphState.

2. Check condition 1: both input ports have wires.
   - Find wire where toNode === matteNodeId AND toPort === 'top_layer' in wireMap.
   - Find wire where toNode === matteNodeId AND toPort === 'matte_layer' in wireMap.
   - If either is missing: matte conditions not met. Return.

3. Get the two upstream nodes (fromNode of each input wire).
   Get topLayerUUID    = _findPathLayerUUID(topLayerUpstreamNodeId)
   Get matteLayerUUID  = _findPathLayerUUID(matteLayerUpstreamNodeId)

4. Check condition 2: both upstream nodes share the same first-level hosting comp.
   - Get topLayerNode.hostingComps[0] and matteLayerNode.hostingComps[0].
   - If either is null or they differ: matte conditions not met. Return.

5. Check condition 3: the matte node's output wire connects to the same comp.
   - Find wire where fromNode === matteNodeId AND type === 'layer' in wireMap.
   - Get that wire's toNode — it must equal the shared hosting comp UUID.
   - If not found or mismatch: matte conditions not met. Return.

6. All three conditions met. Get the node definition. Call:
   def.onAlive(matteNodeData, sharedCompUUID, topLayerUUID, matteLayerUUID)
   Dispatch the returned command via evalBridge.dispatch().
```

---

## PHASE 3 — `deleteNode(nodeId)`

### What it does

Called when the user deletes a node (Delete/Backspace key). Sequence differs by
`nodeKind`. If alive, the node is ghosted first (parks layers, strips effects). Then
removed from `nodeMap` entirely.

### Algorithm — plain language

```
deleteNode(nodeId):

1. Get nodeData from graphState. If missing — log warning, return.

2. Get the node definition from nodeRegistry.

3. nodeKind-specific deletion sequence:

   For nodeKind === 'data':
   - Skip alive/ghost check. Data nodes have no AE presence.
   - Call def.onDelete(nodeData) → command. If not null — evalBridge.dispatch(command).
   - Go to step 5.

   For nodeKind === 'blending' or 'matte':
   - These are always alive and have AE state to clear.
   - For each UUID in node.hostingComps:
       command = def.onGhost(nodeData, hostingCompUUID[, ...upstreamArgs])
       — For blending: pass the upstreamNodeUUID from the main_input wire.
         Find the wire where toNode === nodeId AND toPort === 'main_input'.
         upstreamNodeUUID = _findPathLayerUUID(wire.fromNode).
         command = def.onGhost(nodeData, hostingCompUUID, upstreamNodeUUID)
       — For matte: pass topLayerUUID from top_layer wire.
         command = def.onGhost(nodeData, hostingCompUUID, topLayerUUID)
       Add to batchCommands array.
   - If batchCommands not empty: evalBridge.dispatchBatch(batchCommands). Fire and forget.
   - Call def.onDelete(nodeData). Fire and forget.
   - Go to step 5. (No park step ever for blending or matte.)

   For nodeKind === 'affected' or 'effector':

     a. If node.state === 'alive':
        For each UUID in node.hostingComps:
          command = def.onGhost(nodeData, hostingCompUUID[, upstreamArgs])
          — For affected: def.onGhost(nodeData, hostingCompUUID)
          — For effector: find the main_input wire, get pathLayerUUID via
            _findPathLayerUUID(wire.fromNode).
            def.onGhost(nodeData, hostingCompUUID, pathLayerUUID)
          Add to batchCommands array.
        If batchCommands not empty: evalBridge.dispatchBatch(batchCommands).
          In .then(): proceed regardless of ok/error.
        Proceed to (b) immediately — do not wait for the Promise.

     b. Call def.onDelete(nodeData) → command.
        If command is not null: evalBridge.dispatch(command). Fire and forget.

4. Call graphState.removeNode(nodeId).
   (graphState.removeNode also removes all wires connected to this node.)

5. If graphState.getSelection() === nodeId — call graphState.setSelection(null).
```

**Key rule:** `deleteNode` does not call `disconnectWire` on connected wires.
`graphState.removeNode(nodeId)` handles wire cleanup internally. Calling
`disconnectWire` from inside `deleteNode` is forbidden — it would trigger cascade
on wires being cleaned up as a side effect of deletion.

---

## Stubbed functions — implement as no-ops for now

These are part of the engine's public API but belong to later tasks. Add them now
as stubs.

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
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/schemaCache.js,
//             graph/cascadeAlgorithm.js, graph/portManager.js, graph/wireValidator.js,
//             bridge/evalBridge.js, data/uuidGenerator.js
// MUST LOAD BEFORE: index.js

var engine = (function() {

  // ── Internal helpers ─────────────────────────────────────────

  function _buildInitialProps(params) {
    // If params === 'dynamic' — return {}
    // Otherwise iterate params array, return { key: param.default } for each
  }

  function _buildInitialPortSlots(ports) {
    // Iterate ports. For each port where extendable !== false
    // and category is 'mainInput' or 'secondaryInput':
    // set result[port.id] = 1
  }

  function _findPathLayerUUID(nodeId) {
    // See _findPathLayerUUID spec above
  }

  function _propagateAlive(nodeId, hostingCompUUID, pathLayerUUID) {
    // See _propagateAlive spec above
  }

  function _checkMatteActivation(matteNodeId) {
    // See _checkMatteActivation spec above
  }

  // ── Public API ───────────────────────────────────────────────

  function dropNode(nodeDef, x, y) {
    // See Phase 1 algorithm above
    // nodeDef is the resolved definition object — no registry lookup here
  }

  function _firePathCreation(terminalWireId) {
    // See _firePathCreation spec above
  }

  function connectWire(fromNodeId, fromPort, toNodeId, toPort, boundParam) {
    // See Phase 2 algorithm above
    // boundParam: optional — only used for data wires. Default null.
  }

  function deleteNode(nodeId) {
    // See Phase 3 algorithm above
  }

  function disconnectWire(wireId) {
    console.log('[engine] disconnectWire stub — not yet implemented');
  }

  function setNodeProperty(nodeId, key, value) {
    console.log('[engine] setNodeProperty stub — not yet implemented');
  }

  return {
    dropNode:          dropNode,
    connectWire:       connectWire,
    deleteNode:        deleteNode,
    disconnectWire:    disconnectWire,
    setNodeProperty:   setNodeProperty,
    _firePathCreation: _firePathCreation   // exposed for drag.js wire-insertion
  };

})();
```

Fill every function body completely from the algorithms above.

---

## PHASE 4 — Verification

The engine cannot be fully verified without AE. All tests below run in the browser
console and verify graph state only — no AE calls are made. `evalBridge` is mocked
in the test harness.

Open `index.html` in a browser tab. Reload. Open browser console. Paste and run:

```javascript
(function() {
  var PASS = 0; var FAIL = 0;

  function assert(label, condition) {
    if (condition) { console.log('[PASS]', label); PASS++; }
    else           { console.error('[FAIL]', label); FAIL++; }
  }

  // Mock evalBridge so AE calls succeed silently
  var _origDispatch = evalBridge.dispatch;
  var _origBatch    = evalBridge.dispatchBatch;
  evalBridge.dispatch      = function() { return Promise.resolve({ ok: true, data: null, error: null }); };
  evalBridge.dispatchBatch = function() { return Promise.resolve({ ok: true, data: null, error: null }); };

  // Clean slate
  graphState.clearGraph();

  // ── dropNode ────────────────────────────────────────────────

  var textDef = nodeRegistry.getDefinition('layers/text');
  var textNode = engine.dropNode(textDef, 100, 200);
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
  assert('dropNode sets hasParkedLayer false',   textNode.hasParkedLayer === false);
  assert('dropNode sets dynamicSchema null',     textNode.dynamicSchema === null);
  assert('dropNode adds to nodeMap',             graphState.getNode(textNode.id) !== null);
  assert('dropNode node in nodeMap correct type',graphState.getNode(textNode.id).type === 'layers/text');

  // Comp node — goes alive on drop (mocked evalBridge)
  var compDef  = nodeRegistry.getDefinition('core/comp');
  var compNode = engine.dropNode(compDef, 400, 200);
  assert('dropNode comp returns nodeData',       compNode !== null);
  assert('dropNode comp assigned UUID',          compNode.id && compNode.id.indexOf('PROC-') === 0);

  // Data node — must be alive immediately on drop, no evalBridge call needed
  var colorDef  = nodeRegistry.getDefinition('data/color');
  var colorNode = engine.dropNode(colorDef, 50, 50);
  assert('dropNode data node returns nodeData',  colorNode !== null);
  assert('dropNode data node state is alive',    graphState.getNode(colorNode.id).state === 'alive');

  // Blending node — alive immediately on drop
  var blendDef  = nodeRegistry.getDefinition('utility/blending');
  var blendNode = engine.dropNode(blendDef, 50, 100);
  assert('dropNode blending node state is alive', graphState.getNode(blendNode.id).state === 'alive');

  // Null nodeDef — must return null
  var badNode = engine.dropNode(null, 0, 0);
  assert('dropNode null def returns null',       badNode === null);

  // ── connectWire ─────────────────────────────────────────────

  graphState.clearGraph();

  var srcDef    = nodeRegistry.getDefinition('layers/text');
  var cmpDef    = nodeRegistry.getDefinition('core/comp');
  var srcNode   = engine.dropNode(srcDef, 100, 200);
  var compNode2 = engine.dropNode(cmpDef, 400, 200);

  // Force comp alive so propagation can work
  graphState.updateNode(compNode2.id, { state: 'alive', hostingComps: [] });

  // Valid layer wire: text output → comp input
  var wireResult = engine.connectWire(srcNode.id, 'output', compNode2.id, 'layer_in_0');
  assert('connectWire returns true on valid wire', wireResult === true);

  var allWires = graphState.getAllWires ? graphState.getAllWires() : {};
  var wireKeys = [];
  for (var k in allWires) { if (allWires.hasOwnProperty(k)) wireKeys.push(k); }
  assert('connectWire adds wire to wireMap', wireKeys.length === 1);

  var wire = allWires[wireKeys[0]];
  assert('wire has correct fromNode',  wire && wire.fromNode === srcNode.id);
  assert('wire has correct toNode',    wire && wire.toNode === compNode2.id);
  assert('wire type is layer',         wire && wire.type === 'layer');
  assert('wire has a UUID',            wire && wire.id && wire.id.indexOf('WIRE-') === 0);
  assert('terminal wire has _pathLayerUUID stamped',
    wire && wire._pathLayerUUID === wire.id);

  // Text node should be alive after wire to comp
  setTimeout(function() {
    var updatedSrc = graphState.getNode(srcNode.id);
    assert('text node alive after wire to comp',
      updatedSrc.state === 'alive');
    assert('text node hostingComps includes comp',
      updatedSrc.hostingComps.indexOf(compNode2.id) !== -1);

    // Duplicate wire rejected
    var dupResult = engine.connectWire(srcNode.id, 'output', compNode2.id, 'layer_in_0');
    assert('connectWire rejects duplicate wire', dupResult === false);

    // Cycle rejected
    var cycleResult = engine.connectWire(srcNode.id, 'output', srcNode.id, 'layer_in_0');
    assert('connectWire rejects self-wire (cycle)', cycleResult === false);

    // ── deleteNode ──────────────────────────────────────────

    var nullDef = nodeRegistry.getDefinition('layers/null');
    var nodeToDelete = engine.dropNode(nullDef, 50, 50);
    assert('dropNode null added to nodeMap',     graphState.getNode(nodeToDelete.id) !== null);
    assert('dropNode null dedicated is true',    graphState.getNode(nodeToDelete.id).dedicated === true);

    engine.deleteNode(nodeToDelete.id);
    assert('deleteNode removes from nodeMap',    graphState.getNode(nodeToDelete.id) === null);

    // Delete unknown node — no-op, no throw
    var noThrow = true;
    try { engine.deleteNode('PROC-DOES-NOT-EXIST'); } catch(e) { noThrow = false; }
    assert('deleteNode unknown id is no-op',     noThrow);

    // deleteNode clears selection
    graphState.clearGraph();
    var textDef2 = nodeRegistry.getDefinition('layers/text');
    var selNode  = engine.dropNode(textDef2, 0, 0);
    graphState.setSelection(selNode.id);
    assert('selection set before delete',        graphState.getSelection() === selNode.id);
    engine.deleteNode(selNode.id);
    assert('deleteNode clears selection',        graphState.getSelection() === null);

    // ── Stubs reachable ────────────────────────────────────
    assert('disconnectWire stub exists',         typeof engine.disconnectWire === 'function');
    assert('setNodeProperty stub exists',        typeof engine.setNodeProperty === 'function');
    assert('_firePathCreation exposed',          typeof engine._firePathCreation === 'function');

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

**`_propagateAlive` is recursive — guard against infinite loops.** Before recursing
into an upstream node, always check if that node is already alive in the given
`hostingCompUUID`. If it is, skip it. Without this guard, two nodes wired to each
other will stack overflow.

**`evalBridge.dispatch` is async — never block on it.** `dropNode` and `deleteNode`
return synchronously. The `evalBridge` call fires and the `.then()` updates state
when it resolves. The caller gets the nodeData object back immediately.

**`deleteNode` does not call `disconnectWire` on its wires.** `graphState.removeNode(nodeId)`
already removes all wires referencing the node. Do not call `disconnectWire` from
inside `deleteNode`.

**Engine injects `params.layerUUID` into affected-node commands.** After calling
`def.onAlive()` for an `affected` nodeKind, before passing the command to
`evalBridge.dispatch()`, the engine must inject `command.params.layerUUID = pathLayerUUID`.
This is how the dispatcher knows which UUID to stamp into `layer.comment` in AE.
See `CLAUDE.md` Skill 8 and Skill 10.

**`params.layerUUID` is never injected for effector, blending, or matte commands.**
These node kinds receive `pathLayerUUID` as a direct argument to their `onAlive`
hook. They reference it internally in their returned command params under their own
field names (e.g., `layerNodeUUID` for effectors).

**CompNode detection in `connectWire` step 9a.** The check `toNodeData.type === 'core/comp'`
is the one acceptable place in the engine where a specific node type string appears.
All other node-type conditionals are forbidden.

**`portSlots` initial value is `{ portId: 1 }` for each extendable input port.**
The slot count increments when wires fill slots — that is `portManager.js` work
(TASK-08). The engine only sets the initial value here.

**No ES6+.** `var`, named functions, `for` loops throughout the engine file. The
test harness runs in Chromium and may use `Object.values` — do not use it in the
engine itself.

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
  - engine.disconnectWire    (TASK-07)
  - engine.setNodeProperty   (TASK-08)
  - schemaCache hook in dropNode (TASK-schemaCache)
  - dirtyFlusher call in _firePathCreation (TASK-dirtyFlusher)

─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---
