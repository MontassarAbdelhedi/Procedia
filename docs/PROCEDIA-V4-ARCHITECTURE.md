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
- **Path-driven layer identity.** Each path from an affected source node through zero or more effectors into a CompNode produces exactly one AE layer. The layer's `.comment` in AE is the **terminal wire UUID** — never the node UUID. One node can have multiple downstream paths, each producing a separate AE layer.
- **UUID is the only identifier.** Never use label, layer name, or comp name as an ID. Comp UUIDs are stamped into `comp.comment`. Layer identity uses the terminal wire UUID stamped into `layer.comment`.
- Procedia never auto-repairs a broken Reserved folder or comp. The user owns that responsibility entirely.

---

## 1. Node Taxonomy

### 1a. Node Kind

Every node definition declares a `nodeKind`. This is a type-level constant — never set per instance, never overridden at runtime.

| `nodeKind` | Definition | AE Presence | Always Alive | Examples |
|---|---|---|---|---|
| `affected` | Creates and owns a standalone AE layer. Layer moves between comps when alive. When ghosted, layer is parked in the Reserved Comp — keyframes survive natively. | Layer in hosting comp | No | TextNode, NullNode, ShapeNode, AdjustmentNode, CompNode |
| `effector` | Modifies an existing layer owned by an affected node upstream. No standalone AE layer. When ghosted, modification is removed from the host layer; properties preserved in `nodeMap`. Lifecycle hooks receive a 3rd argument `upstreamNodeUUID` (the terminal wire UUID). | Effect / mask / expression on host layer | No | FillEffectNode, GaussianBlurNode, DropShadowNode |
| `data` | Outputs a pure value. No AE layer, no AE presence of any kind. Drives extendable param slots on downstream nodes via data wires. Set to `alive` immediately on drop. All lifecycle hooks return `null`. | None | **Yes** | ColorNode, NumberNode |

**Key rule — effector ghosting:** An effector never removes itself from AE independently. The affected node's `onGhost` sequence strips all effector modifications from the layer before parking. Effectors set their own state to `ghost` and return their cleanup command — the engine batches and executes everything in the correct order.

**Key rule — data node lifecycle:** Data nodes skip the ghost/alive cycle entirely. They are `alive` from drop until delete. They have no `hostingComps`. Connecting a data wire to a downstream effector marks that effector dirty and schedules a flush — the flusher then pushes the data value to AE.

**Key rule — CompNode exception:** CompNode is `affected` and `dedicated`. When dropped standalone (not wired into a parent comp), it is always alive immediately. When wired into a parent comp as a pre-comp layer, it follows the standard alive/ghost lifecycle. Deleting a CompNode always goes directly to `onDelete` with no park step, regardless of state.

---

### 1b. Node Dedicated Flag

Some affected nodes require a presence in the AE **project panel** (a `CompItem` or `FootageItem`) in addition to existing as a layer.

| Node | `dedicated` | AE Project Object |
|---|---|---|
| `CompNode` | `true` | `CompItem` |
| `NullNode` | `true` | `FootageItem` (solid) |
| `TextNode` | `false` | — |
| `ShapeNode` | `false` | — |
| `AdjustmentNode` | `false` | — |
| `FillEffectNode` | `false` | — |
| `GaussianBlurNode` | `false` | — |
| `DropShadowNode` | `false` | — |
| `ColorNode` | `false` | — |
| `NumberNode` | `false` | — |

**Creation order for `dedicated: true` nodes:**
1. Create the AE project object first
2. Add as a layer to the hosting comp second

Never reverse this order.

---

## 2. Node States

Every node has exactly one state at all times. State lives in `nodeMap` in panel JS. AE does not store state. Data nodes are always `alive` and never transition to `ghost`.

| State | Meaning | AE Layer Exists |
|---|---|---|
| `ghost` | In graph only. No AE presence (affected: parked in Reserved Comp). | No (parked) |
| `alive` | Connected to a comp downstream (or is a data node). AE object active in hosting comp. | Yes |
| `error` | Was alive. AE object no longer found by polling. | Broken |

### State Transition Table

