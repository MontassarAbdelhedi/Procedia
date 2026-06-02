# Procedia — Architecture Specification

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

## 0.1 Terminology

**Downstream** — The direction of wire flow away from a node's output port toward a CompNode. A node B is downstream of node A if there exists a path of one or more layer wires from A's output to B's input.

**Upstream** — The inverse of downstream. A node A is upstream of node B if B is downstream of A.

**First-level hosting comp** — The nearest CompNode reachable from a given node by following layer wires in the downstream direction, at any depth. If multiple downstream paths exist, each path has its own first-level hosting comp. The first-level hosting comp is the comp that directly hosts the AE layer produced by that path.

**Cascade** — The process by which a state transition (alive → ghost) propagates upstream through the graph when a node loses all live comp paths. The cascade algorithm traverses layer wires only — never parent or data wires. Effectors are ghosted before affected nodes. The full algorithm is specified in §7.

**Parking** — Moving an affected node's AE layer from its hosting comp into the Reserved Comp. Parking preserves all keyframes natively in AE. A parked layer is identified by the node's UUID stamped in `layer.comment`. The node's `hasParkedLayer` flag is set to `true` in `nodeMap`. Parking occurs on: `onGhost` and dormant path transitions.

---

## 1. Node Taxonomy

### 1a. Node Kind

Every node definition declares a `nodeKind`. This is a type-level constant — never set per instance, never overridden at runtime.

| `nodeKind` | Definition | Output | AE Presence | Always Alive | Examples |
| ---------- | ---------- | ------ | ----------- | ------------ | -------- |
| `affected` | Creates and owns a standalone AE layer. Layer moves between comps when alive. When ghosted, layer is parked in the Reserved Comp — keyframes survive natively. | Create new AE Layer. Output "Layer" | Layer in hosting comp | No | TextNode, NullNode, ShapeNode, AdjustmentNode, CompNode |
| `effector` | Modifies an existing layer owned by an affected node upstream. No standalone AE layer. When ghosted, modification is removed from the host layer; properties preserved in `nodeMap`. Lifecycle hooks receive a 3rd argument `upstreamNodeUUID` (the terminal wire UUID). | Doesn't create a new AE Layer. Output "Layer". | Effect / mask / expression on host layer | No | FillEffectNode, GaussianBlurNode, DropShadowNode |
| `data` | Outputs a pure value. No AE layer, no AE presence of any kind. Drives secondary input ports on downstream effector nodes via data wires. Set to `alive` immediately on drop. All lifecycle hooks return `null`. | Output "data V value" | None | **Yes** | ColorNode, NumberNode |
| `blending` | Applies an AE blending mode to the AE layer of the affected node wired directly into its input. Must be wired directly to an affected node's output port — cannot be placed between two effectors. No AE layer created. Passes the upstream layer reference through. | Doesn't create a new AE Layer. Output "Layer". | Sets `layer.blendingMode` on upstream affected node's layer. | **Yes** | BlendingNode |
| `matte` | Applies a luma or alpha matte relationship between two upstream AE layers sharing the same first-level hosting comp. Two input ports (top layer, matte layer), one output port. No AE layer created. Exports the top wired AE layer. Two variants: MatteAlphaNode, MatteLumaNode. | Doesn't create a new AE Layer. Output "Layer". | Sets `layer.trackMatteType` on the top layer using the second layer as matte source. | **Yes** | MatteAlphaNode, MatteLumaNode |

**Key rule — effector ghosting:** An effector never removes itself from AE independently. The affected node's `onGhost` sequence strips all effector modifications from the layer before parking. Effectors set their own state to `ghost` and return their cleanup command — the engine batches and executes everything in the correct order.

**Key rule — data node lifecycle:** Data nodes skip the ghost/alive cycle entirely. They are `alive` from drop until delete. They have no `hostingComps`. Connecting a data wire to a downstream effector marks that effector dirty and schedules a flush — the flusher then pushes the data value to AE. The data value lives in `nodeMap[uuid].props` under the relevant property key.

**Key rule — blending and matte node lifecycle:** BlendingNode and matte nodes (MatteAlphaNode, MatteLumaNode) are always alive from drop. They follow no ghost/park cycle. Their AE effect fires when the required input wires are connected and the wiring conditions are valid.

**Key rule — CompNode exception:** CompNode is `affected` and `dedicated`. When dropped standalone (not wired into a parent comp), it is always alive immediately. When wired into a parent comp as a pre-comp layer, it follows the standard alive/ghost lifecycle. Deleting a CompNode always goes directly to `onDelete` with no park step, regardless of state.

---

### 1b. Node Dedicated Flag

Some affected nodes require a presence in the AE **project panel** (a `CompItem` or `FootageItem`) in addition to existing as a layer.

| Node | `dedicated` | AE Project Object |
| ---- | ----------- | ----------------- |
| `CompNode` | `true` | `CompItem` |
| `NullNode` | `true` | `FootageItem` (solid) |
| `TextNode` | `false` | — |
| `ShapeNode` | `false` | — |
| `AdjustmentNode` | `true` | `FootageItem` (solid) |
| `FillEffectNode` | `false` | — |
| `GaussianBlurNode` | `false` | — |
| `DropShadowNode` | `false` | — |
| `ColorNode` | `false` | — |
| `NumberNode` | `false` | — |
| `BlendingNode` | `false` | — |
| `MatteAlphaNode` | `false` | — |
| `MatteLumaNode` | `false` | — |

**NullNode and AdjustmentNode** each create a real `FootageItem` (solid) in the AE project panel. This solid is the source footage for the layer. The solid is created first; the layer is added to the hosting comp second. This order is non-negotiable.

**Creation order for `dedicated: true` nodes:**

1. Create the AE project object first
2. Add as a layer to the hosting comp second

Never reverse this order.

---

## 2. Node States

Every node has exactly one state at all times. State lives in `nodeMap` in panel JS. AE does not store state. Data nodes, blending nodes, and matte nodes are always `alive` and never transition to `ghost`.

| State | Meaning | AE Layer Exists |
| ----- | ------- | --------------- |
| `ghost` | In graph only. No AE presence (affected: parked in Reserved Comp). | No (parked) |
| `alive` | Connected to a comp downstream (or is a data/blending/matte node). AE object active in hosting comp. | Yes |
| `error` | Was alive. AE object no longer found by polling. | Broken |

### State Transition Table

