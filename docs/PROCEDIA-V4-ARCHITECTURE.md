# Procedia v4 — Architecture Specification
*CEP · After Effects 2025+ · Windows · ExtendScript ES3*
*Authored: May 2026*

---

## 0. Core Philosophy

> **A node is a self-contained contract. The graph engine is a dumb executor. Adding a new node means writing one file — nothing else.**

- **One node = one file.** Identity, ports, lifecycle hooks, and AE commands all live in the node definition file. The engine reads it blindly and executes it. No routing switch-cases. No per-node conditionals in engine code.
- **Nodes never write ExtendScript.** A node returns a plain command object: `{ action: 'createTextLayer', params: {...} }`. A centralized ExtendScript dispatcher translates every named action into AE API calls.
- **The graph is always valid.** AE reflects only what is alive. `nodeMap` and `wireMap` are the in-session ledger. Persistence is written only on AE save, AE quit, and panel unload.
- **No apply button.** Structural changes (wire connect/disconnect, node drop/delete) are immediate and atomic. Property changes are debounced 300ms then flushed.
- **Panel JS is the source of truth** for graph topology, node state, and UI. AE is the source of truth for keyframes and comp data.
- **UUID is the only identifier.** Never use label, layer name, or comp name as an ID. UUIDs are stamped into AE object `.comment` fields.
- Procedia never auto-repairs a broken Reserved folder or comp. The user owns that responsibility entirely.

---

## 1. Node Taxonomy

### 1a. Node Kind

Every node definition declares a `nodeKind`. This is a type-level constant — never set per instance, never overridden at runtime. It is the engine's only signal for how to handle ghost cascade and AE cleanup.

| `nodeKind` | Definition | AE Presence | Examples |
|---|---|---|---|
| `affected` | Creates and owns a standalone AE layer. Layer moves between comps when alive. When ghosted, layer is parked in the Reserved Comp — keyframes survive natively. | Layer in hosting comp | TextNode, NullNode, ShapeNode, CompNode |
| `effector` | Modifies an existing layer owned by an affected node upstream. No standalone AE layer. When ghosted, modification is removed from the host layer; properties preserved in `nodeMap`. | Effect / mask / expression on host layer | FillEffectNode, GaussianBlurNode, ExpressionNode |
| `data` | Outputs a pure value. No AE layer, no AE presence of any kind. Drives extendable ports on other nodes. | None | ColorNode, NumberNode, Vector2Node |

**Key rule — effector ghosting:** An effector never removes itself from AE. The affected node's `onGhost` sequence strips all effector modifications from the layer before parking. Effectors set their own state to `ghost` and return their cleanup command — the engine batches and executes everything in the correct order.

**Key rule — CompNode exception:** CompNode is `affected` and `dedicated`. When dropped standalone (not wired into a parent comp), it is always alive immediately. When wired into a parent comp as a pre-comp layer, it follows the standard alive/ghost lifecycle — it can ghost if unwired from its hosting comp. Deleting a CompNode always goes directly to `onDelete` with no park step, regardless of state.

---

### 1b. Node Dedicated Flag

Some affected nodes require a presence in the AE **project panel** (a `CompItem` or `FootageItem`) in addition to existing as a layer. This is declared as `dedicated: true` in the node definition.

| Node | `dedicated` | AE Project Object |
|---|---|---|
| `CompNode` | `true` | `CompItem` |
| `SolidNode` | `true` | `FootageItem` (solid) |
| `FootageNode` | `true` | `FootageItem` |
| `TextNode` | `false` | — |
| `NullNode` | `true` | `FootageItem` (solid) |
| `ShapeNode` | `false` | — |
| `AdjustmentNode` | `false` | — |

**Creation order for `dedicated: true` nodes:**
1. Create the AE project object first
2. Add as a layer to the hosting comp second

Never reverse this order.

---

## 2. Node States

Every node has exactly one state at all times. State lives in `nodeMap` in panel JS. AE does not store state.

| State | Meaning | AE Layer Exists |
|---|---|---|
| `ghost` | In graph only. No AE presence (affected: parked in Reserved Comp). | No (parked) |
| `alive` | Connected to a comp downstream. AE object active in hosting comp. | Yes |
| `error` | Was alive. AE object no longer found by polling. | Broken |