```
onDrop      → ghost        Always. Exceptions:
                             - Standalone CompNode (not wired to a parent comp) → alive immediately.
                             - Data node → alive immediately (no AE dependency).
ghost       → alive        When a downstream comp path is established via wiring.
alive       → ghost        When the last downstream comp path is broken.
alive       → error        When polling detects the AE object is missing.
error       → alive        When user clicks [Re-create in AE].
error       → removed      When user clicks [Remove from Graph].
onDelete    → (onGhost first if alive and hosted) → removed from nodeMap entirely.
             Exception: standalone CompNode onDelete skips onGhost — no park step ever for CompNode.
             Exception: data nodes delete directly — no ghost step, no AE cleanup.
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

  // --- Parent ports (affected nodes only) ---
  { id: 'child_of',   category: 'parent', role: 'child',  type: 'parent' },
  { id: 'parent_of',  category: 'parent', role: 'parent', type: 'parent' }
]
```

**Effector port rule — non-negotiable:**
Effector nodes (Fill, Blur, Drop Shadow, etc.) always follow this exact port pattern — no exceptions:

```javascript
ports: [
  { id: 'layer_in', category: 'input',  type: 'layer', extendable: true, required: true },
  { id: 'output',   category: 'output', type: 'layer', extendable: false }
  // Effectors have NO parent ports.
]
```

The output wire from an effector carries the same layer UUID as its input. The engine does not create a new layer — it passes the terminal wire UUID through so downstream nodes can chain on it.

**Data node port rule:**
Data nodes have only one output port. They have no input ports and no parent ports.

```javascript
ports: [
  { id: 'output', category: 'output', type: 'data', extendable: false }
]
```

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

Every affected node that can participate in AE layer parenting declares both a `child_of` and a `parent_of` port. This includes CompNode. Effector nodes and data nodes do not have parent ports.

- `child_of` port (top edge): Wiring this port to another node's `parent_of` port calls `layer.parent = targetLayer` in AE.
- `parent_of` port (bottom edge): Receives incoming `child_of` wires from child nodes.

**Rules:**
- A `parent` wire connects one `child_of` port to one `parent_of` port — always this direction, never reversed.
- A node can have one `child_of` connection (one parent) but unlimited `parent_of` connections (many children).
- Ghost cascade never follows a `parent` wire. The cascade algorithm's traversal explicitly skips wires of type `'parent'`.

---

## 4. Node Definition Contract

Every node is a plain JS object registered with `nodeRegistry.register()`. These are all the required fields.

**Affected node example (TextNode):**
```javascript
var TextNode = {
  type:     'layers/text',
  label:    'Text',
  category: 'Layers',
  version:  '1.0.0',
  nodeKind:  'affected',
  dedicated: false,

  ports: [
    { id: 'output',    category: 'output', type: 'layer',  extendable: false },
    { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'   },
    { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'   }
  ],

  params: [
    { key: 'label',    type: 'string', default: 'Text',     label: 'Label'    },
    { key: 'content',  type: 'string', default: 'New Text', label: 'Content'  },
    { key: 'fontSize', type: 'number', default: 72,         label: 'Font Size', min: 1, max: 999 },
    { key: 'color',    type: 'color',  default: [1,1,1,1],  label: 'Color'    },
    { key: 'position', type: 'vector2',default: [0, 0],     label: 'Position' },
    { key: 'rotation', type: 'number', default: 0,          label: 'Rotation' },
    { key: 'opacity',  type: 'number', default: 100,        label: 'Opacity',  min: 0, max: 100 }
  ],

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID) {
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
        // Note: engine automatically injects params.layerUUID = terminalWireId
      }
    };
  },

  onGhost: function(nodeData, hostingCompUUID) {
    return {
      action: 'parkLayer',
      params: { nodeUUID: nodeData.id, hostingCompUUID: hostingCompUUID }
    };
  },

  onDelete: function(nodeData) {
    return {
      action: 'deleteParkedLayer',
      params: { nodeUUID: nodeData.id }
    };
  },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID) {
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

**Effector node example (FillEffectNode):**
Effector hooks receive `upstreamNodeUUID` as a 3rd argument — the terminal wire UUID used to find the correct AE layer.

```javascript
onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
  return {
    action: 'applyEffect',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: hostingCompUUID,
      layerNodeUUID:   upstreamNodeUUID,  // ← terminal wire UUID
      matchName:       'ADBE Fill',
      props: { color: nodeData.props.color, opacity: nodeData.props.opacity }
    }
  };
},

onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
  return {
    action: 'removeEffect',
    params: { nodeUUID: nodeData.id, hostingCompUUID: hostingCompUUID, layerNodeUUID: upstreamNodeUUID }
  };
},

onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
  return {
    action: 'setEffectProperty',
    params: {
      nodeUUID: nodeData.id, hostingCompUUID: hostingCompUUID,
      layerNodeUUID: upstreamNodeUUID, matchName: 'ADBE Fill',
      key: key, value: value
    }
  };
}
```

**Data node example (ColorNode):**
All hooks return `null`. The node is always alive.

```javascript
var ColorNode = {
  type: 'data/color', label: 'Color', category: 'Data', version: '1.0.0',
  nodeKind: 'data', dedicated: false,
  ports: [{ id: 'output', category: 'output', type: 'data', extendable: false }],
  params: [
    { key: 'label', type: 'string', default: 'Color',      label: 'Label' },
    { key: 'color', type: 'color',  default: [1, 1, 1, 1], label: 'Color' }
  ],
  onDrop:           function(nodeData)                              { return null; },
  onAlive:          function(nodeData, hostingCompUUID)             { return null; },
  onGhost:          function(nodeData, hostingCompUUID)             { return null; },
  onDelete:         function(nodeData)                              { return null; },
  onPropertyChange: function(key, value, nodeData, hostingCompUUID) { return null; }
};
nodeRegistry.register(ColorNode);
```

---

## 5. Centralized ExtendScript Dispatcher

The dispatcher is the **only** file that writes ExtendScript. It lives in `jsx/dispatcher/dispatcher.jsx`. It exports two entry point functions: `dispatch(commandJSON)` and `dispatchBatch(commandArrayJSON)`.

---

### 5a. Dispatcher Contract

```
Panel JS side:
  evalBridge.dispatch({ action: 'createTextLayer', params: { compUUID, nodeUUID, ... } })
  → returns Promise<{ ok, data, error }>

ExtendScript side (dispatcher.jsx):
  function dispatch(commandJSON) {
    var cmd = JSON.parse(commandJSON);
    var action = cmd.action;
    var params = cmd.params;
    return JSON.stringify(_route(action, params));
  }
