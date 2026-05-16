# majorDebug-v0.2 — Procedia Architecture Fixes
*CEP · After Effects 2025+ · Windows · ExtendScript ES3*
*Authored: May 2026 — To be executed by Claude Code before any new node is built*

---

## Overview

This file contains **6 fixes and 2 new tasks** to be executed sequentially before any new node type is added to Procedia. Each fix addresses either a confirmed bug, a missing specification, or a scalability problem identified in the v2 architecture review.

Read `CLAUDE.md` and `PROCEDIA-V2-ARCHITECTURE.md` in full before starting Task 1.
Stop and verify after every task. Do not chain tasks.

---

## Task Index

| # | Task | Type | Files Touched |
|---|---|---|---|
| 1 | Multi-comp node representation — explicit spec + code | Spec + logic fix | `graph/Wire/nodeState.js`, `PROCEDIA-V2-ARCHITECTURE.md` |
| 2 | Add node position to dataLayer | Spec + data model fix | `PROCEDIA-V2-ARCHITECTURE.md`, `graph/graphState.js`, `jsx/persistence.jsx` |
| 3 | Persistence chunking — text layer size limit | Critical bug fix | `jsx/persistence.jsx`, `jsx/init.jsx`, `bridge/evalBridge.js` |
| 4 | Ghost cascade — batch evalScript calls | Performance fix | `graph/Wire/nodeState.js`, `ae/nodeOps.js`, `jsx/nodeLifeCycle/nodeLifecycle.jsx` |
| 5 | Error state resolution — alert UI (next phase) | New feature spec | `notifications/notificationBar.js`, `ae/nodeOps.js`, `jsx/nodeLifeCycle/nodeLifecycle.jsx` |
| 6 | pollAliveNodes — extend to watch layers (next phase) | New feature spec | `polling/poller.js`, `jsx/polling.jsx` |

---

## TASK 1 — Multi-Comp Node Representation (Explicit Spec + Code Fix)

### What the problem is

The architecture states that a node can be alive in multiple comps simultaneously — but never defines how this is represented in `dataLayer` or how `nodeState.js` decides when to call `onGhost`.

The missing rule: when a wire is deleted, `nodeState.js` checks whether the node is still alive in **any other comp**. If yes, the node stays alive. Only when **all comp paths are gone** does the node call `onGhost`.

This must be:
1. Explicitly written into the architecture as a named rule
2. Correctly implemented in `graph/Wire/nodeState.js`

---

### Rule to add to PROCEDIA-V2-ARCHITECTURE.md

Add a new subsection **5e — Multi-Comp Node Alive Rule** immediately after Section 5d:

```
### 5e. Multi-Comp Node Alive Rule

A node can be alive in multiple comps at once. In dataLayer, it appears as a node
entry under each hosting comp's tree — one entry per comp.

When a wire is deleted:
  1. Run hasCompDownstream(nodeId) from nodeState.js
  2. This function traverses ALL remaining output wires from the node
  3. It collects every CompNode UUID reachable from any output wire
  4. If the result list is empty → node has no comp path → call onGhost
  5. If the result list is non-empty → node is still alive in those comps → do nothing

A node can NEVER be ghosted in one comp while alive in another.
Ghost is a binary state — it applies to the entire node, not per-comp.

The exception: removeLayerFromComp is called when a specific comp path is broken
but other paths remain. This removes the layer from that specific comp in AE and
removes that comp's node entry from dataLayer — but does NOT change the node state.
The node stays alive. onGhost is not called.

Summary:
  - Wire deleted → check ALL remaining output paths → any comp reachable? → stay alive
  - Wire deleted → check ALL remaining output paths → no comp reachable? → onGhost
  - Partial path broken (some comps remain) → removeLayerFromComp only, no state change
```

---

### Code — `graph/Wire/nodeState.js`

The `hasCompDownstream(nodeId)` function must:

**Human-language algorithm:**
1. Accept a `nodeId` as input
2. Look up all wires in `wireMap` where `fromNode === nodeId`
3. For each wire found, look up the `toNode`
4. If `toNode` is a CompNode → add its UUID to a result set
5. If `toNode` is not a CompNode → recursively call `hasCompDownstream(toNode.id)`
6. Merge all recursive results into the result set
7. Return the result set (array of reachable CompNode UUIDs)

