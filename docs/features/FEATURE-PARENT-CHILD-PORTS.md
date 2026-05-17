# FEATURE-PARENT-CHILD-PORTS.md — Procedia
## Add Native Parent/Child Ports to All Affected Nodes

*May 2026 — Procedia v3*

---

## Context — Why This Exists

The cascade algorithm in `nodeState.js` determines a node's aliveness by traversing `layer` wires downstream to find a CompNode. This traversal is wire-type agnostic — it cannot distinguish between a wire that carries a layer into a comp (comp membership) and a wire that declares a parenting relationship between two layers.

This caused a concrete bug with NullNode:

```
textNodeA --[layer]--> nullNode --[layer]--> compNodeB
textNodeA --[layer]--> compNodeB
```

Cutting `textNodeA → compNodeB` should ghost textNodeA. But the cascade algorithm finds a surviving comp path through `nullNode → compNodeB` and keeps textNodeA alive — even though textNodeA is no longer projecting its layer into the comp, only declaring a parent relationship.

**The fix:** introduce a dedicated `parent` wire type that the cascade algorithm never traverses. Parenting is declared through explicit `child` and `parent` ports. The cascade only sees `layer` and `data` wires. Parent wires are invisible to it.

---

## Complete Model — Read Before Starting

### Port Layout on Affected Nodes

```
LEFT EDGE                    NODE                    RIGHT EDGE
─────────────────────────────────────────────────────────────────
[parent port]  ←──  accepts children wiring in
[layer inputs] ←──  layer_in, data_in, etc.
                                              ──→  [layer output]
                                              ──→  [child port]
```

- **`parent` port** — left edge, below layer inputs. Accepts unlimited wires. Any affected node can be a parent to many children.
- **`child` port** — right edge, below layer output. Accepts ONE wire only. A layer can have only one parent in AE. If a second wire attempts to connect, **replace**: disconnect the existing wire silently, then connect the new one.
- **Effector nodes do NOT get these ports.** Effectors modify layers — they do not own them. AE parenting operates on layer ownership. Effectors are excluded entirely.

### Wire Semantics

| Wire type | Cascade traversal | AE operation on connect | AE operation on disconnect |
|---|---|---|---|
| `layer` | ✅ Traversed — determines aliveness | `addLayer` / `makeLayerAlive` | `parkLayer` / `removeLayerFromComp` |
| `data` | ❌ Never traversed | Property write | Revert to default |
| `parent` | ❌ Never traversed | `setLayerParent(childUUID, parentUUID, compUUID)` | `clearLayerParent(childUUID, compUUID)` |

### Parent Wire Connect Rules

1. Both nodes must be **alive in the same hosting comp** before `setLayerParent` is called. If either node is ghost at wire creation time, store the wire in `wireMap` but do not call `setLayerParent` yet — it will be applied when both nodes are alive in the same comp.
2. If a second wire connects to the `child` port: call `clearLayerParent` for the old wire's parent UUID, remove the old wire from `wireMap`, then connect the new wire and call `setLayerParent`.
3. `setLayerParent` and `clearLayerParent` are called immediately — no debounce. They are structural operations.

### Parent Wire Disconnect Rules

1. Cutting a `parent` wire calls `clearLayerParent(childUUID, hostingCompUUID)` immediately.
2. **Cascade is never triggered.** Neither node changes state. Neither node ghosts.
3. If the **parent node ghosts** (its layer wire to the comp is cut): before parking the parent's layer, call `clearLayerParent` for every child still connected to its `parent` port that is alive in the same comp. The parent layer must be clean before parking — no children pointing to a parked layer.
4. If the **child node ghosts**: `clearLayerParent` is called as part of parking the child's layer. The parent node is unaffected.

### Cascade Algorithm Update — `nodeState.js`

Add `parent` to the wire types that stop traversal, alongside `data`:

