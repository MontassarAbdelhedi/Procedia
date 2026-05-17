# Procedia v3 — Architecture Specification
*CEP · After Effects 2025+ · Windows · ExtendScript ES3*
*Last updated: May 2026*

---

## 0. Core Philosophy

> **Procedia is a smart control panel for After Effects — not a renderer, not a compositor. Every node maps to one AE object. Every property change applies instantly. The graph is always valid. AE reflects only what is alive.**

- **AE is the source of truth** for layer keyframes and composition data
- **Panel JS (`nodeMap`, `wireMap`) is the source of truth** for graph topology, node properties, and UI state
- **`tempGraph`** is the in-memory JSON mirror of `nodeMap` + `wireMap` — rebuilt on every structural change, never written to AE during a session
- **Persistence writes happen only on AE save, AE quit, and panel unload** — never on every action
- **Dirty flag + debounce** controls when property changes reach AE — never on every keystroke or slider tick
- **There is no apply button.** Structural changes (wire connect/disconnect, node drop/delete) are immediate and atomic. Property changes are debounced 300ms then flushed.
- Procedia never auto-repairs a broken Reserved folder or comp. The user owns that responsibility entirely.

---

## 1. Node Taxonomy

### 1a. Node Kind — Effector vs Affected

Every node has a `nodeKind` field in its definition. This is the most important property a node has. It governs ghost behavior, parking, and cascade order.

| Kind | Definition | Examples |
|---|---|---|
| `affected` | Creates and owns a standalone AE layer. The layer can be moved between comps. When ghosted, the layer is **parked** in the reserved comp — keyframes survive natively in AE. | TextNode, ShapeNode, NullNode, SolidNode, AdjustmentNode, FootageNode, CompNode |
| `effector` | Modifies an existing layer owned by an affected node. Has no standalone AE layer of its own. When ghosted, its AE modification is removed from the host layer and its properties are preserved in `nodeMap`. | EffectNode, MaskNode, ExpressionNode, GraphPositionNode, GraphRotationNode, GraphScaleNode |

**Key rule:** Before an affected node's layer is parked, all effector modifications must be stripped from it first. The `parkLayer` ExtendScript call receives the layer only after all effects, masks, and expressions applied by effector nodes have been removed. The parked layer is always clean — it contains only what the user added directly in AE (keyframes, manual property changes), never Procedia-managed effector modifications.

**Key rule:** Effector nodes go ghost silently. They save their properties to `nodeMap` and set their state to `ghost`. They do not make their own AE call to remove their modification — the affected node's `onGhost` sequence is responsible for stripping all effector modifications from the layer before parking. Effectors never call `removeEffector` on themselves during a cascade — that call is driven by the cascade algorithm in `nodeState.js`, not by the effector node itself.

**Key rule:** CompNode is always `affected` but has no ghost state. It is always alive. See Section 2.

---

### 1b. Affected Nodes

Require a presence in AE — either as a project item, a layer, or both.

| Node | nodeKind | AE Project Object | AE Layer Type | Notes |
|---|---|---|---|---|
| `CompNode` | `affected` | `CompItem` | — | Is the hosting comp. Always alive. Never ghosts. Never parks. Has `parent_in` and `child_out` ports — can be parented to a sibling layer when used as a precomp inside another comp. |
| `SolidNode` | `affected` | `FootageItem` (solid) | `AVLayer` | Project object created first, then layered |
| `NullNode` | `affected` | — | `NullLayer` | No project object needed |
| `AdjustmentNode` | `affected` | — | `AVLayer` | Adjustment flag set on layer |
| `FootageNode` | `affected` | `FootageItem` | `AVLayer` | User-imported footage |
| `TextNode` | `affected` | — | `TextLayer` | |
| `ShapeNode` | `affected` | — | `ShapeLayer` | |

**Creation order when going alive:**
1. Create AE project object (if the node type requires one)
2. Add as a layer to the hosting comp

Never reverse this order. A layer cannot reference a project object that does not yet exist.

---

### 1c. Effector Nodes

Live on top of an affected node's layer. No standalone AE presence of their own.

| Node | nodeKind | AE Presence | Notes |
|---|---|---|---|
| `EffectNode` | `effector` | Effect on host layer | 1 EffectNode = 1 AE effect. Access by match name only. |
| `MaskNode` | `effector` | Mask on host layer | Applied to target layer, not standalone |
| `ExpressionNode` | `effector` | Expression on host layer property | |
| `GraphPositionNode` | `effector` | Drives position property of host layer | Expects `vector2` data input |
| `GraphRotationNode` | `effector` | Drives rotation property of host layer | Expects `number` data input |
| `GraphScaleNode` | `effector` | Drives scale property of host layer | Expects `vector2` data input |

**Note:** `IsParentNode` has been removed. Parent/child relationships are expressed through native `parent_in` and `child_out` ports declared on every affected node definition (including CompNode). There is no longer a dedicated node type for parenting.

All effector nodes expect their specific data type on their input port. The input port type is declared on the node definition, not negotiated at runtime.

---

## 2. Node States

Every node has exactly one state at all times.

| State | Meaning | AE Layer Exists | In `nodeMap` |
|---|---|---|---|
| `ghost` | Lives in graph only. No AE presence. | No (affected: parked in reserved comp) | Yes |
| `alive` | Connected to a comp downstream. AE object active. | Yes — in hosting comp | Yes |
| `error` | Was alive. AE object no longer found by polling. | Broken | Yes — marked `error: true` |

### State Transition Table

```
onDrop      → ghost        Always. Exception: CompNode → alive immediately on drop.
ghost       → alive        When a downstream comp path is established via wiring.
alive       → ghost        When the last downstream comp path is broken.
alive       → error        When polling detects the AE object is missing.
error       → ghost        When user manually resolves (deletes or re-creates the node).
onDelete    → onGhost first if alive → then removed from nodeMap and tempGraph entirely.
```