```
onDrop      → ghost        Always, AE layer created in reserved comp. Exceptions:
                             - Standalone CompNode (not wired to a parent comp) → alive immediately.
                             - Data node → alive immediately (no AE dependency).
                             - BlendingNode → alive immediately.
                             - Matte nodes → alive immediately (wiring conditions enforced separately).
ghost       → alive        When a downstream comp path is established via wiring, unpark AE layer.
alive       → ghost        When the last downstream comp path is broken: park AE layer, remove stored parent links if found.
alive       → error        When polling detects the AE object is missing.
error       → alive        When user clicks [Re-create in AE], check if parked: unpark.
error       → removed      When user clicks [Remove from Graph], check if parked: remove parked AE layer.
onDelete    → (onGhost first if alive and hosted) → removed from nodeMap entirely, check if parked: remove parked AE layer.
             Exception: standalone CompNode onDelete skips onGhost — no park step ever for CompNode.
             Exception: data nodes delete directly — no ghost step, no AE cleanup.
             Exception: blending and matte nodes delete directly — no ghost step, call onGhost to clear AE state, no park step.
```

---

## 3. Port System

Ports are the connection points on a node. This architecture has four distinct port categories. Each category has its own position on the node body, its own wire type rules, and its own cascade behavior.

**Wiring is the trigger for all structural actions.** Connecting a wire causes the engine to evaluate alive/ghost state transitions. Disconnecting a wire triggers the cascade algorithm. No action occurs on node drop alone — a node becomes alive only when a downstream comp path is established through wiring.

---

### 3a. Port Categories

| Category | Node Kind | Direction | Purpose | Color |
| -------- | --------- | --------- | ------- | ----- |
| `mainInput` | effector · affected · blending · matte | Incoming | Receives layer from upstream nodes | Green |
| `secondaryInput` | effector · affected · blending · matte | Incoming | Receives and locks layer property values; resolved from schema cache on drop for effectors | Gray |
| `output` | effector · affected · data · blending · matte | Outgoing | Sends layer or data wires to downstream nodes | Green for Layer, Gray for data |
| `parent` | effector · affected | Bidirectional | Declares AE parenting relationships only between two AE layers sharing same host comp. | Orange |

**Parent ports are never traversed by the cascade algorithm.** They carry only the `parent` wire type. Deleting a parent wire removes the AE `layer.parent` link silently — it never triggers ghost cascade.

---

### 3b. Port Declaration in Node Definition

#### Affected node port contract

Affected nodes that are source nodes (no layer input) declare:
- One `output` port of type `layer`
- Two `parent` ports (`child_of`, `parent_of`)

Affected nodes that accept upstream layers declare:
- One `main_input` port of type `layer` (required)
- One `output` port of type `layer`
- Two `parent` ports (`child_of`, `parent_of`)

```javascript
// Affected source node (e.g. TextNode — no upstream layer input)
ports: [
  { id: 'output',     category: 'output', type: 'layer' },
  { id: 'child_of',   category: 'parent', role: 'child',  type: 'parent' },
  { id: 'parent_of',  category: 'parent', role: 'parent', type: 'parent' }
]

// Affected node with layer input (e.g. NullNode used as parenting anchor)
ports: [
  { id: 'main_input', category: 'mainInput', type: 'layer', required: true },
  { id: 'output',     category: 'output',    type: 'layer' },
  { id: 'child_of',   category: 'parent',    role: 'child',  type: 'parent' },
  { id: 'parent_of',  category: 'parent',    role: 'parent', type: 'parent' }
]
```

#### Effector node port contract

Effector nodes declare only a `main_input` and an `output`. Secondary input ports (the effect's individual parameters) are **not declared in the node definition**. They are resolved at runtime from the schema cache (§20) and displayed immediately on drop. Effectors have no parent ports.

```javascript
  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', required: true },
    { id: 'output',     category: 'output',    type: 'layer' }
  ],

  params: [
    { key: 'label',    type: 'string',  default: 'Text',     label: 'Label'    },
    { key: 'content',  type: 'string',  default: 'New Text', label: 'Content'  },
    { key: 'fontSize', type: 'number',  default: 72,         label: 'Font Size', min: 1, max: 999 },
    { key: 'color',    type: 'color',   default: [1,1,1,1],  label: 'Color'    },
    { key: 'position', type: 'vector2', default: [0, 0],     label: 'Position' },
    { key: 'rotation', type: 'number',  default: 0,          label: 'Rotation' },
    { key: 'opacity',  type: 'number',  default: 100,        label: 'Opacity',  min: 0, max: 100 }
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

---

### Example 2 — Affected node with layer input (NullNode)

```javascript
var NullNode = {
  type:      'layers/null',
  label:     'Null',
  category:  'Layers',
  version:   '1.0.0',
  nodeKind:  'affected',
  dedicated: true,   // creates a FootageItem (solid) in AE project panel

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', required: true },
    { id: 'output',     category: 'output',    type: 'layer' },
    { id: 'child_of',   category: 'parent',    role: 'child',  type: 'parent' },
    { id: 'parent_of',  category: 'parent',    role: 'parent', type: 'parent' }
  ],

  params: [
    { key: 'label',    type: 'string',  default: 'Null', label: 'Label'    },
    { key: 'position', type: 'vector2', default: [0, 0], label: 'Position' },
    { key: 'opacity',  type: 'number',  default: 100,    label: 'Opacity', min: 0, max: 100 }
  ],

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createNullLayer',
      params: {
        compUUID: hostingCompUUID,
        nodeUUID: nodeData.id,
        position: nodeData.props.position,
        opacity:  nodeData.props.opacity,
        label:    nodeData.props.label
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
      params: { nodeUUID: nodeData.id, hostingCompUUID: hostingCompUUID, key: key, value: value }
    };
  }
};

