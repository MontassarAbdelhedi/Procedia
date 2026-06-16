# Procedia — Node Definitions Reference

*CEP · After Effects 2025+ · Windows · ExtendScript ES3*

---

## Node Taxonomy

Every node declares a `nodeKind` — a type-level constant, never set per instance. Five node kinds:

| `nodeKind` | AE Presence | Always Alive | Lifecycle Hooks |
|---|---|---|---|
| `affected` | AE layer (alive) or parked in Reserved Comp (ghost) | No | All 5 hooks active |
| `effector` | AE effect on upstream layer (alive) or removed (ghost) | No | All 5; takes `upstreamNodeUUID` as 3rd arg |
| `data` | None | **Yes** | All 5 return `null` |
| `blending` | Sets `layer.blendingMode` on upstream affected node's layer | **Yes** | All 5; takes `upstreamNodeUUID` as 3rd arg |
| `matte` | Sets `layer.trackMatteType` (top/matte layer pair) | **Yes** | All 5; takes `topLayerUUID` + `matteLayerUUID` |

---

## Core / Affected Nodes

### CompNode (`core/comp`)

| Property | Value |
|---|---|
| `type` | `core/comp` |
| `nodeKind` | `affected` |
| `dedicated` | `true` — creates a `CompItem` in AE project |
| File | `graph/nodes/categories/core/Comp.js` |

**Ports:**
| id | category | type | capacity |
|---|---|---|---|
| `main_input` | `mainInput` | `layer` | `infinite` |
| `output` | `output` | `layer` | `single` |
| `child_of` | `parent` | `parent` (role: child) | `single` |
| `parent_of` | `parent` | `parent` (role: parent) | — |

**Params:**
| key | type | default | label | constraints |
|---|---|---|---|---|
| `label` | `string` | `'Comp'` | Label | — |
| `width` | `number` | `1920` | Width | min:4, max:16384 |
| `height` | `number` | `1080` | Height | min:4, max:16384 |
| `frameRate` | `number` | `30` | Frame Rate | min:1, max:999 |
| `duration` | `number` | `10` | Duration (s) | min:0.1, max:3600 |

**Lifecycle:**
| Hook | Returns | Action |
|---|---|---|
| `onDrop` | Command | `createComp` — creates CompItem in AE |
| `onAlive` | Command | `createComp` (standalone) or `addCompAsLayer` (when wired to parent) |
| `onDelete` | Command | `deleteComp` — removes CompItem from project |
| `onPropertyChange` | Command | `setCompProperty` — updates dimensions, fps, duration |

*No `onGhost` — CompNode is never ghosted. Standalone CompNodes become alive immediately on drop.*

---

### FootageNode (`core/footage`)

| Property | Value |
|---|---|
| `type` | `core/footage` |
| `nodeKind` | `affected` |
| `dedicated` | `true` — creates a `FootageItem` in AE project |
| File | `graph/nodes/categories/core/Footage.js` |

**Ports:**
| id | category | type | capacity |
|---|---|---|---|
| `output` | `output` | `layer` | `infinite` |
| `child_of` | `parent` | `parent` (role: child) | `single` |
| `parent_of` | `parent` | `parent` (role: parent) | — |

**Params:**
| key | type | default | label |
|---|---|---|---|
| `label` | `string` | `'Footage'` | Label |

**Lifecycle:**
| Hook | Returns | Action |
|---|---|---|
| `onDrop` | `null` | — |
| `onAlive` | Command | `createFootageLayer` — adds footage as layer in comp |
| `onGhost` | Command | `parkLayer` |
| `onDelete` | Command | `deleteFootageItem` |
| `onPropertyChange` | Command | `setLayerProperty` |

---

## Layer / Affected Nodes

### TextNode (`layers/text`)

| Property | Value |
|---|---|
| `type` | `layers/text` |
| `nodeKind` | `affected` |
| `dedicated` | `false` — no standalone AE project object |
| File | `graph/nodes/categories/layers/Text.js` |

**Ports:**
| id | category | type |
|---|---|---|
| `output` | `output` | `layer` |
| `child_of` | `parent` | `parent` (role: child) |
| `parent_of` | `parent` | `parent` (role: parent) |

