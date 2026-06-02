# CLAUDE.md — Procedia
*CEP · After Effects 2025+ · Windows · ExtendScript ES3*
*This file is the single source of truth for Claude Code behavior on this project.*
*Read this file in full before touching any file, in any task, without exception.*

---

## What is Procedia?

Procedia is a **node-based procedural motion design plugin for Adobe After Effects**, built as a **CEP panel**. The panel UI runs in a Chromium-based environment. All After Effects operations are executed via **ExtendScript (.jsx)** bridged through `csInterface.evalScript()`.

**Stack:**
- Platform: Windows, CEP (not UXP)
- Panel language: JavaScript (modern JS is fine in panel files)
- AE scripting: ExtendScript — **strict ES3, zero exceptions**
- Bridge: `csInterface.evalScript()` — string in, string out, always async
- AE version: After Effects 2025+
- No bundler, no ES modules — plain `<script>` tags in `index.html`, loaded in exact order

**Architecture in one sentence:**
A node returns a plain command object. The engine passes it to `evalBridge`. `evalBridge` sends it to `jsx/dispatcher/dispatcher.jsx`. The dispatcher executes it in AE. Nothing else touches AE.

---

## Quick Reference — 16 Skills

| # | Skill | The rule in one line |
|---|---|---|
| 1 | ES3 Syntax | `var` only, named functions, string concat, `for` loops — nothing else |
| 2 | evalScript Bridge | String in, string out. Always `JSON.stringify` out, always `JSON.parse` in |
| 3 | Error Handling | Every `.jsx` function returns `{ ok, data, error }`. Panel always checks `res.ok` |
| 4 | AE Comp API | 1-indexed. Always `instanceof CompItem` check before use |
| 5 | AE Layer & Property API | Always navigate by match name string, never by index |
| 6 | AE Effects API | Access effects by match name only. Never hardcode index numbers |
| 7 | AE Project Folder API | Always find-or-create the Procedia folder before any write |
| 8 | UUID as Identifier | UUID is the only identifier. Stored in `.comment` field. **AE layer `.comment` = terminal wire UUID, not node UUID.** |
| 9 | Dispatcher Pattern | Nodes return command objects. Only `dispatcher.jsx` writes AE calls |
| 10 | Node Definition Contract — Core | One file per node. All hooks, ports, and params declared in that file |
| 11 | Node Definition Contract — Node Kinds | Five node kinds with distinct lifecycle rules. Know each one cold. |
| 12 | File Structure & Load Order | Dependency headers on every file. `index.html` is load-order truth |
| 13 | Task Execution Protocol | One task, one verification, one stop. Never chain without confirmation |
| 14 | Grounded Decision Protocol | Decide once, lock it, escalate when stuck, gate on ambiguity |
| 15 | Ghost Cascade Rules | Only layer wires trigger cascade. Parent, data, blending, and matte wires are never traversed |
| 16 | Dynamic Effect Schema Cache | Effect schemas introspected from AE on first drop, cached to disk, diffed on version change |

---

## Detailed Skill Sections

---

### SKILL 1 — ExtendScript ES3 Syntax

ExtendScript runs on a pre-ES5 engine. Modern JS features silently fail or produce cryptic errors inside After Effects. There are no warnings. There are no exceptions to this skill.

**Forbidden — never use these in any `.jsx` file:**
- `const` or `let` — use `var`
- Arrow functions `() =>` — use named functions
- Template literals `` `${}` `` — use string concatenation
- `.forEach()`, `.map()`, `.filter()`, `.reduce()` — use `for` loops
- Destructuring `const { x } = obj` — access by property name
- Spread `...args` — copy manually
- Default parameters `function(x = 0)` — guard inside function body
- `Promise`, `async`, `await` — use callbacks
- `Object.keys()` — not available in ExtendScript. Iterate manually with `for...in`
- `JSON` as a native global — it is NOT available in AE 2025. Load `jsx/json.jsx` first.

**`Object.keys` note:** `Object.keys` is valid in panel JS (Chromium). Never use it in `.jsx` files.

**✅ Correct:**
```jsx
function createLayer(compUUID, label) {
  var result = { ok: false, data: null, error: null };
  try {
    var proj = app.project;
    for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof CompItem && item.comment === compUUID) {
        var layer = item.layers.addText(label);
        layer.comment = label;
        result.ok = true;
        result.data = { name: layer.name };
        break;
      }
    }
    if (!result.ok) result.error = 'Comp not found: ' + compUUID;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

**❌ Wrong:**
```jsx
const createLayer = (compUUID, label) => {
  const item = app.project.items.find(i => i.comment === compUUID);
  return { ok: true, data: item.name }; // object not string, arrow fn, no try/catch
};
```

---

### SKILL 2 — evalScript Bridge

The bridge between the CEP panel and AE is **string-based only**. Objects cannot cross. The bridge is async. Callbacks only fire when AE has window focus.

**Rules:**
- ExtendScript must always end with `return JSON.stringify(result)`
- Panel JS must always `JSON.parse(result)` on the response
- Never pass complex objects as arguments — serialize them first, inject as strings
- `evalBridge.js` is the **only** file that calls `csInterface.evalScript()`. No other file touches it directly.
- `evalBridge` exposes exactly two functions: `dispatch(commandObj)` and `dispatchBatch(commandArr)` — both return Promises.

**✅ Correct — panel JS calls evalBridge only:**
```javascript
evalBridge.dispatch({ action: 'createTextLayer', params: { compUUID: id, content: 'Hello' } })
  .then(function(res) {
    if (!res.ok) { console.error('[Procedia]', res.error); return; }
    console.log('[Procedia] Layer created:', res.data);
  });