```

---

### 5b. Registered Actions

| Action | What it does in AE |
|---|---|
| `createComp` | Creates a new `CompItem` in the Procedia project folder |
| `createTextLayer` | `comp.layers.addText(...)` — creates a text layer |
| `createNullLayer` | `comp.layers.addNull(...)` — creates a null layer |
| `createShapeLayer` | `comp.layers.addShape(...)` — creates a shape layer |
| `createAdjustmentLayer` | Creates a shape layer with adjustment layer flag enabled |
| `addCompAsLayer` | Adds an existing `CompItem` as a pre-comp layer in the hosting comp |
| `parkLayer` | Moves the layer from hosting comp to Reserved Comp |
| `unparkLayer` | Moves the layer from Reserved Comp to hosting comp; re-stamps `layer.comment` |
| `deleteParkedLayer` | Removes the layer from Reserved Comp permanently |
| `deletePathLayer` | Removes a layer from the hosting comp identified by path UUID |
| `deleteComp` | Deletes the `CompItem` from the project panel |
| `setLayerProperty` | Navigates property hierarchy by match name and sets value |
| `setCompProperty` | Sets comp-level properties (dimensions, fps, duration, bg color) |
| `setLayerParent` | `childLayer.parent = parentLayer` |
| `clearLayerParent` | `childLayer.parent = null` |
| `setLayerOrder` | Reorders layers in comp using `moveToBeginning()` |
| `renameNode` | Sets `layer.name` to match the node's label param |
| `focusComp` | `app.project.activeItem = comp` — brings comp into view |
| `applyEffect` | `layer.Effects.addProperty(matchName)` then sets initial prop values |
| `removeEffect` | Finds effect by match name and removes it from the layer |
| `setEffectProperty` | Sets a named property on an existing effect by match name |
| `restampLayer` | Re-stamps `layer.comment` with a new UUID (used during wire transplant) |
| `pollAliveNodes` | Single multi-UUID check — returns missing and present UUIDs |

**Adding a new action:** Add one named function to `dispatcher.jsx`. Register it in `_route()`. No other file changes required unless the new node itself needs a new action.

---

### 5c. Batch Dispatch

When the ghost cascade algorithm ghosts multiple nodes in sequence, the engine collects all returned command objects into an array and sends a single bridge call: `evalBridge.dispatchBatch(commandArray)`. The dispatcher processes the array in order and returns a single `{ ok, data, error }` response.

This means: one wire deletion = one bridge crossing, regardless of how deep the cascade is.

---

## 6. Graph Engine — Responsibilities

The engine is intentionally dumb. It knows nothing about individual node types. It only knows the rules of the system.

**What the engine does:**
- Maintains `nodeMap` and `wireMap` as the in-session ledger (via `graphState`)
- Calls the correct lifecycle hook on the correct node definition based on state transitions
- Traverses the graph to determine alive/ghost state changes
- Manages extendable port slot spawning and removal
- Enforces wire type compatibility before allowing connections
- Stamps `_pathLayerUUID` on terminal wires when a path is activated
- After stamping `_pathLayerUUID`, checks for dirty nodes in the new path and calls `dirtyFlusher.flush()` if any are dirty — ensuring data wires connected before the path existed take effect immediately
- Sends command objects from lifecycle hooks to `evalBridge.dispatch()` or `evalBridge.dispatchBatch()`
- Manages the dirty flag and debounce timer for property changes
- Supports wire-insertion: dropping a node onto an active wire performs a graph-only wire removal + `_transplantLayerUUID` stamp, then re-wires through the new node, then `_firePathCreation` issues a `restampLayer` instead of a full park/unpark round-trip

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

### 7b. `_pathLayerUUID` — Path Activity Flag

Every terminal wire (`toNode` is a CompNode) has a `_pathLayerUUID` field in `wireMap`.

- **Active path:** `_pathLayerUUID === wireId` — the AE layer exists and is identified by this UUID
- **Dormant path:** `_pathLayerUUID === null` — the path definition exists in the graph but has no live AE layer (intermediate node was removed, breaking the source chain)

`hasCompDownstream()` only counts terminal wires with a non-null `_pathLayerUUID` as live paths. This prevents cascade from treating dormant paths as active comp connections.

### 7c. Algorithm — Step by Step

```
cascadeGhost(deletedWireId):

1. Identify the source node of the deleted wire (the node whose output port the wire left).

2. Call hasCompDownstream(sourceNodeId, excludeDeletedWireId):
   — Traverse all output wires from sourceNode (excluding the deleted wire)
   — Skip any wire of type 'parent' or 'data'
   — Only count terminal wires whose _pathLayerUUID is non-null
   — If any comp is still reachable: sourceNode is still alive → STOP
   — If no comp is reachable: sourceNode has no live comp path → proceed to step 3

3. Collect all nodes in the cascade set:
   — Start with sourceNode
   — Traverse upstream from sourceNode following only 'layer' wires
   — Add every node encountered to the cascade set
   — For each node in cascade set: also add any effector nodes wired into its input ports
   — Never add CompNodes to the cascade set (they are always alive)
   — Never add data nodes to the cascade set (they are always alive)
   — Never traverse 'parent' or 'data' wires during this traversal

4. Order the cascade set: effectors first (outermost to innermost), affected nodes last.
   This ensures effects are removed from a layer before the layer is parked.

5. For each node in the ordered cascade set:
   — Call node.onGhost(nodeData, hostingCompUUID[, upstreamNodeUUID]) → receives a command object
   — Collect all command objects into a batch array
   — Update node state to 'ghost' in nodeMap
   — Update hostingComps list in nodeMap

6. Call evalBridge.dispatchBatch(batchArray) — one bridge crossing for the entire cascade.

7. Rebuild tempGraph from nodeMap + wireMap.