Caller in `wire.js` (on wire delete):
- Call `hasCompDownstream(nodeId)` for the upstream node of the deleted wire
- If result is empty → dispatch `onGhost` for that node
- If result is non-empty → call `removeLayerFromComp` only for the specific broken comp path

**Verification checklist:**
- [ ] `hasCompDownstream` returns an array, never a boolean
- [ ] A node wired to two comps: delete one wire → node stays alive, `removeLayerFromComp` called for that comp only
- [ ] A node wired to one comp: delete that wire → `onGhost` called
- [ ] A chain A → B → CompNode: delete A→B wire → both A and B ghost (cascade still works)
- [ ] No infinite recursion — cycle prevention already handled at wire creation; traversal is safe

---

## TASK 2 — Add Node Position to dataLayer

### What the problem is

Section 0 of the architecture currently states:

> Canvas node positions (x, y) are **panel memory only** — never written to AE or dataLayer

This was a deliberate early decision — but it creates a confirmed UX problem: after an AE crash and panel recovery, all node positions are lost. Every node returns to a default position. On a complex graph this is destructive to the user's work.

Position must be added to dataLayer so it survives crashes.

---

### Changes to PROCEDIA-V2-ARCHITECTURE.md

**1. Remove this bullet from Section 0:**
```
- Canvas node positions (x, y) are **panel memory only** — never written to AE or dataLayer
```

**Replace with:**
```
- Canvas node positions (x, y) are written to dataLayer on every node move and on onDrop.
  They are restored from dataLayer on crash recovery.
  Position is stored per-node at the top level of each node's entry (ghost list and comp tree).
```

**2. Update Section 3a `onDrop` step 4:**

Current:
```
4. Write to `dataLayer` ghost list: `{ id, type }` — no position, no properties
```

Replace with:
```
4. Write to `dataLayer` ghost list: `{ id, type, x, y }` — position included, no properties
```

**3. Update Section 6a dataLayer JSON schema — ghost array:**

Current:
```json
"ghost": [
  { "id": "PROC-xxx", "type": "TextNode" },
  { "id": "PROC-yyy", "type": "ShapeNode" }
]
```

Replace with:
```json
"ghost": [
  { "id": "PROC-xxx", "type": "TextNode", "x": 240, "y": 180 },
  { "id": "PROC-yyy", "type": "ShapeNode", "x": 560, "y": 320 }
]
```

**4. Update Section 6a — alive node entries under `project[compUUID].nodes`:**

Add `"x"` and `"y"` to each node entry in the schema example:
```json
"PROC-text1-uuid": {
  "type": "TextNode",
  "state": "alive",
  "x": 240,
  "y": 180,
  "properties": { ... },
  "keyframes": {},
  "effects": { ... }
}
```

**5. Update Critical Rule 9 in Section 11:**

Current:
```
9. Canvas positions are never persisted. Do not add x/y to dataLayer, dataWire, or any ExtendScript call.
```

Replace with:
```
9. Canvas positions are persisted in dataLayer only — never in dataWire, never passed as arguments
   to any ExtendScript lifecycle call (makeNodeAlive, makeNodeGhost, etc.).
   Position is written to dataLayer via writeDataLayer on every node move.
   Position is never sent to AE — AE has no concept of canvas position.
```

---

### Code — `graph/graphState.js`

Add a `onNodeMoved(uuid, x, y)` action:

**Human-language algorithm:**
1. Receive `uuid`, `x`, `y`
2. Find node in `nodeMap` by UUID
3. Update `nodeMap[uuid].position = { x, y }`
4. Set a `positionDirty` flag to true
5. The debounced write (see Task 3, write-queue) will flush this to dataLayer

No direct evalScript call on every move — position writes go through the debounced write queue.

---

### Code — `jsx/persistence.jsx`

`writeGhostEntry(uuid, nodeType, x, y)`:
- Update signature to accept `x` and `y`
- Include them in the ghost list entry written to dataLayer