**CompNode exception:** CompNode has no ghost state. It is alive the moment it is dropped. Deleting a CompNode goes directly to onDelete — no onGhost step.

---

## 3. Node Lifecycle — 4 Named Events

Every node responds to exactly these four events. Implement each one completely before moving to the next.

---

### 3a. `onDrop`
Triggered when a node is dragged from the node list onto the canvas.

**Steps:**
1. Generate UUID on the panel JS side. Format: `PROC-{timestamp}-{rand4}` e.g. `PROC-1714900000000-a3f2`
2. Set node state = `ghost`
3. Store in `nodeMap`: `{ id, type, nodeKind, state: 'ghost', dirty: false, x, y, props: defaults }`
4. Rebuild `tempGraph` from `nodeMap` + `wireMap`
5. If node type is `CompNode`: skip ghost, call `onAlive` immediately

**ExtendScript called:** None on drop for non-comp nodes. CompNode drop calls `makeCompAlive`.

---

### 3b. `onAlive`
Triggered when a downstream comp path is established — a wire connects this node, directly or transitively, to a CompNode.

**Affected node `onAlive`:**
1. Set node state = `alive` in `nodeMap`
2. Determine hosting comp(s): traverse output wires downstream until all reachable CompNodes are found. One AE layer per hosting comp.
3. If node was previously parked in reserved comp: call `unparkLayer(uuid, hostingCompUUID)` — moves the existing layer from reserved comp to hosting comp. All keyframes survive.
4. If node has never been alive before: call `makeLayerAlive(uuid, nodeType, hostingCompUUID, props)` — creates the AE layer fresh.
5. Re-apply any effector nodes that are wired upstream of this affected node and still alive.
6. Update `nodeMap` state, rebuild `tempGraph`.

**Effector node `onAlive`:**
1. Set node state = `alive` in `nodeMap`
2. Read properties from `nodeMap` (preserved from last ghost)
3. Call `applyEffector(effectorUUID, hostLayerUUID, hostingCompUUID, props)` — applies the modification (effect, mask, expression, etc.) to the host layer using stored properties.
4. Update `nodeMap` state, rebuild `tempGraph`.

**ExtendScript called:** `unparkLayer` OR `makeLayerAlive` for affected nodes. `applyEffector` for effector nodes.

---

### 3c. `onGhost`
Triggered when the last downstream comp path is broken.

**Cascade order is mandatory.** When a wire is deleted, cascade processes nodes in this order before any AE calls are made:

1. Collect all nodes that have lost their comp path due to this wire deletion.
2. Sort them: effectors first, ordered by depth deepest (outermost) to shallowest (closest to affected node). Affected nodes last.
3. Process in that order.

**Effector node `onGhost`:**
1. Save current properties to `nodeMap` (properties survive in panel memory — not written to AE, not to JSON yet)
2. Set node state = `ghost` in `nodeMap`
3. No AE call. The cascade algorithm in `nodeState.js` is responsible for calling `removeEffector` on this effector's behalf — before the host affected node parks. Effectors never remove themselves from AE independently.

**Affected node `onGhost`:**
1. The cascade algorithm has already called `removeEffector` for every effector wired to this node, outermost-first — the layer is clean before this step runs
2. Call `parkLayer(uuid, hostingCompUUID)` — moves the clean AE layer from hosting comp to reserved comp. Keyframes survive natively in AE. No serialization.
3. Set node state = `ghost` in `nodeMap`
4. Rebuild `tempGraph`

**Who calls `removeEffector`:** `nodeState.js` — inside `cascadeGhost()` only. It iterates collected effectors in order, calls `removeEffector` for each via `ae/nodeOps.js`, then parks the affected node last. This is the only place `removeEffector` is called.

**Multi-comp rule:** A node only ghosts when it loses its **last** comp path. If a node is alive in CompNodeA and CompNodeB, and only the CompNodeA wire is cut, the node stays alive in CompNodeB. Only the layer in CompNodeA is removed — call `removeLayerFromComp(uuid, compNodeA_UUID)`. The node stays `alive`.

**ExtendScript called (by cascade algorithm only):** `removeEffector` per effector in order. Then `parkLayer` for the affected node. `removeLayerFromComp` for multi-comp partial disconnect.

---

### 3d. `onDelete`
Triggered when the user removes a node from the canvas entirely.

**Steps:**
1. If node is `alive`: run full `onGhost` sequence first (cleans up AE, parks if affected)
2. If node is `ghost`: skip onGhost
3. After ghost: if `affected` node — call `deleteParkedLayer(uuid)` to remove the layer from the reserved comp entirely
4. Remove node from `nodeMap`
5. Remove all wire entries referencing this UUID from `wireMap`
6. Auto-delete all wires connected to this node in the graph canvas
7. Rebuild `tempGraph`

**ExtendScript called:** `deleteParkedLayer(uuid)` if affected. Nothing extra if effector (its AE modification was already removed in onGhost).

---

## 4. Ghost Cascade — Chain Examples

These examples define the exact behavior Claude Code must implement. Memorize them.

### Example 1 — Simple chain
```
TextNode(affected) -> EffectNode(Blur)(effector) -> CompNode
```
Wire deleted between EffectNode and CompNode:
1. Blur ghost: remove blur from TextNode's layer, save blur props to nodeMap
2. TextNode ghost: park TextNode's clean layer in reserved comp

---