```

**✅ Correct — evalBridge internal pattern:**
```javascript
// bridge/evalBridge.js
function dispatch(commandObj) {
  return new Promise(function(resolve, reject) {
    var json = JSON.stringify(commandObj);
    var call = 'dispatch(' + JSON.stringify(json) + ')';
    csInterface.evalScript(call, function(result) {
      try { resolve(JSON.parse(result)); }
      catch(e) { reject(new Error('Bridge parse error: ' + result)); }
    });
  });
}
```

**Testing note:** evalScript callbacks only fire when AE has window focus. In manual testing: trigger the call, click the AE window, then switch back to the browser console to see the result.

---

### SKILL 3 — Error Handling

Every ExtendScript function must be wrapped in try/catch. AE will not surface errors to the panel unless you explicitly catch and return them.

**Rules:**
- Every `.jsx` function returns `{ ok: boolean, data: any, error: string|null }`
- Always `return JSON.stringify(result)` as the last line — even on error paths
- Panel JS always checks `res.ok` before using `res.data`
- Never swallow errors silently. Always log `res.error` when `res.ok === false`

**✅ Correct:**
```jsx
function parkLayer(nodeUUID, hostingCompUUID, reservedCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) { result.error = 'Host comp not found: ' + hostingCompUUID; return JSON.stringify(result); }
    var layer = findLayerByUUID(hostComp, nodeUUID);
    if (!layer) { result.error = 'Layer not found: ' + nodeUUID; return JSON.stringify(result); }
    var reserved = findCompByUUID(reservedCompUUID);
    if (!reserved) { result.error = 'Reserved comp not found'; return JSON.stringify(result); }
    layer.moveBefore(reserved.layer(1));
    result.ok = true;
    result.data = { parked: nodeUUID };
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

---

### SKILL 4 — AE Comp API

AE project items are 1-indexed. Always verify type before use.

**Rules:**
- Items accessed via `app.project.item(i)` where `i` starts at **1**
- Always check `item instanceof CompItem` before treating it as a comp
- Always check `app.project.numItems > 0` before iterating
- Use `.comment` to store and find Procedia UUIDs
- **Never iterate over the Reserved Comp.** Skip any comp whose name starts with `'DO NOT DELETE'`

**✅ Correct:**
```jsx
function findCompByUUID(uuid) {
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.comment === uuid) return item;
  }
  return null;
}
```

---

### SKILL 5 — AE Layer & Property API

Layers contain properties organized in a hierarchy. Always navigate by **match name**, never by display name or index.

**Rules:**
- Access properties via `.property("matchName")` — not `.property(1)`
- Match names are stable across AE versions and language settings
- Layer types: `AVLayer`, `TextLayer`, `ShapeLayer`, `NullLayer`
- Always check layer type before accessing type-specific properties
- Find layers by UUID stored in `layer.comment` — **layer.comment stores the terminal wire UUID, not the node UUID**

**Common match names:**
```
Transform group:  "ADBE Transform Group"
Position:         "ADBE Position"
Scale:            "ADBE Scale"
Rotation:         "ADBE Rotate Z"
Opacity:          "ADBE Opacity"
```

**✅ Correct:**
```jsx
function setLayerOpacity(layer, value) {
  var xform = layer.property('ADBE Transform Group');
  var opacity = xform.property('ADBE Opacity');
  opacity.setValue(value);
}
```

---

### SKILL 6 — AE Effects API

Effects are accessed by match name only. Display names change with language. Index positions change when effects are added or removed.

**Rules:**
- Add effects: `layer.Effects.addProperty(matchName)`
- Find effects: iterate `layer.Effects`, check `effect.matchName === targetMatchName`
- Remove effects: find by match name first, then call `.remove()`
- Never hardcode an effect index. Never access `layer.Effects.property(1)`
- Effect property values that Procedia stores as 0–100 must be divided by 100 before being set on AE properties that expect a 0–1 range (e.g. `ADBE Fill-0006` opacity). This normalization happens inside the dispatcher action handler — never in the node definition.

**✅ Correct:**
```jsx
function findEffectByMatchName(layer, matchName) {
  var effects = layer.Effects;
  for (var i = 1; i <= effects.numProperties; i++) {
    if (effects.property(i).matchName === matchName) return effects.property(i);
  }
  return null;
}
```

---

### SKILL 7 — AE Project Folder API

All Procedia-created AE objects (comps, solids, footage) live inside the Procedia project folder. The folder must exist before any write.

**Rules:**
- Folder name: `'DO NOT DELETE — Procedia Reserved'`
- Always find-or-create before writing. Never assume it exists.
- Never write items to the project root
- `FolderItem` is the AE type for project panel folders

**✅ Correct:**
```jsx
function findOrCreateProcediaFolder() {
  var name = 'DO NOT DELETE — Procedia Reserved';
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof FolderItem && item.name === name) return item;
  }
  return proj.items.addFolder(name);
}
```

---

### SKILL 8 — UUID as Identifier

UUID is the only identifier that links panel graph nodes to AE objects. Every other identifier (label, layer name, comp name) can be changed by the user at any time.

**Path-driven layer model — critical rule:**
AE layer `.comment` stores the **terminal wire UUID** — not the node UUID. One affected node can have multiple downstream paths into a comp; each path produces one AE layer, identified by the wire UUID of that path's terminal wire (the wire whose `toNode` is a CompNode).

