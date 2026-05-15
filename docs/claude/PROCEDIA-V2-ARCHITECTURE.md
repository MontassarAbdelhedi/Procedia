# Procedia v2 — Architecture Specification
*CEP · After Effects 2025+ · Windows · ExtendScript ES3*
*Last updated: May 2026*

---

## 0. Core Philosophy

> **The graph is always valid. AE reflects only what is alive. dataLayer and dataWire are the ledger. Every action is its own atomic ExtendScript command.**

- AE is the **source of truth** for composition data (layer properties, keyframes, comp settings)
- Panel JS is the **source of truth** for graph topology and UI state
- `dataLayer` + `dataWire` are the **crash-recovery persistence layer** — not the primary runtime store
- Panel memory holds the live graph. dataLayer/dataWire are written to on every action but only read on crash recovery
- There is **no apply button**. Every graph or inspector action immediately triggers an ExtendScript command
- Procedia never auto-repairs a broken Reserved folder or comp. The user owns that responsibility entirely
- Canvas node positions (x, y) are written to dataLayer on every node move and on onDrop.
  They are restored from dataLayer on crash recovery.
  Position is stored per-node at the top level of each node's entry (ghost list and comp tree).

---

## 1. Node Taxonomy

### 1a. Dedicated Nodes
Require a presence in the **AE Project panel** AND as a layer inside a hosting comp.

| Node | AE Project Object | AE Layer Type | Notes |
|---|---|---|---|
| `CompNode` | `CompItem` | — | Is the hosting comp itself. Always alive. |
| `SolidNode` | `FootageItem` (solid) | `AVLayer` | Project object created first, then layered |
| `NullNode` | — | `NullLayer` | No project object needed |
| `AdjustmentNode` | — | `AVLayer` | Adjustment flag set on layer |
| `FootageNode` | `FootageItem` | `AVLayer` | User-imported footage |

**Creation order when going alive:**
1. Create AE project object (if the node type requires one)
2. Add as a layer to the hosting comp

Never reverse this order. A layer cannot reference a project object that does not yet exist.

### 1b. Not-Dedicated Nodes
Live **only as layers** inside a hosting comp. No AE project panel presence.

| Node | AE Layer Type | Notes |
|---|---|---|
| `TextNode` | `TextLayer` | |
| `ShapeNode` | `ShapeLayer` | |
| `MaskNode` | Mask property | Applied to a target layer, not a standalone layer |
| `EffectNode` | Effect on a layer | 1 EffectNode = 1 AE effect. Access by match name only |

### 1c. Special Nodes

| Node | Behavior |
|---|---|
| `IsParentNode` | Sets `layer.parent` in AE between two alive layers. Ghost nodes cannot be parents. If parent goes ghost → children lose parent silently in AE. If child goes ghost → wire auto-deletes. |
| `GraphPositionNode` | Expects position data from its input. Drives the position property of a target layer. |
| `GraphRotationNode` | Expects rotation data. Drives rotation property. |
| `GraphScaleNode` | Expects scale data. Drives scale property. |

All `Graph*` nodes expect exactly one specific data type on their input port. The input port type is declared on the node definition, not negotiated at runtime.

---

## 2. Node States

Every node has exactly one state at all times.

| State | Meaning | AE Object Exists | In dataLayer |
|---|---|---|---|
| `ghost` | Lives in graph only | No | Yes — top-level ghost list |
| `alive` | Connected to a comp downstream | Yes | Yes — inside comp tree |
| `error` | Was alive, AE object no longer found by polling | Broken | Yes — marked with error flag |

### State transition table

```
onDrop      → ghost        Always. Exception: CompNode → alive immediately on drop.
ghost       → alive        When a downstream comp path is established via wiring.
alive       → ghost        When the last downstream comp path is broken.
alive       → error        When polling detects the AE object is missing or renamed.
error       → ghost        When user manually resolves (deletes the node or re-creates).
onDelete    → ghost first (cleanup AE if alive) → then removed from dataLayer entirely.
```

---

