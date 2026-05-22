# TASK-07 — cascadeAlgorithm.js, cycleChecker.js, engine.disconnectWire
*Procedia v4 — Seventh task. Builds on completed TASK-01 through TASK-06.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 9, 12, 13, and 14 in full
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 6, 7, and 8 in full

Confirm both files are present at repo root before starting.

---

## Context

This task completes the wire lifecycle. After TASK-06, the engine can drop nodes, connect wires, and delete nodes. The one remaining piece is `disconnectWire` — what happens when a layer wire is removed. That requires two supporting files:

- `graph/cycleChecker.js` — pure graph traversal, no side effects. Used by `engine.connectWire` to reject cycles before they happen. It was stubbed in TASK-06; this task implements it fully.
- `graph/cascadeAlgorithm.js` — the ghost cascade. When a layer wire is deleted, determines which nodes lose their comp path and must ghost. Collects their `onGhost` commands, batches them into a single `evalBridge.dispatchBatch` call.

Once both are implemented, `engine.disconnectWire` — currently a stub — is replaced with the real implementation that calls into `cascadeAlgorithm`.

**Three files are written or modified in this task:**
1. `graph/cycleChecker.js` — implement fully
2. `graph/cascadeAlgorithm.js` — implement fully
3. `graph/engine.js` — replace `disconnectWire` stub with real implementation

---

## What This Task Does NOT Do

- No canvas wire rendering
- No UI wire drag interaction
- No `portManager.js` implementation
- No `dispatcher.jsx` changes
- No persistence changes

---

## PHASE 1 — `graph/cycleChecker.js`

### What it is

A pure graph traversal utility. No side effects. Takes two node IDs and answers one question: would connecting `fromNodeId → toNodeId` create a directed cycle in the layer-wire graph?

### Algorithm

```
hasCycle(fromNodeId, toNodeId):

Starting from toNodeId, follow all outgoing 'layer' wires downstream.
If fromNodeId is ever encountered — return true (cycle detected).
If the traversal completes without finding fromNodeId — return false.

Rules:
- Only follow wires of type 'layer'. Skip 'data' and 'parent' wires entirely.
- Use a visited set to prevent infinite loops if cycles already exist in the graph
  (defensive — should not happen, but guard anyway).
- The traversal is depth-first.
- Never modify graphState. Read only.
```

### Public API

```javascript
var cycleChecker = (function() {

  function hasCycle(fromNodeId, toNodeId) {
    // Returns true if connecting fromNode → toNode would create a cycle.
    // Pure read — no side effects.
  }

  return { hasCycle: hasCycle };

})();
```

### Implementation shape

```javascript
// graph/cycleChecker.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: graph/wire/wire.js, graph/engine.js

var cycleChecker = (function() {

  function hasCycle(fromNodeId, toNodeId) {
    var visited = {};
    var stack = [toNodeId];

    while (stack.length > 0) {
      var current = stack.pop();
      if (current === fromNodeId) return true;
      if (visited[current]) continue;
      visited[current] = true;

      // Find all outgoing layer wires from current node
      var wires = graphState.getAllWires();
      for (var wireId in wires) {
        var wire = wires[wireId];
        if (wire.type === 'layer' && wire.fromNode === current) {
          stack.push(wire.toNode);
        }
      }
    }
    return false;
  }

  return { hasCycle: hasCycle };

})();
```

This implementation is complete as written above. Fill it in exactly.

---