```
function hasCompDownstream(nodeUUID):
  traverse output wires from nodeUUID
  SKIP wires of type: 'data', 'parent'   ← ADD 'parent' HERE
  TRAVERSE wires of type: 'layer' only
  return true if any CompNode is reachable
```

Add silent parent cleanup to `cascadeGhost()` — after step 3 (effectors removed), before step 4 (parkLayer):

```
3.5 — For each affected node about to be parked:
  a. Find all wires in wireMap where:
       wire.type === 'parent'
       wire.toNode === this node's UUID   (this node is the parent)
  b. For each such wire (child nodes):
       if child node is also in the ghost cascade → skip (child is parking too)
       if child node is alive in the same comp → call clearLayerParent(childUUID, hostingCompUUID)
  c. Also find wires where:
       wire.type === 'parent'
       wire.fromNode === this node's UUID  (this node is the child)
  d. Call clearLayerParent(this node UUID, hostingCompUUID)
     (this node's parent link must be cleared before parking)
```

### `onAlive` Update

When an affected node goes alive, after the layer is created/unparked:

```
After makeLayerAlive or unparkLayer:
  1. Check wireMap for any parent wire where wire.fromNode === this UUID (I am a child)
     If found AND the parent node is alive in the same comp:
       call setLayerParent(this UUID, parentUUID, hostingCompUUID)

  2. Check wireMap for any parent wires where wire.toNode === this UUID (I am a parent)
     For each child wire found — if child node is alive in the same comp:
       call setLayerParent(childUUID, this UUID, hostingCompUUID)
```

---

## Architecture Patches Required

These sections of `PROCEDIA-V3-ARCHITECTURE.md` must be updated as part of this feature. Update them in Phase 2.

### Section 1a — remove IsParentNode from effector list
`IsParentNode` is deprecated by this feature. Remove it from the effector table in Section 1c. Add a comment: `// IsParentNode removed — replaced by native parent/child ports on affected nodes`.

### Section 6a — add parent port type
```
| `parent` | A parenting declaration between two affected node layers | TextNode child port → NullNode parent port |
```

### Section 6c — add parent/child ports to affected node examples
```
TextNode (affected):
  inputs (left edge):
    - port: "parent_in"       type: parent  accepts: one wire from any affected node's child port — UNLIMITED
    - port: "data_fontSize"   type: data    accepts: number
    - port: "data_color"      type: data    accepts: color
    - port: "data_content"    type: data    accepts: string
  outputs (right edge):
    - port: "output"          type: layer   (standard layer output)
    - port: "child_out"       type: parent  accepts: one wire to any affected node's parent port — ONE WIRE MAX, replace on conflict

NullNode (affected):
  inputs (left edge):
    - port: "parent_in"       type: parent  accepts: unlimited wires
  outputs (right edge):
    - port: "output"          type: layer
    - port: "child_out"       type: parent  one wire max
```

### Section 6d — add parent port rules
```
- `parent` wire can only connect between `child_out` port and `parent_in` port. Mismatch with layer or data ports: port does not highlight, no connection made.
- `child_out` port accepts one wire only. If a second wire is dragged to an occupied `child_out`, the existing wire is disconnected (clearLayerParent called) and replaced with the new wire (setLayerParent called).
- `parent_in` port accepts unlimited wires — one per child node.
- Parent wires never trigger ghost cascade. Neither connect nor disconnect changes node state.
- Cycle check applies to parent wires too: a node cannot be both an ancestor and a descendant of the same node via parent wires.
```

### Section 7a — add parent wire row
```
| `parent` wire | No cascade — parenting link cleared silently | No cascade — parenting link cleared silently |
```

### Section 7b — update cascadeGhost algorithm
Add step 3.5 as described above in the Complete Model section.

### Section 12 — update setLayerParent / clearLayerParent trigger description
```
| `setLayerParent(childUUID, parentUUID, hostingCompUUID)` | parent wire connected (both nodes alive in same comp) | Sets childLayer.parent = parentLayer |
| `clearLayerParent(childUUID, hostingCompUUID)` | parent wire disconnected, OR parent/child node ghosts | Sets childLayer.parent = null |
```