nodeRegistry.register(NullNode);
```

---

### Example 3 — Effector node (FillEffectNode)

Effector nodes declare `params: 'dynamic'`. The engine resolves the schema from the cache at drop time and injects secondary input ports. The node definition does not list individual effect properties. Effector hooks receive `upstreamNodeUUID` as a 3rd argument — the terminal wire UUID used to find the correct AE layer.

```javascript
var FillEffectNode = {
  type:      'effects/fill',
  label:     'Fill',
  category:  'Effects',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'ADBE Fill',
  params:    'dynamic',   // resolved from schemaCache at drop time

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', required: true },
    { id: 'output',     category: 'output',    type: 'layer' }
  ],

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'applyDynamicEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       'ADBE Fill',
        props:           nodeData.props
      }
    };
  },

  onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'removeEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       'ADBE Fill'
      }
    };
  },

  onDelete: function(nodeData) { return null; },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
    // key is a property matchName (e.g. 'ADBE Fill-0002')
    return {
      action: 'setEffectProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        effectMatchName: 'ADBE Fill',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(FillEffectNode);
```

---

### Example 4 — Data node (ColorNode)

All hooks return `null`. The node is always alive.

```javascript
var ColorNode = {
  type: 'data/color', label: 'Color', category: 'Data', version: '1.0.0',
  nodeKind: 'data', dedicated: false,
  ports: [{ id: 'output', category: 'output', type: 'data' }],
  params: [
    { key: 'label', type: 'string', default: 'Color',      label: 'Label' },
    { key: 'color', type: 'color',  default: [1, 1, 1, 1], label: 'Color' }
  ],
  onDrop:           function(nodeData)                               { return null; },
  onAlive:          function(nodeData, hostingCompUUID)              { return null; },
  onGhost:          function(nodeData, hostingCompUUID)              { return null; },
  onDelete:         function(nodeData)                               { return null; },
  onPropertyChange: function(key, value, nodeData, hostingCompUUID)  { return null; }
};
nodeRegistry.register(ColorNode);
```

---

### Example 5 — Blending node (BlendingNode)

```javascript
var BlendingNode = {
  type:      'utility/blending',
  label:     'Blending',
  category:  'Utility',
  version:   '1.0.0',
  nodeKind:  'blending',
  dedicated: false,

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', required: true },
    { id: 'output',     category: 'output',    type: 'layer' }
  ],

  params: [
    { key: 'label', type: 'string', default: 'Blending', label: 'Label' },
    { key: 'mode',  type: 'enum',   default: 'NORMAL',   label: 'Mode',
      options: ['NORMAL','ADD','MULTIPLY','SCREEN','OVERLAY','DARKEN','LIGHTEN',
                'COLOR_DODGE','COLOR_BURN','HARD_LIGHT','SOFT_LIGHT','DIFFERENCE',
                'EXCLUSION','HUE','SATURATION','COLOR','LUMINOSITY'] }
  ],

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'setBlendingMode',
      params: { nodeUUID: nodeData.id, layerNodeUUID: upstreamNodeUUID, mode: nodeData.props.mode }
    };
  },

  onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'setBlendingMode',
      params: { nodeUUID: nodeData.id, layerNodeUUID: upstreamNodeUUID, mode: 'NORMAL' }
    };
  },

  onDelete: function(nodeData) { return null; },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
    if (key !== 'mode') return null;
    return {
      action: 'setBlendingMode',
      params: { nodeUUID: nodeData.id, layerNodeUUID: upstreamNodeUUID, mode: value }
    };
  }
};
nodeRegistry.register(BlendingNode);
```

---

### Example 6 — Matte node (MatteLumaNode)

`MatteAlphaNode` is defined identically with `type: 'utility/matte-alpha'`, `label: 'Matte Alpha'`, and the action strings changed to `'setAlphaMatte'` / `'clearMatte'`.

```javascript
var MatteLumaNode = {
  type:      'utility/matte-luma',
  label:     'Matte Luma',
  category:  'Utility',
  version:   '1.0.0',
  nodeKind:  'matte',
  dedicated: false,

  ports: [
    { id: 'top_layer',   category: 'mainInput',      type: 'layer', required: true },
    { id: 'matte_layer', category: 'secondaryInput',  type: 'layer', required: true },
    { id: 'output',      category: 'output',          type: 'layer' }
  ],

  params: [
    { key: 'label',  type: 'string',  default: 'Matte Luma', label: 'Label'  },
    { key: 'invert', type: 'boolean', default: false,         label: 'Invert' }
  ],

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID, topLayerUUID, matteLayerUUID) {
    return {
      action: 'setLumaMatte',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        topLayerUUID:    topLayerUUID,
        matteLayerUUID:  matteLayerUUID,
        invert:          nodeData.props.invert
      }
    };
  },

  onGhost: function(nodeData, hostingCompUUID, topLayerUUID) {
    return {
      action: 'clearMatte',
      params: { nodeUUID: nodeData.id, hostingCompUUID: hostingCompUUID, topLayerUUID: topLayerUUID }
    };
  },

  onDelete: function(nodeData) { return null; },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID, topLayerUUID, matteLayerUUID) {
    if (key !== 'invert') return null;
    return {
      action: 'setLumaMatte',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        topLayerUUID:    topLayerUUID,
        matteLayerUUID:  matteLayerUUID,
        invert:          value
      }
    };
  }
};
nodeRegistry.register(MatteLumaNode);
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
| ------ | ------------------ |
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
| `applyDynamicEffect` | Applies an effect and sets all its properties from a props map (keyed by match name) |
| `removeEffect` | Finds effect by match name and removes it from the layer |
| `setEffectProperty` | Sets a named property on an existing effect by match name |
| `restampLayer` | Re-stamps `layer.comment` with a new UUID (used during wire transplant) |
| `pollAliveNodes` | Single multi-UUID check — returns missing and present UUIDs |
| `setBlendingMode` | Sets `layer.blendingMode` on the layer identified by `layerNodeUUID`. Accepts a blending mode string mapped to AE `BlendingMode` enum. |
| `setLumaMatte` | Sets `TrackMatteType.LUMA` on the top layer, using the matte layer as source. Applies `invert` flag. Reorders layers if needed so matte layer is directly above top layer. |
| `setAlphaMatte` | Sets `TrackMatteType.ALPHA` on the top layer, using the matte layer as source. Applies `invert` flag. Reorders layers if needed. |
| `clearMatte` | Sets `layer.trackMatteType = TrackMatteType.NO_TRACK_MATTE` on the top layer. |
| `introspectEffect` | Creates a temp solid in Reserved Comp, applies the effect, walks all properties to build a schema array, removes temp layer. Returns schema. |
| `readSchemaCache` | Reads `effectSchemaCache.json` from the plugin directory and returns its parsed contents. |
| `writeSchemaCache` | Writes the provided cache object to `effectSchemaCache.json` in the plugin directory. |
| `getAEVersion` | Returns the running AE version string (`app.version`). |

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
- Enforces wire type compatibility before allowing connections
- Stamps `_pathLayerUUID` on terminal wires when a path is activated
- After stamping `_pathLayerUUID`, checks for dirty nodes in the new path and calls `dirtyFlusher.flush()` if any are dirty — ensuring data wires connected before the path existed take effect immediately
- Sends command objects from lifecycle hooks to `evalBridge.dispatch()` or `evalBridge.dispatchBatch()`
- Manages the dirty flag and debounce timer for property changes
- Supports wire-insertion: dropping a node onto an active wire performs a graph-only wire removal + `_transplantLayerUUID` stamp, then re-wires through the new node, then `_firePathCreation` issues a `restampLayer` instead of a full park/unpark round-trip
- On node drop, checks `params: 'dynamic'` and calls `schemaCache.getSchema()` — stores resolved schema on `nodeMap[uuid].dynamicSchema`, all secondary input ports are displayed immediately (see §20)

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
   — Never add blending or matte nodes to the cascade set (they are always alive)
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