### Phase 1 verification — browser console

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  // Build a small graph manually in graphState for testing
  graphState.clearGraph();

  // A → B → C (linear chain)
  graphState.addNode({ id: 'N-A', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'ghost', dirty: false, x: 0, y: 0, props: {}, hostingComps: [], portSlots: {} });
  graphState.addNode({ id: 'N-B', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'ghost', dirty: false, x: 0, y: 0, props: {}, hostingComps: [], portSlots: {} });
  graphState.addNode({ id: 'N-C', type: 'core/comp',   nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0, props: {}, hostingComps: [], portSlots: {} });

  graphState.addWire({ id: 'W-AB', type: 'layer', fromNode: 'N-A', fromPort: 'output',
    toNode: 'N-B', toPort: 'layer_in_0', boundParam: null });
  graphState.addWire({ id: 'W-BC', type: 'layer', fromNode: 'N-B', fromPort: 'output',
    toNode: 'N-C', toPort: 'layer_in_0', boundParam: null });

  // No cycle: wiring D → A (new node upstream)
  assert('no cycle: new node wiring upstream of A',
    cycleChecker.hasCycle('N-D', 'N-A') === false);

  // No cycle: valid new wire D → B
  assert('no cycle: D → B (D is new)',
    cycleChecker.hasCycle('N-D', 'N-B') === false);

  // Cycle: trying to wire C → A (C is downstream of A)
  assert('cycle detected: C → A',
    cycleChecker.hasCycle('N-C', 'N-A') === true);

  // Cycle: trying to wire B → A (B is downstream of A)
  assert('cycle detected: B → A',
    cycleChecker.hasCycle('N-B', 'N-A') === true);

  // Cycle: self-wire A → A
  assert('cycle detected: A → A (self)',
    cycleChecker.hasCycle('N-A', 'N-A') === true);

  // No cycle: C → B is a cross-wire but not a cycle
  // (C has no outgoing wires, so traversal from B finds nothing)
  assert('no cycle: C → B (C has no outgoing layer wires)',
    cycleChecker.hasCycle('N-C', 'N-B') === false);

  // Parent wires are ignored
  graphState.addWire({ id: 'W-PARENT', type: 'parent', fromNode: 'N-A', fromPort: 'child_of',
    toNode: 'N-C', toPort: 'parent_of', boundParam: null });
  assert('parent wires ignored in cycle check',
    cycleChecker.hasCycle('N-C', 'N-A') === true); // still true from layer wires only

  // Data wires are ignored
  graphState.addWire({ id: 'W-DATA', type: 'data', fromNode: 'N-C', fromPort: 'output',
    toNode: 'N-A', toPort: 'layer_in_1', boundParam: 'fontSize' });
  // Even with a data wire C → A, the layer-wire cycle check still works
  assert('data wires ignored in cycle check',
    cycleChecker.hasCycle('N-C', 'N-A') === true);

  graphState.clearGraph();

  console.log('---');
  console.log('cycleChecker:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before Phase 2.**

**STOP. Paste console output. Wait for confirmation.**

---

## PHASE 2 — `graph/cascadeAlgorithm.js`

### What it is

Runs whenever a `layer` wire is deleted. Determines which nodes have lost their comp path as a result, collects their `onGhost` commands in the correct order, fires a single `evalBridge.dispatchBatch`, and updates `nodeMap` state.

### Public API

```javascript
var cascadeAlgorithm = (function() {

  function cascadeGhost(deletedWireId) { ... }
  function hasCompDownstream(nodeId)   { ... }  // also used by engine._propagateAlive

  return {
    cascadeGhost:       cascadeGhost,
    hasCompDownstream:  hasCompDownstream
  };

})();
```

### `hasCompDownstream(nodeId)` — implement first

```
hasCompDownstream(nodeId):

Traverses all outgoing 'layer' wires from nodeId, recursively.
Returns an array of CompNode UUIDs reachable downstream via layer wires only.

Rules:
- Skip any wire of type 'parent' or 'data'
- A node is a CompNode if: its nodeKind === 'affected' AND dedicated === true
  AND type === 'core/comp'
- Use a visited set — do not traverse the same node twice
- Read only — no side effects
- Returns [] if no comp is reachable
```

### `cascadeGhost(deletedWireId)` — main function

```
cascadeGhost(deletedWireId):

1. Look up the deleted wire in wireMap.
   — If not found: log warning, return. (Wire already removed — nothing to cascade.)
   — The wire must already exist in wireMap at the time this function is called.
     The caller (engine.disconnectWire) calls cascadeGhost BEFORE removing the wire
     from wireMap, so the wire is still accessible here.

2. If wire.type is not 'layer': return immediately. Only layer wire deletions cascade.

3. Identify sourceNode: the node at wire.fromNode.
   Get sourceNodeData from graphState.

4. Temporarily remove the deleted wire from consideration:
   — Do NOT call graphState.removeWire yet. Instead, filter it out when computing
     hasCompDownstream by passing the deletedWireId as an exclusion.
   — This simulates the post-deletion state without mutating wireMap yet.

5. Call hasCompDownstreamExcluding(sourceNode.id, deletedWireId):
   — Same as hasCompDownstream but skips the wire with deletedWireId during traversal.
   — If result is non-empty: sourceNode still has a comp path — STOP. Return.
   — If result is empty: proceed to collect cascade set.

6. Collect cascade set:
   — Start with sourceNode
   — Traverse upstream from sourceNode via 'layer' wires only (skip parent, data)
   — For each node encountered, add to cascadeSet
   — For each node in cascadeSet: also check its input ports for effector nodes wired in
     (wires where toNode === node.id AND the fromNode's nodeKind === 'effector')
     Add any effectors found to cascadeSet
   — Never add CompNodes (type === 'core/comp') to cascadeSet
   — Use a visited set to prevent duplicates
   — Only include nodes whose state === 'alive'
     (ghost nodes have no AE presence to clean up)

7. Order the cascade set:
   — Effectors first (nodeKind === 'effector'), affected nodes last (nodeKind === 'affected')
   — Within each group, order does not matter

8. Determine which hostingComps each node is losing:
   — For each node in the ordered cascade set:
     — Call hasCompDownstreamExcluding(node.id, deletedWireId) → remainingComps
     — losingComps = node.hostingComps.filter(c => remainingComps.indexOf(c) === -1)
     — These are the comps this node is being evicted from

9. Build the command batch:
   — For each node in ordered cascade set:
     — For each comp UUID in losingComps:
       — Call nodeDefinition.onGhost(nodeData, compUUID) → command object
       — If command is not null, push to batchCommands array

10. Update graphState for each node in cascade set:
    — newHostingComps = node.hostingComps.filter(c => remainingComps.indexOf(c) !== -1)
    — graphState.updateNode(node.id, {
        state: newHostingComps.length === 0 ? 'ghost' : 'alive',
        hostingComps: newHostingComps
      })

11. NOW remove the wire from wireMap:
    — graphState.removeWire(deletedWireId)

12. If batchCommands has entries:
    — Call evalBridge.dispatchBatch(batchCommands)
    — In .then(): if !res.ok — log the error. Do not re-ghost — state is already updated.

13. Call graphState.rebuildTempGraph().
```

### `hasCompDownstreamExcluding(nodeId, excludeWireId)` — internal helper

Same logic as `hasCompDownstream` but skips the wire with `id === excludeWireId` during traversal. This is an internal function — not exposed on the public API.

### Implementation shape

```javascript
// graph/cascadeAlgorithm.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js
// MUST LOAD BEFORE: graph/engine.js

var cascadeAlgorithm = (function() {

  function _isCompNode(nodeData) {
    // returns true if nodeData represents a CompNode
    // check: nodeData.nodeKind === 'affected' && nodeData.dedicated === true
    //        && nodeData.type === 'core/comp'
  }

  function _hasCompDownstreamExcluding(nodeId, excludeWireId, visited) {
    // recursive helper — returns array of comp UUIDs reachable downstream
    // skips wire with id === excludeWireId
    // uses visited set to prevent infinite traversal
  }

  function hasCompDownstream(nodeId) {
    return _hasCompDownstreamExcluding(nodeId, null, {});
  }

  function _collectCascadeSet(sourceNodeId, excludeWireId) {
    // returns array of nodeData objects: upstream affected + their effectors
    // never includes CompNodes
    // only includes alive nodes
  }

  function _orderCascadeSet(cascadeSet) {
    // returns new array: effectors first, affected last
  }

  function cascadeGhost(deletedWireId) {
    // see algorithm above
  }

  return {
    cascadeGhost:      cascadeGhost,
    hasCompDownstream: hasCompDownstream
  };

})();
```

Fill every function body from the algorithm above.

---

### Phase 2 verification — browser console

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  // Mock evalBridge for this test
  var _orig = evalBridge.dispatchBatch;
  var batchCalls = [];
  evalBridge.dispatchBatch = function(cmds) {
    batchCalls.push(cmds);
    return Promise.resolve({ ok: true, data: null, error: null });
  };
  var _origDispatch = evalBridge.dispatch;
  evalBridge.dispatch = function() {
    return Promise.resolve({ ok: true, data: null, error: null });
  };

  graphState.clearGraph();

  // Build: TextNode → CompNode (alive chain)
  graphState.addNode({ id: 'N-TEXT', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'T', content: 'Hi', fontSize: 72, color: [1,1,1,1],
             position: [0,0], rotation: 0, opacity: 100 },
    hostingComps: ['N-COMP'], portSlots: {} });

  graphState.addNode({ id: 'N-COMP', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0,
    props: { label: 'C', width: 1920, height: 1080, fps: 24, duration: 10, bgColor: [0,0,0] },
    hostingComps: [], portSlots: {} });

  graphState.addWire({ id: 'W-TC', type: 'layer', fromNode: 'N-TEXT', fromPort: 'output',
    toNode: 'N-COMP', toPort: 'layer_in_0', boundParam: null });

  // ── hasCompDownstream ──────────────────────────────────────
  var comps = cascadeAlgorithm.hasCompDownstream('N-TEXT');
  assert('hasCompDownstream finds comp from text node',  comps.length === 1);
  assert('hasCompDownstream returns comp UUID',          comps[0] === 'N-COMP');

  var compsFromComp = cascadeAlgorithm.hasCompDownstream('N-COMP');
  assert('hasCompDownstream on comp itself returns []', compsFromComp.length === 0);

  // ── cascadeGhost — text loses comp path ───────────────────
  batchCalls = [];
  cascadeAlgorithm.cascadeGhost('W-TC');

  setTimeout(function() {
    // Wire should be removed from wireMap
    assert('cascadeGhost removes wire from wireMap',
      graphState.getWire('W-TC') === null);

    // Text node should now be ghost
    var textAfter = graphState.getNode('N-TEXT');
    assert('cascadeGhost sets text node to ghost',
      textAfter !== null && textAfter.state === 'ghost');
    assert('cascadeGhost clears hostingComps on text',
      textAfter !== null && textAfter.hostingComps.length === 0);

    // Comp node should remain alive
    var compAfter = graphState.getNode('N-COMP');
    assert('cascadeGhost does not ghost comp node',
      compAfter !== null && compAfter.state === 'alive');

    // dispatchBatch was called with parkLayer command
    assert('cascadeGhost called dispatchBatch',  batchCalls.length === 1);
    assert('batch contains one command',         batchCalls[0].length === 1);
    assert('batch command is parkLayer',         batchCalls[0][0].action === 'parkLayer');
    assert('parkLayer has correct nodeUUID',     batchCalls[0][0].params.nodeUUID === 'N-TEXT');

    // ── multi-node cascade ─────────────────────────────────
    graphState.clearGraph();
    batchCalls = [];

    // NullNode → TextNode → CompNode
    graphState.addNode({ id: 'N-NULL', type: 'layers/null', nodeKind: 'affected', dedicated: true,
      state: 'alive', dirty: false, x: 0, y: 0,
      props: { label: 'N', position: [0,0], rotation: 0, opacity: 100, scale: [100,100] },
      hostingComps: ['N-COMP2'], portSlots: {} });

    graphState.addNode({ id: 'N-TEXT2', type: 'layers/text', nodeKind: 'affected', dedicated: false,
      state: 'alive', dirty: false, x: 0, y: 0,
      props: { label: 'T2', content: 'Hi', fontSize: 72, color: [1,1,1,1],
               position: [0,0], rotation: 0, opacity: 100 },
      hostingComps: ['N-COMP2'], portSlots: {} });

    graphState.addNode({ id: 'N-COMP2', type: 'core/comp', nodeKind: 'affected', dedicated: true,
      state: 'alive', dirty: false, x: 0, y: 0,
      props: { label: 'C2', width: 1920, height: 1080, fps: 24, duration: 10, bgColor: [0,0,0] },
      hostingComps: [], portSlots: {} });

    graphState.addWire({ id: 'W-NT', type: 'layer', fromNode: 'N-NULL', fromPort: 'output',
      toNode: 'N-TEXT2', toPort: 'layer_in_0', boundParam: null });
    graphState.addWire({ id: 'W-TC2', type: 'layer', fromNode: 'N-TEXT2', fromPort: 'output',
      toNode: 'N-COMP2', toPort: 'layer_in_0', boundParam: null });

    // Delete the wire between Text2 and Comp2
    cascadeAlgorithm.cascadeGhost('W-TC2');

    setTimeout(function() {
      // Both NullNode and TextNode2 should ghost (neither has comp path now)
      var nullAfter  = graphState.getNode('N-NULL');
      var text2After = graphState.getNode('N-TEXT2');
      assert('multi-cascade: text2 is ghost',   text2After.state === 'ghost');
      assert('multi-cascade: null is ghost',    nullAfter.state === 'ghost');
      assert('multi-cascade: comp still alive', graphState.getNode('N-COMP2').state === 'alive');
      assert('multi-cascade: dispatchBatch called', batchCalls.length === 1);
      assert('multi-cascade: batch has 2 commands', batchCalls[0].length === 2);

      // ── data wire deletion does not cascade ───────────────
      graphState.clearGraph();
      batchCalls = [];
      graphState.addNode({ id: 'N-A2', type: 'layers/text', nodeKind: 'affected', dedicated: false,
        state: 'alive', dirty: false, x: 0, y: 0, props: {}, hostingComps: ['N-C3'], portSlots: {} });
      graphState.addNode({ id: 'N-C3', type: 'core/comp', nodeKind: 'affected', dedicated: true,
        state: 'alive', dirty: false, x: 0, y: 0, props: {}, hostingComps: [], portSlots: {} });
      graphState.addWire({ id: 'W-DATA', type: 'data', fromNode: 'N-A2', fromPort: 'output',
        toNode: 'N-C3', toPort: 'layer_in_0', boundParam: 'fontSize' });

      cascadeAlgorithm.cascadeGhost('W-DATA');

      setTimeout(function() {
        // Data wire — should not cascade, node stays alive, dispatchBatch not called
        assert('data wire: cascadeGhost is no-op',
          graphState.getNode('N-A2').state === 'alive');
        assert('data wire: dispatchBatch not called', batchCalls.length === 0);

        // ── parent wire deletion does not cascade ─────────
        graphState.clearGraph();
        batchCalls = [];
        graphState.addNode({ id: 'N-P1', type: 'layers/text', nodeKind: 'affected', dedicated: false,
          state: 'alive', dirty: false, x: 0, y: 0, props: {}, hostingComps: ['N-C4'], portSlots: {} });
        graphState.addNode({ id: 'N-C4', type: 'core/comp', nodeKind: 'affected', dedicated: true,
          state: 'alive', dirty: false, x: 0, y: 0, props: {}, hostingComps: [], portSlots: {} });
        graphState.addWire({ id: 'W-PAR', type: 'parent', fromNode: 'N-P1', fromPort: 'child_of',
          toNode: 'N-C4', toPort: 'parent_of', boundParam: null });

        cascadeAlgorithm.cascadeGhost('W-PAR');

        setTimeout(function() {
          assert('parent wire: cascadeGhost is no-op',
            graphState.getNode('N-P1').state === 'alive');
          assert('parent wire: dispatchBatch not called', batchCalls.length === 0);

          // Restore evalBridge
          evalBridge.dispatchBatch = _orig;
          evalBridge.dispatch      = _origDispatch;
          graphState.clearGraph();

          console.log('---');
          console.log('cascadeAlgorithm:', PASS, 'passed,', FAIL, 'failed');
          if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
        }, 50);
      }, 50);
    }, 50);
  }, 50);

})();
```

**Zero failures required before Phase 3.**

**STOP. Paste console output. Wait for confirmation.**

---

## PHASE 3 — `engine.disconnectWire(wireId)`

Replace the stub in `graph/engine.js` with the real implementation.

### Algorithm

```
disconnectWire(wireId):