### Example 2 — Multiple effectors
```
TextNode -> EffectNode(Blur) -> EffectNode(Glow) -> CompNode
```
Wire deleted between TextNode and Blur (or anywhere in the chain):
1. Glow ghost first (deepest/outermost): remove glow from layer, save props
2. Blur ghost second: remove blur from layer, save props
3. TextNode ghost last: park clean layer in reserved comp

---

### Example 3 — Mid-chain cut
```
TextNode -> EffectNode(Blur) -> EffectNode(Glow) -> CompNode
```
Wire deleted between Blur and Glow:
- Glow loses comp path → ghosts (remove glow from layer, save props)
- Blur now has no downstream comp path either → ghosts (remove blur from layer, save props)
- TextNode now has no downstream comp path → ghosts (park clean layer)

Same result as Example 2. Cascade always travels upstream from the cut, unwinding outermost-first.

---

### Example 4 — Multi-comp, partial disconnect
```
TextNode -> CompNodeA
TextNode -> CompNodeB
```
Wire deleted between TextNode and CompNodeA only:
- TextNode still has a comp path through CompNodeB → does NOT ghost
- Only the TextNode layer inside CompNodeA is removed: `removeLayerFromComp(textNodeUUID, compNodeA_UUID)`
- TextNode stays `alive` in CompNodeB

---

### Example 5 — Comp-to-comp wire
```
TextNode -> CompNodeA -> CompNodeB
```
Wire deleted between CompNodeA and CompNodeB:
- CompNodeA's precomp layer is removed from CompNodeB
- CompNodeA stays alive as its own comp (CompNode never ghosts)
- TextNode stays alive inside CompNodeA — unaffected
- Only the precomp layer reference is severed

---

### Example 6 — Data wire (no cascade)
```
NumberNode(effector) -> EffectNode(Blur).blurAmount
TextNode(affected) -> EffectNode(Blur) -> CompNode
```
Wire deleted between NumberNode and Blur's data port:
- NumberNode loses a data connection only — data wires never trigger ghost cascade
- NumberNode state unchanged
- Blur reverts blurAmount to its default value (or last manual value)
- TextNode unaffected

**Rule: Data wire deletion never triggers ghost cascade. Only layer wire deletion does.**

---

## 5. Dirty Flag — Property Change Debounce

Property changes (inspector edits) must never fire evalScript on every keystroke or every slider tick.

### How It Works

```
User changes a property in the inspector
  → nodeMap[uuid].props[key] = newValue
  → nodeMap[uuid].dirty = true
  → reset debounce timer (300ms)

Timer fires
  → collect all nodes where dirty === true
  → for each dirty node: call updateNodeProperty(uuid, hostingCompUUID, matchName, value)
  → nodeMap[uuid].dirty = false
```

### What Bypasses the Debounce

These events are structural — they always flush immediately, without waiting for the debounce timer:

- Wire connected (onAlive)
- Wire deleted (onGhost cascade)
- Node dropped (onDrop)
- Node deleted (onDelete)
- Panel unload / AE save / AE quit (persistence flush)

### Rules

- One evalScript call per dirty node per flush — not one global call for all dirty nodes combined
- Polling is paused during any flush — check `isWriting` flag in `poller.js`
- If a node goes ghost while dirty: clear the dirty flag, do not flush (the AE layer no longer exists)
- If a node goes alive while dirty: flush immediately after the alive sequence completes

---

## 6. Port System

### 6a. Port Types

Every port has a declared type.

| Type | Carries | Example |
|---|---|---|
| `layer` | An AE layer reference — an affected node that becomes a layer in a comp | TextNode → CompNode |
| `data` | A value — number, color, vector, string | NumberNode → EffectNode blur amount |
| `parent` | A parenting declaration between two affected node layers | TextNode child port → NullNode parent port |

### 6b. Output Ports

Every node has **one output port**. The output port is untyped — its effective type is determined by the receiving input port.

Example: TextNode output wired to CompNode layer input → carries a layer. Same TextNode output wired to GraphPositionNode data input → carries position data. The sending node does not need to know what it is outputting.

### 6c. Input Ports

Input ports are always visible. They highlight (fill + increase radius) when a wire drag is active and the cursor enters the ~20px snap radius. Port labels appear only on highlight.

```
TextNode (affected):
  inputs:
    - port: "parent_in"        type: parent  accepts: unlimited wires from any affected node's child_out port
    - port: "data_content"     type: data    accepts: string
    - port: "data_fontSize"    type: data    accepts: number
    - port: "data_color"       type: data    accepts: color
  outputs:
    - port: "output"           type: layer   (standard layer output)
    - port: "child_out"        type: parent  one wire max — replaced on conflict

NullNode (affected):
  inputs:
    - port: "parent_in"        type: parent  accepts: unlimited wires from any affected node's child_out port
  outputs:
    - port: "output"           type: layer
    - port: "child_out"        type: parent  one wire max — replaced on conflict

EffectNode (Gaussian Blur):
  inputs:
    - port: "layer_in"         type: layer   accepts: any layer
    - port: "data_blurAmount"  type: data    accepts: number

CompNode (affected):
  inputs:
    - port: "layer_in_{n}"     type: layer   accepts: any layer   multiplicity: unlimited
    - port: "parent_in"        type: parent  accepts: unlimited wires from any affected node's child_out port
  outputs:
    - port: "output"           type: layer                        (used when CompNode is wired as a precomp into another comp)
    - port: "child_out"        type: parent  one wire max — the precomp layer's AE parent inside the hosting comp

GraphPositionNode:
  inputs:
    - port: "data_position"    type: data    accepts: vector2
```

### 6d. Port Rules