**Rules:**
- Node UUID format: `PROC-{timestamp}-{rand4}` e.g. `PROC-1716000000000-a3f2`
- Wire UUID format: `WIRE-{timestamp}-{rand4}`
- UUIDs are generated in panel JS via `uuidGenerator.js`, never in ExtendScript
- Node UUIDs are stored in `comp.comment` in AE (CompNode only)
- **Layer `.comment` = terminal wire UUID** (not node UUID). This is how the dispatcher finds the correct layer for a given path.
- UUID is never shown in the UI except in the inspector's read-only state field
- Never use `layer.name`, `comp.name`, or node label as a lookup key

---

### SKILL 9 — Dispatcher Pattern

This is the most important architectural rule in v4. **Nodes never write ExtendScript. Only `dispatcher.jsx` writes AE calls.**

**How it works:**
1. A node lifecycle hook returns a plain command object: `{ action: 'createTextLayer', params: {...} }`
2. The engine passes the command to `evalBridge.dispatch(commandObj)`
3. `evalBridge` serializes it and calls `csInterface.evalScript('dispatch(...)')`
4. `dispatcher.jsx` receives the serialized command, routes to the named action handler, returns `JSON.stringify({ ok, data, error })`

**Complete dispatcher action table:**

| Action | What it does in AE |
|---|---|
| `createComp` | Creates a new `CompItem` in the Procedia folder |
| `createTextLayer` | `comp.layers.addText(...)` |
| `createNullLayer` | `comp.layers.addNull(...)` |
| `createShapeLayer` | `comp.layers.addShape(...)` |
| `createAdjustmentLayer` | `comp.layers.addShape(...)` with adjustment layer flag enabled |
| `addCompAsLayer` | Adds an existing `CompItem` as a pre-comp layer in the hosting comp |
| `parkLayer` | Moves the layer from hosting comp to Reserved Comp |
| `unparkLayer` | Moves the layer from Reserved Comp to hosting comp; re-stamps `layer.comment` |
| `deleteParkedLayer` | Removes a layer permanently from Reserved Comp |
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
| `applyDynamicEffect` | Applies an effect and sets all its properties from a props map keyed by match name |
| `removeEffect` | Finds effect by match name and removes it |
| `setEffectProperty` | Sets a named property on an existing effect by match name |
| `restampLayer` | Re-stamps `layer.comment` with a new UUID (used during wire transplant) |
| `pollAliveNodes` | Single multi-UUID check — returns missing and present UUIDs |
| `setBlendingMode` | Sets `layer.blendingMode` on the layer identified by `layerNodeUUID`. Accepts a blending mode string mapped to AE `BlendingMode` enum. |
| `setLumaMatte` | Sets `TrackMatteType.LUMA` on the top layer using the matte layer as source. Applies `invert` flag. Reorders layers if needed so matte layer is directly above top layer. |
| `setAlphaMatte` | Sets `TrackMatteType.ALPHA` on the top layer using the matte layer as source. Applies `invert` flag. Reorders layers if needed. |
| `clearMatte` | Sets `layer.trackMatteType = TrackMatteType.NO_TRACK_MATTE` on the top layer. |
| `introspectEffect` | Creates a temp solid in Reserved Comp, applies the effect, walks all properties to build a schema array, removes temp layer. Returns schema. Temp layer cleanup happens on both success and failure paths — non-negotiable. |
| `readSchemaCache` | Reads `effectSchemaCache.json` from the plugin directory and returns its parsed contents. |
| `writeSchemaCache` | Writes the provided cache object to `effectSchemaCache.json` in the plugin directory. |
| `getAEVersion` | Returns the running AE version string (`app.version`). Never parse or truncate — store the full string verbatim. |

**Adding a new action:**
- Open `jsx/dispatcher/dispatcher.jsx`
- Add one named function: `function actionMyNewThing(params) { ... }`
- Register it in `_route()` at the top of the file
- This is the **only** acceptable reason to edit `dispatcher.jsx` when adding a new node

**Rules:**
- `evalBridge.js` is the only file that calls `csInterface.evalScript()`
- `dispatcher.jsx` is the only `.jsx` file that contains AE API calls
- Node definition hooks return command objects or `null` — they never call `evalBridge` directly
- `engine.js` contains zero node-type conditionals — it calls hooks by name, passes results to `evalBridge`

---

### SKILL 10 — Node Definition Contract — Core

Every node is a plain JS object registered with `nodeRegistry.register()`. One file, one node.

**Mandatory rules:**
- All 5 lifecycle hooks must be present on every node definition, even if they return `null`
- Every param must have a `default` matching its declared `type`
- `nodeKind` and `dedicated` are never set per instance — they are type-level constants
- The file ends with `nodeRegistry.register(NodeName)` — no other registration step needed
- No `import`/`export` statements anywhere

**`dedicated` reference — memorize this:**

| Node | `dedicated` | AE Project Object |
|---|---|---|
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

**Creation order for `dedicated: true` nodes — non-negotiable:**
1. Create the AE project object first (CompItem or FootageItem/solid)
2. Add as a layer to the hosting comp second

**Affected node port contract (source node — no upstream layer input):**
```javascript
ports: [
  { id: 'output',     category: 'output', type: 'layer',  extendable: false },
  { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'   },
  { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'   }
]
```

**Effector port contract — non-negotiable:**
Every effector node has exactly this port structure. No variations, no exceptions:
```javascript
ports: [
  { id: 'main_input', category: 'mainInput', type: 'layer', required: true },
  { id: 'output',     category: 'output',    type: 'layer', extendable: false }
  // NO parent ports — effectors have no standalone AE layer
]
```

**Canonical affected node example (TextNode):**
```javascript
var TextNode = {
  type: 'layers/text', label: 'Text', category: 'Layers', version: '1.0.0',
  nodeKind: 'affected', dedicated: false,

  ports: [
    { id: 'output',    category: 'output', type: 'layer',  extendable: false },
    { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'   },
    { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'   }
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
      params: { nodeUUID: nodeData.id, hostingCompUUID: hostingCompUUID, key: key, value: value }
    };
  }
};
nodeRegistry.register(TextNode);
```