## 3. Node Lifecycle — 4 Named Events

Every node responds to exactly these four events. Claude Code must implement each one completely before moving to the next.

### 3a. `onDrop`
Triggered when a node is dragged from the node list onto the canvas.

**Steps:**
1. Generate UUID on the panel JS side. Format: `PROC-{timestamp}-{rand4}` e.g. `PROC-1714900000000-a3f2`
2. Set node state = `ghost`
3. Store in panel memory: `{ id, type, state: 'ghost', position: {x, y}, properties: defaults }`
4. Write to `dataLayer` ghost list: `{ id, type, x, y }` — position included, no properties
5. If node type is `CompNode`: skip ghost, go directly to `onAlive`

**ExtendScript called:** `writeGhostEntry(uuid, nodeType)` — writes to dataLayer text layer only

### 3b. `onAlive`
Triggered when a downstream comp path is established (a wire connects this node, directly or transitively, to a CompNode).

**Steps:**
1. Set node state = `alive`
2. Determine hosting comp: traverse output wires downstream until the first `CompNode` is found. If multiple CompNodes are reachable, the node goes alive in **each** — one AE layer per hosting comp.
3. If node is dedicated: create AE project object first (if required by type), then add as layer to hosting comp
4. If node is not-dedicated: add as layer to hosting comp directly
5. Write keyframes from dataLayer backup to the new AE layer
6. Move node entry from ghost list to the comp tree in `dataLayer`
7. Write to `dataWire` to record the connection

**ExtendScript called:** `makeNodeAlive(uuid, nodeType, hostingCompUUID, properties, keyframes)`

### 3c. `onGhost`
Triggered when the last downstream comp path is broken (wire deleted, or upstream CompNode deleted).

**Steps:**
1. Pull keyframes from AE layer back into `dataLayer` as JSON
2. Delete the AE layer from the hosting comp
3. If dedicated node had a project object AND no other comp references it: delete the project object too
4. Set node state = `ghost`
5. Move node entry from comp tree back to ghost list in `dataLayer`
6. Remove related entries from `dataWire`

**ExtendScript called:** `makeNodeGhost(uuid, hostingCompUUID)` — returns keyframes as JSON for panel to store

### 3d. `onDelete`
Triggered when user removes a node from the canvas entirely.

**Steps:**
1. If node is `alive`: run `onGhost` first (full cleanup), then continue
2. If node is `ghost`: skip onGhost
3. Remove node from panel memory
4. Remove UUID from `dataLayer` ghost list
5. Remove all wire entries referencing this UUID from `dataWire`
6. Auto-delete all wires connected to this node in the graph

**ExtendScript called:** `deleteNodeData(uuid)` — removes from both dataLayer and dataWire

---

## 4. Port System

### 4a. Port Types

Every port has a declared type. There are exactly two port types:

| Type | Carries | Example |
|---|---|---|
| `layer` | An AE layer reference — a node that becomes a layer in a comp | TextNode → CompNode |
| `data` | A value — number, color, vector, string | ExpressionNode → TextNode (font size) |

### 4b. Output Ports

Every node has **one output port**. The output port is **untyped / flexible**. Its effective type is determined by the receiving input port.

Example: A `TextNode` output wired to an `EffectNode` layer input → carries a layer. The same `TextNode` output wired to a `GraphPositionNode` data input → carries position data.

The sending node does not need to know what it is outputting. The receiving port defines the contract.

### 4c. Input Ports

Input ports are **always visible** on every node. They highlight (fill with port color, increase radius) when a wire drag is active and the cursor enters the port's snap radius (~20px). Port labels appear only on highlight.

Each node type declares its own input port schema. Example:

```
TextNode:
  inputs:
    - port: "data_fontSize"    type: data    accepts: number
    - port: "data_color"       type: data    accepts: color
    - port: "data_content"     type: data    accepts: string

EffectNode (Gaussian Blur):
  inputs:
    - port: "layer_in"         type: layer   accepts: any layer
    - port: "data_blurAmount"  type: data    accepts: number

CompNode:
  inputs:
    - port: "layer_in_{n}"     type: layer   accepts: any layer   multiplicity: unlimited

GraphPositionNode:
  inputs:
    - port: "data_position"    type: data    accepts: vector2
```