**Params:**
| key | type | default | label | constraints |
|---|---|---|---|---|
| `label` | `string` | `'Text'` | Label | — |
| `content` | `string` | `'New Text'` | Content | — |
| `fontSize` | `number` | `72` | Font Size | min:1, max:999 |
| `color` | `color` | `[1,1,1,1]` | Color | — |
| `position` | `vector2` | `[0,0]` | Position | — |
| `rotation` | `number` | `0` | Rotation | — |
| `opacity` | `number` | `100` | Opacity | min:0, max:100 |

**Lifecycle:**
| Hook | Returns | Action |
|---|---|---|
| `onDrop` | `null` | — |
| `onAlive` | Command | `createTextLayer` |
| `onGhost` | Command | `parkLayer` |
| `onDelete` | Command | `deleteParkedLayer` |
| `onPropertyChange` | Command | `setLayerProperty` |

---

### NullNode (`layers/null`)

| Property | Value |
|---|---|
| `type` | `layers/null` |
| `nodeKind` | `affected` |
| `dedicated` | `true` — creates a `FootageItem` (solid) in AE |
| File | `graph/nodes/categories/layers/Null.js` |

**Ports:**
| id | category | type |
|---|---|---|
| `output` | `output` | `layer` |
| `child_of` | `parent` | `parent` (role: child) |
| `parent_of` | `parent` | `parent` (role: parent) |

**Params:**
| key | type | default | label | constraints |
|---|---|---|---|---|
| `label` | `string` | `'Null'` | Label | — |
| `position` | `vector2` | `[0,0]` | Position | — |
| `rotation` | `number` | `0` | Rotation | — |
| `opacity` | `number` | `100` | Opacity | min:0, max:100 |
| `scale` | `vector2` | `[100,100]` | Scale | — |

**Lifecycle:**
| Hook | Returns | Action |
|---|---|---|
| `onDrop` | `null` | — |
| `onAlive` | Command | `createNullLayer` |
| `onGhost` | Command | `parkLayer` |
| `onDelete` | Command | `deleteParkedLayer` |
| `onPropertyChange` | Command | `setLayerProperty` |

---

### ShapeNode (`layers/shape`)

| Property | Value |
|---|---|
| `type` | `layers/shape` |
| `nodeKind` | `affected` |
| `dedicated` | `true` — creates a `FootageItem` in AE |
| File | `graph/nodes/categories/layers/Shape.js` |

**Ports:**
| id | category | type |
|---|---|---|
| `output` | `output` | `layer` |
| `child_of` | `parent` | `parent` (role: child) |
| `parent_of` | `parent` | `parent` (role: parent) |

**Params:**
| key | type | default | label | constraints |
|---|---|---|---|---|
| `label` | `string` | `'Shape'` | Label | — |
| `position` | `vector2` | `[0,0]` | Position | — |
| `rotation` | `number` | `0` | Rotation | — |
| `opacity` | `number` | `100` | Opacity | min:0, max:100 |
| `scale` | `vector2` | `[100,100]` | Scale | — |
| `fillColor` | `color` | `[1,0,1,1]` | Fill Color | — |

**Lifecycle:**
| Hook | Returns | Action |
|---|---|---|
| `onDrop` | `null` | — |
| `onAlive` | Command | `createShapeLayer` |
| `onGhost` | Command | `parkLayer` |
| `onDelete` | Command | `deleteParkedLayer` |
| `onPropertyChange` | Command | `setLayerProperty` |

---

### AdjustmentNode (`layers/adjustment`)

| Property | Value |
|---|---|
| `type` | `layers/adjustment` |
| `nodeKind` | `affected` |
| `dedicated` | `true` — creates a `FootageItem` (solid) as adjustment layer |
| File | `graph/nodes/categories/layers/Adjustment.js` |

**Ports:** Same as ShapeNode (output + parent ports)

**Params:**
| key | type | default | label | constraints |
|---|---|---|---|---|
| `label` | `string` | `'Adjustment'` | Label | — |
| `position` | `vector2` | `[0,0]` | Position | — |
| `rotation` | `number` | `0` | Rotation | — |
| `opacity` | `number` | `100` | Opacity | min:0, max:100 |
| `scale` | `vector2` | `[100,100]` | Scale | — |

**Lifecycle:**
| Hook | Returns | Action |
|---|---|---|
| `onDrop` | `null` | — |
| `onAlive` | Command | `createAdjustmentLayer` |
| `onGhost` | Command | `parkLayer` |
| `onDelete` | Command | `deleteParkedLayer` |
| `onPropertyChange` | Command | `setLayerProperty` |