- Input port can accept one or multiple wires (inifnite), defined in node declaration.
- One output port per node. Multiple wires can originate from the same output port.
- `data` wire cannot connect to `layer` port and vice versa. Mismatch: port does not highlight, no connection made, no error shown.
- Cycles are blocked at wire creation. Traverse downstream from the target node before confirming. If source node is found → cycle → reject silently.
- `parent` wire can only connect between a `child_out` port and a `parent_in` port. Mismatch with `layer` or `data` ports: port does not highlight, no connection made.
- `child_out` port accepts one wire only. If a second wire is dragged to an occupied `child_out`, the existing wire is disconnected (`clearLayerParent` called) and replaced with the new wire (`setLayerParent` called).
- `parent_in` port accepts unlimited wires — one per child node.
- Parent wires never trigger ghost cascade. Neither connect nor disconnect changes node state.
- Cycle check applies to parent wires too: a node cannot be both an ancestor and a descendant of the same node via parent wires.

### 6e. Layer Stacking Order in CompNode

AE layer z-order is set manually by the user via the CompNode inspector. The inspector shows connected input nodes in a reorderable list. On reorder, ExtendScript walks the desired UUID order bottom-to-top and calls `layer.moveToBeginning()` to match.

---

### 6f. Port Rendering Convention

Two visual shapes, strict assignment — never mixed:

| Port type | Shape | Screen position | Geometry function |
|---|---|---|---|
| `layer` input | filled circle | top edge of node | `nodeGeometry.inputPortPositions()` |
| `data` input | filled circle | top edge of node | `nodeGeometry.inputPortPositions()` |
| `layer` output | filled circle | bottom edge of node | `nodeGeometry.outputPortPositions()` |
| `data` output | filled circle | bottom edge of node | `nodeGeometry.outputPortPositions()` |
| `parent_in` | rectangle tab | left edge, vertically centered | `nodeGeometry.parentInPortPosition()` |
| `child_out` | rectangle tab | right edge, vertically centered | `nodeGeometry.childOutPortPosition()` |

`inputPortPositions()` and `outputPortPositions()` **filter out `parent` type ports** — they only return circles. `parentInPortPosition()` and `childOutPortPosition()` return the tab positions only. Never include `parent` ports in circle lists or circle ports in tab logic.

Parent wires use a **horizontal S-curve** bezier (control points extend left/right from the tabs). All other wires use a **vertical S-curve** bezier (control points extend up/down from the circles).

`nodeGeometry.js` is the **single source of truth** for all port positions and constants (`NODE_WIDTH`, `NODE_HEIGHT`, `RECT_W`, `RECT_H`, `PORT_COLOR`). `nodeHitTest.js` is the single source for all hit testing.

---

## 7. Wire Rules — Ghost Cascade Logic

### 7a. Wire Types and Cascade Behavior

| Wire type deleted | Upstream node | Downstream node |
|---|---|---|
| `layer` wire | Cascade ghost upstream (see Section 4) | Re-evaluates its own comp path |
| `data` wire | No cascade — state unchanged | Loses the data input, reverts to default |
| `parent` wire | No cascade — parenting link cleared silently | No cascade — parenting link cleared silently |

### 7b. Cascade Algorithm (implemented in `graph/Wire/nodeState.js`)

```
function cascadeGhost(deletedWire):

  1. Find all nodes upstream of deletedWire.toNode
     that no longer have a comp path after this deletion.
     Stop traversal at: data wire boundaries, parent wire boundaries, CompNode boundaries.

  2. Sort collected nodes:
     - Effectors first, ordered deepest (outermost) to shallowest
     - Affected nodes last

  3. For each effector in order:
     a. nodeMap[uuid].props preserved (already in memory)
     b. Call removeEffector(uuid, hostLayerUUID, hostingCompUUID)
     c. nodeMap[uuid].state = 'ghost'

  3.5 For each affected node about to be parked:
     a. Find all wires in wireMap where wire.type === 'parent' AND wire.fromNode === this UUID
        (this node is a child) → call clearLayerParent(this UUID, hostingCompUUID)
     b. Find all wires in wireMap where wire.type === 'parent' AND wire.toNode === this UUID
        (this node is a parent) → for each such child wire:
          if child node is also in this ghost cascade → skip (child is parking too)
          if child node is alive in the same comp → call clearLayerParent(childUUID, hostingCompUUID)

  4. For each affected node:
     a. Layer is now clean (all effectors removed in step 3, parent links cleared in step 3.5)
     b. Call parkLayer(uuid, hostingCompUUID)
     c. nodeMap[uuid].state = 'ghost'

  5. Rebuild tempGraph from nodeMap + wireMap.
  6. Do NOT write to AE persistence here — tempGraph will be written on next save.
```

### 7c. Multi-Comp Path Rule

A node alive in multiple comps tracks one `alive` entry per comp in `nodeMap`. When one path is broken, only that comp's layer is removed. The node stays `alive` in remaining comps.

### 7d. Cycle Prevention

Before confirming any wire from Node A output → Node B input:
1. Starting from Node B, traverse all downstream connections
2. If Node A is encountered → cycle detected → reject wire silently
3. If Node A is not found → wire is valid → confirm

---

## 8. Data Model

### 8a. In-Memory: `nodeMap`

Single source of truth for all node state during a session. Lives in `graphState.js`. Only `graphState.js` mutates it.

```javascript
var nodeMap = {
  'PROC-aaa': {
    id:       'PROC-aaa',
    type:     'TextNode',
    nodeKind: 'affected',
    state:    'alive',        // 'ghost' | 'alive' | 'error'
    dirty:    false,
    x:        120,            // canvas position — panel memory only
    y:        240,
    props: {
      content:  'Hello',
      fontSize: 72,
      color:    [1, 1, 1, 1]
    },
    hostingComps: ['PROC-ccc']  // UUIDs of comps this node is alive in
  },
  'PROC-bbb': {
    id:       'PROC-bbb',
    type:     'EffectNode',
    nodeKind: 'effector',
    state:    'alive',
    dirty:    false,
    x:        300,
    y:        240,
    props: {
      aeMatchName: 'ADBE Gaussian Blur 2',
      blurAmount:  10
    },
    hostingComps: ['PROC-ccc']
  }
};
```

