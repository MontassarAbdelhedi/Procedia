# FIX — Dirty Flush After Path Creation
*Procedia v4 — Single-file surgical fix.*

---

## Prerequisite Reading — Do This First

Read these files in full before touching anything:

1. `graph/engine.js` — read `_firePathCreation` and `connectWire` in full
2. `flush/dirtyFlusher.js` — read `_terminalWiresForEffector` and `flush` in full

No other files need to be read. No other files will be touched.

---

## The Bug

**Symptom:** When a Color node is wired to Fill's `color` param (data wire), the Fill effect's
color does not update in AE — even though Fill is alive and the path is complete.

**Root cause:** There is a wire-connection order where `_pathLayerUUID` is null on the Fill→Comp
terminal wire at the moment `dirtyFlusher.flush()` runs.

**The exact failure sequence:**

```
1. User drops: Text, Fill, Color, Comp
2. User wires: Fill → Comp   (layer wire — terminal)
   → engine calls _firePathCreation(fill_comp_wire_id)
   → collectPathUpstream walks upstream from Fill, finds Fill is an effector,
     keeps walking — but Fill has NO upstream layer wire yet
   → sourceNode is null → _firePathCreation returns early
   → _pathLayerUUID is NEVER stamped on Fill→Comp wire (stays null)

3. User wires: Color → Fill.color  (data wire, boundParam = 'color')
   → engine.connectWire marks Fill dirty, calls dirtyFlusher.schedule()
   → flush() runs, finds Fill dirty and alive
   → _terminalWiresForEffector(fill_id) iterates all wires
   → finds Fill→Comp wire but _pathLayerUUID === null → skipped
   → returns [] → no commands dispatched → Fill's color never reaches AE

4. User wires: Text → Fill  (layer wire — non-terminal)
   → _activateDormantTerminalWiresDownstream runs
   → finds Fill→Comp, collectPathUpstream now finds Text as sourceNode
   → _firePathCreation fires, stamps _pathLayerUUID = fill_comp_wire_id
   → from this point forward, flush works correctly
```

The window between steps 3 and 4 is the bug. Any data wire connected to an effector
before the effector's upstream layer wire is connected loses its first flush silently.

---

## The Fix

### What to change

**File:** `graph/engine.js`
**Function:** `_firePathCreation`
**Location:** immediately after the line `graphState.updateWire(wireId, { _pathLayerUUID: wireId });`

Add this block:

```javascript
// After stamping _pathLayerUUID, flush any dirty nodes in this path.
// This handles the case where a data wire was connected to an effector before
// the upstream layer wire existed — the effector was marked dirty but
// _terminalWiresForEffector returned empty because _pathLayerUUID was null.
// Now that the path is complete and stamped, those pending dirty states resolve.
var _hasDirtyInPath = false;
if (path.sourceNode && path.sourceNode.dirty) {
  _hasDirtyInPath = true;
}
if (!_hasDirtyInPath) {
  var _di;
  for (_di = 0; _di < path.effectors.length; _di++) {
    if (path.effectors[_di].dirty) {
      _hasDirtyInPath = true;
      break;
    }
  }
}
if (_hasDirtyInPath) {
  dirtyFlusher.flush();
}
```

**Variable naming:** use `_hasDirtyInPath` and `_di` (prefixed with underscore) to avoid
colliding with any outer-scope variables already in `_firePathCreation`. Do not reuse `i`,
`j`, `k` — they are already in use in the function above this insertion point.

### Why this is safe

- `dirtyFlusher.flush()` is idempotent — calling it when nothing is dirty is a no-op
- `path` is already computed at this point — no extra traversal cost
- The call is synchronous and executes before `dispatchBatch` resolves — no ordering issue
- `dirtyFlusher` is loaded after `graph/engine.js` in `index.html`, but `_firePathCreation`
  is only ever called at runtime (after all scripts are loaded) — no load-order problem

### What NOT to change

- Do not modify `_terminalWiresForEffector` — its skip logic (`!w._pathLayerUUID`) is correct
- Do not modify `dirtyFlusher.flush` — it handles the effector case correctly once
  `_pathLayerUUID` is stamped
- Do not modify `connectWire` — the data wire dirty-marking in step 5b is correct
- Do not modify `_activateDormantTerminalWiresDownstream` — it already works for the
  reconnect case; this fix handles the first-time case that precedes it
- Do not touch `cascadeAlgorithm.js`, `graphState.js`, or any node definition files
- Do not add, remove, or reorder any `<script>` tags in `index.html`

---

## Verification

Test this exact sequence in the browser console (no AE required — use the mock bridge):

```
Step 1: Drop nodes
  engine.dropNode('core/comp',   400, 200)  // compId
  engine.dropNode('effects/fill', 200, 200)  // fillId
  engine.dropNode('data/color',    50, 200)  // colorId
  engine.dropNode('layers/text',    50, 100)  // textId

Step 2: Wire Fill → Comp (terminal, but sourceNode is null → _pathLayerUUID stays null)
  engine.connectWire(fillId,  'output',   compId,  'layer_in_0')

Step 3: Wire Color → Fill.color (data wire)
  engine.connectWire(colorId, 'output',   fillId,  'layer_in_1', 'color')
  // At this point Fill is dirty. Before the fix: flush does nothing.
  // After the fix: still nothing yet — _pathLayerUUID is still null here.
  // (The fix fires AFTER _firePathCreation stamps — not here.)

Step 4: Wire Text → Fill (this triggers _activateDormantTerminalWiresDownstream
        which calls _firePathCreation which stamps _pathLayerUUID AND — with the fix —
        also calls dirtyFlusher.flush())
  engine.connectWire(textId, 'output', fillId, 'layer_in_0')

  EXPECTED after fix:
  - _pathLayerUUID is stamped on Fill→Comp wire
  - dirtyFlusher.flush() is called immediately inside _firePathCreation
  - Fill's color param is dispatched as setEffectProperty to AE
  - graphState shows Fill.dirty === false after flush resolves

  WITHOUT fix:
  - _pathLayerUUID is stamped
  - No flush is triggered
  - Fill.dirty remains true until user makes another inspector change
```

**Confirm these things after applying the fix:**

1. `graphState.getWire(fill_comp_wire_id)._pathLayerUUID` is not null after step 4
2. `graphState.getNode(fillId).dirty` is `false` after step 4 resolves
3. A `setEffectProperty` command with `key: 'color'` appears in the evalBridge dispatch log
4. Connecting wires in the "correct" order (Text→Fill first, then Fill→Comp) still works
   as before — no regression

---

## Commit

```
git add graph/engine.js
git commit -m "fix: flush dirty effectors when path is stamped in _firePathCreation

Data wires connected to an effector before its upstream layer wire exists
mark the effector dirty but _terminalWiresForEffector returns empty because
_pathLayerUUID is null. When the upstream layer wire is later connected,
_firePathCreation stamps _pathLayerUUID but never flushes — leaving the
effector permanently dirty until the next inspector change.

Fix: after stamping _pathLayerUUID, check if any node in the new path is
dirty and call dirtyFlusher.flush() immediately if so."
```

**STOP. Do not proceed to any other task. Wait for confirmation that verification passes.**
