# BRIEF — Wire-Driven AE Layer Creation
*Procedia v4 · Architecture Change · graph/ · jsx/dispatcher/*
*Status: Ready for implementation*

---

## The Problem

Layer creation is currently **node-driven**: when an affected node (e.g. TextNode) goes alive,
one AE layer is created and keyed to the node's UUID. This model breaks as soon as one affected
node has multiple downstream paths into a comp.

**Example of the failure:**

```
text node ——wire 1——> comp node         → creates 1 AE layer (node UUID as key)
text node ——wire 2——> fill node ——wire 3——> comp node   → ??? same node UUID, same layer?
```

The node-driven model cannot represent these two paths as separate AE layers. It conflates
`text (raw)` with `text + fill` as a single object — which is architecturally wrong and will
corrupt AE state when paths diverge or either wire is removed.

---

## The Fix — Path-Driven Layer Creation

Each **path** from an affected source node through zero or more effectors into a comp node
produces exactly one AE layer. A path is identified by the UUID of its **terminal wire** — the
wire whose `toNode` is a CompNode.

This is a precise model change. It does not change how nodes are defined. It does not change the
dispatcher. It changes how the engine and cascade algorithm interpret wire events.

---

## Core Definition

**Terminal wire:** Any `layer` wire whose `toNode` is a CompNode.

**Path:** The ordered chain of layer wires leading from an affected source node (possibly through
effectors) to a terminal wire.

**One path = one AE layer.** The layer's `.comment` in AE is the terminal wire's UUID — never
the node UUID.

**wireMap entry for a terminal wire gets one new field:**

```javascript
// wireMap entry — terminal wire (toNode is a CompNode)
{
  id:       'WIRE-xxx',
  type:     'layer',
  fromNode: 'PROC-fill-uuid',   // could be an effector or the source affected node directly
  fromPort: 'output',
  toNode:   'PROC-comp-uuid',   // always a CompNode for terminal wires
  toPort:   'layer_in_0',
  boundParam: null,
  _pathLayerUUID: 'WIRE-xxx'    // UUID stamped into AE layer .comment for this path
                                // For terminal wires: always equals the wire's own id.
                                // For non-terminal wires: null.
}
```

`_pathLayerUUID` is the AE identity of the layer this path produced. It is null for all
non-terminal wires. It is set on wire creation (when the wire is confirmed into wireMap).

---

## Behavior Contract — Four Events

### EVENT 1 — Terminal wire added (path becomes complete)

A wire is confirmed into wireMap where `toNode` is a CompNode.

**Engine must:**

1. Walk upstream from `wire.fromNode` following layer wires only, collecting the full path in
   order: `[sourceAffectedNode, ...effectors]`
2. Identify `sourceAffectedNode` — the first `nodeKind: 'affected'` node in the upstream chain
3. Call `sourceAffectedNode.onAlive(nodeData, hostingCompUUID)` to produce the create command.
   Pass `layerUUID: wire.id` in params so the dispatcher stamps this UUID into `layer.comment`
4. For each effector in path order (closest to source first): call
   `effector.onAlive(nodeData, hostLayerUUID, hostingCompUUID)` to apply the effector
5. Store `wire._pathLayerUUID = wire.id` in wireMap via `graphState.updateWire()`
6. Update `sourceAffectedNode.hostingComps` to include `hostingCompUUID` (if not already present)
7. Dispatch all commands as a single `evalBridge.dispatchBatch()`

### EVENT 2 — Terminal wire removed (path destroyed)

A layer wire is deleted where `toNode` is a CompNode.

**Engine must:**

1. Read `wire._pathLayerUUID` from wireMap before deletion
2. Build the teardown batch:
   - Walk upstream from `wire.fromNode`, collect effectors in reverse order (outermost first)
   - For each effector: call `effector.onGhost(nodeData, hostingCompUUID)` → add command to batch
   - Call `dispatcher.deletePathLayer` action with `{ layerUUID: wire._pathLayerUUID, compUUID: hostingCompUUID }` — removes the AE layer whose `.comment === wire._pathLayerUUID`
3. Delete wire from wireMap
4. Re-evaluate `sourceAffectedNode.hostingComps`: remove this comp UUID only if no other terminal
   wire in wireMap still points to this same comp from this same source node
5. If `hostingComps` becomes empty: set source node state to `ghost` in nodeMap
6. Dispatch all commands as `evalBridge.dispatchBatch()`
7. Rebuild tempGraph

### EVENT 3 — Intermediate wire added (completes a previously broken path)

Example: `text ——wire 2——> fill` already exists. User adds `fill ——wire 3——> comp`.
Wire 3 is the new terminal wire.

This is the same as EVENT 1. The engine detects that wire 3's `toNode` is a CompNode and fires
the full path-creation sequence, walking upstream through fill to find the source text node.

### EVENT 4 — Intermediate wire removed (path broken mid-chain)

Example: `text ——wire 2——> fill ——wire 3——> comp`. User removes wire 2 (between text and fill).
Wire 3 is still in wireMap but the path is severed.

**Engine must:**

1. Detect that deleting wire 2 breaks path(s) downstream of it. Walk downstream from wire 2's
   `toNode` (fill) to find all terminal wires that were reachable through wire 2.
2. For each such terminal wire found: run EVENT 2 teardown — collect effectors, delete path layer,
   remove `_pathLayerUUID` entry
3. Set fill node state to ghost (it has no remaining comp path)
4. Re-evaluate text node: if no other paths remain, set to ghost and park its layer in Reserved
5. Batch all commands and dispatch in a single bridge crossing

---

## What Changes in Each File

### `graph/graphState.js`

Add `updateWire(wireId, fields)` if it doesn't exist. Used to set `_pathLayerUUID` on a wire
after layer creation confirms.

`wireMap` schema gains one field per wire entry: `_pathLayerUUID: null | string`.

### `graph/engine.js`

The wire commit handler (called when a wire is confirmed) must detect if `toNode` is a CompNode.
If yes: fire path-creation sequence (EVENT 1) instead of the current node-level alive call.

The wire delete handler must detect if the deleted wire was a terminal wire (had `_pathLayerUUID`
set). If yes: fire path-destruction sequence (EVENT 2). If not: fire intermediate-cut sequence
(EVENT 4).

**Zero node-type conditionals added.** CompNode detection uses
`nodeRegistry.getDefinition(node.type).nodeKind` or `node.type === 'core/comp'` — contained
inside `cascadeAlgorithm.js`, not in `engine.js`.

### `graph/cascadeAlgorithm.js`

`hasCompDownstream(nodeUUID)` — no change needed. Already traverses downstream correctly.

`cascadeGhost(deletedWireId)` — extend to handle EVENT 4. When the deleted wire is non-terminal,
the algorithm must walk downstream to find all terminal wires that are now stranded, then run
EVENT 2 teardown for each one.

`collectPathUpstream(terminalWireId)` — new function. Walks upstream from a terminal wire's
`fromNode` following layer wires, returning the ordered list:
`{ sourceNode, effectors: [closest-to-source, ..., closest-to-comp] }`.

### `jsx/dispatcher.jsx`

Add one new action: `deletePathLayer`.

```
action: 'deletePathLayer'
params: { layerUUID: string, compUUID: string }
```

Finds the AE layer in `compUUID` whose `.comment === layerUUID` and removes it.
This is distinct from `deleteParkedLayer` (which removes from the Reserved Comp).

The `createTextLayer`, `createNullLayer`, etc. actions must accept a new optional param:
`layerUUID`. When present, stamp `layer.comment = layerUUID` instead of the default node UUID.
When absent, existing behavior unchanged (backward compatible).

### Node definition files (Text.js, Null.js, Shape.js, etc.)

`onAlive(nodeData, hostingCompUUID)` hook signature unchanged.

The engine passes `layerUUID` as part of `params` when building the dispatch command — the node
definition does not need to know about it. The engine injects it into the command object after
calling the hook.

No node file changes required.

---

## Wire Validation — New Rule

Add to `graph/wireValidator.js`:

**Duplicate path rule:** Reject any new wire from source node A into comp C if a path from A to C
already exists in wireMap (i.e., another terminal wire already connects A's output chain into C's
input). Two paths from the same source to the same comp would produce duplicate AE layers in that
comp — illegal.

The validator walks upstream from the proposed `fromNode` to find the source affected node, then
checks wireMap for any existing terminal wire that reaches the same comp from the same source.

---

## What Does NOT Change

- Node definition files — no hooks change, no ports change, no params change
- `evalBridge.js` — no change
- `poller.js` — polling still queries by node UUID via `layer.comment`, but now layer.comment
  is a wire UUID for path-created layers. Update `pollAliveNodes` to receive a list of
  `{ nodeUUID, layerUUID, compUUID }` objects instead of a flat UUID list. For path-created
  layers, `layerUUID !== nodeUUID`. For legacy parked layers, `layerUUID === nodeUUID`.
- Ghost cascade trigger rules — still layer wires only, still data/parent wires skipped
- `dirtyFlusher.js` — debounce unchanged. Property changes still key on node UUID.
  The flusher resolves the path layer UUID from wireMap at flush time.
- `persistence.jsx` — wireMap is already persisted. `_pathLayerUUID` is a wireMap field and
  will serialize automatically. No extra work.

---

## Scenarios — Expected Behavior

### Scenario A — Direct wire to comp
```
text ——wire 1——> comp
```
1. Wire 1 confirmed. `wire 1.toNode` is CompNode.
2. ENGINE: call `Text.onAlive()`, inject `layerUUID: 'WIRE-1'` into command.
3. AE: text layer created. `layer.comment = 'WIRE-1'`.
4. `wire 1._pathLayerUUID = 'WIRE-1'` stored in wireMap.
5. Text node state → alive. `hostingComps: ['comp-uuid']`.

### Scenario B — Fill added, no comp downstream yet
```
text ——wire 2——> fill       (fill has no comp downstream)
```
1. Wire 2 confirmed. `wire 2.toNode` is fill (effector, not CompNode).
2. ENGINE: `toNode` is not CompNode → no path creation. Wire added to wireMap only.
3. Fill node: evaluate state → no comp downstream → stays ghost.
4. Text node: `hasCompDownstream` → still ghost (no comp reachable).
5. AE: nothing happens.

### Scenario C — Fill connected to comp (completing the path)
```
text ——wire 2——> fill ——wire 3——> comp
```
1. Wire 3 confirmed. `wire 3.toNode` is CompNode.
2. ENGINE: walk upstream from fill → finds text as source affected node.
3. Call `Text.onAlive()` with `layerUUID: 'WIRE-3'` → creates text layer. `layer.comment = 'WIRE-3'`.
4. Call `Fill.onAlive()` with `hostLayerUUID: 'WIRE-3'` → applies Fill effect to that layer.
5. `wire 3._pathLayerUUID = 'WIRE-3'` stored.
6. Text node → alive. `hostingComps: ['comp-uuid']`.
7. Fill node → alive.

**AE comp timeline now contains:**
```
Layer 1: text layer  (comment = 'WIRE-1')    ← from Scenario A
Layer 2: text layer  (comment = 'WIRE-3')    ← from Scenario C, has Fill effect applied
```

### Scenario D — Remove wire 1
```
wire 1 deleted
```
1. ENGINE: `wire 1._pathLayerUUID = 'WIRE-1'`. This is a terminal wire.
2. Teardown: no effectors on wire 1's path. Dispatch `deletePathLayer({ layerUUID: 'WIRE-1', compUUID: 'comp-uuid' })`.
3. AE: layer with `comment = 'WIRE-1'` removed from comp.
4. Wire 1 deleted from wireMap.
5. Text node: check remaining `hostingComps` — wire 3's path still alive → stays alive.
6. Fill node: unaffected.

**AE comp timeline now contains:**
```
Layer 1: text layer + fill  (comment = 'WIRE-3')    ← untouched
```

### Scenario E — Remove wire 3
```
wire 3 deleted
```
1. ENGINE: `wire 3._pathLayerUUID = 'WIRE-3'`. Terminal wire.
2. Teardown upstream path: fill.onGhost() → remove Fill effect from layer.
3. Dispatch `deletePathLayer({ layerUUID: 'WIRE-3', compUUID: 'comp-uuid' })`.
4. Wire 3 deleted from wireMap.
5. Text node: re-evaluate `hostingComps` — no remaining paths → state → ghost.
6. Text node ghost: `Text.onGhost()` → `parkLayer` → layer moved to Reserved Comp.
7. Fill node: → ghost. Props preserved in nodeMap.

### Scenario F — Remove intermediate wire 2 (mid-chain cut)
```
text ——wire 2——> fill ——wire 3——> comp
wire 2 deleted
```
1. ENGINE: `wire 2.toNode` is fill (not CompNode). Not a terminal wire.
2. Walk downstream from fill → find terminal wire 3. `wire 3._pathLayerUUID = 'WIRE-3'`.
3. Run EVENT 2 teardown for wire 3's path:
   - Fill.onGhost() → remove Fill effect
   - `deletePathLayer({ layerUUID: 'WIRE-3', compUUID: 'comp-uuid' })`
4. Wire 2 deleted from wireMap.
5. Text node: no remaining comp paths → ghost → `Text.onGhost()` → `parkLayer`.
6. Fill node: → ghost.

---

## Implementation Order

Complete each phase fully. Stop after each. Do not proceed without confirmation.

**PHASE 1 — Read and plan**
Read `graph/engine.js`, `graph/cascadeAlgorithm.js`, `graph/graphState.js`,
`graph/wireValidator.js`, `jsx/dispatcher/dispatcher.jsx`, `polling/poller.js`.
State in plain language: which functions you will modify and what each change does.
List every file that will be touched.
STOP. Wait for confirmation.

**PHASE 2 — `graphState.js`**
Add `updateWire(wireId, fields)` method.
Add `_pathLayerUUID: null` to default wire structure in `addWire()`.
Verify: `graphState.addWire({...})` creates entry with `_pathLayerUUID: null`.
STOP.

**PHASE 3 — `jsx/dispatcher.jsx`**
Add `deletePathLayer` action handler.
Add `layerUUID` param support to `createTextLayer`, `createNullLayer`, `createShapeLayer`,
`createSolidLayer`, `createAdjustmentLayer` — when `layerUUID` is present, use it as
`layer.comment`. When absent, fall back to `nodeUUID` (existing behavior).
ES3 strict throughout. All returns `JSON.stringify({ ok, data, error })`.
STOP.

**PHASE 4 — `graph/cascadeAlgorithm.js`**
Add `collectPathUpstream(terminalWireId)` — returns `{ sourceNode, effectors }`.
Extend `cascadeGhost()` to handle EVENT 4: non-terminal wire cut → find stranded terminal wires
downstream → run teardown for each.
STOP.

**PHASE 5 — `graph/engine.js`**
Modify wire-commit handler: detect terminal wire → call EVENT 1 sequence.
Modify wire-delete handler: detect terminal vs. non-terminal → call EVENT 2 or EVENT 4.
Zero node-type conditionals added to `engine.js`. CompNode detection stays in cascadeAlgorithm.
STOP.

**PHASE 6 — `graph/wireValidator.js`**
Add duplicate-path rule: reject wire if source affected node already has a path into the same
comp via another terminal wire.
STOP.

**PHASE 7 — `polling/poller.js`**
Update `pollAliveNodes` to accept `{ nodeUUID, layerUUID, compUUID }` objects.
When `layerUUID !== nodeUUID` (path-created layer), look up the AE layer by `layerUUID`, not
`nodeUUID`.
STOP.

**PHASE 8 — Integration verification (all scenarios)**
Run all six scenarios from this brief manually in the panel. Check each expected outcome.
Report results against the checklist below.
STOP.

---

## Verification Checklist

```
SCENARIO A — Direct wire to comp
  [ ] Drop TextNode. Drop CompNode. Wire text → comp.
      AE: one text layer appears in comp. layer.comment === the wire's UUID (not node UUID).
  [ ] Text node state: alive. hostingComps contains comp UUID.

SCENARIO B — Fill added, no comp downstream
  [ ] Drop FillEffectNode. Wire text → fill (no comp connected).
      AE: nothing changes. No new layer created.
  [ ] Fill node state: ghost. Text node state: unchanged from Scenario A.

SCENARIO C — Fill connected to comp
  [ ] Wire fill → comp (completing the path).
      AE: second text layer appears in comp. This layer has the Fill effect applied.
          layer.comment === wire 3's UUID.
  [ ] comp now has exactly 2 layers. No duplicate UUIDs in .comment fields.

SCENARIO D — Remove wire 1
  [ ] Delete wire 1 (direct text → comp wire).
      AE: layer whose .comment === wire 1 UUID is removed. The fill-path layer is untouched.
  [ ] comp has exactly 1 layer (the fill-path one). Text node still alive.

SCENARIO E — Remove wire 3
  [ ] Delete wire 3 (fill → comp wire).
      AE: Fill effect removed from the path layer. Path layer removed from comp.
          Text node parks its layer in Reserved Comp.
  [ ] comp is empty. Text node: ghost. Fill node: ghost.

SCENARIO F — Intermediate wire cut
  [ ] With text → fill → comp active, delete wire 2 (text → fill).
      AE: Fill effect removed. Path layer deleted. Text layer parked in Reserved Comp.
  [ ] comp is empty. Text node: ghost. Fill node: ghost.

DUPLICATE PATH GUARD
  [ ] With wire 1 (text → comp) active, attempt a second direct wire from text → comp.
      Result: wire rejected before creation. One wire to comp per source-comp pair.

REGRESSION — existing behaviors unaffected
  [ ] Multi-comp: text wired to CompA and CompB independently → 2 layers (one per terminal wire).
      Removing wire to CompA removes only that layer. CompB layer untouched.
  [ ] Park/unpark: remove all comp wires → text parks in Reserved. Re-wire → text unparks.
      Keyframes on the parked layer survive.
  [ ] Property change via inspector → correct layer updated in AE (resolved by wire UUID).
  [ ] Panel reload: wireMap persists with _pathLayerUUID. Graph restores correctly.
  [ ] Poller: alive nodes polled without errors after UUID scheme change.
```

---

## Absolute Rules — Applies to This Task

1. ES3 strict in all `.jsx` files. No exceptions.
2. Every `.jsx` function returns `JSON.stringify({ ok, data, error })`.
3. `evalBridge.js` is the only file that calls `csInterface.evalScript()`.
4. `graphState.js` is the only file that mutates `nodeMap` and `wireMap`.
5. `engine.js` contains zero node-type conditionals.
6. No node definition file is touched by this task.
7. One phase at a time. Stop after each phase. Wait for confirmation before proceeding.

---

*BRIEF-WIRE-DRIVEN-LAYERS.md — Procedia v4 — May 2026*
*Hand this document to Claude Code. Read CLAUDE.md and PROCEDIA-V4-ARCHITECTURE.md first.*