### 8b. In-Memory: `wireMap`

```javascript
var wireMap = {
  'WIRE-xxx': {
    id:       'WIRE-xxx',
    fromNode: 'PROC-aaa',
    fromPort: 'output',
    toNode:   'PROC-bbb',
    toPort:   'layer_in'
  }
};
```

### 8c. `tempGraph` — The In-Memory JSON Mirror

`tempGraph` is a plain JS object rebuilt from `nodeMap` + `wireMap` on every structural change. It is never written to AE during a session. It is the source used when persistence writes happen.

```javascript
var tempGraph = {
  version: '2.0',
  nodes: {
    'PROC-aaa': {
      type:     'TextNode',
      nodeKind: 'affected',
      state:    'alive',
      x: 120, y: 240,
      props: { content: 'Hello', fontSize: 72, color: [1,1,1,1] },
      hostingComps: ['PROC-ccc']
    }
  },
  wires: {
    'WIRE-xxx': {
      fromNode: 'PROC-aaa',
      fromPort: 'output',
      toNode:   'PROC-bbb',
      toPort:   'layer_in'
    }
  }
};
```

`tempGraph` is rebuilt by calling `graphState.rebuildTempGraph()` after every structural change. Property changes (dirty flush) do not rebuild `tempGraph` — they update `nodeMap[uuid].props` and write directly to AE.

---

## 9. Persistence

### 9a. Storage Structure in AE

Three text layers in the reserved comp (`__PROCEDIA_RESERVED__` inside `"DO NOT DELETE - Procedia"` folder):

| Layer Name | Contents | Written When |
|---|---|---|
| `__PROCEDIA_NODES__` | Full node registry — all nodes, all props, positions, states | AE save / AE quit / panel unload |
| `__PROCEDIA_WIRES__` | Full wire registry | AE save / AE quit / panel unload |
| `__PROCEDIA_GHOST_LAYERS__` | UUIDs of affected nodes currently parked in reserved comp | AE save / AE quit / panel unload |

Per-CompNode text layers (one per alive CompNode, stored inside that comp):

| Layer Name | Contents |
|---|---|
| `__PROCEDIA_COMP_{uuid}__` | Comp membership — list of node UUIDs upstream of this comp (excluding upstream comp interiors) |

### 9b. `__PROCEDIA_NODES__` Schema

```json
{
  "version": "2.0",
  "nodes": {
    "PROC-aaa": {
      "type": "TextNode",
      "nodeKind": "affected",
      "state": "alive",
      "x": 120, "y": 240,
      "props": { "content": "Hello", "fontSize": 72 },
      "hostingComps": ["PROC-ccc"]
    },
    "PROC-bbb": {
      "type": "EffectNode",
      "nodeKind": "effector",
      "state": "ghost",
      "x": 300, "y": 240,
      "props": { "aeMatchName": "ADBE Gaussian Blur 2", "blurAmount": 10 },
      "hostingComps": []
    }
  }
}
```

### 9c. `__PROCEDIA_WIRES__` Schema (unchanged from v1)

```json
{
  "version": "2.0",
  "wires": [
    {
      "id": "WIRE-xxx",
      "fromNode": "PROC-aaa",
      "fromPort": "output",
      "toNode":   "PROC-bbb",
      "toPort":   "layer_in"
    }
  ]
}
```

### 9d. Per-CompNode Membership Layer Schema

```json
{
  "compId": "PROC-ccc",
  "members": ["PROC-aaa", "PROC-bbb"],
  "layerOrder": ["PROC-aaa", "PROC-bbb"]
}
```

`members` lists all node UUIDs upstream of this comp — stopping at upstream CompNode boundaries (a precomp's internal nodes are not listed here — they belong to that precomp's own membership layer). `layerOrder` controls AE layer stacking.

### 9e. Write Triggers

Persistence writes happen **only** on these three events. Never on any other action.

```javascript
// 1. AE project save
csInterface.addEventListener('com.adobe.csxs.events.ApplicationBeforeUnload', flushToPersistence);

// 2. Panel unload (panel closed or refreshed)
window.addEventListener('beforeunload', flushToPersistence);

// 3. AE quit
csInterface.addEventListener('com.adobe.csxs.events.ApplicationQuit', flushToPersistence);
```

`flushToPersistence()` serializes `tempGraph` and writes three evalScript calls:
1. `writeNodeRegistry(jsonString)` → writes `__PROCEDIA_NODES__`
2. `writeWireRegistry(jsonString)` → writes `__PROCEDIA_WIRES__`
3. `writeCompMembership(compUUID, jsonString)` → one call per alive CompNode

### 9f. Read on Panel Open

On panel open, read in this order:

1. `readNodeRegistry()` → parse → populate `nodeMap`
2. `readWireRegistry()` → parse → populate `wireMap`
3. Rebuild `tempGraph` from `nodeMap` + `wireMap`
4. Poll all UUIDs marked `alive` in `nodeMap` → verify they still exist in AE → flag missing as `error`

### 9g. What Procedia Does NOT Do

- Does not write during a session (only on save/quit/unload)
- Does not auto-repair deleted Reserved comp or folder
- Does not warn on panel open if Reserved comp is missing (fails on first write, surfaces the error then)
- Does not serialize keyframes — keyframes live in AE natively on parked layers

---

## 10. Reserved Comp — Parking Structure