### State Transition Table

```
onDrop      → ghost        Always. Exception: standalone CompNode (not wired to a parent comp) → alive immediately.
ghost       → alive        When a downstream comp path is established via wiring.
alive       → ghost        When the last downstream comp path is broken.
alive       → error        When polling detects the AE object is missing.
error       → alive        When user clicks [Re-create in AE].
error       → removed      When user clicks [Remove from Graph].
onDelete    → (onGhost first if alive and hosted) → removed from nodeMap entirely.
             Exception: standalone CompNode onDelete skips onGhost — no park step ever for CompNode.
```

---

## 3. Port System

Ports are the connection points on a node. v4 has three distinct port categories. Each category has its own position on the node body, its own wire type rules, and its own cascade behavior.

---

### 3a. Port Categories

| Category | Position on Node | Direction | Purpose |
|---|---|---|---|
| `input` | Left edge | Incoming | Receives layer or data wires from upstream nodes |
| `output` | Right edge | Outgoing | Sends layer or data wires to downstream nodes |
| `parent` | Top and bottom edge | Bidirectional | Declares AE parenting relationships only |

**Parent ports are never traversed by the cascade algorithm.** They carry only the `parent` wire type. Deleting a parent wire removes the AE `layer.parent` link silently — it never triggers ghost cascade.

---

### 3b. Port Declaration in Node Definition

Each port is declared as an object in the node's `ports` array:

```javascript
ports: [
  // --- Input ports ---
  { id: 'layer_in', category: 'input',  type: 'layer',  extendable: true,  required: true  },

  // --- Output port ---
  { id: 'output',   category: 'output', type: 'layer',  extendable: false },

  // --- Parent ports ---
  { id: 'child_of',   category: 'parent', role: 'child',  type: 'parent' },
  { id: 'parent_of',  category: 'parent', role: 'parent', type: 'parent' }
]
```

**Effector port rule — non-negotiable:**
Effector nodes (Fill, Blur, Drop Shadow, etc.) always follow this exact port pattern — no exceptions:

```javascript
ports: [
  // Main input: receives the AE layer to apply the effect to.
  // type is ALWAYS 'layer'. required: true.
  // Extendable: newborn slots accept data wires only — bound to effect params via picker.
  { id: 'layer_in', category: 'input',  type: 'layer', extendable: true, required: true },

  // Output: emits the SAME layer reference after the effect is applied.
  // type is ALWAYS 'layer'. This is not a new layer — it is the same layer passed through.
  { id: 'output',   category: 'output', type: 'layer', extendable: false }

  // Effectors have NO parent ports. They have no standalone AE layer and cannot participate
  // in AE layer parenting.
]
```

The output wire from an effector carries the same layer UUID as its input. The engine does not create a new layer — it passes the reference through so downstream nodes (including other effectors) can chain on it.

**Port field reference:**

| Field | Required | Values | Notes |
|---|---|---|---|
| `id` | Yes | string | Unique within the node. Snake_case. |
| `category` | Yes | `'input'` \| `'output'` \| `'parent'` | Determines position on node body |
| `type` | Yes | `'layer'` \| `'data'` \| `'parent'` | Wire type this port accepts or emits |
| `extendable` | Input only | `true` \| `false` | Whether the port can spawn new slots. Default: `false` |
| `required` | Input only | `true` \| `false` | If `true`, node cannot go alive without this port wired |
| `role` | Parent only | `'child'` \| `'parent'` | Whether this end of the wire is the child or the parent |

---

### 3c. Extendable Ports

A port declared with `extendable: true` follows these rules, enforced entirely by the graph engine:

**Spawning rule:** When all slots of an extendable port are occupied by a wire, one new empty slot is spawned automatically. There is always exactly one empty slot visible at all times.

**Removal rule:** When a wire is removed from an extendable slot and that slot is not the last remaining slot, the empty slot is removed. The minimum number of visible slots is one.

**Naming rule:** The engine names each slot by appending an index to the port `id`. Examples: `layer_in_0`, `layer_in_1`, `layer_in_2`. The node definition declares the port once — the engine manages the slot instances.