`readDataLayer()` on crash recovery:
- For each node in ghost list: restore `position.x` and `position.y` into panel memory
- For each node in comp tree: restore `position.x` and `position.y` into panel memory
- Default position if missing from data: `{ x: 100, y: 100 }` — document this as the fallback

**Verification checklist:**
- [ ] Drop a node → move it → crash AE → reopen → node appears at correct position
- [ ] Drop two nodes → move both → positions are distinct after recovery
- [ ] Old dataLayer entries without `x`/`y` fields → fallback to `{ x: 100, y: 100 }` without error
- [ ] Position is never passed to `makeNodeAlive` or any other lifecycle ExtendScript call

---

## TASK 3 — Persistence Chunking (Text Layer Size Limit)

### What the problem is

AE imposes a character limit on `sourceText` of text layers — approximately 30,000–60,000 characters depending on AE version. The limit is not documented in AE's API reference and is not enforced with an error — AE silently truncates the string.

On a medium project (50 nodes, 200 wires, some keyframe data serialized from ghosted nodes), the dataLayer JSON can exceed this limit. When truncated, `JSON.parse` fails on the next read, and crash recovery is permanently broken for that project.

This is a **silent, project-destroying bug**.

### Solution: Chunked storage

Split the JSON string into fixed-size chunks. Store each chunk in a separate text layer inside the Reserved comp. A header layer stores the chunk count so the reader knows how many layers to concatenate.

**Chunk size: 20,000 characters.** This is safely below the AE text layer limit and gives a headroom buffer.

---

### Architecture change — Section 7a

**Current:**
```
The comp contains exactly two text layers:
- Layer 1: `"__PROCEDIA_DATA__"` — holds dataLayer JSON
- Layer 2: `"__PROCEDIA_WIRES__"` — holds dataWire JSON
```

**Replace with:**
```
The comp contains a variable number of text layers organized as follows:

HEADER layer (always layer 1):
  Name: "__PROCEDIA_HEADER__"
  Content: JSON — { "dataChunks": N, "wireChunks": M }
  This layer is written first on every save. Readers always read this first.

dataLayer chunk layers (layers 2 to N+1):
  Names: "__PROCEDIA_DATA_0__", "__PROCEDIA_DATA_1__", ... "__PROCEDIA_DATA_{N-1}__"
  Content: raw string slice of the full dataLayer JSON
  Chunk size: 20,000 characters per layer

dataWire chunk layers (layers N+2 to N+M+1):
  Names: "__PROCEDIA_WIRE_0__", "__PROCEDIA_WIRE_1__", ... "__PROCEDIA_WIRE_{M-1}__"
  Content: raw string slice of the full dataWire JSON
  Chunk size: 20,000 characters per layer

All layers are locked (layer.locked = true).
The Reserved comp is locked (comp.locked = true).
Chunk layers are created or deleted dynamically as the JSON size changes.
```

---

### Human-language algorithm — Write

**`writeDataLayer(jsonString)` in `jsx/persistence.jsx`:**

1. Unlock the Reserved comp
2. Read the current header to know how many `__PROCEDIA_DATA_{n}__` layers currently exist
3. Delete all existing data chunk layers (by name pattern)
4. Split `jsonString` into chunks of 20,000 characters each
5. For each chunk (index `n`):
   a. Create a new text layer named `"__PROCEDIA_DATA_{n}__"`
   b. Set its `sourceText` to the chunk string
   c. Lock the layer
6. Update the header layer: set `dataChunks` to the new chunk count
7. Lock the Reserved comp again

Apply the same algorithm for `writeDataWire(jsonString)` using `__PROCEDIA_WIRE_{n}__` layers and the `wireChunks` field.

---

### Human-language algorithm — Read

**`readDataLayer()` in `jsx/persistence.jsx`:**

1. Find the Reserved comp
2. Find the `__PROCEDIA_HEADER__` layer — read its `sourceText` — parse JSON to get `dataChunks` count N
3. For `n` from 0 to N-1:
   a. Find the layer named `"__PROCEDIA_DATA_{n}__"`
   b. Read its `sourceText`
   c. Append to a running string
4. Return the full concatenated string as `result.data`