### 10a. Layout

```
DO NOT DELETE - Procedia/
  __PROCEDIA_RESERVED__/        ← locked comp
    __PROCEDIA_NODES__           ← locked text layer
    __PROCEDIA_WIRES__           ← locked text layer
    __PROCEDIA_GHOST_LAYERS__    ← locked text layer (UUID list of parked layers)
    [parked AE layers]           ← affected node layers currently ghosted
```

Parked layers are real AE layers inside the reserved comp. They are locked. They carry their original UUID in their layer comment field so Procedia can find them by UUID on rewire.

### 10b. Parking a Layer (`parkLayer`)

ExtendScript:
1. Find the layer in the hosting comp by UUID (via `layer.comment`)
2. Cut it and add it to `__PROCEDIA_RESERVED__` comp
3. Lock the layer
4. Append UUID to `__PROCEDIA_GHOST_LAYERS__` text layer content

### 10c. Unparking a Layer (`unparkLayer`)

ExtendScript:
1. Find the layer in `__PROCEDIA_RESERVED__` by UUID
2. Unlock it
3. Cut it and add it to the new hosting comp
4. Remove UUID from `__PROCEDIA_GHOST_LAYERS__`

### 10d. Deleting a Parked Layer (`deleteParkedLayer`)

ExtendScript:
1. Find the layer in `__PROCEDIA_RESERVED__` by UUID
2. Delete it
3. Remove UUID from `__PROCEDIA_GHOST_LAYERS__`

### 10e. Layer Limit Awareness

The reserved comp accumulates parked layers as users ghost affected nodes. This is safe at typical project scales. One parked layer per UUID — never duplicated. Rewiring moves the layer back, never copies it.

---

## 11. Smart Polling

### 11a. Purpose

Detect when a user modifies a Procedia-managed AE object outside Procedia. Does not gate writes — writes are always immediate when triggered.

### 11b. What It Watches

For every UUID marked `alive` in `nodeMap`, polling checks:
- Does a CompItem or layer with this UUID still exist in AE?
- If yes: have its properties (name, duration, frameRate, width, height) changed?

Polling does not watch ghost nodes — they have no live AE object.

### 11c. Adaptive Frequency

| User activity | Poll interval |
|---|---|
| Active (mouse/keyboard in last 5s) | Every 1 second |
| Idle (no input for 5s+) | Every 5 seconds |

Track activity via `mousemove` and `keydown` on the panel. Polling pauses during any evalScript write (`isWriting` flag in `poller.js`).

### 11d. On Change Detected

- **Properties changed:** Update `nodeMap[uuid].props`, update inspector if node is selected, mark `tempGraph` dirty
- **Object missing:** Set `nodeMap[uuid].state = 'error'`, show error badge on node, show notification bar message: `"[NodeLabel] was deleted outside Procedia"`. Do NOT auto-ghost or auto-delete. Wait for user action.

---

## 12. ExtendScript Command List

All ExtendScript functions return `JSON.stringify({ ok: boolean, data: any, error: string|null })`.
All are called via `evalBridge.js` only.
All written in strict ES3 (var, named functions, string concatenation, for loops — no exceptions).

### Init
| Command | Trigger | Description |
|---|---|---|
| `initReservedComp()` | First node drop | Creates folder, reserved comp, three locked text layers, writes empty JSON |

### Affected Node Lifecycle
| Command | Trigger | Description |
|---|---|---|
| `makeLayerAlive(uuid, nodeType, hostingCompUUID, props)` | onAlive (first time) | Creates AE project object if needed, adds layer to hosting comp, sets properties |
| `unparkLayer(uuid, hostingCompUUID)` | onAlive (was parked) | Moves layer from reserved comp to hosting comp. Keyframes survive. |
| `parkLayer(uuid, hostingCompUUID)` | onGhost (affected) | Moves layer from hosting comp to reserved comp. Layer locked. |
| `deleteParkedLayer(uuid)` | onDelete (affected) | Removes parked layer from reserved comp permanently |
| `removeLayerFromComp(uuid, hostingCompUUID)` | Multi-comp partial disconnect | Removes layer from one comp only, node stays alive in others |
| `deleteComp(uuid)` | CompNode deleted | Deletes the AE CompItem from the project |
| `renameNode(uuid, newName)` | Node label changed | Renames the comp or layer in AE |

### Effector Node Lifecycle
| Command | Trigger | Description |
|---|---|---|
| `applyEffector(effectorUUID, hostLayerUUID, hostingCompUUID, props)` | onAlive (effector) | Applies effect/mask/expression to host layer with saved properties |
| `removeEffector(effectorUUID, hostLayerUUID, hostingCompUUID)` | onGhost (effector) | Removes the AE modification from host layer |

### Comp-to-Comp
| Command | Trigger | Description |
|---|---|---|
| `addCompAsLayer(fromCompUUID, toCompUUID)` | Comp wired to comp | Adds from-comp as precomp layer inside to-comp |
| `removeCompLayerFromComp(fromCompUUID, toCompUUID)` | Comp-to-comp wire deleted | Removes from-comp layer from to-comp |

### Properties
| Command | Trigger | Description |
|---|---|---|
| `updateNodeProperty(uuid, hostingCompUUID, propertyMatchName, value)` | Dirty flush (debounced 300ms) | Updates single property on AE layer by match name |
| `setLayerOrder(hostingCompUUID, orderedUUIDs)` | User reorders in CompNode inspector | Calls `layer.moveToBeginning()` bottom-to-top to match orderedUUIDs |
| `setLayerParent(childUUID, parentUUID, hostingCompUUID)` | parent wire connected (both nodes alive in same comp) | Sets `childLayer.parent = parentLayer` |
| `clearLayerParent(childUUID, hostingCompUUID)` | parent wire disconnected, OR parent/child node ghosts | Sets `childLayer.parent = null` |