---

## NullNode Brief Corrections

The current `node_template.md` for NullNode contains exceptions that are now handled universally by the parent port system. The following exceptions must be **deleted** from the NullNode brief before handing to Claude Code:

- **Exception 5 — PARENTING** → Delete entirely. Parenting is now handled by the `parent_in` port on NullNode, same as every other affected node.
- **Exception 6 — PORT MULTIPLICITY for `layer_in_{n}`** → Delete entirely. NullNode no longer has a `layer_in` input. Children wire into it via their `child_out` port to NullNode's `parent_in` port.
- **Exception 10 — SOURCE OF PARENTING TRUTH** → Delete entirely. Recovery reads `parent` wires from `wireMap` universally — no NullNode-specific logic.

The corrected NullNode inputs/outputs become:

```
Inputs:
  - parent_in: parent — unlimited wires — affected nodes that are children of this null

Outputs:
  - output: layer — the null layer passed downstream to a comp
  - child_out: parent — one wire — declares this null as child of another affected node
```

---

## Execution Protocol

Execute these phases in order. **Stop after every phase and wait for confirmation.**

---

### PHASE 1 — Read and audit

Read these files in order:
1. `CLAUDE.md` — all 12 skills
2. `PROCEDIA-V3-ARCHITECTURE.md` — full document
3. `graph/Wire/nodeState.js` — full file — locate `hasCompDownstream()` and `cascadeGhost()`
4. `graph/Wire/wire.js` — full file — locate wire connection validation logic
5. `graph/nodes/categories/core/Comp.js` — port declaration pattern
6. `graph/nodes/categories/layers/Text.js` — if it exists
7. `graph/nodes/categories/layers/Null.js` — if it exists

Report back:
- Exact line numbers of `hasCompDownstream()` in `nodeState.js`
- Exact line numbers of `cascadeGhost()` in `nodeState.js`
- How wire type is currently stored in `wireMap` entries (field name)
- How port type mismatches are currently rejected in `wire.js`
- Whether `Text.js`, `Null.js`, and `Comp.js` exist and their current port declarations
- Whether `setLayerParent` and `clearLayerParent` already exist in `jsx/properties.jsx`

**STOP. Report findings. Wait for confirmation.**

---

### PHASE 2 — Update architecture document

Open `PROCEDIA-V3-ARCHITECTURE.md`. Apply all patches listed in the "Architecture Patches Required" section above:

- Section 1c — remove IsParentNode
- Section 6a — add `parent` port type row
- Section 6c — add `parent_in` and `child_out` to affected node port examples
- Section 6d — add parent port rules
- Section 7a — add `parent` wire row
- Section 7b — add step 3.5 to cascadeGhost algorithm
- Section 12 — update setLayerParent / clearLayerParent trigger descriptions

**STOP. Confirm architecture doc is updated. Wait for confirmation.**

---

### PHASE 3 — Update `nodeState.js` — cascade algorithm

Two surgical changes only. Do not rewrite the file.

**Change A — `hasCompDownstream()`:**
Find the wire type filter. Add `'parent'` to the list of wire types that stop traversal, alongside `'data'`.

**Change B — `cascadeGhost()`:**
Add step 3.5 between the effector ghost loop and the affected node park loop:

```javascript
// Step 3.5 — clear parent links before parking
for (var i = 0; i < affectedNodesToGhost.length; i++) {
  var nodeUUID = affectedNodesToGhost[i];
  var hostingCompUUID = nodeMap[nodeUUID].hostingComps[0]; // or iterate if multi-comp

  // Clear this node's outbound parent link (I am a child)
  for (var wId in wireMap) {
    var w = wireMap[wId];
    if (w.type === 'parent' && w.fromNode === nodeUUID) {
      callClearLayerParent(nodeUUID, hostingCompUUID);
    }
  }

  // Clear inbound parent links (I am the parent — children still alive)
  for (var wId in wireMap) {
    var w = wireMap[wId];
    if (w.type === 'parent' && w.toNode === nodeUUID) {
      var childUUID = w.fromNode;
      // Only clear if child is NOT also in this ghost cascade
      var childIsGhosting = false;
      for (var j = 0; j < affectedNodesToGhost.length; j++) {
        if (affectedNodesToGhost[j] === childUUID) { childIsGhosting = true; break; }
      }
      if (!childIsGhosting && nodeMap[childUUID] && nodeMap[childUUID].state === 'alive') {
        callClearLayerParent(childUUID, hostingCompUUID);
      }
    }
  }
}
```

**Verification checklist:**
- [ ] `hasCompDownstream()` skips `parent` wire type
- [ ] `cascadeGhost()` has step 3.5 clearing parent links before any `parkLayer` call
- [ ] No other logic in `nodeState.js` was modified
- [ ] ES3 strict — `var` only, `for` loops only, no arrow functions

**STOP. Wait for confirmation.**

---

### PHASE 4 — Update `wire.js` — connection validation

Add `parent` wire type handling to the connection validation logic:

**Rule A — Port type matching:**
A `child_out` port can only connect to a `parent_in` port. Any other target port type → port does not highlight during wire drag, connection rejected silently.

**Rule B — `child_out` single-wire enforcement (replace on conflict):**
Before confirming a new wire to a `child_out` port:
```javascript
// Check if child_out already has a wire
var existingWire = findWireByFromPort(fromNodeUUID, 'child_out');
if (existingWire) {
  // Clear the old parent link in AE
  callClearLayerParent(fromNodeUUID, getHostingComp(fromNodeUUID));
  // Remove the old wire from wireMap
  delete wireMap[existingWire.id];
}
// Then proceed to connect the new wire
```

**Rule C — Cycle check extends to parent wires:**
Before confirming a `parent` wire from Node A (`child_out`) → Node B (`parent_in`):
Traverse all `parent` wires upstream from Node B. If Node A is found → cycle → reject silently.

**Rule D — Wire type stored in wireMap:**
Every parent wire entry in `wireMap` must include `type: 'parent'`. Verify the wire creation code sets this field.

**Verification checklist:**
- [ ] `parent` wire mismatch with `layer` or `data` ports → rejected silently
- [ ] Second wire to `child_out` → replaces, does not stack
- [ ] Cycle check works for parent wire chains
- [ ] `wireMap` entries for parent wires have `type: 'parent'`
- [ ] ES3 strict throughout

**STOP. Wait for confirmation.**

---

### PHASE 5 — Update `ae/nodeOps.js` — parent wire AE calls

Add two functions if they do not already exist. If they exist, verify their signatures match:

```javascript
// Called on parent wire connect (both nodes alive in same comp)
function callSetLayerParent(childUUID, parentUUID, hostingCompUUID) {
  var script = 'setLayerParent("' + childUUID + '","' + parentUUID + '","' + hostingCompUUID + '")';
  return evalBridge.call(script);
}

// Called on parent wire disconnect, or when either node ghosts
function callClearLayerParent(childUUID, hostingCompUUID) {
  var script = 'clearLayerParent("' + childUUID + '","' + hostingCompUUID + '")';
  return evalBridge.call(script);
}
```

Also add the `onAlive` parent re-application logic. After `makeLayerAlive` or `unparkLayer` resolves successfully:

```javascript
// Re-apply: I am a child
for (var wId in wireMap) {
  var w = wireMap[wId];
  if (w.type === 'parent' && w.fromNode === nodeUUID) {
    var parentUUID = w.toNode;
    if (nodeMap[parentUUID] && nodeMap[parentUUID].state === 'alive') {
      var sharedComp = getSharedHostingComp(nodeUUID, parentUUID);
      if (sharedComp) { callSetLayerParent(nodeUUID, parentUUID, sharedComp); }
    }
  }
}

// Re-apply: I am a parent
for (var wId in wireMap) {
  var w = wireMap[wId];
  if (w.type === 'parent' && w.toNode === nodeUUID) {
    var childUUID = w.fromNode;
    if (nodeMap[childUUID] && nodeMap[childUUID].state === 'alive') {
      var sharedComp = getSharedHostingComp(childUUID, nodeUUID);
      if (sharedComp) { callSetLayerParent(childUUID, nodeUUID, sharedComp); }
    }
  }
}
```