1. Look up the wire in wireMap. If not found — log warning, return.

2. Get the wire type.
   — If type is 'parent':
       a. Call evalBridge.dispatch({ action: 'clearLayerParent',
            params: { nodeUUID: wire.fromNode } })
       b. Call graphState.removeWire(wireId)
       c. Return. No cascade.
   — If type is 'data':
       a. Call graphState.removeWire(wireId)
       b. Return. No cascade.

3. Wire type is 'layer':
   — Call cascadeAlgorithm.cascadeGhost(wireId)
   — cascadeAlgorithm handles wire removal from wireMap internally.
   — Do NOT call graphState.removeWire here — cascadeAlgorithm owns that step.
```

**This is the complete implementation.** The engine's role is just routing — cascade owns everything else for layer wires.

Find the stub in `engine.js`:

```javascript
function disconnectWire(wireId) {
  console.log('[engine] disconnectWire stub — not yet implemented');
}
```

Replace it with the real implementation as described above.

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
  var _origDispatch = evalBridge.dispatch;
  var _origBatch    = evalBridge.dispatchBatch;
  var dispatchCalls = [];
  evalBridge.dispatch = function(cmd) {
    dispatchCalls.push(cmd);
    return Promise.resolve({ ok: true, data: null, error: null });
  };
  evalBridge.dispatchBatch = function(cmds) {
    return Promise.resolve({ ok: true, data: null, error: null });
  };

  graphState.clearGraph();

  // ── Parent wire disconnect ─────────────────────────────────
  graphState.addNode({ id: 'N-CH', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'alive', dirty: false, x: 0, y: 0, props: {}, hostingComps: ['N-CP'], portSlots: {} });
  graphState.addNode({ id: 'N-PA', type: 'layers/null', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0, props: {}, hostingComps: ['N-CP'], portSlots: {} });
  graphState.addNode({ id: 'N-CP', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 0, y: 0, props: {}, hostingComps: [], portSlots: {} });
  graphState.addWire({ id: 'W-PAR2', type: 'parent',
    fromNode: 'N-CH', fromPort: 'child_of', toNode: 'N-PA', toPort: 'parent_of', boundParam: null });

  dispatchCalls = [];
  engine.disconnectWire('W-PAR2');

  setTimeout(function() {
    assert('parent disconnect: wire removed',          graphState.getWire('W-PAR2') === null);
    assert('parent disconnect: clearLayerParent fired',
      dispatchCalls.length === 1 && dispatchCalls[0].action === 'clearLayerParent');
    assert('parent disconnect: child node still alive',
      graphState.getNode('N-CH').state === 'alive');

    // ── Data wire disconnect ───────────────────────────────
    graphState.addWire({ id: 'W-DAT2', type: 'data',
      fromNode: 'N-PA', fromPort: 'output', toNode: 'N-CH', toPort: 'layer_in_1',
      boundParam: 'fontSize' });

    dispatchCalls = [];
    engine.disconnectWire('W-DAT2');
    assert('data disconnect: wire removed',       graphState.getWire('W-DAT2') === null);
    assert('data disconnect: no dispatch fired',  dispatchCalls.length === 0);

    // ── Unknown wire is no-op ──────────────────────────────
    var noThrow = true;
    try { engine.disconnectWire('WIRE-DOES-NOT-EXIST'); } catch(e) { noThrow = false; }
    assert('disconnectWire unknown id is no-op', noThrow);

    // Restore
    evalBridge.dispatch      = _origDispatch;
    evalBridge.dispatchBatch = _origBatch;
    graphState.clearGraph();

    console.log('---');
    console.log('engine.disconnectWire:', PASS, 'passed,', FAIL, 'failed');
    if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
  }, 100);

})();
```