8. Schedule persistence write (debounced — will fire on next save trigger).
```

### 7d. Dormant Terminal Wires

When a non-terminal wire is deleted and the source chain for a terminal wire is broken:
- The terminal wire's `_pathLayerUUID` is cleared to `null` (dormant)
- The AE layer is NOT removed — it remains in the hosting comp
- When the upstream chain is later reconnected, `_activateDormantTerminalWiresDownstream` detects the dormant terminal wire and calls `_firePathCreation`
- `_firePathCreation` re-stamps `_pathLayerUUID` and issues `unparkLayer` or `restampLayer` (not a fresh `onAlive`) to reconnect the existing layer

### 7e. Multi-Comp Rule

A node can be alive in multiple comps simultaneously. `nodeMap[uuid].hostingComps` is an array of comp UUIDs.

When a wire is deleted:
- `hasCompDownstream()` checks ALL remaining output wires, not just the deleted one
- If the node is still reachable from any other comp path, it stays alive
- Only when all live comp paths are gone does the node call `onGhost`

### 7f. Cycle Prevention

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
    hostingComps:   ['PROC-ccc'], // UUIDs of comps this node is currently alive in
    hasParkedLayer: false,        // true when the node is ghost and its layer is in Reserved Comp
    // portSlots — managed by engine, not by node definition
    portSlots: {
      'layer_in': 1              // current slot count for extendable ports
    }
    // _transplantLayerUUID — transient engine field, set during wire-insertion.
    // Non-null means: on next _firePathCreation for this node, issue 'restampLayer'
    // instead of 'onAlive', then clear this field. Not persisted.
  }
};
```

**`hasParkedLayer`:** Set to `true` when the node transitions to `ghost` and its layer is moved to the Reserved Comp. Set back to `false` when the layer is unparked (node goes alive again). The engine uses this to decide between `unparkLayer` and a fresh `onAlive` call when a ghost node reconnects.

**`_transplantLayerUUID`:** Transient field, never persisted. Set by `drag.js` during wire-insertion to carry the old path UUID across the graph-only wire removal. Cleared by `_firePathCreation` immediately after issuing `restampLayer`.

### 8b. `wireMap` — In-Session Wire Ledger

```javascript
var wireMap = {
  'WIRE-xxx': {
    id:       'WIRE-xxx',
    type:     'layer',            // 'layer' | 'data' | 'parent'
    fromNode: 'PROC-aaa',
    fromPort: 'output',
    toNode:   'PROC-bbb',
    toPort:   'layer_in_0',       // slot-indexed for extendable ports
    boundParam: null,             // null | param key string (e.g. 'color') — data wires only

    // Terminal-wire-only field (toNode is a CompNode):
    _pathLayerUUID: 'WIRE-xxx'   // Non-null = active path. null = dormant path.
                                 // When active, equals the wire's own id.
                                 // This UUID is stamped into AE layer.comment for this path.
  }
};
```

**`_pathLayerUUID` rules:**
- Only terminal wires carry this field (wires where `toNode` is a CompNode)
- All other wires have `_pathLayerUUID === null`
- The field is stamped by `_firePathCreation` in `engine.js`
- The field is cleared when a non-terminal upstream wire is removed (dormant state)
- `hasCompDownstream()` in `cascadeAlgorithm.js` only counts wires where `_pathLayerUUID !== null`
- `dirtyFlusher._terminalWiresForEffector()` skips any terminal wire where `_pathLayerUUID` is null

### 8c. `tempGraph` — In-Memory JSON Mirror

Rebuilt from `nodeMap` + `wireMap` on every structural change. Never written to AE during a session. Used as the source for persistence writes.