---

### SKILL 11 — Node Definition Contract — Node Kinds

There are five `nodeKind` values. Each has distinct lifecycle rules. Know every row cold before writing or editing any node file.

| `nodeKind` | AE Presence | Always Alive | Lifecycle Hooks |
|---|---|---|---|
| `affected` | AE layer (alive) or parked in Reserved Comp (ghost) | No | All 5 hooks active |
| `effector` | AE effect on upstream layer (alive) or removed (ghost) | No | All 5 hooks active; takes `upstreamNodeUUID` as 3rd arg in `onAlive`, `onGhost`, `onPropertyChange` |
| `data` | None | **Yes** | All 5 hooks present but return `null` |
| `blending` | Sets `layer.blendingMode` on upstream affected node's layer | **Yes** | All 5 hooks present; takes `upstreamNodeUUID` as 3rd arg in `onAlive`, `onGhost`, `onPropertyChange` |
| `matte` | Sets `layer.trackMatteType` on the top layer using the matte layer as source | **Yes** | All 5 hooks present; `onAlive`/`onPropertyChange` take `topLayerUUID` + `matteLayerUUID` as 3rd and 4th args; `onGhost` takes `topLayerUUID` as 3rd arg only |

---

#### Data nodes (`nodeKind: 'data'`)

Set to `alive` immediately on drop. No AE presence. All lifecycle hooks return `null`. They drive extendable param slots on downstream effectors via data wires. Never ghost, never park, never cascade.

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

#### Effector nodes (`nodeKind: 'effector'`)

Effectors modify an existing layer owned by an upstream affected node. They create no standalone AE layer. They declare `params: 'dynamic'` — the engine resolves the property schema from `schemaCache` at drop time and injects secondary input port slots. `upstreamNodeUUID` is the terminal wire UUID — the `.comment` value on the AE layer to find for effect application.