**Zero failures required before closing this task.**

**STOP. Paste console output. Wait for confirmation.**

---

## Additional Rules for This Task

**`cascadeGhost` is called BEFORE `graphState.removeWire`.** The cascade needs to read the wire from `wireMap` to identify the source node. The wire must still be there when `cascadeGhost` is called. `cascadeAlgorithm` removes the wire itself at step 11. `engine.disconnectWire` must never call `graphState.removeWire` for layer wires — cascade owns that.

**`hasCompDownstreamExcluding` is the simulation step.** Before deciding whether to cascade, the algorithm simulates the post-deletion state by ignoring the about-to-be-deleted wire during traversal. This is what makes the multi-comp rule work correctly — a node with two comp paths only cascades when both are severed.

**Only `alive` nodes enter the cascade set.** Ghost nodes have no AE presence. Adding them to the cascade set and calling `onGhost` on them would produce commands for AE objects that don't exist. Step 6 of the algorithm explicitly filters to `state === 'alive'` only.

**Effectors are collected from node input ports, not from the cascade traversal.** The upstream traversal collects affected nodes. Effectors are found by checking each affected node's input wires for upstream nodes with `nodeKind === 'effector'`. This is a separate pass — not part of the upstream layer-wire traversal.

**Cascade order is non-negotiable.** Effectors first, affected last. An effector modifies a layer owned by an affected node. If the layer is parked before the effect is stripped, the effect removal command targets an AE object that has moved — the order prevents this.

**`disconnectWire` for parent wires dispatches `clearLayerParent`.** This is the only AE call `engine.disconnectWire` makes directly. It fires `clearLayerParent` with the child node's UUID (the `fromNode` of the parent wire — the `child_of` end). The dispatcher handles finding and clearing `layer.parent` in AE.

**No ES6+.** `var`, `for...in`, named functions throughout all three files.

---

## On Completion

When all three phase test scripts return zero failures, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-07 COMPLETE

graph/cycleChecker.js            ✅  [N tests passed]
graph/cascadeAlgorithm.js        ✅  [N tests passed]
graph/engine.js (disconnectWire) ✅  [N tests passed]

Verified in browser console. Zero failures.
Note: AE park/unpark integration pending dispatcher implementation.

engine.disconnectWire stub replaced with real implementation.

Next task: TASK-08 — portManager.js + dirtyFlusher.js
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-07-CASCADE.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 9, 12, 13, 14 — PROCEDIA-V4-ARCHITECTURE.md Sections 6, 7, 8*