### Persistence
| Command | Trigger | Description |
|---|---|---|
| `writeNodeRegistry(jsonString)` | AE save / quit / panel unload | Overwrites `__PROCEDIA_NODES__` text layer |
| `writeWireRegistry(jsonString)` | AE save / quit / panel unload | Overwrites `__PROCEDIA_WIRES__` text layer |
| `writeCompMembership(compUUID, jsonString)` | AE save / quit / panel unload | Overwrites per-comp membership text layer inside that comp |
| `readNodeRegistry()` | Panel open | Returns `__PROCEDIA_NODES__` JSON string |
| `readWireRegistry()` | Panel open | Returns `__PROCEDIA_WIRES__` JSON string |
| `readCompMembership(compUUID)` | Panel open | Returns per-comp membership JSON string |

### Polling & AE View
| Command | Trigger | Description |
|---|---|---|
| `pollAliveNodes(uuidList)` | Every poll tick | Checks all alive UUIDs: returns array of `{ uuid, exists, properties }` |
| `focusCompInAE(uuid)` | Double-click CompNode | Opens the comp in the AE timeline viewer |

---

## 13. File & Folder Structure

Every file has one responsibility. Do not mix concerns.

```
procedia/
│
├── CSXS/
│   └── manifest.xml
│
├── index.html                        # Panel entry point — script load order
├── index.js                          # Bootstrap — preamble loader, init calls, persistence event listeners
│
├── ae/
│   ├── nodeOps.js                    # All callMake*, callPark*, callUnpark*, callApplyEffector*,
│   │                                 #   callRemoveEffector*, callDeleteComp, callRenameNode,
│   │                                 #   callFocusCompInAE — ONLY file with AE call functions
│   └── graphHooks.js                 # Wires graphState events to ae/nodeOps calls. No DOM. No direct evalBridge.
│
├── ui/
│   ├── nodeList.js                   # Node list DOM — buildNodeList, category collapse, search filter
│   ├── drag.js                       # Drag from node list to canvas — initDrag, buildDefaultProperties
│   └── keyboard.js                   # Keyboard shortcuts — Delete/Backspace
│
├── graph/
│   ├── graphState.js                 # Panel memory — nodeMap, wireMap, tempGraph, selection.
│   │                                 # ONLY file that mutates nodeMap and wireMap.
│   │                                 # Exposes rebuildTempGraph(), flushToPersistence().
│   ├── nodes/
│   │   ├── nodeGeometry.js           # Port positions + constants — single source for NODE_WIDTH/HEIGHT, RECT_W/H,
│   │   │                             #   PORT_COLOR, inputPortPositions, outputPortPositions,
│   │   │                             #   parentInPortPosition, childOutPortPosition
│   │   ├── nodeHitTest.js            # Hit testing — hitTest (body), hitTestOutputPort, hitTestInputPort,
│   │   │                             #   hitTestParentInPort, hitTestChildOutPort
│   │   ├── nodeRenderer.js           # Node drawing — drawNode (body, ports, label, state dot)
│   │   ├── nodeRegistry.js           # Thin registry — register, lookup, category API
│   │   └── categories/
│   │       ├── core/
│   │       │   └── Comp.js           # CompNode — nodeKind: 'affected'
│   │       ├── layers/
│   │       │   ├── Text.js           # TextNode — nodeKind: 'affected'
│   │       │   └── Null.js           # NullNode — nodeKind: 'affected'
│   │       ├── effects/              # EffectNode — nodeKind: 'effector'
│   │       ├── generators/
│   │       └── utility/
│   ├── canvas/
│   │   ├── viewport.js               # Transform state — pan, zoom, coordinate conversion
│   │   ├── renderer.js               # Draw loop — nodes, wires, grid
│   │   ├── input.js                  # Mouse events — pan, zoom, wire drag, node select/move
│   │   ├── index.js                  # Canvas assembly
│   │   └── minimap.js                # Overview minimap
│   └── Wire/
│       ├── wire.js                   # Wire drag state, commit/delete logic, cycle check
│       ├── wireRenderer.js           # Bezier wire drawing
│       └── nodeState.js              # Ghost cascade — cascadeGhost(), hasCompDownstream(),
│                                     #   evaluateNodeState(), collectAffectedNodes()
│
├── inspector/
│   ├── inspector.js                  # Inspector panel — renders selected node properties
│   └── layerOrderList.js             # Drag-to-reorder list for CompNode layer stacking
│
├── data/
│   └── uuidGenerator.js              # UUID generation — PROC-{timestamp}-{rand4} / WIRE-{timestamp}-{rand4}
│
├── flush/
│   └── dirtyFlusher.js               # Dirty flag management — flushDirtyNodes(), debounce timer,
│                                     #   isWriting flag coordination with poller
│
├── polling/
│   └── poller.js                     # Adaptive polling — 1s active / 5s idle, isWriting flag
│
├── notifications/
│   └── notificationBar.js            # Panel-level notification bar
│
├── bridge/
│   └── evalBridge.js                 # ONLY file that calls csInterface.evalScript(). Promise-based. Always JSON.parse.
│
└── jsx/
    ├── json.jsx                      # JSON polyfill — MUST be first in preamble
    ├── init.jsx                      # initReservedComp
    ├── persistence.jsx               # writeNodeRegistry, writeWireRegistry, writeCompMembership,
    │                                 #   readNodeRegistry, readWireRegistry, readCompMembership
    ├── nodeLifeCycle/
    │   ├── nodeLayerOps/             # split from nodeLayerOps.jsx — load in order below
    │   │   ├── nodeLayerLookup.jsx   # findCompByUUID, findLayerByUUID, findReservedComp,
    │   │   │                         #   findLayerByName, readGhostUUIDs, writeGhostUUIDs
    │   │   ├── nodeLayerCreate.jsx   # createNullLayer, applyNullTransform, makeLayerAlive, makeNodeAlive
    │   │   ├── nodeLayerPark.jsx     # parkLayer, unparkLayer, deleteParkedLayer
    │   │   └── nodeLayerRemove.jsx   # deleteComp, renameNode, removeLayerFromComp
    │   ├── nodeEffectorOps.jsx       # applyEffector, removeEffector
    │   ├── nodeCompOps.jsx           # addCompAsLayer, removeCompLayerFromComp
    │   ├── nodeKeyframes.jsx         # keyframe read/write helpers
    │   ├── nodeDataLayer.jsx         # data-layer (RESERVED stamps) read/write
    │   ├── nodeWireOps.jsx           # wire state helpers called from panel
    │   └── nodeLifecycle.jsx         # lifecycle orchestration helpers
    ├── properties.jsx                # updateNodeProperty, setLayerOrder, setLayerParent, clearLayerParent
    ├── aeFocus.jsx                   # focusCompInAE
    └── polling.jsx                   # pollAliveNodes
```