---

## Data Nodes

All data nodes are **always alive** from drop until delete. All lifecycle hooks return `null`. No AE presence. They drive secondary input ports on downstream effector nodes.

### ColorNode (`data/color`)

| Property | Value |
|---|---|
| `type` | `data/color` |
| `nodeKind` | `data` |
| `dedicated` | `false` |
| File | `graph/nodes/categories/data/Color.js` |

**Ports:**
| id | category | type |
|---|---|---|
| `output` | `output` | `data` |

**Params:**
| key | type | default | label |
|---|---|---|---|
| `color` | `color` | `[1,1,1,1]` | Color |

---

### NumberNode (`data/number`)

| Property | Value |
|---|---|
| `type` | `data/number` |
| `nodeKind` | `data` |
| `dedicated` | `false` |
| File | `graph/nodes/categories/data/Number.js` |

**Ports:**
| id | category | type |
|---|---|---|
| `output` | `output` | `data` |

**Params:**
| key | type | default | label | constraints |
|---|---|---|---|---|
| `label` | `string` | `'Number'` | Label | — |
| `value` | `number` | `50` | Value | min:0, max:100 |

---

## Effector Nodes (Dynamic Params)

All effector nodes declare `params: 'dynamic'`. Individual effect properties are resolved from the schema cache at runtime. No hardcoded parameter lists.

**Canonical effector port contract (non-negotiable):**
```
ports: [
  { id: 'main_input', category: 'mainInput', type: 'layer', required: true },
  { id: 'output',     category: 'output',    type: 'layer' }
]
```

**No parent ports — effectors have no standalone AE layer.**

All effector hooks receive `upstreamNodeUUID` as the 3rd argument (the terminal wire UUID identifying the AE layer to modify).

| Hook | Returns | Action |
|---|---|---|
| `onDrop` | `null` | — |
| `onAlive` | Command | `applyDynamicEffect` — applies effect to upstream layer |
| `onGhost` | Command | `removeEffect` — removes effect from upstream layer |
| `onDelete` | `null` | — (cleaned up via `onGhost` first) |
| `onPropertyChange` | Command | `setEffectProperty` — updates a single effect property by matchName |

### FillEffectNode (`blur-sharpen/fill`)

| Property | Value |
|---|---|
| `type` | `blur-sharpen/fill` |
| `matchName` | `ADBE Fill` |
| File | `graph/nodes/effects/Blur & Sharpen/FillEffect.js` |

### GaussianBlurNode (`blur-sharpen/gaussian-blur`)

| Property | Value |
|---|---|
| `type` | `blur-sharpen/gaussian-blur` |
| `matchName` | `ADBE Gaussian Blur` |
| File | `graph/nodes/effects/Blur & Sharpen/GaussianBlur.js` |

### DropShadowNode (`blur-sharpen/drop-shadow`)

| Property | Value |
|---|---|
| `type` | `blur-sharpen/drop-shadow` |
| `matchName` | `ADBE Drop Shadow` |
| File | `graph/nodes/effects/Blur & Sharpen/DropShadow.js` |

There are ~450+ additional effector node files across 23 effect categories (3D Channel, Audio, Channel, Color Correction, Distort, Expression Controls, Generate, Immersive Video, Keying, Matte, Noise & Grain, obsolete, Perspective, Simulation, Stylize, Text, Time, Transition, Uncategorized, etc.) — all following the same effector pattern with `nodeKind: 'effector'`, `params: 'dynamic'`, and a unique `matchName`.

---

## Blending Node

Always alive from drop. No ghost/park cycle. Applies an AE blending mode to the layer of the affected node wired into its `main_input`.

### BlendingNode (`utility/blending`)

| Property | Value |
|---|---|
| `type` | `utility/blending` |
| `nodeKind` | `blending` |
| `dedicated` | `false` |
| File | `graph/nodes/effects/utility/Blending.js` |

**Ports:**
| id | category | type | required |
|---|---|---|---|
| `main_input` | `mainInput` | `layer` | `true` |
| `output` | `output` | `layer` | — |

*No parent ports.*

**Params:**
| key | type | default | label |
|---|---|---|---|
| `label` | `string` | `'Blending'` | Label |
| `mode` | `enum` | `'NORMAL'` | Mode |