```javascript
var tempGraph = {
  version: '4.0',
  nodes: { /* nodeMap contents, minus runtime-only fields (dirty, portSlots, _transplantLayerUUID) */ },
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

Property changes (inspector edits, data wire connections) are never structural. They do not rebuild `tempGraph` or trigger cascade. They are handled independently.

**Two sources of dirty state:**
1. **Inspector edit:** User changes a param in the inspector → `graphState.updateProp(uuid, key, value)` → `dirty = true`
2. **Data wire connect:** `engine.connectWire()` connecting a data wire marks the target node dirty immediately

**Flush sequence:**
1. `graphState.updateProp(uuid, key, value)` — sets `dirty = true`
2. `dirtyFlusher.schedule()` — debounces 300ms
3. `dirtyFlusher.flush()` — for each dirty node:
   - Calls `node.onPropertyChange(key, value, nodeData, hostingCompUUID[, upstreamNodeUUID])` → command object
   - Calls `evalBridge.dispatch(command)`
   - Sets `dirty = false`

**Dirty flush after path stamp:** When `_firePathCreation` stamps `_pathLayerUUID` on a new path, it immediately checks if any node in the path is dirty and calls `dirtyFlusher.flush()` synchronously. This handles the case where data wires were connected to an effector before the upstream layer wire existed — the effector was marked dirty but `_terminalWiresForEffector()` returned empty because `_pathLayerUUID` was null at flush time.

Dirty flush does **not** write to `__PROCEDIA_NODES__`. Persistence is separate.

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
- If the object exists: check for property changes the user made directly in AE and sync back to `nodeMap`
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
│   │                                 # addWire, removeWire, updateWire, updateProp,
│   │                                 # clearDirty, loadGraph, clearGraph, getTempGraph
│   ├── nodeRegistry.js               # register(def), getDefinition(type), getAll(),
│   │                                 # getByCategory(cat), listTypes()
│   ├── engine.js                     # Dumb executor. Reads node definitions, calls hooks,
│   │                                 # dispatches commands, manages port slots, cascade trigger.
│   │                                 # No node-type conditionals. No AE calls.
│   │                                 # _firePathCreation: stamps _pathLayerUUID, flushes dirty,
│   │                                 # handles _transplantLayerUUID (restampLayer).
│   ├── cascadeAlgorithm.js           # cascadeGhost(), hasCompDownstream(excludingWireId),
│   │                                 # collectPathUpstream(), isCompNode()
│   ├── cycleChecker.js               # hasCycle(fromNodeId, toNodeId) — pure graph traversal
│   ├── portManager.js                # Extendable port slot lifecycle. spawnSlot(),
│   │                                 # removeSlot(), resolveSlotName(), getOpenSlot()
│   ├── wireValidator.js              # Wire type compatibility checks before connection.
│   │                                 # Rejects incompatible types. Filters picker list.
│   │
│   ├── nodes/
│   │   └── categories/
│   │       ├── core/
│   │       │   └── Comp.js           # CompNode — nodeKind: 'affected', dedicated: true
│   │       ├── layers/
│   │       │   ├── Text.js           # TextNode — nodeKind: 'affected'
│   │       │   ├── Null.js           # NullNode — nodeKind: 'affected', dedicated: true
│   │       │   ├── Shape.js          # ShapeNode — nodeKind: 'affected'
│   │       │   └── Adjustment.js     # AdjustmentNode — nodeKind: 'affected'
│   │       ├── effects/
│   │       │   ├── FillEffect.js     # FillEffectNode — nodeKind: 'effector'
│   │       │   ├── GaussianBlur.js   # GaussianBlurNode — nodeKind: 'effector'
│   │       │   └── DropShadow.js     # DropShadowNode — nodeKind: 'effector'
│   │       ├── data/
│   │       │   ├── Color.js          # ColorNode — nodeKind: 'data', always alive
│   │       │   └── Number.js         # NumberNode — nodeKind: 'data', always alive
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
│   │                                 # Wire-insertion: drop on wire → inserts node mid-path.
│   │                                 # Active paths use _transplantLayerUUID (no park/unpark).
│   │                                 # Dormant paths fall through to full engine.disconnectWire.
│   ├── inspector.js                  # Inspector panel — renders params for selected node
│   ├── layerOrderList.js             # Drag-to-reorder for CompNode layer stacking
│   ├── statusBar.js                  # Status bar: node/wire/alive/ghost counts, zoom level
│   ├── keyboard.js                   # Delete/Backspace shortcuts
│   ├── settings.js                   # Persistent settings store — localStorage key 'procedia_settings'
│   │                                 # get(key), set(key,value), getAll(). No dependencies.
│   └── settingsModal.js              # Gear-button modal: open/close, minimap toggle, wireStyle select.
│                                     # Depends on settings.js. init() called by index.js.
│
├── flush/
│   └── dirtyFlusher.js               # Dirty flag, 300ms debounce, flush()
│                                     # _terminalWiresForSource(), _terminalWiresForEffector()
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
├── lib/
│   └── CSInterface.js                # Adobe CEP interface library
│
└── jsx/
    ├── json.jsx                      # JSON polyfill — MUST be first in evalBridge preamble
    ├── utils.jsx                     # findCompByUUID, findLayerByUUID, findReservedComp,
    │                                 # findOrCreateReservedComp
    ├── persistence.jsx               # readGraph, writeGraph, chunking logic
    ├── polling.jsx                   # pollAliveNodes — single multi-UUID check
    └── dispatcher/
        └── dispatcher.jsx            # THE ONLY EXTENDSCRIPT WRITER.
                                      # dispatch(commandJSON), dispatchBatch(commandArrayJSON)
                                      # _route(action, params) → handler functions
                                      # All action handlers live here.
```