**Effector hook signature — non-negotiable:**
```javascript
var FillEffectNode = {
  type: 'effects/fill', label: 'Fill', category: 'Effects', version: '1.0.0',
  nodeKind: 'effector', dedicated: false,
  matchName: 'ADBE Fill',
  params: 'dynamic',   // resolved from schemaCache at drop time

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', required: true },
    { id: 'output',     category: 'output',    type: 'layer', extendable: false }
  ],

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'applyDynamicEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,  // terminal wire UUID — used to find the AE layer
        matchName:       'ADBE Fill',
        props:           nodeData.props     // keyed by property matchName
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

#### Blending nodes (`nodeKind: 'blending'`)

Always alive from drop. No ghost/park cycle. Applies an AE blending mode to the AE layer of the affected node wired directly into its `main_input` port. Cannot be wired to an effector's output — `wireValidator` rejects it.

On wire connect: call `setBlendingMode`. On wire disconnect or delete: call `setBlendingMode` with `mode: 'NORMAL'`. On property change: call `setBlendingMode` with new mode. The dispatcher maps the string mode value to the correct `BlendingMode` enum — the node definition passes the string only.

```javascript
var BlendingNode = {
  type: 'utility/blending', label: 'Blending', category: 'Utility', version: '1.0.0',
  nodeKind: 'blending', dedicated: false,

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', required: true },
    { id: 'output',     category: 'output',    type: 'layer', extendable: false }
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

#### Matte nodes (`nodeKind: 'matte'`)

Always alive from drop. Two variants: `MatteLumaNode` and `MatteAlphaNode` — structurally identical, differing only in `TrackMatteType` applied.

**Three-condition activation rule (enforced by `wireValidator`):** All three must be true before `onAlive` fires:
1. Both `top_layer` and `matte_layer` input wires are connected.
2. Both upstream layers share the same first-level hosting comp.
3. The matte node's output wire connects to that same comp.

If any condition fails: node stays ghost, no AE action fires, warning shown in notification bar.

The dispatcher is responsible for reordering layers so the matte layer is directly above the top layer before setting `trackMatteType`. The node definition is unaware of layer ordering.

```javascript
var MatteLumaNode = {
  type: 'utility/matte-luma', label: 'Matte Luma', category: 'Utility', version: '1.0.0',
  nodeKind: 'matte', dedicated: false,

  ports: [
    { id: 'top_layer',   category: 'mainInput',     type: 'layer', required: true },
    { id: 'matte_layer', category: 'secondaryInput', type: 'layer', required: true },
    { id: 'output',      category: 'output',         type: 'layer', extendable: false }
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
// MatteAlphaNode is identical with type: 'utility/matte-alpha', label: 'Matte Alpha',
// and action strings changed to 'setAlphaMatte' / 'clearMatte'.
```

---

### SKILL 12 — File Structure & Load Order

This project has no bundler and no ES modules. `index.html` is the only source of load order truth. Files are loaded via `<script>` tags in exact top-to-bottom order.

**Every file must declare its dependencies at the top:**
```javascript
// graph/engine/nodes/index.js
// DEPENDS ON: graph/engine/nodes/dropNode.js, graph/engine/nodes/deleteNode.js,
//             graph/engine/nodes/duplicateNode.js, graph/engine/nodes/lockNode.js,
//             graph/engine/nodes/recreateNode.js
// MUST LOAD BEFORE: engine/state.js, engine/index.js
```

**Rules:**
- Never create a file without adding its `<script>` tag to `index.html` in the same task
- Group tags in `index.html` by layer: infrastructure → node definitions → engine → canvas → ui → entry point
- When splitting a file, create a folder named after the original file and place splits inside it. Delete the original.
- Never split mid-task. Declare the split as its own step before writing any code.
- After any file change, the first verification item is always: panel loads without console errors

**Load order in `index.html`:**
```html
<!-- 1. CEP interface -->
<script src="lib/CSInterface.js"></script>

<!-- 2. Infrastructure — no dependencies -->
<script src="data/uuidGenerator.js"></script>
<script src="bridge/evalBridge.js"></script>
<script src="graph/graphState/state.js"></script>
<script src="graph/graphState/tempGraph.js"></script>
<script src="graph/graphState/nodes.js"></script>
<script src="graph/graphState/wires.js"></script>
<script src="graph/graphState/props.js"></script>
<script src="graph/graphState/selection.js"></script>
<script src="graph/graphState/graphOps.js"></script>
<script src="graph/graphState/index.js"></script>
<script src="graph/nodeRegistry.js"></script>
<script src="ui/settings.js"></script>

<!-- 3. Node definitions — depend on nodeRegistry -->
<script src="graph/nodes/categories/core/Comp.js"></script>
<script src="graph/nodes/categories/layers/Text.js"></script>
<script src="graph/nodes/categories/layers/Null.js"></script>
<script src="graph/nodes/categories/layers/Shape.js"></script>
<script src="graph/nodes/categories/layers/Adjustment.js"></script>
<script src="graph/nodes/categories/effects/FillEffect.js"></script>
<script src="graph/nodes/categories/effects/GaussianBlur.js"></script>
<script src="graph/nodes/categories/effects/DropShadow.js"></script>
<script src="graph/nodes/categories/data/Color.js"></script>
<script src="graph/nodes/categories/data/Number.js"></script>
<script src="graph/nodes/categories/utility/Blending.js"></script>
<script src="graph/nodes/categories/utility/MatteLuma.js"></script>
<script src="graph/nodes/categories/utility/MatteAlpha.js"></script>

<!-- 4. Schema cache — after nodeRegistry, before engine -->
<script src="graph/schemaCache/state.js"></script>
<script src="graph/schemaCache/persistence.js"></script>
<script src="graph/schemaCache/diff.js"></script>
<script src="graph/schemaCache/index.js"></script>

<!-- 5. Graph engine — depends on graphState, nodeRegistry, schemaCache, all nodes -->
<script src="graph/cycleChecker.js"></script>
<script src="graph/wireValidator/portUtils.js"></script>
  <script src="graph/wireValidator/matteValidator.js"></script>
  <script src="graph/wireValidator/canConnect.js"></script>
  <script src="graph/wireValidator/filterPickerList.js"></script>
  <script src="graph/wireValidator/index.js"></script>
<script src="graph/cascade/index.js"></script>
<script src="flush/dirtyFlusher.js"></script>
<script src="graph/engine/helpers.js"></script>
<script src="graph/engine/propagate.js"></script>
<script src="graph/engine/wires.js"></script>
<script src="graph/engine/nodes/dropNode.js"></script>
<script src="graph/engine/nodes/deleteNode.js"></script>
<script src="graph/engine/nodes/duplicateNode.js"></script>
<script src="graph/engine/nodes/lockNode.js"></script>
<script src="graph/engine/nodes/recreateNode.js"></script>
<script src="graph/engine/nodes/index.js"></script>
<script src="graph/engine/state.js"></script>
<script src="graph/engine/index.js"></script>

<!-- 6. Canvas — depends on engine -->
<script src="graph/canvas/viewport.js"></script>
<script src="graph/canvas/renderer.js"></script>
<script src="graph/canvas/input.js"></script>
<script src="graph/canvas/minimap/constants.js"></script>
<script src="graph/canvas/minimap/state.js"></script>
<script src="graph/canvas/minimap/utils.js"></script>
<script src="graph/canvas/minimap/renderer.js"></script>
<script src="graph/canvas/minimap/interaction.js"></script>
<script src="graph/canvas/minimap/index.js"></script>
<script src="graph/canvas/drag.js"></script>
<script src="graph/wire/wireRenderer.js"></script>
<script src="graph/wire/wire.js"></script>

<!-- 7. UI — depends on graphState, nodeRegistry, engine -->
<script src="ui/nodeList.js"></script>
<script src="ui/nodePicker/compatibility.js"></script>
<script src="ui/nodePicker/render.js"></script>
<script src="ui/nodePicker/filter.js"></script>
<script src="ui/nodePicker/events.js"></script>
<script src="ui/nodePicker/index.js"></script>
<script src="ui/inspector.js"></script>
<script src="ui/settingsModal.js"></script>

<!-- 8. Infrastructure services -->
<script src="polling/missingNodes.js"></script>
<script src="polling/notifications.js"></script>
<script src="polling/externalDeletions.js"></script>
<script src="polling/poller.js"></script>

<!-- 9. UI chrome — no graph dependencies -->
<script src="ui/topBar.js"></script>
<script src="ui/bottomBar.js"></script>
<script src="ui/statusBar.js"></script>
<script src="ui/sidebarToggle.js"></script>

<!-- 10. Entry point — depends on everything -->
<script src="index.js"></script>
```

---

### SKILL 13 — Task Execution Protocol

Never chain multiple tasks without verifying each one works first.

**Every task follows this structure:**
```
1. State what you are building — one sentence
2. List every file you will touch
3. State your approach — one sentence (APPROACH: I will...)
4. Write the code
5. Output verification checklist — stop and wait for confirmation
```

**Verification checklist always includes:**
- [ ] Panel loads without console errors (open browser dev tools, check console)
- [ ] The specific behavior works as described
- [ ] Edge cases handled (not found, AE busy, null input)
- [ ] No regressions in adjacent behavior

**AE has no script editor — verification methods:**
- AE does **not** have a built-in script editor available. Never write verification steps that require ESTK or `alert(...)`.
- **Option A — direct panel interaction:** describe the panel action and the expected AE-observable outcome (e.g., "drop a Comp node → comp appears in AE project panel with correct UUID in `.comment`").
- **Option B — CEP DevTools console:** call `evalBridge.dispatch(...)` or run test scripts pasted into the panel's browser DevTools console (accessible via `http://localhost:8088` or the panel's browser dev tools), and check the logged result.
- Never ask the user to run a `.jsx` file in a standalone script editor.