*Note: The actual Blending.js file on disk returns `null` from all hooks (blending handled natively). The architecture spec describes a richer implementation where `onAlive`/`onGhost`/`onPropertyChange` dispatch `setBlendingMode` actions.*

---

## Matte / Effector Nodes

Two matte variants exist. On disk they are declared as `nodeKind: 'effector'` (not `nodeKind: 'matte'`).

### MatteLumaNode (`utility/matte-luma`)

| Property | Value |
|---|---|
| `type` | `utility/matte-luma` |
| `nodeKind` | `effector` |
| `dedicated` | `false` |
| File | `graph/nodes/effects/utility/MatteLuma.js` |

**Ports:**
| id | category | type | required |
|---|---|---|---|
| `main_input` | `mainInput` | `layer` | `true` |
| `output` | `output` | `layer` | — |

**Params:**
| key | type | default | label |
|---|---|---|---|
| `label` | `string` | `'Luma Matte'` | Label |
| `invert` | `boolean` | `false` | Invert |

**Lifecycle:**
| Hook | Returns | Action |
|---|---|---|
| `onDrop` | `null` | — |
| `onAlive` | Command | `setLumaMatte` — applies luma matte from upstream layer |
| `onGhost` | Command | `clearMatte` — clears the matte |
| `onDelete` | `null` | — |
| `onPropertyChange` | Command | `setLayerProperty` |

---

### MatteAlphaNode (`utility/matte-alpha`)

| Property | Value |
|---|---|
| `type` | `utility/matte-alpha` |
| `nodeKind` | `effector` |
| `dedicated` | `false` |
| File | `graph/nodes/effects/utility/MatteAlpha.js` |

**Ports:** Same as MatteLumaNode (main_input + output)

**Params:**
| key | type | default | label |
|---|---|---|---|
| `label` | `string` | `'Alpha Matte'` | Label |
| `invert` | `boolean` | `false` | Invert |

**Lifecycle:** Same as MatteLumaNode but dispatches `setAlphaMatte` / `clearMatte`

---

## `dedicated` Flag Reference

| Node | `dedicated` | AE Project Object |
|---|---|---|
| `CompNode` | `true` | `CompItem` |
| `FootageNode` | `true` | `FootageItem` |
| `NullNode` | `true` | `FootageItem` (solid) |
| `ShapeNode` | `true` | `FootageItem` (solid) |
| `AdjustmentNode` | `true` | `FootageItem` (solid) |
| `TextNode` | `false` | — |
| `ColorNode` | `false` | — |
| `NumberNode` | `false` | — |
| All effector nodes | `false` | — |
| `BlendingNode` | `false` | — |

Creation order for `dedicated: true` nodes: create the AE project object FIRST, then add as a layer to the hosting comp SECOND.

---

## Lifecycle Hook Signatures

| `nodeKind` | `onAlive(nodeData, hostingCompUUID, ...)` | `onGhost(nodeData, hostingCompUUID, ...)` | `onPropertyChange(key, value, nodeData, hostingCompUUID, ...)` |
|---|---|---|---|
| `affected` | `(nodeData, hostingCompUUID)` | `(nodeData, hostingCompUUID)` | `(key, value, nodeData, hostingCompUUID)` |
| `effector` | `(nodeData, hostingCompUUID, upstreamNodeUUID)` | `(nodeData, hostingCompUUID, upstreamNodeUUID)` | `(key, value, nodeData, hostingCompUUID, upstreamNodeUUID)` |
| `data` | all return `null` | all return `null` | all return `null` |
| `blending` | `(nodeData, hostingCompUUID, upstreamNodeUUID)` | `(nodeData, hostingCompUUID, upstreamNodeUUID)` | `(key, value, nodeData, hostingCompUUID, upstreamNodeUUID)` |
| `matte` | `(nodeData, hostingCompUUID, topLayerUUID, matteLayerUUID)` | `(nodeData, hostingCompUUID, topLayerUUID)` | `(key, value, nodeData, hostingCompUUID, topLayerUUID, matteLayerUUID)` |

---

## Registration

Every node definition file ends with:
```javascript
nodeRegistry.register(NodeName);
```

The registry (`graph/nodeRegistry.js`) requires a non-empty `type` string and rejects duplicates. All 474+ node files are loaded dynamically by `graph/nodes/loadNodes.js` via `document.write('<script src="...">')`.