---

## 14. Wire Types and Visual Language

| Wire Type | Color | What It Carries | Triggers Cascade |
|---|---|---|---|
| `layer` | Blue | AE layer reference — the core connection between nodes | Yes |
| `data` | Yellow | Pure value (color, number, vector) — drives locked params on downstream effectors | No |
| `parent` | Green | AE parenting relationship — `layer.parent` only | No |

### Wire Style Modes

`wireRenderer.js` reads `settings.get('wireStyle')` on every draw call. Three styles are supported:

| Value | Name | Geometry |
|---|---|---|
| `'bezier'` | Bezier | Default S-curve with horizontal control points. |
| `'direct'` | Direct | Single straight `lineTo()` — diagonal line, no control points. |
| `'stepped'` | Stepped | Three segments: vertical down → horizontal → vertical up (Manhattan routing). |

The style setting is read per-frame — switching the setting in the modal takes effect immediately on the next render tick. All wire types (layer, data, parent), the drag preview, and the `drawWire()` single-wire call all respect the style setting. Hit testing is still bezier-based regardless of style.

---

## 15. Settings System

### 15a. settings.js — Persistent Key/Value Store

`ui/settings.js` is a standalone module with no dependencies. It loads from `localStorage` at parse time and exposes three functions:

```javascript
settings.get(key)         // returns current value
settings.set(key, value)  // writes value, persists to localStorage immediately
settings.getAll()         // returns a shallow copy of the full state
```

**localStorage key:** `procedia_settings`

**Supported keys and defaults:**

| Key | Type | Default | Effect |
|---|---|---|---|
| `minimap` | `boolean` | `true` | Whether the minimap canvas is visible |
| `wireStyle` | `'bezier' \| 'direct' \| 'stepped'` | `'bezier'` | Wire rendering geometry |

**Rules:**
- Unknown keys passed to `set()` are rejected with a console warning — no unknown keys are silently written
- `getAll()` always returns a copy — the internal `_state` reference is never exposed
- No events or pub/sub — consumers call `settings.get()` directly per-frame or per-open

### 15b. settingsModal.js — UI Shell

`ui/settingsModal.js` depends on `ui/settings.js` and must load after it. It injects modal DOM at `init()` time (never hardcoded in `index.html`) and wires the gear button (`#settings-btn`) click to `open()`.

**Public API:** `settingsModal.init()`, `settingsModal.open()`, `settingsModal.close()`

**Open behavior:** Before revealing the overlay, `open()` re-syncs all controls to current `settings` state — ensuring the modal always shows the live values even if settings changed programmatically.

**Close triggers:** ✕ button, click outside modal box, Escape key.

**`index.js` wires it up:** `settingsModal.init()` is called at the end of the panel init sequence.

---

## 16. Wire-Insertion Feature

When the user drops a node from the palette directly onto an existing wire, `drag.js` intercepts the drop and inserts the node mid-path.