**Newborn slot wire acceptance:** A freshly spawned empty slot has no assigned param. It only accepts wires whose `data type` matches one of the types listed in the node's `params` entries. Incompatible wires are rejected by the engine before the picker is shown. When a compatible wire is dropped:
1. Engine checks the wire's data type against the node's param list
2. Engine filters the param list to only params whose type matches
3. A picker UI appears listing the filtered params
4. User selects a param → the slot is now permanently typed to that param
5. The wire source value drives that param — inspector shows the param as locked with a wire icon

**Main port rule:** The first `required: true` extendable input port is the main port. It always accepts its declared `type` without showing a picker. Only newborn non-required slots show the picker.

---

### 3d. Parent Ports

Every affected node that can participate in AE layer parenting declares both a `child_of` and a `parent_of` port. This includes CompNode.

- `child_of` port (top edge): Wiring this port to another node's `parent_of` port calls `layer.parent = targetLayer` in AE.
- `parent_of` port (bottom edge): Receives incoming `child_of` wires from child nodes.

**Rules:**
- A `parent` wire connects one `child_of` port to one `parent_of` port — always this direction, never reversed.
- A node can have one `child_of` connection (one parent) but unlimited `parent_of` connections (many children).
- If the parent node goes ghost, AE automatically clears the child's `layer.parent`. No explicit AE call needed — the layer park sequence handles it.
- If the child node goes ghost and is parked, the parked layer has no parent. When it returns to alive, `layer.parent` is re-applied from the wire data in `wireMap`.
- Ghost cascade never follows a `parent` wire. The cascade algorithm's traversal explicitly skips wires of type `'parent'`.

**Same-comp constraint:** A `parent` wire is only valid when both the child node and the parent node are alive in the same hosting comp. The wire validator must reject any parent wire where the two nodes do not share a `hostingComps` entry. This applies to all nodes including CompNode.

**CompNode as a pre-comp layer:** A CompNode can be wired into another CompNode's `layer_in` port using a standard `layer` wire — making it a pre-comp layer inside the hosting comp. When used this way, CompNode also has a `child_of` port and can declare a parent layer within its hosting comp. No parenting loop is allowed: the cycle checker must reject any parent wire that would create a circular parenting chain.

---

## 4. Node Definition Contract

Every node is a plain JS object registered with `nodeRegistry.register()`. These are all the required fields.

```javascript
var TextNode = {

  // --- Identity ---
  type:     'layers/text',       // Unique string. category/node-name in kebab-case.
  label:    'Text',              // Human-readable display name.
  category: 'Layers',           // Must match the folder name under categories/.
  version:  '1.0.0',

  // --- Classification ---
  nodeKind:  'affected',         // 'affected' | 'effector' | 'data'
  dedicated: false,              // true if node requires an AE project panel object

  // --- Ports ---
  ports: [
    { id: 'output',   category: 'output', type: 'layer',  extendable: false },
    { id: 'child_of', category: 'parent', role: 'child',  type: 'parent'   },
    { id: 'parent_of',category: 'parent', role: 'parent', type: 'parent'   }
  ],

  // --- Params ---
  // Defines the node's inspector fields AND the valid types for extendable port binding.
  params: [
    { key: 'label',    type: 'string', default: 'Text',     label: 'Label'    },
    { key: 'content',  type: 'string', default: 'New Text', label: 'Content'  },
    { key: 'fontSize', type: 'number', default: 72,         label: 'Font Size', min: 1, max: 999 },
    { key: 'color',    type: 'color',  default: [1,1,1,1],  label: 'Color'    },
    { key: 'position', type: 'vector2',default: [0, 0],     label: 'Position' },
    { key: 'rotation', type: 'number', default: 0,          label: 'Rotation' },
    { key: 'opacity',  type: 'number', default: 100,        label: 'Opacity',  min: 0, max: 100 }
  ],

  // --- Lifecycle Hooks ---
  // Each hook returns a command object (or null). The engine executes the command.
  // Never write ExtendScript here. Never call evalBridge here.

  onDrop: function(nodeData) {
    // Called when node is dropped onto the canvas. Return null for most nodes.
    // CompNode overrides this to return an onAlive command immediately.
    return null;
  },

  onAlive: function(nodeData, hostingCompUUID) {
    // Called when a downstream comp path is established.
    // Return a command object for the dispatcher to execute.
    return {
      action: 'createTextLayer',
      params: {
        compUUID:  hostingCompUUID,
        nodeUUID:  nodeData.id,
        content:   nodeData.props.content,
        fontSize:  nodeData.props.fontSize,
        color:     nodeData.props.color,
        position:  nodeData.props.position,
        rotation:  nodeData.props.rotation,
        opacity:   nodeData.props.opacity,
        label:     nodeData.props.label
      }
    };
  },

  onGhost: function(nodeData, hostingCompUUID) {
    // Called when the last downstream comp path is broken.
    // Return a command to park or clean up.
    return {
      action: 'parkLayer',
      params: {
        nodeUUID:       nodeData.id,
        hostingCompUUID: hostingCompUUID
      }
    };
  },

  onDelete: function(nodeData) {
    // Called when the node is deleted from the graph.
    // For affected nodes: layer is already parked (onGhost ran first). Delete the parked layer.
    return {
      action: 'deleteParkedLayer',
      params: { nodeUUID: nodeData.id }
    };
  },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID) {
    // Called by dirtyFlusher after 300ms debounce.
    // Return a command to update the live AE layer property.
    return {
      action: 'setLayerProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        key:             key,
        value:           value
      }
    };
  }

};

nodeRegistry.register(TextNode);
```