**Verification checklist:**
- [ ] `callSetLayerParent` and `callClearLayerParent` exist in `ae/nodeOps.js`
- [ ] `onAlive` re-applies both directions of parent links
- [ ] ES3 strict — no arrow functions, no const/let
- [ ] `evalBridge.call()` is the only bridge invocation (not `csInterface.evalScript` directly)

**STOP. Wait for confirmation.**

---

### PHASE 6 — Update node definitions — add ports to existing nodes

Update the port declarations for these three node files. Add `parent_in` and `child_out` ports. Do not change any other field.

**Nodes to update:**
- `graph/nodes/categories/core/Comp.js` — **parent_in only**. CompNode cannot be a child of anything — it is always the root. No `child_out` port.
- `graph/nodes/categories/layers/Text.js` — add both `parent_in` and `child_out`
- `graph/nodes/categories/layers/Null.js` — add both `parent_in` and `child_out`. Remove `layer_in_{n}` input entirely (it is replaced by `parent_in`). Remove Exceptions 5, 6, and 10 from comments.

**Port declaration pattern to add (ES3 object literal):**

```javascript
// In inputs array — add parent_in:
{
  key: 'parent_in',
  type: 'parent',
  label: 'Parent',
  multiplicity: 'unlimited'
}

// In outputs array — add child_out (not for CompNode):
{
  key: 'child_out',
  type: 'parent',
  label: 'Child',
  multiplicity: 'single'   // enforced by wire.js replace logic — declared here for clarity
}
```

**Verification checklist:**
- [ ] `Comp.js` has `parent_in`, no `child_out`
- [ ] `Text.js` has both `parent_in` and `child_out`
- [ ] `Null.js` has both `parent_in` and `child_out`, `layer_in_{n}` removed
- [ ] No other fields modified in any node file
- [ ] ES3 strict throughout

**STOP. Wait for confirmation.**

---

### PHASE 7 — Visual rendering — port appearance

The `parent_in` and `child_out` ports must be visually distinct from `layer` and `data` ports. Open `graph/nodes/node.js` (or wherever port rendering lives — confirm in Phase 1 audit).

**Rules:**
- `parent` ports render in a **distinct color** — not the same as layer ports (white/grey) or data ports. Use a warm tone (amber, gold) to suggest a relationship link rather than a data flow. Exact hex is your call — be specific and commit to one.
- `parent` ports render **below** all other ports on their respective edges. `parent_in` is the bottommost port on the left edge. `child_out` is the bottommost port on the right edge.
- Port shape: same circle as other ports. No special shape needed — color is enough to distinguish.
- Port label: `parent_in` shows label `"Parent"` on hover. `child_out` shows label `"Child"` on hover.
- Wire color: `parent` wires render in the same amber/gold color as the ports. This makes parent chains visually distinct from layer wires (typically white/blue) and data wires.

**Verification checklist:**
- [ ] `parent_in` and `child_out` ports render at bottom of their respective edges
- [ ] Parent ports and wires use a distinct color from layer and data ports
- [ ] Labels appear on hover only
- [ ] No layout shift on existing ports — only new ports added below

**STOP. Wait for confirmation.**

---

### PHASE 8 — Integration test (you drive this)

Output this message verbatim:

```
─────────────────────────────────────────
PHASE 8 — INTEGRATION TEST
Ready for manual testing.

Feature: Parent/Child Ports
Branch: [current branch name]

Please test these scenarios in order:

SCENARIO 1 — Basic parenting
  1. Drop a NullNode → wire to CompNode (null goes alive)
  2. Drop a TextNode → wire to CompNode (text goes alive)
  3. Wire TextNode child_out → NullNode parent_in
  4. Verify in AE: TextNode layer's parent = NullNode layer ✅

SCENARIO 2 — The original bug
  1. Drop TextNode, NullNode, CompNode
  2. Wire: TextNode → CompNode (layer wire)
  3. Wire: TextNode child_out → NullNode parent_in
  4. Wire: NullNode → CompNode (layer wire)
  5. Cut the TextNode → CompNode layer wire
  6. Verify: TextNode ghosts (layer removed from comp) ✅
  7. Verify: NullNode stays alive ✅
  8. Verify in AE: TextNode layer no longer in comp ✅

SCENARIO 3 — Parent replace
  1. Wire TextNode child_out → NullA parent_in (parented to NullA)
  2. Wire TextNode child_out → NullB parent_in (should replace NullA)
  3. Verify in AE: TextNode parent = NullB, not NullA ✅
  4. Verify NullA parent_in has no wire ✅

SCENARIO 4 — Ghost clears parenting
  1. Wire: TextNode → CompNode, NullNode → CompNode
  2. Wire: TextNode child_out → NullNode parent_in
  3. Cut NullNode → CompNode (null ghosts)
  4. Verify in AE: TextNode parent = null (cleared) ✅
  5. Verify TextNode stays alive in CompNode ✅

SCENARIO 5 — CompNode has no child_out
  1. Attempt to drag a wire from CompNode's right edge child area
  2. Verify: no child_out port exists on CompNode ✅

Reply with:
  ✅ PASS — to proceed to commit
  ❌ FAIL: [scenario number + describe issue] — to fix and retest
─────────────────────────────────────────
```

Do not proceed to Phase 9 until ✅ PASS.

---

### PHASE 9 — Commit

```bash
git add -A
git commit -m "feat: add native parent/child ports to all affected nodes"
git push origin HEAD
```

**Verification checklist:**
- [ ] `git status` is clean
- [ ] `git push` completed without errors

---

### PHASE 10 — Done

Output this message verbatim:

```
─────────────────────────────────────────
FEATURE COMPLETE

Feature: Native Parent/Child Ports
Branch:  [branch name]
Commit:  [short hash]

All affected nodes now have:
  - parent_in port (left edge, unlimited wires)
  - child_out port (right edge, one wire, replace on conflict)

Cascade algorithm updated:
  - parent wires never trigger ghost cascade
  - parent links cleared silently on ghost before parkLayer

IsParentNode deprecated and removed from architecture.
NullNode no longer requires special parenting logic.

Ready for next brief.
─────────────────────────────────────────
```

---

## Quick Phase Summary

```
PHASE 1  — read and audit — report findings — STOP
PHASE 2  — update PROCEDIA-V3-ARCHITECTURE.md — STOP
PHASE 3  — nodeState.js — hasCompDownstream + cascadeGhost step 3.5 — STOP
PHASE 4  — wire.js — parent type validation + replace logic — STOP
PHASE 5  — ae/nodeOps.js — callSetLayerParent + callClearLayerParent + onAlive re-apply — STOP
PHASE 6  — node definitions — Comp.js, Text.js, Null.js — add ports — STOP
PHASE 7  — node.js — visual rendering of parent ports and wires — STOP
PHASE 8  — STOP. hand to developer. integration test — 5 scenarios
PHASE 9  — commit feat:
PHASE 10 — confirm complete
```

Each phase is a hard stop. Never chain phases without explicit confirmation.

---

*FEATURE-PARENT-CHILD-PORTS.md — Procedia v3 — May 2026*
*Prerequisite reading: CLAUDE.md (all 12 skills), PROCEDIA-V3-ARCHITECTURE.md*
*This feature deprecates IsParentNode and replaces it with a universal port-level parenting system.*