**Active path (wire has `_pathLayerUUID`):**
1. Graph-only wire removal: `graphState.removeWire(wireId)` + `portManager.afterDisconnect()`
2. Stamp `_transplantLayerUUID` on the source node (the old path UUID)
3. Drop the new node via `engine.dropNode()`
4. Wire A: original source → new node input
5. Wire B: new node output → original destination
6. `_firePathCreation` fires for the new terminal wire. It detects `_transplantLayerUUID` on the source node and issues `restampLayer` instead of `onAlive`, re-stamping the existing AE layer with the new terminal wire UUID. No park/unpark round-trip.

**Dormant path (wire has `_pathLayerUUID === null`):**
Falls through to `engine.disconnectWire(wireId)` — full cascade/ghost handling — then normal wire-drop sequence.

---

## 17. Critical Rules for Claude Code

1. **ExtendScript is ES3 strict.** No `const`, `let`, arrow functions, template literals, `forEach`, destructuring, spread, or default parameters. Use `var`, named functions, string concatenation, and `for` loops exclusively.

2. **Every `.jsx` function returns `JSON.stringify({ ok, data, error })`.** No exceptions. Panel JS always checks `res.ok` before using `res.data`.

3. **`evalBridge.js` is the only door to AE.** Never call `csInterface.evalScript()` from any other file.

4. **`graphState.js` is the only file that mutates `nodeMap` and `wireMap`.** All other files call into it. Never mutate node or wire state from outside `graphState.js`.

5. **`jsx/dispatcher/dispatcher.jsx` is the only file that writes AE API calls.** Nodes return command objects. The engine passes them to `evalBridge`. `evalBridge` sends them to `dispatcher.jsx`. Nothing else touches AE.

6. **Node definitions never call `evalBridge`.** A lifecycle hook returns a command object or `null`. It never resolves a Promise or calls `evalBridge` directly.

7. **`engine.js` contains zero node-type conditionals.** No `if (node.type === 'CompNode')`, no `switch(nodeKind)`. All type-specific behavior lives in the node definition. The engine calls hooks by name only.

8. **Ghost cascade never traverses `parent` or `data` wires.** `cascadeAlgorithm.js` skips any wire whose `type` is not `'layer'` during traversal.

9. **`nodeKind` is set on the node definition, never on the instance.** It is a type-level constant.

10. **AE layer `.comment` = terminal wire UUID (not node UUID).** The dispatcher finds layers by the `_pathLayerUUID` / `layerNodeUUID` param. Never look up a layer by node UUID for path-driven AE operations.

11. **Data nodes are always `alive`.** Set to `alive` on drop. All hooks return `null`. Never ghost, never park, never cascade.

12. **Cascade order is non-negotiable.** Effectors ghost first (outermost to innermost). Affected nodes park last. An affected node is never parked before all its effectors are stripped.

13. **Persistence writes happen only on three events:** AE save, AE quit, panel unload.

14. **Polling pauses during writes.** `isWriting = true` before any `evalBridge.dispatch()`. `isWriting = false` in the callback. Poller skips if `isWriting` is true.

15. **`JSON` is not native in ExtendScript.** `jsx/json.jsx` must be the first file in the `evalBridge` preamble. Never call `JSON.stringify` or `JSON.parse` in any `.jsx` without this polyfill loaded.

16. **One file per node. One node per file.** The node definition is the complete specification of the node. If adding a new node requires editing `engine.js`, `cascadeAlgorithm.js`, or `dispatcher.jsx` — stop and reconsider the design.

    Exception: if a new node needs a new **action** that doesn't exist in `dispatcher.jsx`, add the action handler there. This is the only acceptable reason to edit `dispatcher.jsx` when adding a node.

17. **`evalScript` callbacks only fire when AE has window focus.** In testing: trigger the call, click the AE window, then switch back to the browser console to see the result.

18. **Layer stacking in AE is 1-based. `layerOrder` in panel is 0-based.** Index 0 = AE layer 1 (top). Reorder using `moveToBeginning()` from bottom to top.

19. **Effect opacity values stored as 0–100 must be divided by 100** before setting AE properties that expect a 0–1 range (e.g. `ADBE Fill-0006`). This normalization happens inside the dispatcher action handler, not in the node definition.

---

*Procedia v4 — Architecture Specification — May 2026*
*This document is the single source of truth for Claude Code and for the developer.*
*Any behavior not described here must be clarified before implementation begins.*