---

## 5. Centralized ExtendScript Dispatcher

The dispatcher is the **only** file that writes ExtendScript. It lives in `jsx/dispatcher.jsx`. It exports one entry point function: `dispatch(commandJSON)`.

The panel never writes ExtendScript strings. It calls `evalBridge.dispatch(commandObject)`, which serializes the command and passes it to `dispatcher.jsx`.

---

### 5a. Dispatcher Contract

```
Panel JS side:
  evalBridge.dispatch({ action: 'createTextLayer', params: { compUUID, nodeUUID, content, ... } })
  → returns Promise<{ ok, data, error }>

ExtendScript side (dispatcher.jsx):
  function dispatch(commandJSON) {
    var cmd = JSON.parse(commandJSON);
    var action = cmd.action;
    var params = cmd.params;
    // route to the correct handler by action name
    // return JSON.stringify({ ok, data, error })
  }
```

---

### 5b. Registered Actions

The dispatcher maintains a flat registry of named actions. Each action is a function that receives `params` and returns `{ ok, data, error }`.

| Action | What it does in AE |
|---|---|
| `createComp` | `app.project.items.addComp(...)` — creates a new comp |
| `createTextLayer` | `comp.layers.addText(...)` — creates a text layer |
| `createNullLayer` | `comp.layers.addNull(...)` — creates a null layer |
| `createShapeLayer` | `comp.layers.addShape(...)` — creates a shape layer |
| `createSolidLayer` | `app.project.items.addSolid(...)` then `comp.layers.add(...)` |
| `parkLayer` | Moves the layer from hosting comp to Reserved Comp |
| `unparkLayer` | Moves the layer from Reserved Comp to hosting comp |
| `deleteParkedLayer` | Removes the layer from Reserved Comp permanently |
| `deleteComp` | Deletes the `CompItem` from the project panel |
| `applyEffect` | `layer.Effects.addProperty(matchName)` |
| `removeEffect` | Finds effect by match name and removes it |
| `setLayerProperty` | Navigates property hierarchy by match name and sets value |
| `setLayerParent` | `childLayer.parent = parentLayer` |
| `clearLayerParent` | `childLayer.parent = null` |
| `setLayerOrder` | Reorders layers in comp using `moveToBeginning()` |
| `renameNode` | Sets `layer.name` to match the node's label param |
| `focusComp` | `app.project.activeItem = comp` — brings comp into view |

**Adding a new action:** Add one named function to `dispatcher.jsx`. No other file changes. Node files that need the action simply return `{ action: 'newActionName', params: {...} }`.

---

### 5c. Batch Dispatch