### 4d. Port Rules

- One wire per input port. A second wire to the same input port replaces the first.
- One output port per node. Multiple wires can originate from the same output port simultaneously.
- A `data` wire cannot connect to a `layer` port and vice versa. Type mismatch: wire is blocked, no connection made, no error shown — the port simply does not highlight as a valid target.
- Cycles are blocked at wire creation. Before confirming a wire, traverse the graph to check if the connection would create a cycle. If yes: reject silently.

### 4e. Layer Stacking Order in CompNode

When multiple nodes feed into a CompNode, AE layer z-order is set manually by the user via the CompNode inspector. The inspector shows a list of connected input nodes that the user can reorder. On reorder, ExtendScript walks the desired UUID order from bottom to top and calls `layer.moveToBeginning()` so the final stack matches the list.

---

## 5. Wire Rules — Ghost Cascade Logic

### 5a. Feed vs Fed Distinction

Every wire carries either a `layer` or a `data` signal. This determines how ghost cascades when the wire is deleted.

| Wire type deleted | Upstream node | Downstream node |
|---|---|---|
| `data` wire | Goes ghost (alone, isolated) | Unaffected — loses the data input only |
| `layer` wire | Cascade ghost upstream | Re-evaluates downstream paths |

### 5b. Cascade Ghost Algorithm

When a `layer` wire is deleted between Node A (upstream) and Node B (downstream):

1. Remove the wire from `dataWire`
2. For Node A: run downstream traversal — does any remaining output wire path reach a CompNode?
   - Yes → Node A stays alive in that comp
   - No → Node A calls `onGhost`. Then repeat step 2 for every node upstream of Node A recursively, stopping when a node still has a live comp path or when a `data` wire boundary is hit
3. For Node B: run downstream traversal independently
   - If Node B still reaches a comp → stays alive
   - If Node B no longer reaches a comp → calls `onGhost`, cascade upstream from Node B

### 5c. Multi-Comp Path Rule

A node alive in multiple comps is tracked as multiple entries in `dataLayer` (one per comp). When one path is broken, only that comp's entry is ghosted. The node stays alive in any remaining comp.

### 5d. Cycle Prevention

Before confirming any wire connection from Node A output → Node B input:
1. Starting from Node B, traverse all downstream connections
2. If Node A is encountered in this traversal → cycle detected → reject wire silently
3. If Node A is not encountered → wire is valid → confirm

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

---

## 6. Data Model

### 6a. dataLayer JSON Schema

Stored as the text content of a text layer named `"__PROCEDIA_DATA__"` inside the Reserved comp.

```json
{
  "version": "2.0",
  "ghost": [
    { "id": "PROC-xxx", "type": "TextNode", "x": 240, "y": 180 },
    { "id": "PROC-yyy", "type": "ShapeNode", "x": 560, "y": 320 }
  ],
  "project": {
    "PROC-comp1-uuid": {
      "type": "CompNode",
      "state": "alive",
      "properties": {
        "width": 1920,
        "height": 1080,
        "duration": 10,
        "frameRate": 24
      },
      "layerOrder": ["PROC-text1-uuid", "PROC-shape1-uuid"],
      "nodes": {
        "PROC-text1-uuid": {
          "type": "TextNode",
          "state": "alive",
          "x": 240,
          "y": 180,
          "properties": {
            "content": "Hello",
            "fontSize": 72,
            "color": [1, 1, 1, 1]
          },
          "keyframes": {},
          "effects": {
            "PROC-blur1-uuid": {
              "type": "EffectNode",
              "aeMatchName": "ADBE Gaussian Blur 2",
              "state": "alive",
              "properties": {
                "blurAmount": 10
              },
              "keyframes": {}
            }
          }
        }
      }
    }
  }
}
```