Apply same for `readDataWire()` using `wireChunks` count M.

---

### Human-language algorithm — Init

**`initReservedComp()` in `jsx/init.jsx`:**

Update to create the header layer first, initialized to:
```json
{ "dataChunks": 1, "wireChunks": 1 }
```
Then create one `__PROCEDIA_DATA_0__` layer with empty JSON `{}`.
Then create one `__PROCEDIA_WIRE_0__` layer with empty JSON `{}`.

---

### Write-queue debounce (Panel JS — `bridge/evalBridge.js` or new `data/writeQueue.js`)

To prevent race conditions from rapid successive writes (every action fires a full write), introduce a **write queue with debounce**:

**Human-language algorithm:**
1. Any code that needs to write dataLayer or dataWire calls `writeQueue.markDirty('data')` or `writeQueue.markDirty('wire')` — never calls the ExtendScript write directly
2. `writeQueue` maintains two dirty flags: `dataDirty` and `wireDirty`
3. `writeQueue` runs a `setTimeout` of **500ms** on every `markDirty` call (reset the timer if already pending)
4. When the timer fires:
   a. If `dataDirty`: serialize current `graphState` to JSON → call `writeDataLayer(jsonString)` via evalBridge → clear `dataDirty`
   b. If `wireDirty`: serialize current `wireMap` to JSON → call `writeDataWire(jsonString)` via evalBridge → clear `wireDirty`
5. During an active write: set `isWriting = true` — the poller checks this flag and skips its tick

**New file: `data/writeQueue.js`**
Responsible for: dirty flags, debounce timer, serialization, calling evalBridge.
No other file calls `evalBridge.call('writeDataLayer', ...)` directly — all writes go through `writeQueue`.

---

### Verification checklist
- [ ] Create 100+ nodes → open AE project text layer → confirm it is not a single giant layer
- [ ] Header layer exists and `dataChunks` count matches actual chunk layer count
- [ ] Write then read round-trip: serialized JSON in equals parsed JSON out, character-for-character
- [ ] Delete chunk layers manually in AE → initReservedComp re-creates them on next write
- [ ] Rapid 10 successive property changes → only 1 evalScript write fires (debounce working)
- [ ] `isWriting` flag blocks poll tick during active write
- [ ] Crash recovery: reopen AE project → panel reads chunks → graph reconstructs correctly

---

## TASK 4 — Ghost Cascade Batch evalScript Calls

### What the problem is

When a wire is deleted and N nodes need to cascade-ghost, the current implied behavior is N sequential `makeNodeGhost` evalScript calls — one per node. Each call crosses the CEP bridge, waits for AE to respond, then the next fires. At 100–200ms per round-trip, 20 ghosting nodes = 2–4 seconds of blocking operations from a single user action.

### Solution: Collect first, batch second

Separate the cascade into two phases:
1. **Graph traversal (pure JS)** — collect the full set of UUIDs to ghost, all in panel memory, no AE calls
2. **Batch AE call** — fire one single `makeNodesGhost(batchJSON)` ExtendScript call with all UUIDs and their hosting comp UUIDs

---

### Human-language algorithm — Panel JS (`graph/Wire/nodeState.js`)

**`collectGhostCandidates(deletedWireFromNodeId)`:**

1. Start with an empty set: `toGhost = []`
2. Start with the upstream node of the deleted wire as the current candidate
3. For the current candidate:
   a. Call `hasCompDownstream(candidateId)` (see Task 1)
   b. If result is empty → add `{ uuid: candidateId, hostingCompUUIDs: currentAliveComps }` to `toGhost`
   c. If result is non-empty → stop recursing up this branch
4. For each node immediately upstream of the current candidate (via input wires):
   a. Repeat step 3 recursively
5. Return `toGhost` — a flat array of `{ uuid, hostingCompUUIDs[] }` objects

**Important rules:**
- Visit each node UUID at most once — use a `visited` set to prevent re-traversal
- Stop recursion at `data` wire boundaries — do not cross into data-wire-only upstream nodes
- Do not call any evalScript during this phase

---

### Human-language algorithm — AE call (`ae/nodeOps.js`)

**`callMakeNodesGhost(toGhostArray)`:**