**Hard stops:**
- After every task — do not proceed to the next without explicit confirmation
- After every `.jsx` change — test via panel interaction or DevTools console, not a standalone script runner
- Before creating a new file — always check if it already exists
- Before any git operation — confirm current branch and status

---

### SKILL 14 — Grounded Decision Protocol

Never oscillate between approaches, rewrite working code speculatively, or resolve ambiguity by trying both paths.

**RULE A — Decide once:**
```
APPROACH: I will use [X] because [one reason].
```
That decision is frozen for the task. Only the user can change it.

**RULE B — Escalation ladder when stuck:**
```
STEP 1 → Re-read the relevant CLAUDE.md skill section
STEP 2 → Check Procedia___Architecture_Specification.md for the relevant rule
STEP 3 → State what is unknown and ask ONE specific question. STOP.

Format:
STUCK: [one sentence — what is unknown]
TRIED: [one sentence — what was already attempted]
NEED:  [one specific question]
```

**RULE C — Ambiguity gate:**
If a task is underspecified, stop before touching any file and ask one clarifying question. Never attempt both interpretations.

```
AMBIGUOUS: [what is unclear]
QUESTION:  [the one thing needed to proceed]
```

---

### SKILL 15 — Ghost Cascade Rules

The cascade algorithm governs when nodes transition from `alive` to `ghost`. Getting this wrong corrupts AE state silently.

**Path-driven layer model — the foundation:**
- Each **path** from an affected source node through zero or more effectors into a CompNode produces exactly one AE layer
- A path is identified by its **terminal wire UUID** — the UUID of the wire whose `toNode` is a CompNode
- The terminal wire has a `_pathLayerUUID` field in `wireMap`. When the path is live, `_pathLayerUUID === wireId`. When the path is dormant (no AE layer), `_pathLayerUUID === null`
- Cascade only affects nodes whose terminal wire has an active `_pathLayerUUID`

**Hard rules — never violate:**
- Only `layer` wire deletions trigger cascade. Data wire and parent wire deletions never trigger cascade.
- The cascade traversal in `cascadeAlgorithm.js` must skip any wire whose `type` is `'parent'` or `'data'`
- Only terminal wires with a non-null `_pathLayerUUID` are considered live paths in `hasCompDownstream()`
- Effectors ghost before the affected node they modify. An affected node is never parked before all its effectors are stripped from its layer.
- A node stays alive if it has any remaining comp path downstream — even if the deleted wire was one of several
- **CompNode is never ghosted.** Never add CompNode to the cascade set.
- **Data nodes, blending nodes, and matte nodes are never ghosted.** Never add them to any cascade set.
- The entire cascade is batched into a single `evalBridge.dispatchBatch()` call — one bridge crossing per cascade, regardless of depth

**Dormant terminal wires:**
When a non-terminal wire is deleted and the path becomes incomplete (no source node), the terminal wire's `_pathLayerUUID` is set to `null` — making it dormant. The affected node's layer is parked in Reserved Comp. When the path is later reconnected, `_activateDormantTerminalWiresDownstream` detects the dormant wire and calls `_firePathCreation`, which re-activates the path using `unparkLayer` (not a fresh `onAlive`) to move the existing layer back.

**Key distinction:** `restampLayer` is used only during wire-insertion (drop onto active wire) where the AE layer never leaves the hosting comp. Dormant reconnection always uses `unparkLayer` because the layer was parked.

**Cascade order:**
```
1. Collect all nodes in cascade set (effectors + affected only)
   — Never include: CompNode, data nodes, blending nodes, matte nodes
2. Order: effectors outermost-first, affected nodes last
3. Call onGhost() on each → collect command objects
4. dispatchBatch(allCommands) → one bridge crossing
5. Update all node states to 'ghost' in nodeMap
6. Rebuild tempGraph
7. Schedule persistence write (debounced)
```

---

### SKILL 16 — Dynamic Effect Schema Cache

Effect nodes (`nodeKind: 'effector'`) declare `params: 'dynamic'`. On first drop, the engine introspects AE for the effect's full property schema. The schema is cached to `data/effectSchemaCache.json`. Every subsequent drop of the same node type reads from cache — zero bridge calls. On panel load, if the AE version has changed, all cached schemas are re-introspected and diffed.

**Key files:**
- `graph/schemaCache/` (4 files: state.js, persistence.js, diff.js, index.js) — in-memory cache + disk read/write + AE version diff logic. Public API: `init()`, `hasSchema()`, `getSchema()`, `storeSchema()`, `isReady()`
- `data/effectSchemaCache.json` — ships as `{ "aeVersion": "", "schemas": {} }`. Never created at runtime — must exist on disk.
- Dispatcher actions: `introspectEffect`, `readSchemaCache`, `writeSchemaCache`, `getAEVersion`