**Rules:**
- `ghost` array stores UUID + type only. No properties, no position, no keyframes.
- `project` is keyed by CompNode UUID
- Each comp lists its `layerOrder` array (ordered list of node UUIDs) — this drives AE layer stacking
- `keyframes` is empty `{}` when node is alive (AE is authoritative). Populated when node goes ghost.
- Node canvas positions (x, y) are **never stored here** — panel memory only

### 6b. dataWire JSON Schema

Stored as the text content of a text layer named `"__PROCEDIA_WIRES__"` inside the Reserved comp.

```json
{
  "version": "2.0",
  "wires": [
    {
      "id": "WIRE-xxx",
      "fromNode": "PROC-aaa",
      "fromPort": "output",
      "toNode": "PROC-bbb",
      "toPort": "layer_in"
    },
    {
      "id": "WIRE-yyy",
      "fromNode": "PROC-ccc",
      "fromPort": "output",
      "toNode": "PROC-aaa",
      "toPort": "data_fontSize"
    }
  ]
}
```

**Rules:**
- `dataWire` is the **only place** wires are stored. Never infer connections from the dataLayer tree.
- Wire IDs follow the same format as node UUIDs: `WIRE-{timestamp}-{rand4}`
- `fromPort` is always `"output"` (every node has one output port)
- `toPort` matches the port name declared in the node's input schema
- When a wire is deleted, its entry is removed from this array immediately

---

## 7. Persistence — Reserved Comp

### 7a. Structure

One reserved comp named `"__PROCEDIA_RESERVED__"` lives inside the `"DO NOT DELETE - Procedia"` folder.

The comp contains exactly two text layers:
- Layer 1: `"__PROCEDIA_DATA__"` — holds dataLayer JSON
- Layer 2: `"__PROCEDIA_WIRES__"` — holds dataWire JSON

Both layers are locked (`layer.locked = true`) to prevent accidental user edits.
The Reserved comp itself is also locked (`comp.locked = true`).

### 7b. Lazy Initialization

The Reserved comp is created on the **first node drop**, not on panel open.

Init sequence (ExtendScript):
1. Check if `"DO NOT DELETE - Procedia"` folder exists → create if missing
2. Check if `"__PROCEDIA_RESERVED__"` comp exists inside it → create if missing
3. Check if both text layers exist inside the comp → create if missing, lock both
4. Write initial empty JSON to both text layers
5. Lock the comp

If the folder or comp is missing at any subsequent write, re-run the init sequence silently before writing.

### 7c. Write Behavior

- Every action triggers an immediate write to dataLayer or dataWire (or both)
- Writes happen via ExtendScript: read current JSON from text layer → merge change → write back
- Panel memory is the live store. dataLayer/dataWire are the crash-recovery backup.
- On panel reopen with an intact AE project: panel rebuilds from memory (AE session persists)
- On AE crash and reopen: panel reads dataLayer and dataWire to reconstruct graph state

### 7d. What Procedia Does NOT Do

- Does not auto-repair deleted Reserved comp or folder
- Does not warn on panel open if Reserved comp is missing (only fails on first write and surfaces the error then)
- Does not keep a secondary backup beyond the two text layers

---

## 8. Smart Polling

### 8a. Purpose

Polling detects when a user modifies a Procedia-managed AE object **outside Procedia** (directly in AE). It does not gate writes — writes are always immediate.

### 8b. What It Watches

For every UUID tracked as `alive` in panel memory, polling checks:
- Does a CompItem with this UUID still exist in the AE project?
- If yes: has its name, duration, frameRate, width, or height changed?

Polling does **not** watch ghost nodes. Ghost nodes have no AE object to poll.

### 8c. Adaptive Frequency

| User activity state | Poll interval |
|---|---|
| Active (mouse/keyboard event in last 5s) | Every 1 second |
| Idle (no input for 5s+) | Every 5 seconds |

Activity is tracked by listening to `mousemove` and `keydown` events on the panel. A timestamp is updated on each event. The poller checks the timestamp to decide which interval to use.

### 8d. On Change Detected