When the ghost cascade algorithm ghosts multiple nodes in sequence, the engine collects all returned command objects into an array and sends a single bridge call: `evalBridge.dispatchBatch(commandArray)`. The dispatcher processes the array in order and returns a single `{ ok, data, error }` response.

This means: one wire deletion = one bridge crossing, regardless of how deep the cascade is.

---

## 6. Graph Engine — Responsibilities

The engine is intentionally dumb. It knows nothing about individual node types. It only knows the rules of the system.

**What the engine does:**
- Maintains `nodeMap` and `wireMap` as the in-session ledger
- Calls the correct lifecycle hook on the correct node definition based on state transitions
- Traverses the graph to determine alive/ghost state changes
- Manages extendable port slot spawning and removal
- Enforces wire type compatibility before allowing connections
- Sends command objects from lifecycle hooks to `evalBridge.dispatch()`
- Manages the dirty flag and debounce timer for property changes

**What the engine never does:**
- Knows the name or type of any specific node
- Contains a switch-case or if-else branching on node type
- Calls AE APIs directly
- Writes ExtendScript strings

---

## 7. Ghost Cascade Algorithm

The cascade algorithm runs whenever a wire is deleted. It determines which nodes transition from `alive` to `ghost` as a result.

### 7a. Trigger

Wire deletion is the only cascade trigger. Data wire deletions and parent wire deletions never trigger cascade. Only `layer` wire deletions trigger it.

### 7b. Algorithm — Step by Step

```
cascadeGhost(deletedWireId):

1. Identify the source node of the deleted wire (the node whose output port the wire left).

2. Call hasCompDownstream(sourceNodeId):
   — Traverse all output wires from sourceNode
   — Skip any wire of type 'parent' or 'data' — never traverse these
   — Collect all CompNode UUIDs reachable by following only 'layer' wires downstream
   — If the result list is non-empty: sourceNode is still alive in those comps → STOP
   — If the result list is empty: sourceNode has no comp path → proceed to step 3

3. Collect all nodes in the cascade set:
   — Start with sourceNode
   — Traverse upstream from sourceNode following only 'layer' wires
   — Add every node encountered to the cascade set
   — For each node in cascade set: also add any effector nodes wired into its input ports
   — Never add CompNodes to the cascade set (they are always alive)
   — Never traverse 'parent' or 'data' wires during this traversal

4. Order the cascade set: effectors first (outermost to innermost), affected nodes last.
   This ensures effects are removed from a layer before the layer is parked.

5. For each node in the ordered cascade set:
   — Call node.onGhost(nodeData, hostingCompUUID) → receives a command object
   — Collect all command objects into a batch array
   — Update node state to 'ghost' in nodeMap
   — Update hostingComps list in nodeMap

6. Call evalBridge.dispatchBatch(batchArray) — one bridge crossing for the entire cascade.

7. Rebuild tempGraph from nodeMap + wireMap.

8. Schedule persistence write (debounced — will fire on next save trigger).
```

### 7c. Multi-Comp Rule

A node can be alive in multiple comps simultaneously. `nodeMap[uuid].hostingComps` is an array of comp UUIDs.

When a wire is deleted:
- `hasCompDownstream()` checks ALL remaining output wires, not just the deleted one
- If the node is still reachable from any other comp path, it stays alive
- Only when `hostingComps` becomes empty does the node call `onGhost`
- `onGhost` is called once per hosting comp being vacated, with that comp's UUID

### 7d. Cycle Prevention

Before confirming any wire from Node A output → Node B input:
1. Starting from Node B, traverse all downstream layer wires
2. If Node A is encountered → cycle detected → reject the wire silently
3. If Node A is not found → wire is valid → confirm

---

## 8. Data Model

### 8a. `nodeMap` — In-Session Source of Truth

Lives in `graphState.js`. Only `graphState.js` mutates it.