1. Serialize `toGhostArray` to JSON: `[{ uuid, hostingCompUUIDs: [...] }, ...]`
2. Fire one single evalBridge call: `makeNodesGhost(batchJSON)`
3. On response: for each entry in the returned keyframes data, dispatch to `graphState` to store keyframes
4. Dispatch `graphState.setNodeState(uuid, 'ghost')` for each ghosted node

---

### Human-language algorithm — ExtendScript (`jsx/nodeLifeCycle/nodeLifecycle.jsx`)

**`makeNodesGhost(batchJSONString)`:**

1. Parse `batchJSONString` → array of `{ uuid, hostingCompUUIDs }`
2. Initialize `result.data = []`
3. For each entry in the array:
   a. For each `hostingCompUUID` in `entry.hostingCompUUIDs`:
      - Find the hosting comp by UUID
      - Find the layer in that comp where `layer.comment === entry.uuid`
      - Read keyframes from that layer (call internal `readLayerKeyframes(layer)` helper)
      - Delete the layer
   b. Append `{ uuid: entry.uuid, keyframes: collectedKeyframes }` to `result.data`
4. Return `JSON.stringify({ ok: true, data: result.data, error: null })`

All of this happens in **one ExtendScript execution** — one bridge crossing — regardless of how many nodes are ghosting.

---

### Verification checklist
- [ ] Delete one wire → exactly 1 evalScript call fires (confirm in browser console — add a temporary log)
- [ ] Delete a wire that cascades 5 nodes → still exactly 1 evalScript call
- [ ] Each ghosted node's keyframes are correctly returned and stored in panel memory
- [ ] Node states in panel memory updated to `ghost` for all affected nodes
- [ ] `dataLayer` updated (via write queue) with moved entries
- [ ] No node is double-ghosted (visited set works correctly)
- [ ] A node alive in 2 comps: delete one path → `removeLayerFromComp` for that comp only, not in `toGhost` batch

---

## TASK 5 — Error State Resolution UI (Next Phase Feature)

### Context

When polling detects that a Procedia-managed AE object was deleted outside Procedia (Section 8d), the node enters `error` state and a notification is shown. The current spec says "wait for user action" but never defines what that action is.

### Notification bar spec

When a node enters `error` state, the notification bar shows one entry:

```
⚠ [NodeLabel] was deleted outside Procedia.   [Re-create in AE]   [Remove from Graph]
```

**[Re-create in AE] button behavior:**
1. Call `makeNodeAlive(uuid, nodeType, hostingCompUUID, properties, nodeLabel)` using the last-known properties stored in panel memory
2. On success: set node state back to `alive`, clear error badge, dismiss notification
3. On failure: show inline error in notification: `"Re-create failed: [error message]"`

**[Remove from Graph] button behavior:**
1. Treat the node as if it is in `ghost` state (skip AE cleanup — the AE object is already gone)
2. Remove node from panel memory
3. Remove UUID from dataLayer
4. Remove all wires referencing this UUID from dataWire and from the graph
5. Dismiss notification
6. This path does NOT call `makeNodeGhost` — the AE object doesn't exist

### Architecture addition — Section 2 state transition table

Add this transition:
```
error → alive     When user clicks [Re-create in AE] and makeNodeAlive succeeds.
error → removed   When user clicks [Remove from Graph] — node is fully deleted, not ghosted.
```

### Files to touch
- `notifications/notificationBar.js` — add two action buttons to the error notification template
- `ae/nodeOps.js` — add `callReCreateNode(uuid)` which calls `makeNodeAlive` with last-known properties
- `jsx/nodeLifeCycle/nodeLifecycle.jsx` — `makeNodeAlive` already exists; no new ExtendScript needed
- `graph/graphState.js` — add `removeNodeCompletely(uuid)` action for the "Remove from Graph" path

### Verification checklist
- [ ] Delete a comp in AE directly → error badge appears on node in graph within next poll tick
- [ ] Notification bar shows node label + both buttons
- [ ] [Re-create in AE] → comp reappears in AE project panel → node returns to alive state
- [ ] [Remove from Graph] → node disappears from canvas → all wires removed → dataLayer clean
- [ ] [Remove from Graph] does NOT call makeNodeGhost (no AE cleanup attempt)
- [ ] Multiple nodes in error simultaneously → each has its own notification entry