If a tracked comp's properties have changed:
- Update the node's properties in panel memory to reflect AE values
- Update the inspector if this node is currently selected
- Write updated values to dataLayer

If a tracked comp no longer exists (deleted in AE):
- Set node state = `error`
- Show error badge on the node in the graph
- Show a notification in the panel-level notification bar: `"[NodeLabel] was deleted outside Procedia"`
- Do NOT auto-ghost, do NOT auto-delete. Wait for user action.

---

## 9. ExtendScript Command List

All ExtendScript functions return `JSON.stringify({ ok: boolean, data: any, error: string|null })`.
All are called via `csInterface.evalScript()` from panel JS.
All are written in strict ES3 (var only, no arrow functions, no template literals, no forEach).

### Init
| Command | Trigger | Description |
|---|---|---|
| `initReservedComp()` | First node drop | Creates folder, comp, two locked text layers, writes empty JSON |

### Node Lifecycle
| Command | Trigger | Description |
|---|---|---|
| `writeGhostEntry(uuid, nodeType)` | onDrop | Appends entry to ghost list in dataLayer |
| `makeNodeAlive(uuid, nodeType, hostingCompUUID, properties, nodeLabel)` | onAlive | Creates AE project object if needed, adds layer to hosting comp, writes keyframes, updates dataLayer |
| `makeNodeGhost(uuid, hostingCompUUID)` | onGhost | Reads keyframes from AE layer, deletes layer, returns keyframes JSON, updates dataLayer |
| `deleteNodeData(uuid)` | onDelete | Removes UUID from dataLayer ghost list or comp tree, removes wires from dataWire |
| `deleteComp(uuid)` | CompNode deleted | Deletes the AE CompItem from the project |
| `renameNode(uuid, newName)` | Node label changed | Renames the comp or layer in AE to match the new label |

### Comp-to-Comp Layer Ops
| Command | Trigger | Description |
|---|---|---|
| `addCompAsLayer(fromCompUUID, toCompUUID)` | Comp wired to comp | Adds the from-comp as a precomp layer inside the to-comp |
| `removeCompLayerFromComp(fromCompUUID, toCompUUID)` | Comp-to-comp wire deleted | Removes the from-comp layer from the to-comp |
| `removeLayerFromComp(uuid, hostingCompUUID)` | Non-comp wire to comp removed (multi-comp) | Removes only the layer in that specific hosting comp; node stays alive in remaining comps |

### Properties
| Command | Trigger | Description |
|---|---|---|
| `updateNodeProperty(uuid, hostingCompUUID, propertyMatchName, value)` | Inspector change | Updates a single property on the AE layer by match name |
| `setLayerOrder(hostingCompUUID, orderedUUIDs)` | User reorders in inspector | Calls `layer.moveToBeginning()` from bottom to top to match orderedUUIDs array |
| `setLayerParent(childUUID, parentUUID, hostingCompUUID)` | IsParentNode wired | Sets `childLayer.parent = parentLayer` |
| `clearLayerParent(childUUID, hostingCompUUID)` | IsParentNode ghosted/deleted | Sets `childLayer.parent = null` |

### Wires
| Command | Trigger | Description |
|---|---|---|
| `writeWire(wireJSON)` | Wire confirmed | Appends wire entry to dataWire text layer |
| `deleteWire(wireId)` | Wire deleted | Removes wire entry from dataWire text layer |

### Polling & AE View
| Command | Trigger | Description |
|---|---|---|
| `pollAliveNodes(uuidList)` | Every poll tick | Checks all alive UUIDs: returns array of `{ uuid, exists, properties }` |
| `focusCompInAE(uuid)` | Double-click CompNode | Opens the comp in the AE timeline viewer |

### Persistence (crash recovery)
| Command | Trigger | Description |
|---|---|---|
| `readDataLayer()` | Panel crash recovery | Returns full dataLayer JSON string |
| `readDataWire()` | Panel crash recovery | Returns full dataWire JSON string |
| `writeDataLayer(jsonString)` | Any state change | Overwrites dataLayer text layer content |
| `writeDataWire(jsonString)` | Any wire change | Overwrites dataWire text layer content |