```javascript
var nodeMap = {
  'PROC-aaa': {
    id:          'PROC-aaa',
    type:        'layers/text',
    nodeKind:    'affected',
    dedicated:   false,
    state:       'alive',          // 'ghost' | 'alive' | 'error'
    dirty:       false,
    x:           120,              // canvas position
    y:           240,
    props: {
      label:    'My Text',
      content:  'Hello',
      fontSize: 72,
      color:    [1, 1, 1, 1],
      position: [0, 0],
      rotation: 0,
      opacity:  100
    },
    hostingComps: ['PROC-ccc'],    // UUIDs of comps this node is currently alive in
    // Port slot state — managed by engine, not by node definition
    portSlots: {
      'layer_in': 0               // current slot count for extendable ports
    }
  }
};
```

### 8b. `wireMap` — In-Session Wire Ledger

```javascript
var wireMap = {
  'WIRE-xxx': {
    id:       'WIRE-xxx',
    type:     'layer',             // 'layer' | 'data' | 'parent'
    fromNode: 'PROC-aaa',
    fromPort: 'output',
    toNode:   'PROC-bbb',
    toPort:   'layer_in_0',        // slot-indexed for extendable ports
    // For data wires targeting an extendable param slot:
    boundParam: null               // null | param key string (e.g. 'fontSize')
  }
};
```

### 8c. `tempGraph` — In-Memory JSON Mirror

Rebuilt from `nodeMap` + `wireMap` on every structural change. Never written to AE during a session. Used as the source for persistence writes.

```javascript
var tempGraph = {
  version: '4.0',
  nodes: { /* nodeMap contents, minus runtime-only fields */ },
  wires: { /* wireMap contents */ }
};
```

---

## 9. Persistence

Written to AE only on three events: **AE save**, **AE quit**, **panel unload**.

Two text layers in the Reserved Comp store the serialized graph:
- `__PROCEDIA_NODES__` — serialized `tempGraph.nodes`
- `__PROCEDIA_WIRES__` — serialized `tempGraph.wires`

**Read sequence on panel open:**
1. Find Reserved Comp — if missing, create it
2. Read `__PROCEDIA_NODES__` and `__PROCEDIA_WIRES__` text layer contents
3. Parse JSON — if parse fails, start with an empty graph and notify the user
4. Rebuild `nodeMap` and `wireMap` from the parsed data
5. Rebuild `tempGraph`
6. Poll all alive nodes to verify their AE objects still exist
7. For any node whose AE object is missing: set state to `error`

**Chunking:** If the serialized string exceeds the AE text layer character limit, split into `__PROCEDIA_NODES_1__`, `__PROCEDIA_NODES_2__`, etc. The reader concatenates chunks before parsing.

---

## 10. Property Changes — Dirty Flush

Property changes (inspector edits) are never structural. They do not rebuild `tempGraph` or trigger cascade. They are handled independently.

1. Inspector fires `graphState.updateProp(uuid, key, value)`
2. `graphState` updates `nodeMap[uuid].props[key]` and sets `nodeMap[uuid].dirty = true`
3. `dirtyFlusher` debounces 300ms, then for each dirty node:
   - Calls `node.onPropertyChange(key, value, nodeData, hostingCompUUID)` → command object
   - Calls `evalBridge.dispatch(command)`
   - Sets `nodeMap[uuid].dirty = false`
4. Dirty flush does **not** write to `__PROCEDIA_NODES__`. Persistence is separate.

---

## 11. Reserved Comp

A special comp created by Procedia: `"DO NOT DELETE — Procedia Reserved"`, stored in a folder of the same name.

**Rules:**
- The graph engine never sees the Reserved Comp when traversing project items. All comp-traversal loops must skip any comp whose name starts with `"DO NOT DELETE"`.
- Parked layers live here. Their keyframes are preserved natively in AE.
- The Reserved Comp is never shown in the Procedia node graph — it is invisible to the user.
- Procedia never auto-repairs a deleted Reserved Comp. The user is warned on next panel open.

---

## 12. Polling

The poller runs on a tick: 1 second when panel is active, 5 seconds when idle.

On each tick, `pollAliveNodes(uuidList)` is called — a single ExtendScript execution that checks all alive node UUIDs in one bridge crossing.

For each UUID in the list:
- Find the AE object by UUID (via `.comment` field)
- If the object exists: check for property changes the user made directly in AE (name, comp dimensions, etc.) and sync back to `nodeMap`
- If the object is missing: mark the node `error` in `nodeMap`, show notification