When a **non-terminal** upstream wire is deleted and the source chain for a terminal wire is broken, the terminal wire becomes dormant. The behavior is identical to a standard ghost transition:

1. The terminal wire's `_pathLayerUUID` is cleared to `null`
2. The cascade algorithm runs `onGhost` for all nodes in the now-disconnected path
3. The affected node's AE layer is parked in the Reserved Comp
4. `nodeMap[uuid].state` is set to `'ghost'`
5. `nodeMap[uuid].hasParkedLayer` is set to `true`

**Reconnection:** When the upstream chain is later reconnected:

- `_activateDormantTerminalWiresDownstream` detects the dormant terminal wire (wire exists but `_pathLayerUUID === null`)
- It calls `_firePathCreation`, which detects `hasParkedLayer: true` on the affected node
- `_firePathCreation` issues `unparkLayer` (not a fresh `onAlive`) to move the existing layer back from Reserved Comp
- `_pathLayerUUID` is re-stamped with the wire's UUID
- `nodeMap[uuid].state` → `'alive'`, `nodeMap[uuid].hasParkedLayer` → `false`

**Key distinction from the wire-insertion transplant:** `restampLayer` is used only during wire-insertion (§16) where the AE layer never leaves the hosting comp. Dormant reconnection always uses `unparkLayer` because the layer was parked.

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
    locked:     false,            // prevents node from being moved
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
    // hasParkedLayer — set to true in two cases:
    //   1. Standard ghost: node transitions alive → ghost via wire deletion or cascade.
    //   2. Dormant path: non-terminal upstream wire deleted, breaking source chain.
    //      In both cases: state = 'ghost', hasParkedLayer = true.
    //      Reconnect uses unparkLayer in both cases.
    // dynamicSchema — runtime-only, never persisted. Populated on drop or panel load restore.
    // Only present on effector nodes with params: 'dynamic'.
    dynamicSchema: null
    // _transplantLayerUUID — transient engine field, set during wire-insertion.
    // Non-null means: on next _firePathCreation for this node, issue 'restampLayer'
    // instead of 'onAlive', then clear this field. Not persisted.
  }
};
```

**`hasParkedLayer`:** Set to `true` when the node transitions to `ghost` and its layer is moved to the Reserved Comp — including both standard ghost transitions and dormant path transitions. Set back to `false` when the layer is unparked (node goes alive again). The engine uses this to decide between `unparkLayer` and a fresh `onAlive` call when a ghost node reconnects.

**`dynamicSchema`:** Runtime-only field on effector nodes with `params: 'dynamic'`. Populated from `schemaCache` on drop or on panel load restore. Never written to `tempGraph`. Shape: `{ matchName: string, properties: [{ matchName, label, type, defaultValue }] }`.

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
    toPort:   'main_input',       // port ID on the target node
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
- The field is cleared when a non-terminal upstream wire is removed (dormant state) — this also triggers `onGhost` and parks the layer
- `hasCompDownstream()` in `cascadeAlgorithm.js` only counts wires where `_pathLayerUUID !== null`
- `dirtyFlusher._terminalWiresForEffector()` skips any terminal wire where `_pathLayerUUID` is null

### 8c. `tempGraph` — In-Memory JSON Mirror

Rebuilt from `nodeMap` + `wireMap` on every structural change. Never written to AE during a session. Used as the source for persistence writes.

```javascript
var tempGraph = {
  version: '4.0',
  nodes: { /* nodeMap contents, minus runtime-only fields (dirty, portSlots, _transplantLayerUUID, dynamicSchema) */ },
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
8. For any restored effector node with `params: 'dynamic'`: trigger schema resolution (from cache or from AE) — `dynamicSchema` is never persisted and must always be resolved fresh

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

## 12. Blending Node

### 12a. Definition

BlendingNode is a `nodeKind: 'blending'` node. It applies an AE blending mode to the AE layer of the affected node wired directly into its `main_input` port. It does not create an AE layer.

**Port constraint (enforced by `wireValidator`):** The `main_input` port of a blending node only accepts wires from an affected node's output port. Wires from effector outputs are rejected. The blending node's `output` port passes the upstream layer reference through unchanged.

**Always alive:** Yes. BlendingNode is alive from drop until delete — no ghost/park cycle.

### 12b. Behavior

**On wire connect (blending node's `main_input` receives a wire from an affected node):**
- Call `setBlendingMode` dispatcher action with the upstream affected node's `layerNodeUUID` and the current `mode` param.

**On wire disconnect / on delete:**
- Call `setBlendingMode` with `mode: 'NORMAL'` to restore the layer's blending mode to default.

**On property change (`mode`):**
- Call `setBlendingMode` with the new mode value.

### 12c. AE Implementation Note

`layer.blendingMode` accepts `BlendingMode` enum constants (e.g. `BlendingMode.MULTIPLY`). The dispatcher action `setBlendingMode` is responsible for mapping the string param value to the correct AE enum. The mapping lives entirely inside the dispatcher handler — the node definition passes the string only.

---

## 13. Matte Nodes

### 13a. Definition

Two node definitions: `MatteLumaNode` (`nodeKind: 'matte'`) and `MatteAlphaNode` (`nodeKind: 'matte'`). They are structurally identical — the only difference is the AE `TrackMatteType` applied (`LUMA` vs `ALPHA`).

Each matte node has two input ports (`top_layer`, `matte_layer`) and one output port. It exports the top wired AE layer — it does not create a new layer.

**Always alive:** Yes.

### 13b. Wiring Validity Rules (enforced by `wireValidator`)

Before the engine activates a matte node (goes alive), all three of the following must be true:

1. Both `top_layer` and `matte_layer` input wires are connected.
2. The AE layers of both upstream nodes share the **same first-level hosting comp**.
3. The matte node's `output` wire connects to the same first-level hosting comp.

If any check fails: the matte node stays ghost. The engine does not call `onAlive`. No AE action is taken. A warning is shown in the notification bar.

### 13c. Behavior

**On all three wiring conditions met (matte node goes alive):**
- Call `setLumaMatte` or `setAlphaMatte` dispatcher action.
- Pass: `topLayerUUID`, `matteLayerUUID`, `hostingCompUUID`, `invert` param.

**On any wiring condition broken / on delete:**
- Call `clearMatte` dispatcher action with `topLayerUUID`.
- This sets `layer.trackMatteType = TrackMatteType.NO_TRACK_MATTE` on the top layer.

**On property change (`invert`):**
- Re-call `setLumaMatte` / `setAlphaMatte` with the updated `invert` value.

### 13d. AE Implementation Note

In AE, setting a luma or alpha matte requires the matte layer to be directly above the target layer in the comp's layer stack. The dispatcher action is responsible for verifying or enforcing this layer order. If the matte layer is not immediately above the top layer, the action must reorder layers using `moveToBeginning()` before setting the matte. This logic lives inside the dispatcher — the node definition is unaware of layer ordering.

---

## 14. Polling

The poller runs on a tick: 1 second when panel is active, 5 seconds when idle.

On each tick, `pollAliveNodes(uuidList)` is called — a single ExtendScript execution that checks all alive node UUIDs in one bridge crossing.

For each UUID in the list:

- Find the AE object by UUID (via `.comment` field)
- If the object exists: check for property changes the user made directly in AE and sync back to `nodeMap`
- If the object is missing: mark the node `error` in `nodeMap`, show notification

**Polling pauses during any write.** `isWriting = true` is set before any `evalBridge.dispatch()` call. `isWriting = false` is set in the callback. The poller checks this flag before every tick and skips if true.

---

## 15. File Structure

> See **[structure.md](../structure.md)** at the project root for the full annotated file tree, load order, public APIs, dependency graph, and key call flows.

> **Claude Code — Before implementing any phase that creates or moves files:**
> 1. Read `structure.md` and list all existing `.js`, `.jsx`, and `.html` files.
> 2. Compare the actual file tree against what is described there.
> 3. Report any files that exist on disk but are absent from that map, and any files in the map that do not yet exist on disk.
> 4. Do not move, rename, or delete any existing file without explicit developer confirmation.
> 5. Only after reporting discrepancies and receiving confirmation: proceed with file creation or relocation.

---

## 16. Wire Types and Visual Language

| Wire Type | Color | What It Carries | Triggers Cascade |
| --------- | ----- | --------------- | ---------------- |
| `layer` | green | AE layer reference — the core connection between nodes | Yes |
| `data` / secondary inputs | gray | Pure value (color, number, vector) — drives locked params on downstream effectors | No |
| `parent` | orange | AE parenting relationship — `layer.parent` only | No |

### Wire Style Modes

`wireRenderer.js` reads `settings.get('wireStyle')` on every draw call. Three styles are supported:

| Value | Name | Geometry |
| ----- | ---- | -------- |
| `'bezier'` | Bezier | Default S-curve with horizontal control points. |
| `'direct'` | Direct | Single straight `lineTo()` — diagonal line, no control points. |
| `'stepped'` | Stepped | Three segments: vertical down → horizontal → vertical up (Manhattan routing). |

The style setting is read per-frame — switching the setting in the modal takes effect immediately on the next render tick. All wire types (layer, data, parent), the drag preview, and the `drawWire()` single-wire call all respect the style setting. Hit testing is still bezier-based regardless of style.

---

## 17. Settings System

### 17a. settings.js — Persistent Key/Value Store

`ui/settings.js` is a standalone module with no dependencies. It loads from `localStorage` at parse time and exposes three functions:

```javascript
settings.get(key)         // returns current value
settings.set(key, value)  // writes value, persists to localStorage immediately
settings.getAll()         // returns a shallow copy of the full state
```

**localStorage key:** `procedia_settings`

**Supported keys and defaults:**

| Key | Type | Default | Effect |
| --- | ---- | ------- | ------ |
| `minimap` | `boolean` | `true` | Whether the minimap canvas is visible |
| `wireStyle` | `'bezier'` \| `'direct'` \| `'stepped'` | `'bezier'` | Wire rendering style |

**Rules:**

- Unknown keys passed to `set()` are rejected with a console warning — no unknown keys are silently written
- `getAll()` always returns a copy — the internal `_state` reference is never exposed
- No events or pub/sub — consumers call `settings.get()` directly per-frame or per-open

### 17b. settingsModal.js — UI Shell

`ui/settingsModal.js` depends on `ui/settings.js` and must load after it. It injects modal DOM at `init()` time (never hardcoded in `index.html`) and wires the gear button (`#settings-btn`) click to `open()`.

**Public API:** `settingsModal.init()`, `settingsModal.open()`, `settingsModal.close()`

**Open behavior:** Before revealing the overlay, `open()` re-syncs all controls to current `settings` state — ensuring the modal always shows the live values even if settings changed programmatically.

**Close triggers:** ✕ button, click outside modal box, Escape key.

**`index.js` wires it up:** `settingsModal.init()` is called at the end of the panel init sequence.

---

## 18. Wire-Insertion Feature

When the user drops a node from the palette directly onto an existing wire, `drag.js` intercepts the drop and inserts the node mid-path.

**Active path (wire has `_pathLayerUUID`):**

1. Graph-only wire removal: `graphState.removeWire(wireId)`
2. Stamp `_transplantLayerUUID` on the source node (the old path UUID)
3. Drop the new node via `engine.dropNode()`
4. Wire A: original source → new node input
5. Wire B: new node output → original destination
6. `_firePathCreation` fires for the new terminal wire. It detects `_transplantLayerUUID` on the source node and issues `restampLayer` instead of `onAlive`, re-stamping the existing AE layer with the new terminal wire UUID. No park/unpark round-trip.

**Dormant path (wire has `_pathLayerUUID === null`):**
Falls through to `engine.disconnectWire(wireId)` — full cascade/ghost handling — then normal wire-drop sequence.

---

## 19. Wire Drop on Empty Canvas

When the user drops an output wire onto the empty canvas, display a DOM picker of valid node types. Only display nodes whose `main_input` port type is compatible with the wire being dropped. On selection: drop the new node and wire the original node's output to the new node's `main_input`.

---

## 20. Dynamic Effect Schema Cache

### 20a. What This Feature Does

Effect nodes (FillEffect, GaussianBlur, DropShadow, etc.) declare only their `matchName` and `params: 'dynamic'`. They do not hardcode parameter lists.

On first drop, Procedia queries AE for the effect's full property schema at runtime. The schema is cached to `effectSchemaCache.json` inside the plugin directory. Every subsequent drop of the same node type reads from cache — zero bridge calls. When AE updates and a new version is detected on panel load, only changed schemas are re-introspected — unchanged schemas are preserved.

This feature touches: `schemaCache/` (4 files split from `schemaCache.js`), `jsx/utils.jsx` (one new function), `jsx/dispatcher.jsx` (new actions), `engine.js` (one new hook call), all effect node definitions (simplified to `matchName` + `params: 'dynamic'` + two ports). It does not touch `cascadeAlgorithm.js`, `graphState.js`, `wireValidator`, or any non-effect node.

### 20b. Port Resolution — All Ports Visible from Drop

When `engine.js` calls `schemaCache.getSchema(matchName)` on node drop, the resolved schema populates the node's secondary input ports immediately:

1. Schema is returned as `[{ matchName, label, type, defaultValue }, ...]`
2. Each property entry becomes a secondary input port on the node — no spawning needed, all ports exist from drop
3. Port ID convention: `secondary_in_{property.matchName}` (non-alphanumeric characters replaced with `_`)
4. Each port is `category: 'secondaryInput'`, `type: 'data'`
5. `nodeMap[uuid].props` is initialized with `{ [property.matchName]: property.defaultValue }` for each property
6. The inspector reads `nodeMap[uuid].props` to render inspectable parameters — no additional schema lookup needed at render time

All secondary input ports behave identically to static `secondaryInput` ports for wiring, dirty flush, and `onPropertyChange`. The engine passes the property's `matchName` as the `key` argument to `onPropertyChange`.

### 20c. Deliverables

- `graph/schemaCache/` (state.js, persistence.js, diff.js, index.js) — in-memory cache + disk read/write + diff logic
- `jsx/utils.jsx` — new function: `getAEVersion()`
- `jsx/dispatcher.jsx` — new actions: `introspectEffect`, `readSchemaCache`, `writeSchemaCache`, `getAEVersion`
- `engine.js` — call `schemaCache.getSchema()` on node drop when `params: 'dynamic'`; store schema on node instance, all ports visible immediately
- `data/effectSchemaCache.json` — ships empty, never created at runtime
- `index.html` — `<script>` tags for `schemaCache/state.js`, `schemaCache/persistence.js`, `schemaCache/diff.js`, `schemaCache/index.js` after `nodeRegistry.js`, before `engine.js`
- Effect node definitions — simplified (`matchName` + `params: 'dynamic'` + two ports only)

### 20d. `schemaCache/` — Split Module Specification

The original `schemaCache.js` has been split into four files under `graph/schemaCache/`, following the same IIFE sub-module pattern used by `graph/engine/` and `graph/cascade/`:

| File | Internal Global | Responsibility |
|---|---|---|
| `state.js` | `__sc_state` | In-memory cache (`_memoryCache`, `_aeVersion`, `_ready`), getter/setter accessors, public read API (`hasSchema`, `getSchema`, `isReady`, `memoryKeys`) |
| `persistence.js` | `__sc_persist` | `writeToDisk()` — persists cache to disk via `evalBridge.dispatch({ action: 'writeSchemaCache' })` |
| `diff.js` | `__sc_diff` | `schemasAreDifferent()` — property-level comparison; `runVersionDiff()` — re-introspects all known schemas when AE version changes |
| `index.js` | `schemaCache` | Aggregates sub-modules; exposes `init()`, `storeSchema()`, `fetchSchema()`; forwards `hasSchema`, `getSchema`, `isReady` from `__sc_state` |

**Load order:** `state.js` → `persistence.js` → `diff.js` → `index.js`

**Public API (same as before):**
```javascript
schemaCache.init()        // → Promise — reads cache, checks AE version, diffs if changed
schemaCache.hasSchema(mn) // → boolean
schemaCache.getSchema(mn) // → Object|null
schemaCache.storeSchema(mn, data) // → void (memory + disk)
schemaCache.fetchSchema(mn) // → Promise — cached or introspect-on-miss
schemaCache.isReady()     // → boolean
```

**`Object.keys` note:** This is panel JS (Chromium). `Object.keys` is valid here. Never use it in `.jsx` files.

### 20e. `introspectEffect` Dispatcher Action (ES3)

```jsx
function actionIntrospectEffect(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var reservedComp = findReservedComp();
    if (!reservedComp) { result.error = 'Reserved Comp not found — cannot introspect'; return result; }

    var tempLayer = reservedComp.layers.addSolid([0,0,0], '__PROCEDIA_INTROSPECT_TEMP__', 100, 100, 1);
    tempLayer.enabled = false;

    var effect;
    try {
      effect = tempLayer.Effects.addProperty(params.matchName);
    } catch (addErr) {
      tempLayer.remove();
      result.error = 'Effect not found in AE: ' + params.matchName;
      return result;
    }

    var ALLOWED_TYPES = [
      PropertyValueType.COLOR, PropertyValueType.TwoD, PropertyValueType.ThreeD,
      PropertyValueType.SCALAR, PropertyValueType.ANGLE, PropertyValueType.NO_VALUE
    ];

    var schema = [];
    for (var i = 1; i <= effect.numProperties; i++) {
      var prop = effect.property(i);
      var pvt  = prop.propertyValueType;
      var allowed = false;
      for (var k = 0; k < ALLOWED_TYPES.length; k++) { if (pvt === ALLOWED_TYPES[k]) { allowed = true; break; } }
      if (!allowed) continue;
      var mappedType = null;
      if (pvt === PropertyValueType.COLOR)    mappedType = 'color';
      if (pvt === PropertyValueType.TwoD)     mappedType = 'vector2';
      if (pvt === PropertyValueType.ThreeD)   mappedType = 'vector3';
      if (pvt === PropertyValueType.SCALAR)   mappedType = 'number';
      if (pvt === PropertyValueType.ANGLE)    mappedType = 'number';
      if (pvt === PropertyValueType.NO_VALUE) mappedType = 'boolean';
      schema.push({ matchName: prop.matchName, label: prop.name, type: mappedType, defaultValue: prop.defaultValue });
    }

    effect.remove();
    tempLayer.remove();
    result.ok   = true;
    result.data = { matchName: params.matchName, properties: schema };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
```

Temp layer cleanup happens on **both** success and failure paths — non-negotiable.

### 20f. `readSchemaCache` and `writeSchemaCache` Dispatcher Actions (ES3)

```jsx
function actionReadSchemaCache(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var pluginFolder = new Folder($.fileName).parent.parent; // jsx/ → plugin root
    var cacheFile    = new File(pluginFolder.fsName + '/data/effectSchemaCache.json');
    if (!cacheFile.exists) { result.ok = true; result.data = { aeVersion: '', schemas: {} }; return result; }
    cacheFile.open('r');
    var raw = cacheFile.read();
    cacheFile.close();
    result.ok   = true;
    result.data = JSON.parse(raw);
  } catch (e) { result.error = e.toString(); }
  return result;
}

function actionWriteSchemaCache(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var pluginFolder = new Folder($.fileName).parent.parent;
    var cacheFile    = new File(pluginFolder.fsName + '/data/effectSchemaCache.json');
    cacheFile.open('w');
    cacheFile.write(JSON.stringify(params.cache));
    cacheFile.close();
    result.ok = true; result.data = { written: true };
  } catch (e) { result.error = e.toString(); }
  return result;
}

function actionGetAEVersion(params) {
  var result = { ok: false, data: null, error: null };
  try { result.ok = true; result.data = { version: app.version }; }
  catch (e) { result.error = e.toString(); }
  return result;
}
```

Register all three under keys `'readSchemaCache'`, `'writeSchemaCache'`, `'getAEVersion'`.

**`$.fileName` path note:** Verify the correct number of `.parent` traversals from the audit in Phase 1. `dispatcher.jsx` lives in `jsx/dispatcher/` — two `.parent` calls reach the plugin root. Confirm this against actual directory structure.

### 20g. Engine Integration — Dynamic Schema Hook on Node Drop

On node drop, after adding the node to `nodeMap`, `engine.js` checks `nodeDef.params`:

1. If `params` is not `'dynamic'`: proceed normally
2. If `params === 'dynamic'`:
   - Read `matchName` from the node definition
   - Call `schemaCache.hasSchema(matchName)`
   - **Cache hit:** call `schemaCache.getSchema(matchName)` → store as `nodeMap[uuid].dynamicSchema` → secondary input ports become available immediately → call `inspector.render(nodeData)`
   - **Cache miss:** dispatch `introspectEffect` → on success: `schemaCache.storeSchema(matchName, res.data)` → store as `dynamicSchema` → secondary input ports resolve → render inspector. On failure: log error, node stays with no inspector params

On **panel load restore**: any node with `params: 'dynamic'` triggers the same schema resolution path. `dynamicSchema` is never persisted — always resolved fresh.

### 20h. Inspector Integration — Dynamic Rendering

```javascript
function renderInspector(nodeData, nodeDef) {
  if (nodeDef.params === 'dynamic') {
    var schema = nodeData.dynamicSchema;
    if (!schema || !schema.properties || schema.properties.length === 0) {
      _renderLoadingState();
      return;
    }
    _renderDynamicParams(nodeData, schema.properties);
  } else {
    _renderStaticParams(nodeData, nodeDef.params);
  }
}
```

Each property maps to an inspector control: `color` → color picker, `number` → number input, `vector2` → two number inputs, `vector3` → three number inputs, `boolean` → checkbox. Value reads from `nodeData.props[property.matchName]`; falls back to `property.defaultValue`. On change: `graphState.updateProp(nodeData.id, property.matchName, newValue)`.

---

## 21. Implementation Phase Plan

Each phase is a hard stop. Claude Code must complete the phase, output the verification checklist, and wait for explicit developer confirmation before proceeding.

### PHASE 1 — Audit

Read and report on the following before touching any file:

1. List all existing `.js`, `.jsx`, `.html` files in the project root. Compare against §15 file structure. Report discrepancies.
2. Open `jsx/dispatcher.jsx` — list all existing action handler function names. Report the exact line number where a new action handler should be inserted.
3. Open `jsx/utils.jsx` — confirm whether `getAEVersion` already exists. Report the exact line number where it should be added if absent.
4. Open `engine.js` — find the function that fires on node drop. Report its exact name and line number.
5. Open `index.html` — find where `graph/` panel JS files are loaded. Report the exact line numbers where the `schemaCache/state.js`, `schemaCache/persistence.js`, `schemaCache/diff.js`, `schemaCache/index.js` script tags should be inserted (after `nodeRegistry.js`, before `engine.js`).
6. Confirm that `data/effectSchemaCache.json` does NOT already exist.
7. Open `graph/nodes/categories/effects/FillEffect.js` if it exists and report its current contents.

Output:
```
AUDIT COMPLETE
File tree discrepancies: [list or 'none']
dispatcher.jsx — new action insertion line: [N]
utils.jsx — getAEVersion exists: [yes/no] — insertion line if no: [N]
engine.js — onDrop function name: [name] — line: [N]
index.html — schemaCache/state.js insertion line: [N], schemaCache/persistence.js: [N+1], schemaCache/diff.js: [N+2], schemaCache/index.js: [N+3]
effectSchemaCache.json — exists: [yes/no]
FillEffect.js — exists: [yes/no]
```

STOP. Wait for confirmation.

---

### PHASE 2 — Create `data/effectSchemaCache.json`

```json
{ "aeVersion": "", "schemas": {} }
```

STOP. Wait for confirmation.

---

### PHASE 3 — Add `getAEVersion` to `jsx/utils.jsx`

If it already exists from Phase 1 audit, skip and report skip. Otherwise add using the ES3 function body in §20f. Returns `JSON.stringify({ ok, data, error })`. Never parse or truncate `app.version` — store the full string verbatim.

STOP. Wait for confirmation.

---

### PHASE 4 — Add `introspectEffect` to `jsx/dispatcher.jsx`

Add the full action handler from §20e. Register under `'introspectEffect'`. ES3 strict. Temp layer cleanup on both success and failure paths.

STOP. Wait for confirmation.

---

### PHASE 5 — Create `graph/schemaCache/` (4 files)

Create `graph/schemaCache/state.js`, `graph/schemaCache/persistence.js`, `graph/schemaCache/diff.js`, and `graph/schemaCache/index.js` following the split specification in §20d. Public API: `init`, `hasSchema`, `getSchema`, `storeSchema`, `fetchSchema`, `isReady`. `init()` returns a Promise. No AE API calls in this file.

STOP. Wait for confirmation.

---

### PHASE 6 — Add `readSchemaCache`, `writeSchemaCache`, `getAEVersion` to `jsx/dispatcher.jsx`

Add all three action handlers from §20f. Register under their respective keys. Verify `$.fileName` path traversal matches actual directory depth from Phase 1 audit.

STOP. Wait for confirmation.

---

### PHASE 7 — Update `engine.js` — Dynamic Schema Hook

Add schema resolution logic to the node drop path as specified in §20g. Cache hit and miss paths. Panel load restore path. Non-dynamic nodes completely unaffected. `dynamicSchema` stored on node instance in `nodeMap`, never in `tempGraph`.

STOP. Wait for confirmation.

---

### PHASE 8 — Update `inspector.js` — Dynamic Rendering

Implement `renderInspector` branch as specified in §20h. All five param types rendered. Loading state when schema not yet resolved. Static node rendering unaffected.

STOP. Wait for confirmation.

---

### PHASE 9 — Reference Implementation: `FillEffect.js`

Write or rewrite `graph/nodes/categories/effects/FillEffect.js` using Example 3 from §4 as the canonical template. Two ports only (`main_input`, `output`). `params: 'dynamic'`. `matchName: 'ADBE Fill'`. All hooks use `upstreamNodeUUID` as 3rd argument.

Add `applyDynamicEffect` and `setEffectProperty` dispatcher action handlers to `dispatcher.jsx` and register them. Both ES3 compliant. Both navigate by match name — never by index.

STOP. Wait for confirmation.

---

### PHASE 10 — Add `schemaCache/` files to `index.html`

```html
<script src="graph/schemaCache/state.js"></script>
<script src="graph/schemaCache/persistence.js"></script>
<script src="graph/schemaCache/diff.js"></script>
<script src="graph/schemaCache/index.js"></script>
```

Insert at the exact lines from Phase 1 audit. Must load after `nodeRegistry.js`, before `engine.js`. Order matters: state → persistence → diff → index.

STOP. Wait for confirmation.

---

### PHASE 11 — Call `schemaCache.init()` on Panel Load

In `index.js`, after `evalBridge` is ready:

```javascript
schemaCache.init().then(function() {
  console.log('[Procedia] Schema cache ready');
  // Enable node palette, restore graph
});
```

Panel must not enable the node palette until `schemaCache.isReady()` returns `true`. Graceful degradation if init fails.

STOP. Wait for confirmation.

---

### PHASE 12 — Integration Test

Run all five scenarios. Report results per scenario. Do not proceed past a failing scenario without developer instruction.

**SCENARIO 1 — First drop, cache miss**
```
Clear effectSchemaCache.json to: { "aeVersion": "", "schemas": {} }
Reload panel
Drop a FillEffect node
Expected:
  - Console: '[schemaCache] cache miss — introspecting ADBE Fill'
  - Console: '[schemaCache] schema stored for ADBE Fill'
  - Inspector renders Fill effect params (Color, Opacity, etc.)
  - effectSchemaCache.json now contains ADBE Fill schema
  - aeVersion field matches app.version string
```

**SCENARIO 2 — Second drop, cache hit**
```
(continuing from Scenario 1)
Drop a second FillEffect node
Expected:
  - NO introspect bridge call (no temp layer flash in Reserved Comp)
  - Console: '[schemaCache] cache hit — ADBE Fill'
  - Inspector renders immediately
  - effectSchemaCache.json unchanged
```

**SCENARIO 3 — Panel reload, cache survives**
```
Reload the panel
Drop a FillEffect node
Expected:
  - Cache loaded from disk on panel init
  - No introspect call on drop
  - Inspector renders correctly
```

**SCENARIO 4 — Param change applies to AE**
```
Drop FillEffect → wire it to a TextNode → wire TextNode to a CompNode
FillEffect goes alive
In inspector: change Fill color to blue [0, 0, 1, 1]
Expected:
  - After 300ms debounce: Fill effect on the TextNode layer updates to blue in AE
  - nodeMap props for this FillEffect contain { 'ADBE Fill-0002': [0,0,1,1] }
```

**SCENARIO 5 — Version diff (simulated)**
```
In effectSchemaCache.json, manually change "aeVersion" to "99.0.0 (fake)"
Reload panel
Expected:
  - Console: '[schemaCache] AE version changed from "99.0.0 (fake)" to "[real version]"'
  - Console: '[schemaCache] Diff complete — 0 schema(s) updated'
  - effectSchemaCache.json aeVersion updated to real AE version string
  - All cached schemas preserved
```

STOP. Report all five scenario results before proceeding.

---

### PHASE 13 — Commit

```
git add -A
git commit -m "feat: dynamic effect schema cache — introspect AE params on drop, cache to disk, diff on version change"
git push
```

Confirm push success. Report branch name and commit hash.

---

## 22. Critical Rules for Claude Code

These rules apply to every phase without exception. Do not rationalize exceptions.

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
11. **Data nodes are always `alive`.** Set to `alive` on drop. All hooks return `null`. Never ghost, never park, never cascade. Same applies to blending and matte nodes.
12. **Cascade order is non-negotiable.** Effectors ghost first (outermost to innermost). Affected nodes park last. An affected node is never parked before all its effectors are stripped.
13. **Persistence writes happen only on three events:** AE save, AE quit, panel unload.
14. **Polling pauses during writes.** `isWriting = true` before any `evalBridge.dispatch()`. `isWriting = false` in the callback. Poller skips if `isWriting` is true.
15. **`JSON` is not native in ExtendScript.** `jsx/json.jsx` must be the first file in the `evalBridge` preamble. Never call `JSON.stringify` or `JSON.parse` in any `.jsx` without this polyfill loaded.
16. **One file per node. One node per file.** If adding a new node requires editing `engine.js`, `cascadeAlgorithm.js`, or `dispatcher.jsx` — stop and reconsider the design. Exception: if a new node needs a new **action** that doesn't exist in `dispatcher.jsx`, add the action handler there. This is the only acceptable reason to edit `dispatcher.jsx` when adding a node.
17. **`evalScript` callbacks only fire when AE has window focus.** In testing: trigger the call, click the AE window, then switch back to the browser console to see the result.
18. **Layer stacking in AE is 1-based. `layerOrder` in panel is 0-based.** Index 0 = AE layer 1 (top). Reorder using `moveToBeginning()` from bottom to top.
19. **Effect opacity values stored as 0–100 must be divided by 100** before setting AE properties that expect a 0–1 range (e.g. `ADBE Fill-0006`). This normalization happens inside the dispatcher action handler, not in the node definition.
20. **Blending node `main_input` only accepts wires from affected nodes.** `wireValidator` must reject wires from effector outputs into a blending node's `main_input`. This check is type-level — it applies regardless of what is upstream of the effector.
21. **Matte node activation requires three simultaneous conditions.** Both input wires connected, both upstream layers sharing the same first-level hosting comp, and the output wired to that same comp. If any condition is unmet, the matte node stays ghost and no AE action fires.

---

*Procedia v4 — Architecture Specification — May 2026*
*This document is the single source of truth for Claude Code and for the developer.*
*Any behavior not described here must be clarified before implementation begins.*