---

## TASK 6 — pollAliveNodes Extended to Watch Layers (Next Phase Feature)

### Context

Currently `pollAliveNodes` only checks `CompItem` existence and property changes (Section 8b). It does not detect when a user manually deletes a layer from the AE timeline that Procedia created. This is a silent desync — the panel thinks the node is alive, but the layer is gone.

### Extended polling behavior

`pollAliveNodes(uuidList)` must be split into two sub-checks per tick:

**Sub-check A — Comp existence (existing behavior, unchanged):**
- For each UUID in `uuidList` where node type is `CompNode`:
  - Does a `CompItem` with `item.comment === uuid` exist?
  - If yes: have its `name`, `duration`, `frameRate`, `width`, `height` changed?

**Sub-check B — Layer existence (new behavior):**
- For each UUID in `uuidList` where node type is NOT `CompNode` (i.e. layer nodes):
  - Find the hosting comp(s) from the dataLayer comp tree
  - Inside each hosting comp, search for a layer where `layer.comment === uuid`
  - If layer not found → node has been deleted outside Procedia → return as missing

### Return schema update

Current return: `array of { uuid, exists, properties }`

Extended return:
```json
[
  { "uuid": "PROC-xxx", "exists": true, "type": "comp", "properties": { ... } },
  { "uuid": "PROC-yyy", "exists": false, "type": "layer", "properties": null }
]
```

Panel JS handles `exists: false` the same way for both comp and layer nodes — transition to `error` state, show notification.

### ExtendScript changes — `jsx/polling.jsx`

**Human-language algorithm for `pollAliveNodes(uuidListJSON, dataLayerJSON)`:**

1. Parse both arguments
2. For each UUID:
   a. Find its type from dataLayerJSON (is it a CompNode or a layer node?)
   b. If CompNode → run existing comp-check logic
   c. If layer node → find hosting comp UUID from dataLayerJSON → find that comp → search layers for matching UUID in `layer.comment`
3. Return full results array

**Note:** `dataLayerJSON` must be passed as an argument to the poll call, because the polling function needs to know which comp each layer lives in. The panel JS serializes the relevant portion of graphState and passes it with the poll call.

### Verification checklist
- [ ] Delete a TextNode's layer directly in AE timeline → error badge appears on that node within next poll tick
- [ ] Delete a comp in AE → error badge appears (existing behavior still works)
- [ ] Layer renamed in AE (but not deleted) → no error triggered (rename is not a deletion)
- [ ] Poll tick with 50 alive nodes (mix of comp and layer) → single evalScript call, no timeout
- [ ] `isWriting` flag still blocks poll correctly during active writes

---

## Execution Order

```
TASK 1  → Multi-comp spec + nodeState.js logic     → verify → ✅
TASK 2  → Position in dataLayer                     → verify → ✅
TASK 3  → Chunked persistence + write queue         → verify → ✅
TASK 4  → Batch ghost cascade                       → verify → ✅
TASK 5  → Error state resolution UI                 → verify → ✅
TASK 6  → Extended layer polling                    → verify → ✅
```

Tasks 1–4 are foundational fixes. Execute them before 5 and 6.
Tasks 5 and 6 are new features — execute them only after 1–4 are verified clean.

---

## What NOT to Do

- Do not build any new node type (GaussianBlur, Solid, Null, etc.) until all 6 tasks are complete
- Do not modify `nodeRegistry.js` or any node category file during this debug phase
- Do not change the `evalBridge.js` Promise wrapper — only add `writeQueue.js` alongside it
- Do not add `x`/`y` to any ExtendScript lifecycle call signature — position is dataLayer-only
- Do not attempt Tasks 5 or 6 before Tasks 1–4 are verified

---

*majorDebug-v0.2 — May 2026 — Procedia CEP, AE 2025+, Windows*
*This file governs the next implementation phase. After all 6 tasks are complete and verified, return to SKILL-NEW-NODE.md to begin the next node brief.*