---

## 14. Critical Rules for Claude Code

1. **ExtendScript is ES3 strict.** No `const`, `let`, arrow functions, template literals, `forEach`, destructuring, spread, default parameters, or Promises. Use `var`, named functions, string concatenation, and `for` loops exclusively.

2. **Every `.jsx` function returns `JSON.stringify({ ok, data, error })`.** No exceptions. Panel JS always checks `res.ok` before using `res.data`.

3. **`evalBridge.js` is the only door to AE.** Never call `csInterface.evalScript()` from any other file.

4. **`graphState.js` is the only file that mutates `nodeMap` and `wireMap`.** All other files dispatch to it. Never mutate state in place from outside `graphState.js`.

5. **`ae/nodeOps.js` is the only file that contains AE call functions.** All `call*` functions live here. `ae/graphHooks.js` listens to graphState events and calls into `ae/nodeOps.js` only. `ui/` files never touch evalBridge.

6. **`flush/dirtyFlusher.js` is the only file that manages the dirty flag and debounce timer.** Inspector changes set `nodeMap[uuid].dirty = true` and notify `dirtyFlusher`. They do not call evalBridge directly.

7. **Node UUID is the only identifier.** Never use label, comp name, or layer name. They can be changed by the user. UUIDs are stored in `layer.comment` and `comp.comment` in AE.

8. **`nodeKind` is set on the node definition, not per instance.** Never allow a node instance to override its `nodeKind`. It is a type-level property.

9. **Cascade order is non-negotiable.** Effectors ghost outermost-first. Affected nodes park last. Never park an affected node before all its effectors have been removed from its layer. See Section 4.

10. **Data wires never trigger ghost cascade.** Only layer wire deletion triggers cascade. This is a hard rule — never implement cascade logic that responds to data wire events.

11. **Persistence writes happen only on three events:** AE save, AE quit, panel unload. Never write `__PROCEDIA_NODES__` or `__PROCEDIA_WIRES__` during a session action. `tempGraph` is the in-session state — it writes to AE only when the session ends or the project is saved.

12. **Dirty flush bypasses persistence.** `updateNodeProperty` writes directly to the live AE layer — it is not a persistence write. It does not touch `__PROCEDIA_NODES__`. Properties in `nodeMap` are the source and will be persisted on the next save trigger.

13. **Canvas positions (x, y) are persisted in `__PROCEDIA_NODES__`.** Unlike v1, positions are stored — users expect the graph to look the same when they reopen the panel.

14. **CompNode is always alive.** No ghost state, no park logic. Deleting a CompNode calls `deleteComp` directly — no `parkLayer` step.

15. **Layer stacking in AE is 1-based. `layerOrder` array is 0-based.** Index 0 = AE layer 1 (top). Reorder with `moveToBeginning()` from bottom to top. AE does not provide `Layer.moveTo(index)`.

16. **Polling must pause during any evalScript write.** `isWriting = true` before any write call. `isWriting = false` in the callback. `poller.js` checks this flag before every tick.

17. **`JSON` is not native in ExtendScript on AE 2025.** `jsx/json.jsx` must be the first file in the evalBridge preamble. Never call `JSON.stringify` or `JSON.parse` in any `.jsx` without this polyfill loaded first.

18. **`evalScript` callbacks only fire when AE has window focus.** In manual testing: trigger the call, click the AE window, then switch back to the browser console to read the result.

19. **Implement one ExtendScript command at a time. Test in AE. Then proceed.** Never chain multiple commands in one task without a verification checkpoint.

20. **`parent_in` and `child_out` ports are always rectangle tabs, never circles.** `nodeGeometry.inputPortPositions()` and `outputPortPositions()` filter out `parent` type ports by design. Never pass a `parent` port through the circle path. Likewise, never call `parentInPortPosition` / `childOutPortPosition` for `layer` or `data` ports. The geometry and hit-test modules enforce this split — do not bypass it.

21. **`nodeGeometry.js` and `nodeHitTest.js` are the only files that may compute port screen positions or hit radii.** Any code that needs a port's screen coordinate must call the appropriate function on `nodeGeometry` or `nodeHitTest`. Never inline port math in renderer, input, or wire files.

---

*Procedia v3 — Architecture Specification — May 2026 (updated: parent/child native ports, nodeGeometry/nodeHitTest split)*
*This document is the single source of truth for Claude Code. Any behavior not described here must be clarified with the developer before implementation.*
