---
name: create-node
description: Guides the creation of a new Procedia node definition following the established patterns. Always ask the user the required questions before generating any code.
---

# Create Node — Procedia Skill

Use this skill when the user wants to create a new node for Procedia. Before writing any code, you **must** ask the user the following questions in order.

## Required Questions

### 1. Affected or not?
Determine the `nodeKind`:
- **`affected`** — owns a standalone AE layer. Has parent ports (`child_of`, `parent_of`). Lifecycle: `onDrop`, `onAlive`, `onGhost`, `onDelete`, `onPropertyChange`. Uses actions like `createTextLayer`, `parkLayer`, `deleteParkedLayer`, `setLayerProperty`.
- **`effector`** — modifies an upstream layer's effect. No parent ports. `params: 'dynamic'`. Has `matchName`. Uses `applyDynamicEffect`, `removeEffect`, `setEffectProperty`.
- **`data`** — no AE presence. All hooks return `null`. Single `output` port of type `data`.
- **`blending`** — sets `layer.blendingMode` on upstream affected layer. Always alive. Uses `setBlendingMode`.
- **`matte`** — sets `layer.trackMatteType`. Two input ports: `top_layer` + `matte_layer`. Uses `setLumaMatte`/`setAlphaMatte`, `clearMatte`.

### 2. Dedicated or not?
- `dedicated: true` — node creates an AE project object (CompItem, FootageItem solid). Creation order: AE object first, layer second.
- `dedicated: false` — no standalone AE project object.

### 3. What does the node do?
Understand the purpose to determine ports, params, and lifecycle actions.

### 4. Does the dispatcher have the correct instruction to pass to After Effects?
Check `_docs/CLAUDE.md` (Skill 9 — Dispatcher Pattern, complete action table) and `jsx/dispatcher/dispatcher.jsx`. If the action doesn't exist, you must also create a new handler in `dispatcher.jsx` and register it in `_route()`, then add the action name to the whitelist in `bridge/evalBridge.js`. This is the only acceptable second file when adding a node.

### 5. What category does the node belong to?
Matches the `category` field in the node definition. Existing categories: `Core`, `Layers`, `Data`, `Shapes`, `Track Matte`, `Utility`, and 22 effect categories (e.g. `Blur & Sharpen`, `Color Correction`, `Distort`, `Generate`, `Perspective`, `Simulation`, `Stylize`, `Text`, `Time`, `Transition`, etc.).

## Port Contracts by nodeKind

### `affected` (source node — no upstream layer input)
```javascript
ports: [
  { id: 'output',    category: 'output', type: 'layer',  capacity: 'single' },
  { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent', capacity: 'single' },
  { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent' }
]
```
For nodes that accept layer inputs (e.g. CompNode): add `main_input` port.
For shape nodes: add `secondaryInput` data ports for each param that can accept data wires.

### `effector` (non-negotiable)
```javascript
ports: [
  { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true },
  { id: 'output',     category: 'output',    type: 'layer', capacity: 'single' }
  // NO parent ports
]
```

### `data`
```javascript
ports: [
  { id: 'output', category: 'output', type: 'data' }
]
```

### `blending`
```javascript
ports: [
  { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true },
  { id: 'output',     category: 'output',    type: 'layer', capacity: 'single' }
]
```

### `matte`
```javascript
ports: [
  { id: 'top_layer',   category: 'mainInput',      type: 'layer', capacity: 'single', required: true, label: 'Foreground' },
  { id: 'matte_layer', category: 'secondaryInput',  type: 'layer', capacity: 'single', required: true, label: 'Matte' },
  { id: 'output',      category: 'output',          type: 'layer', capacity: 'single' }
]
```

## Lifecycle Hook Signatures

| `nodeKind` | `onAlive` | `onGhost` | `onPropertyChange` |
|---|---|---|---|
| `affected` | `(nodeData, hostingCompUUID)` | `(nodeData, hostingCompUUID)` | `(key, value, nodeData, hostingCompUUID)` |
| `effector` | `(nodeData, hostingCompUUID, upstreamNodeUUID)` | `(nodeData, hostingCompUUID, upstreamNodeUUID)` | `(key, value, nodeData, hostingCompUUID, upstreamNodeUUID)` |
| `data` | returns `null` | returns `null` | returns `null` |
| `blending` | `(nodeData, hostingCompUUID, upstreamNodeUUID)` | `(nodeData, hostingCompUUID, upstreamNodeUUID)` | `(key, value, nodeData, hostingCompUUID, upstreamNodeUUID)` |
| `matte` | `(nodeData, hostingCompUUID, topLayerUUID, matteLayerUUID)` | `(nodeData, hostingCompUUID, topLayerUUID)` | `(key, value, nodeData, hostingCompUUID, topLayerUUID, matteLayerUUID)` |

## File Placement

- Node definition file: `graph/nodes/categories/<Category>/<NodeName>.js`
- Add `<script>` tag to `graph/nodes/loadNodes.js`
- If new dispatcher action needed: add to `jsx/dispatcher/dispatcher.jsx` + whitelist in `bridge/evalBridge.js`

## Registration

Every node file ends with:
```javascript
nodeRegistry.register(NodeName);
```

## Verification Checklist

- [ ] All 5 lifecycle hooks present (onDrop, onAlive, onGhost, onDelete, onPropertyChange)
- [ ] `onDisable`/`onEnable` also present for affected nodes (CompNode, Rectangle pattern)
- [ ] `nodeKind` and `dedicated` set as type-level constants (not per instance)
- [ ] Every param has a `default` matching its declared `type`
- [ ] Port contracts match the nodeKind
- [ ] New `<script>` tag added to `graph/nodes/loadNodes.js`
- [ ] Dispatcher action exists (either existing or newly added)
- [ ] New dispatcher action registered in `_route()` and whitelisted in `bridge/evalBridge.js`
- [ ] Panel loads without console errors