**Polling pauses during any write.** `isWriting = true` is set before any `evalBridge.dispatch()` call. `isWriting = false` is set in the callback. The poller checks this flag before every tick and skips if true.

---

## 13. File Structure

```
procedia/
│
├── index.html                        # Script load order. Single source of load truth.
├── index.js                          # Panel entry point. Depends on everything.
│
├── graph/
│   ├── graphState.js                 # nodeMap, wireMap, tempGraph. ONLY mutator.
│   │                                 # Exposes: addNode, removeNode, updateNode,
│   │                                 # addWire, removeWire, updateProp, rebuildTempGraph
│   ├── nodeRegistry.js               # register(def), getDefinition(type), getAll(),
│   │                                 # getByCategory(cat), listTypes()
│   ├── engine.js                     # Dumb executor. Reads node definitions, calls hooks,
│   │                                 # dispatches commands, manages port slots, cascade trigger.
│   │                                 # No node-type conditionals. No AE calls.
│   ├── cascadeAlgorithm.js           # cascadeGhost(), hasCompDownstream(),
│   │                                 # collectCascadeSet(), orderCascadeSet()
│   ├── cycleChecker.js               # hasCycle(fromNodeId, toNodeId) — pure graph traversal
│   ├── portManager.js                # Extendable port slot lifecycle. spawnSlot(),
│   │                                 # removeSlot(), resolveSlotName(), getOpenSlot()
│   ├── wireValidator.js              # Wire type compatibility checks before connection.
│   │                                 # Rejects incompatible types. Filters picker list.
│   │
│   ├── nodes/
│   │   ├── nodeRegistry.js           # (see above)
│   │   └── categories/
│   │       ├── core/
│   │       │   └── Comp.js           # CompNode — nodeKind: 'affected', dedicated: true
│   │       ├── layers/
│   │       │   ├── Text.js           # TextNode
│   │       │   ├── Null.js           # NullNode
│   │       │   ├── Shape.js          # ShapeNode
│   │       │   └── Adjustment.js     # AdjustmentNode
│   │       ├── effects/              # FillEffectNode, GaussianBlurNode, etc.
│   │       ├── data/                 # ColorNode, NumberNode, Vector2Node
│   │       └── utility/
│   │
│   ├── canvas/
│   │   ├── viewport.js               # Pan, zoom, coordinate transform
│   │   ├── renderer.js               # Draw loop — nodes, wires, grid
│   │   ├── input.js                  # Mouse events
│   │   └── minimap.js
│   │
│   └── wire/
│       ├── wire.js                   # Wire drag, commit, delete — calls engine and cascadeAlgorithm
│       └── wireRenderer.js           # Bezier wire drawing. Color-coded by wire type.
│
├── ui/
│   ├── nodeList.js                   # Node palette — category collapse, search, drag-to-canvas
│   ├── drag.js                       # onDrop handler — calls engine.dropNode()
│   ├── inspector.js                  # Inspector panel — renders params for selected node
│   ├── layerOrderList.js             # Drag-to-reorder for CompNode layer stacking
│   └── keyboard.js                   # Delete/Backspace shortcuts
│
├── flush/
│   └── dirtyFlusher.js               # Dirty flag, 300ms debounce, flushDirtyNodes()
│
├── polling/
│   └── poller.js                     # Adaptive polling, isWriting flag
│
├── notifications/
│   └── notificationBar.js            # Panel-level notification bar — error state UI
│
├── bridge/
│   └── evalBridge.js                 # ONLY file that calls csInterface.evalScript().
│                                     # Exposes: dispatch(commandObj), dispatchBatch(commandArr)
│                                     # Promise-based. Always JSON.parse.
│
├── data/
│   └── uuidGenerator.js              # PROC-{timestamp}-{rand4} / WIRE-{timestamp}-{rand4}
│
└── jsx/
    ├── json.jsx                      # JSON polyfill — MUST be first in evalBridge preamble
    ├── utils.jsx                     # findCompByUUID, findLayerByUUID, findReservedComp
    ├── persistence.jsx               # readGraph, writeGraph, chunking logic
    ├── polling.jsx                   # pollAliveNodes — single multi-UUID check
    └── dispatcher.jsx                # THE ONLY EXTENDSCRIPT WRITER.
                                      # dispatch(commandJSON) → routes to named action handlers.
                                      # dispatchBatch(commandArrayJSON) → processes array in order.
                                      # All action handlers live here: createTextLayer,
                                      # createNullLayer, createComp, parkLayer, unparkLayer,
                                      # deleteParkedLayer, deleteComp, applyEffect, removeEffect,
                                      # setLayerProperty, setLayerParent, clearLayerParent,
                                      # setLayerOrder, renameNode, focusComp
```