**Engine behavior on node drop (when `params === 'dynamic'`):**
1. Call `schemaCache.hasSchema(matchName)`
2. **Cache hit:** call `schemaCache.getSchema()` → store as `nodeMap[uuid].dynamicSchema` → `portManager` spawns secondary input port slots → render inspector
3. **Cache miss:** dispatch `introspectEffect` → on success: `schemaCache.storeSchema()` → store as `dynamicSchema` → spawn port slots → render inspector. On failure: log error, node stays with no inspector params.

**On panel load restore:** any node with `params: 'dynamic'` triggers the same schema resolution path. `dynamicSchema` is never persisted — always resolved fresh.

**Secondary port slot spawning:**
- Port slot ID convention: `secondary_in_{property.matchName}` (non-alphanumeric characters replaced with `_`)
- Spawned ports are `category: 'secondaryInput'`, `type: 'data'`
- `nodeMap[uuid].props` is initialized with `{ [property.matchName]: property.defaultValue }` for each property
- The inspector reads `nodeMap[uuid].props` — no additional schema lookup needed at render time

**`schemaCache.init()` sequence:**
1. Read `effectSchemaCache.json` from disk via `readSchemaCache` action
2. Compare `aeVersion` in cache against live `app.version` from `getAEVersion` action
3. If versions match: `_ready = true`, proceed
4. If versions differ: re-introspect all known schemas, diff against cached, update changed entries, write updated cache to disk, `_ready = true`

**Panel init rule:** The node palette must not be enabled until `schemaCache.isReady()` returns `true`. Graceful degradation if `init()` fails.

**`introspectEffect` cleanup rule — non-negotiable:** The temp solid created in Reserved Comp during introspection must be removed on **both** success and failure paths. No exceptions.

---

## File Directory

```
procedia/
├── index.html                              ← Script load order. Single source of truth.
├── index.js                                ← Panel entry point.
│
├── graph/
│   ├── graphState/
│   │   ├── state.js                    ← Shared internal state (nodeMap, wireMap, tempGraph, selection)
│   │   ├── tempGraph.js                ← rebuildTempGraph — stripped snapshot for consumers
│   │   ├── nodes.js                    ← Node CRUD (addNode, removeNode, updateNode, getNode, getAllNodes)
│   │   ├── wires.js                    ← Wire CRUD (addWire, removeWire, updateWire, getWire, getAllWires)
│   │   ├── props.js                    ← updateProp, clearDirty
│   │   ├── selection.js                ← Multi-select tracking (setSelection, getSelection, etc.)
│   │   ├── graphOps.js                 ← loadGraph, clearGraph
│   │   └── index.js                    ← Assembles graphState from sub-modules
│   │                                     Supports `locked` node property.
│   ├── nodeRegistry.js                     ← register(), getDefinition(), getAll(), getByCategory()
│   ├── schemaCache/                        ← Dynamic effect schema cache (4 files)
│   │   ├── state.js                        ─ Internal state & read accessors
│   │   ├── persistence.js                  ─ Disk persistence via evalBridge
│   │   ├── diff.js                         ─ AE version-diff & schema comparison
│   │   └── index.js                        ─ Aggregates into schemaCache global (init(), getSchema(),
│   │                                         storeSchema(), hasSchema(), isReady())
│   ├── engine/
│   │   ├── helpers.js                      ← Internal helpers: buildInitialProps, refreshNodeUI,
│   │   │                                     resolveDynamicSchema, findPathLayerUUID, etc.
│   │   ├── propagate.js                    ← Alive propagation engine: propagateAlive,
│   │   │                                     checkMatteActivation, firePathCreation
│   │   ├── wires.js                        ← Wire connect/disconnect
│   │   ├── nodes/
│   │   │   ├── dropNode.js                 ← dropNode() — node creation with onDrop dispatch
│   │   │   ├── deleteNode.js               ← deleteNode(), deleteSelectedNodes()
│   │   │   ├── duplicateNode.js            ← duplicateSelectedNodes()
│   │   │   ├── lockNode.js                 ← toggleLockSelectedNodes()
│   │   │   ├── recreateNode.js             ← recreateNode() — error-state recovery
│   │   │   └── index.js                    ← Aggregates into __e_nodes IIFE
│   │   ├── state.js                        ← resetAll(), setNodeProperty()
│   │   └── index.js                        ← Public API — aggregates all engine IIFEs
│   ├── cascadeAlgorithm.js                 ← cascadeGhost(), hasCompDownstream(), collectPathUpstream()
│   ├── cycleChecker.js                     ← hasCycle() — pure graph traversal
│   ├── wireValidator/                      ← Wire type compatibility. Filters picker list.
│   │   ├── portUtils.js                    ← Port lookup & category validation
│   │   ├── matteValidator.js               ← Matte three-condition validation
│   │   ├── canConnect.js                   ← Core connection validation
│   │   ├── filterPickerList.js             ← Picker list filtering
│   │   └── index.js                        ← Aggregates into wireValidator global
│   ├── nodes/
│   │   └── categories/
│   │       ├── core/        Comp.js
│   │       ├── layers/      Text.js, Null.js, Shape.js, Adjustment.js
│   │       ├── effects/     FillEffect.js, GaussianBlur.js, DropShadow.js
│   │       ├── data/        Color.js, Number.js
│   │       └── utility/     Blending.js, MatteLuma.js, MatteAlpha.js
│   ├── canvas/
│   │   ├── viewport.js, renderer.js, input.js, minimap.js (no selection highlight)
│   │   ├── drag.js          ← onDrop handler + wire-insertion (drop on wire to insert mid-path)
│   └── wire/
│       ├── wire.js, wireRenderer.js
│
├── ui/
│   ├── nodeList.js      ← Node palette — category collapse, search, drag-to-canvas
│   │                      Shows drag ghost with category-colored dot + node name
│   ├── nodePicker.js    ← Popup picker when dropping wire on empty canvas
│   ├── inspector.js     ← Inspector panel — renders params for selected node
│   │                      Handles both static (params array) and dynamic (schema) nodes
│   ├── statusBar.js     ← Status bar: node/wire counts, alive/ghost counts, zoom level
│   ├── settings.js      ← Persistent key/value store (localStorage): minimap, wireStyle
│   ├── settingsModal.js ← Gear-button modal — open/close, minimap toggle, wire style select
│   ├── topBar.js        ← Top bar chrome with Save/Undo/Redo/Fit, Duplicate/Delete,
│   │                      Reset/Reload/Settings buttons. Selection-badge removed.
│   ├── bottomBar.js     ← Bottom bar chrome — centered notification text only
│   └── sidebarToggle.js ← Left/right panel collapse toggle
│
├── flush/         dirtyFlusher.js
├── polling/       missingNodes.js, notifications.js, externalDeletions.js, poller.js
│
├── bridge/
│   └── evalBridge.js                       ← ONLY file that calls csInterface.evalScript()
│
├── data/
│   ├── uuidGenerator.js
│   └── effectSchemaCache.json              ← Disk-persisted effect schema cache.
│                                             Ships as { "aeVersion": "", "schemas": {} }.
│                                             Written by schemaCache/persistence.js via writeSchemaCache action.
│
├── lib/
│   └── CSInterface.js
│
└── jsx/
    ├── json.jsx                            ← JSON polyfill. MUST be first in evalBridge preamble.
    ├── utils.jsx                           ← findCompByUUID, findLayerByUUID, findReservedComp,
    │                                         findOrCreateReservedComp, getAEVersion
    ├── persistence.jsx                     ← readGraph, writeGraph, chunking
    └── dispatcher/
        └── dispatcher.jsx                  ← THE ONLY EXTENDSCRIPT WRITER.
```

