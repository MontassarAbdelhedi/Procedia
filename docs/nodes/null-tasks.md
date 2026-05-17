# NullNode — Implementation Tasks

Derived from `null.md`. Each task is one logical unit. Stop and verify in AE before moving to the next.

---

## TASK 1 — Architecture doc correction

**Scope:** `PROCEDIA-V2-ARCHITECTURE.md` only — no code changes.

- Open Section 1a of PROCEDIA-V2-ARCHITECTURE.md
- Move NullNode from "Not-Dedicated" to "Dedicated"
- Add row: `NullNode | — (no FootageItem) | NullLayer | Created via comp.layers.addNull()`

**Verify:**
- [ ] Section 1a table correctly lists NullNode as Dedicated
- [ ] No other sections reference NullNode as Not-Dedicated

---

## TASK 2 — Node definition file

**Scope:** create `jsx/nodes/nullNode.js` (panel-side node schema).

- Define node type `"null"` with:
  - `label` param (string, default `"Null"`)
  - `position` param ([float, float], default `[0, 0]`)
  - `scale` param ([float, float], default `[100, 100]`)
  - `rotation` param (float, default `0`)
  - `opacity` param (float, default `100`)
  - One input port `layer_in` with `multiplicity: unlimited`
  - One output port `output` of kind `layer`
- Add comment: `// TODO v1.1.0 — add 3D toggle param and z-position/rotation props`
- Register the type in the node registry (wherever CompNode is registered)

**Verify:**
- [ ] Node appears in the panel node picker
- [ ] All params show correct defaults in inspector

---

## TASK 3 — ExtendScript: createNullLayer()

**Scope:** `jsx/nodeLifeCycle/nodeCompOps.jsx` (or equivalent ops file).

- Write `createNullLayer(compUUID, nodeUUID, label)`:
  - Find comp by UUID
  - Call `comp.layers.addNull(comp.duration)`
  - Set `layer.name = label` (default `"Null"`)
  - Store `nodeUUID` in `layer.comment`
  - Return `{ ok, data: { layerIndex }, error }`
- Use `comp.layers.addNull()` only — no `importFile`, no footage

**Verify:**
- [ ] Run via AE Script Editor; null layer appears in comp
- [ ] Layer name matches the label argument
- [ ] `layer.comment` contains the nodeUUID

---

## TASK 4 — ExtendScript: applyNullTransform()

**Scope:** same ops file as Task 3.

- Write `applyNullTransform(compUUID, nodeUUID, position, scale, rotation, opacity)`:
  - Find comp + layer by UUID (via `layer.comment`)
  - Set properties using exact match names under `"ADBE Transform Group"`:
    - `"ADBE Position"` ← `[position[0], position[1]]`
    - `"ADBE Scale"` ← `[scale[0], scale[1]]`
    - `"ADBE Rotate Z"` ← `rotation`
    - `"ADBE Opacity"` ← `opacity`
  - Access array values by index only — no destructuring, no spread
  - Return `{ ok, data: null, error }`

**Verify:**
- [ ] Position, scale, rotation, opacity all update in AE
- [ ] No ES3 violations (use `value[0]`, `value[1]`, not spread)

---

## TASK 5 — ExtendScript: renameNullLayer()

**Scope:** same ops file or `nodeEffectorOps.jsx`.

- Write `renameNullLayer(compUUID, nodeUUID, newLabel)`:
  - Find layer by `layer.comment === nodeUUID` in the given comp
  - Set `layer.name = newLabel`
  - Return `{ ok, data: null, error }`
- Hook into the panel inspector so label changes call this immediately (not on blur)

**Verify:**
- [ ] Typing in label field renames the AE layer in real time
- [ ] Rename works across all hosting comps (multi-comp)

---

## TASK 6 — ExtendScript: setLayerParent() and clearLayerParent()

**Scope:** new or existing parenting ops file.

- Write `setLayerParent(childUUID, nullUUID, hostingCompUUID)`:
  - Find comp by `hostingCompUUID`
  - Find child layer and null layer by their `.comment` UUIDs
  - Set `childLayer.parent = nullLayer`
  - Guard: if null layer does not exist yet, return `{ ok: false, error: "null not ready" }`
  - Return `{ ok, data: null, error }`

- Write `clearLayerParent(childUUID, hostingCompUUID)`:
  - Find child layer by UUID in comp
  - Set `childLayer.parent = null`
  - Return `{ ok, data: null, error }`

**Verify:**
- [ ] Parenting set correctly in AE Timeline panel
- [ ] `clearLayerParent` removes parent without deleting the layer
- [ ] Guard fires correctly when null is not yet alive

---

## TASK 7 — Wire events: onWireAdded / onWireRemoved for layer_in

**Scope:** panel JS wire event handlers (wherever CompNode wire events are handled).

- On `onWireAdded` for a `layer_in_{n}` port on NullNode:
  - Call `setLayerParent(childUUID, nullUUID, hostingCompUUID)` for each hosting comp
  - Guard: null must already be alive in comp (Task 3 must have run first)
- On `onWireRemoved`:
  - Call `clearLayerParent(childUUID, hostingCompUUID)` for each hosting comp
- Port naming follows the same dynamic pattern as CompNode (`layer_in_0`, `layer_in_1`, …)

**Verify:**
- [ ] Connecting a layer wire parents it in AE immediately
- [ ] Disconnecting clears the parent in AE immediately
- [ ] Multiple simultaneous children all parent correctly

---

## TASK 8 — Multi-comp: null layer per hosting comp

**Scope:** panel JS + ExtendScript node lifecycle.

- When a NullNode is added to a new hosting comp (via `onWireAdded` from a CompNode output):
  - Call `createNullLayer()` in that comp
  - Call `applyNullTransform()` with current param values
  - Re-apply all existing `layer_in` parenting relationships in that comp via `setLayerParent()`
- When removed from a hosting comp:
  - Standard layer removal (same as other Dedicated nodes)
- Track hosting comps via `_hostingCompUUIDs` (per existing multi-comp pattern)

**Verify:**
- [ ] Null layer appears independently in each hosting comp
- [ ] Each null layer has the same UUID in `.comment`
- [ ] Existing children are re-parented correctly when null is added to a new comp

---

## TASK 9 — Crash recovery: re-apply parenting from dataWire

**Scope:** panel JS crash/reload recovery path.

- On panel reload, after re-creating all node layers in AE:
  - Iterate all `layer_in_{n}` wires on each NullNode
  - Call `setLayerParent(childUUID, nullUUID, hostingCompUUID)` for each
- Do not infer parenting from AE layer state — dataWire is the only source of truth

**Verify:**
- [ ] Close and reopen panel; parenting relationships are restored in AE
- [ ] No duplicate parenting calls on clean load (only run when recovering)