---

## 14. Wire Types and Visual Language

| Wire Type | Color | What It Carries | Triggers Cascade |
|---|---|---|---|
| `layer` | Blue | AE layer reference — the core connection between nodes | Yes |
| `data` | Yellow | Pure value (color, number, vector) — drives locked params | No |
| `parent` | Green | AE parenting relationship — `layer.parent` only | No |

---

## 15. Critical Rules for Claude Code

1. **ExtendScript is ES3 strict.** No `const`, `let`, arrow functions, template literals, `forEach`, destructuring, spread, or default parameters. Use `var`, named functions, string concatenation, and `for` loops exclusively.

2. **Every `.jsx` function returns `JSON.stringify({ ok, data, error })`.** No exceptions. Panel JS always checks `res.ok` before using `res.data`.

3. **`evalBridge.js` is the only door to AE.** Never call `csInterface.evalScript()` from any other file.

4. **`graphState.js` is the only file that mutates `nodeMap` and `wireMap`.** All other files call into it. Never mutate node or wire state from outside `graphState.js`.

5. **`jsx/dispatcher.jsx` is the only file that writes AE API calls.** Nodes return command objects. The engine passes them to `evalBridge`. `evalBridge` sends them to `dispatcher.jsx`. Nothing else touches AE.

6. **Node definitions never call `evalBridge`.** A lifecycle hook returns a command object or `null`. It never resolves a Promise or calls `evalBridge` directly.

7. **`engine.js` contains zero node-type conditionals.** No `if (node.type === 'CompNode')`, no `switch(nodeKind)`. All type-specific behavior lives in the node definition. The engine calls hooks by name only.

8. **Ghost cascade never traverses `parent` or `data` wires.** `cascadeAlgorithm.js` skips any wire whose `type` is not `'layer'` during traversal.

9. **`nodeKind` is set on the node definition, never on the instance.** It is a type-level constant.

10. **UUID is the only identifier in AE.** Stored in `layer.comment` and `comp.comment`. Never use display names.

11. **Cascade order is non-negotiable.** Effectors ghost first (outermost to innermost). Affected nodes park last. An affected node is never parked before all its effectors are stripped.

12. **Persistence writes happen only on three events:** AE save, AE quit, panel unload.

13. **Polling pauses during writes.** `isWriting = true` before any `evalBridge.dispatch()`. `isWriting = false` in the callback. Poller skips if `isWriting` is true.

14. **`JSON` is not native in ExtendScript.** `jsx/json.jsx` must be the first file in the `evalBridge` preamble. Never call `JSON.stringify` or `JSON.parse` in any `.jsx` without this polyfill loaded.

15. **One file per node. One node per file.** The node definition is the complete specification of the node. If adding a new node requires editing `engine.js`, `cascadeAlgorithm.js`, or `dispatcher.jsx` — stop and reconsider the design.

    Exception: if a new node needs a new **action** that doesn't exist in `dispatcher.jsx`, add the action handler there. This is the only acceptable reason to edit `dispatcher.jsx` when adding a node.

16. **`evalScript` callbacks only fire when AE has window focus.** In testing: trigger the call, click the AE window, then switch back to the browser console to see the result.

17. **Layer stacking in AE is 1-based. `layerOrder` in panel is 0-based.** Index 0 = AE layer 1 (top). Reorder using `moveToBeginning()` from bottom to top.

---

*Procedia v4 — Architecture Specification — May 2026*
*This document is the single source of truth for Claude Code and for the developer.*
*Any behavior not described here must be clarified before implementation begins.*