---

## Absolute Rules — Never Violate

These apply to every task, every file, without exception.

1. **ES3 in all `.jsx` files.** No `const`, `let`, arrow functions, template literals, `forEach`, `Object.keys`, destructuring, spread, default parameters, Promises.

2. **Every `.jsx` function returns `JSON.stringify({ ok, data, error })`.** No exceptions.

3. **`evalBridge.js` is the only file that calls `csInterface.evalScript()`.** No other file touches it.

4. **`graphState/` is the only module that mutates `nodeMap` and `wireMap`.** All other files call into `graphState`.

5. **`dispatcher.jsx` is the only file that contains AE API calls.** Nodes return command objects. They never call AE.

6. **`engine.js` contains zero node-type conditionals.** No `if (node.type === 'CompNode')`, no `switch(nodeKind)`.

7. **Adding a new node touches one file only** — the node definition file — plus adding its `<script>` tag to `index.html`. If any other file needs editing, stop and reconsider the design.

8. **Exception to rule 7:** If the new node needs an AE action that doesn't exist yet, add one handler function to `dispatcher.jsx`. This is the only acceptable second file.

9. **Ghost cascade never traverses `parent` or `data` wires.** These wire types are explicitly skipped in `cascadeAlgorithm.js`.

10. **AE layer `.comment` = terminal wire UUID (not node UUID).** The dispatcher finds AE layers by the `_pathLayerUUID` passed as `layerNodeUUID`. Never look up a layer by node UUID for path-driven operations.

11. **Cascade order is non-negotiable.** Effectors first (outermost to innermost). Affected nodes last. Never park before stripping.

12. **Persistence writes happen only on three events:** AE save, AE quit, panel unload.

13. **Polling pauses during writes.** `isWriting = true` before dispatch. `isWriting = false` in callback. Poller skips if true.

14. **`JSON` is not native in ExtendScript.** `jsx/json.jsx` must be the first file in the evalBridge preamble.

15. **CompNode is always alive.** No ghost state. No park step. Never add CompNode to a cascade set. CompNode `onDelete` skips `onGhost` — no park step ever.

16. **Data nodes, blending nodes, and matte nodes are always alive.** Set to `alive` immediately on drop. Blending and matte nodes call `onGhost` on delete to clear AE state, but no park step ever occurs. None of these three kinds are ever added to a cascade set.

17. **Effect opacity values stored as 0–100 must be divided by 100** before setting AE properties that expect a 0–1 range (e.g. `ADBE Fill-0006`). This normalization happens inside the dispatcher action handler — never in the node definition.

18. **Blending node `main_input` only accepts wires from affected nodes.** `wireValidator` rejects wires from effector outputs. This check is type-level.

19. **Matte node activation requires all three conditions simultaneously.** Both input wires connected, both upstream layers sharing the same first-level hosting comp, output wired to that same comp. If any condition is unmet: node stays ghost, no AE action fires.

20. **AE layer stacking is 1-based. `layerOrder` in panel is 0-based.** Index 0 = AE layer 1 (top). Reorder using `moveToBeginning()` from bottom to top.

21. **One task, one verification, one stop.** Never chain tasks without explicit developer confirmation.

---

## Prerequisite Reading — Before Any Task

Read these documents in this order before starting any implementation task:

1. **This file (`CLAUDE.md`)** — all 16 skills, all absolute rules
2. **`Procedia___Architecture_Specification.md`** — the full system design
3. **The specific task brief or feature doc** for the work at hand

If a task brief contradicts this file, stop and ask. Do not resolve the contradiction by choosing one or the other.

---

*Procedia v4 — CLAUDE.md — May 2026*
*Any behavior not described here must be clarified with the developer before implementation begins.*