---

## 10. File & Folder Structure

Clean repo for fresh start. Every file has one responsibility.

```
procedia/
│
├── CSXS/
│   └── manifest.xml                  # CEP manifest — panel registration
│
├── index.html                        # Panel entry point — script load order
├── index.js                          # Panel bootstrap — JSX preamble loader + init calls only
│
├── ae/                               # AE call layer — all evalScript calls live here
│   ├── nodeOps.js                    # Node AE operations — ensureProcediaReady, callMakeNodeAlive,
│   │                                 #   callMakeNodeGhost, callAddLayerToComp, callRemoveLayerFromComp,
│   │                                 #   callDeleteComp, callRenameNode, callFocusCompInAE
│   └── graphHooks.js                 # Wire/state event hooks — wires graphState events to ae/nodeOps calls
│
├── ui/                               # UI interaction layer — no AE calls, no graphState mutations
│   ├── nodeList.js                   # Node list DOM — buildNodeList, category collapse, search filter
│   ├── drag.js                       # Drag from node list to canvas — initDrag, buildDefaultProperties
│   └── keyboard.js                  # Keyboard shortcuts — Delete/Backspace deletes selected node
│
├── graph/
│   ├── graphState.js                 # Panel memory — nodeMap, wireMap, selection; only file that mutates state
│   ├── nodes/
│   │   ├── node.js                   # Node rendering — drawNode, hit-testing
│   │   ├── nodeRegistry.js           # Thin registry — register, lookup, category API
│   │   └── categories/
│   │       ├── core/
│   │       │   └── Comp.js           # CompNode definition
│   │       ├── layers/
│   │       │   └── Text.js           # TextNode definition
│   │       ├── effects/              # (empty — future nodes)
│   │       ├── generators/           # (empty — future nodes)
│   │       └── utility/             # (empty — future nodes)
│   ├── canvas/
│   │   ├── viewport.js               # Transform state — pan, zoom, coordinate conversion
│   │   ├── renderer.js               # Draw loop — nodes, wires, grid
│   │   ├── input.js                  # Mouse events — pan, zoom, wire drag, node select/move
│   │   ├── index.js                  # Canvas assembly — exposes canvas global
│   │   └── minimap.js                # Overview minimap
│   └── Wire/
│       ├── wire.js                   # Wire drag state, commit/delete logic, cycle check
│       ├── wireRenderer.js           # Bezier wire drawing
│       └── nodeState.js              # Ghost cascade — hasCompDownstream, evaluateNodeState
│
├── inspector/
│   ├── inspector.js                  # Inspector panel — renders selected node properties as editable fields
│   └── layerOrderList.js             # Drag-to-reorder list for CompNode layer stacking
│
├── data/
│   └── uuidGenerator.js             # UUID generation — PROC-{timestamp}-{rand4} / WIRE-{timestamp}-{rand4}
│
├── polling/
│   └── poller.js                     # Adaptive polling — alive node health check (1s active / 5s idle)
│
├── notifications/
│   └── notificationBar.js            # Panel-level notification bar — show/hide/dismiss per-node
│
├── bridge/
│   └── evalBridge.js                 # Single evalScript wrapper — Promise-based, always JSON.parse
│
└── jsx/
    ├── json.jsx                      # JSON polyfill — MUST be first in preamble (native JSON absent in AE 2025)
    ├── init.jsx                      # initReservedComp
    ├── persistence.jsx               # writeGhostEntry, readDataLayer, readDataWire, writeDataLayer, writeDataWire
    ├── nodeLifeCycle/                # Lifecycle JSX — split by responsibility
    │   ├── nodeKeyframes.jsx         # Keyframe read/write helpers
    │   ├── nodeDataLayer.jsx         # dataLayer read/write for node entries
    │   ├── nodeWireOps.jsx           # addCompAsLayer, removeCompLayerFromComp, removeLayerFromComp
    │   └── nodeLifecycle.jsx         # makeNodeAlive, makeNodeGhost, deleteComp, renameNode
    ├── properties.jsx                # updateNodeProperty, setLayerOrder, setLayerParent, clearLayerParent
    ├── aeFocus.jsx                   # focusCompInAE — opens comp in AE timeline viewer
    └── polling.jsx                   # pollAliveNodes
```

**Rules:**
- One `.jsx` file per responsibility. Never mix lifecycle and persistence in the same file.
- `evalBridge.js` is the **only** file that calls `csInterface.evalScript()`. All other JS files go through it.
- `graphState.js` is the **only** file that mutates the in-memory node and wire maps.
- `ae/nodeOps.js` is the **only** file that contains `callMake*` / `callDelete*` / `callFocus*` functions. `ae/graphHooks.js` wires graph events to those calls. Neither file touches the DOM.
- `ui/` files contain only UI interaction logic (DOM events, drag, keyboard). They call into `graphState` and `ae/` but never call `csInterface.evalScript()` directly.
- `graph/nodes/nodeRegistry.js` is the thin registry loader. Node type definitions live in `graph/nodes/categories/{category}/{NodeName}.js`. Read the relevant node file before touching any node logic.

---

## 11. Critical Rules for Claude Code

1. **ExtendScript is ES3 strict.** No `const`, no `let`, no arrow functions, no template literals, no `forEach`, no destructuring, no spread, no default parameters, no Promises. Use `var`, named functions, string concatenation, and `for` loops only.

2. **Every `.jsx` function returns `JSON.stringify({ ok, data, error })`.** No exceptions. Panel JS always checks `res.ok` before using `res.data`.

3. **`evalBridge.js` is the only door to AE.** Never call `csInterface.evalScript()` directly from any other file.

4. **`graphState.js` is the only file that mutates panel state.** Dispatch actions to it, never mutate nodeMap or wireMap in place from other files.

4a. **`ae/nodeOps.js` is the only file that contains AE call functions.** All `callMake*`, `callDelete*`, `callFocus*`, and `callAdd*` functions live here. `ae/graphHooks.js` listens to graphState events and calls into `ae/nodeOps.js` only. `ui/` files never call evalBridge directly.

5. **Node UUID is the only identifier.** Never use node label, comp name, or layer name as an identifier. They can be changed by the user.

6. **Layer stacking order in AE is 1-based. The `layerOrder` array in panel memory is 0-based.** Array index 0 represents AE layer 1 (top). AE scripting does not provide `Layer.moveTo(index)`, so reorder by moving desired layers from bottom to top with `moveToBeginning()`.

7. **Implement one command at a time, test in AE, then proceed.** Never chain multiple ExtendScript commands in one task without a verification checkpoint.

8. **Polling must be paused during any ExtendScript write.** Check `isWriting` flag in `poller.js` before firing a poll tick.

9. **Canvas positions are persisted in dataLayer only** — never in dataWire, never passed as arguments
   to any ExtendScript lifecycle call (makeNodeAlive, makeNodeGhost, etc.).
   Position is written to dataLayer via writeDataLayer on every node move.
   Position is never sent to AE — AE has no concept of canvas position.

10. **Comp node is always alive.** It has no ghost state. Do not implement a ghost path for CompNode.

11. **`JSON` is not a native global in ExtendScript on AE 2025.** `typeof JSON === 'undefined'`. The polyfill `jsx/json.jsx` provides `JSON.stringify` and `JSON.parse`. It must be the **first** file prepended to the evalBridge preamble in `index.js`. Never call `JSON.stringify` or `JSON.parse` in any `.jsx` file without this polyfill being loaded first.

12. **`evalScript` callbacks only fire when AE has window focus.** After calling `evalBridge.evalScript(...)`, the returned Promise will not resolve/reject until AE is the foreground window. In manual testing, always click the AE window after triggering a call, then switch back to the browser console to read the result.

---

*Procedia v2 — Architecture Specification — May 2026*
*This document is the single source of truth for Claude Code. Any behavior not described here must be clarified before implementation.*
