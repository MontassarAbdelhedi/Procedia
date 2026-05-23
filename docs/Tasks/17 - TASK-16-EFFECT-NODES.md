# TASK-16 — FillEffect.js, GaussianBlur.js, DropShadow.js
*Procedia v4 — Sixteenth task. Builds on completed TASK-01 through TASK-15.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 1, 2, 3, 6, 9, 10, 12 in full — Skills 1 and 6 especially
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 1a (effector nodeKind), 3b (effector port rule), 4 (node definition contract) in full

Confirm both files are present at repo root before starting.

---

## Context

This task introduces the first **effector nodes** in Procedia. Effectors are fundamentally different from affected nodes in every way that matters:

| Property | Affected node | Effector node |
|---|---|---|
| `nodeKind` | `'affected'` | `'effector'` |
| AE presence | Owns a standalone layer | Modifies a layer owned by another node |
| `onAlive` | Creates an AE layer | Applies an effect to the upstream layer |
| `onGhost` | Parks its layer | Removes the effect from the upstream layer |
| `onDelete` | Deletes the parked layer | Removes the effect (same as onGhost) |
| Port pattern | output, child_of, parent_of | layer_in (extendable), output — NO parent ports |
| Cascade order | Ghosted last | Ghosted first (before affected nodes) |

**The effector is a pass-through.** Layer goes in, effect is applied, same layer reference comes out. The output wire carries the same layer UUID as the input wire. The engine does not create a new layer — it passes the reference through.

**Three effector nodes in this task:**

| Node | AE Effect Match Name | Key Params |
|---|---|---|
| FillEffect | `'ADBE Fill'` | color, opacity, blendingMode |
| GaussianBlur | `'ADBE Gaussian Blur 2'` | blurriness, blurDimensions, repeatEdgePixels |
| DropShadow | `'ADBE Drop Shadow'` | color, opacity, direction, distance, softness |

---

## What This Task Does NOT Do

- No affected node changes
- No canvas or UI changes
- No persistence changes

Files written: `graph/nodes/categories/effects/FillEffect.js`, `graph/nodes/categories/effects/GaussianBlur.js`, `graph/nodes/categories/effects/DropShadow.js`.

Files modified: `jsx/dispatcher/dispatcher.jsx` — add `applyEffect`, `removeEffect`, `setEffectProperty` action handlers.

---

## The Effector Lifecycle — Critical Understanding

Before writing any code, internalize this sequence. Getting it wrong corrupts AE state silently.

### `onAlive(nodeData, hostingCompUUID)` — for effectors

The effector does not know which layer it is applied to directly. It only knows `hostingCompUUID`. The upstream affected node's UUID is retrieved by the engine from `wireMap` — the engine finds the layer wire connecting an affected node's output to this effector's `layer_in` port, reads the `fromNode` UUID, and passes it as part of the command.

The effector's `onAlive` hook receives `hostingCompUUID`. The dispatcher finds the upstream layer by searching the hosting comp for a layer whose UUID is the `upstreamNodeUUID` passed in params.

**Who provides `upstreamNodeUUID` to the effector's onAlive?**

The engine. When calling `def.onAlive(nodeData, hostingCompUUID)` for an effector, the engine must first look up the upstream layer node UUID from `wireMap`:

```
upstreamNodeUUID = the fromNode of the wire connected to this effector's layer_in port
```

The engine passes this into the command params. The effector's `onAlive` hook puts it in `params`:

```javascript
onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
  return {
    action: 'applyEffect',
    params: {
      nodeUUID:        nodeData.id,        // the effector's own UUID (stored on the effect)
      hostingCompUUID: hostingCompUUID,
      layerNodeUUID:   upstreamNodeUUID,   // the affected node whose layer gets the effect
      matchName:       'ADBE Fill',        // AE effect match name
      props:           {                   // initial effect property values
        color:        nodeData.props.color,
        opacity:      nodeData.props.opacity,
        blendingMode: nodeData.props.blendingMode
      }
    }
  };
}
```

### Engine update required

`engine.js` currently calls `def.onAlive(nodeData, hostingCompUUID)`. For effector nodes, it must also resolve and pass `upstreamNodeUUID`. Add this to `_propagateAlive` in `engine.js`:

```javascript
// When calling onAlive for an effector:
var upstreamNodeUUID = null;
if (nodeData.nodeKind === 'effector') {
  // Find the wire connecting an affected node's output to this effector's layer_in
  var wires = graphState.getAllWires();
  for (var wId in wires) {
    var w = wires[wId];
    if (w.toNode === nodeData.id && w.type === 'layer') {
      upstreamNodeUUID = w.fromNode;
      break;
    }
  }
}
var cmd = def.onAlive(nodeData, hostingCompUUID, upstreamNodeUUID);
```

This is the **only** node-type conditional permitted in the engine beyond the existing CompNode check. It is necessary because effectors require upstream context that affected nodes do not.

### `onGhost(nodeData, hostingCompUUID)` — for effectors

Remove the effect from the upstream layer. Same `upstreamNodeUUID` lookup applies. The engine must resolve it before calling `onGhost` as well.

### `onDelete(nodeData)` — for effectors

Effectors have no parked state. `onDelete` is identical to `onGhost` — remove the effect from wherever it currently is. If the node is already ghost, there is nothing to remove (the effect was already stripped). Return `null` if the node is ghost.

```javascript
onDelete: function(nodeData) {
  // If already ghost, effect is already removed — nothing to do
  if (nodeData.state === 'ghost') return null;
  // Otherwise same as onGhost — remove the effect
  return {
    action: 'removeEffect',
    params: {
      nodeUUID:      nodeData.id,   // stored in the effect's comment — used to find it
      layerNodeUUID: null,          // engine resolves this, same as onGhost
      hostingCompUUID: null         // engine resolves this from nodeData.hostingComps[0]
    }
  };
}
```

Note: for `onDelete`, the engine resolves `layerNodeUUID` and `hostingCompUUID` the same way as for `onGhost` before dispatching.

---

## Dispatcher Actions for Effectors

Three new dispatcher actions are added in this task. All three go in `jsx/dispatcher/dispatcher.jsx`.

### `applyEffect(params)`

```
params: { nodeUUID, hostingCompUUID, layerNodeUUID, matchName, props }

1. comp  = findCompByUUID(hostingCompUUID) — if null: return error
2. layer = findLayerByUUID(comp, layerNodeUUID) — if null: return error
3. effect = layer.Effects.addProperty(matchName) — adds the effect at the end of the effect list
4. effect.comment = nodeUUID   — store effector UUID on the effect for later lookup
5. Set initial effect properties from props (see per-effect property mapping below)
6. Return { ok: true, data: { effectName: effect.name } }
```

**Per-effect property setting — use if/else on matchName:**

```jsx
// ADBE Fill
if (matchName === 'ADBE Fill') {
  if (props.color)        effect.property('ADBE Fill-0002').setValue([props.color[0], props.color[1], props.color[2]]);
  if (props.opacity !== undefined) effect.property('ADBE Fill-0006').setValue(props.opacity);
}

// ADBE Gaussian Blur 2
if (matchName === 'ADBE Gaussian Blur 2') {
  if (props.blurriness !== undefined)      effect.property('ADBE Gaussian Blur 2-0001').setValue(props.blurriness);
  if (props.blurDimensions !== undefined)  effect.property('ADBE Gaussian Blur 2-0002').setValue(props.blurDimensions);
  if (props.repeatEdgePixels !== undefined) effect.property('ADBE Gaussian Blur 2-0003').setValue(props.repeatEdgePixels);
}

// ADBE Drop Shadow
if (matchName === 'ADBE Drop Shadow') {
  if (props.color)                   effect.property('ADBE Drop Shadow-0001').setValue([props.color[0], props.color[1], props.color[2]]);
  if (props.opacity !== undefined)   effect.property('ADBE Drop Shadow-0002').setValue(props.opacity);
  if (props.direction !== undefined) effect.property('ADBE Drop Shadow-0003').setValue(props.direction);
  if (props.distance !== undefined)  effect.property('ADBE Drop Shadow-0004').setValue(props.distance);
  if (props.softness !== undefined)  effect.property('ADBE Drop Shadow-0005').setValue(props.softness);
}
```

### `removeEffect(params)`

```
params: { nodeUUID, hostingCompUUID, layerNodeUUID }

1. comp  = findCompByUUID(hostingCompUUID) — if null: return { ok: true } (already gone)
2. layer = findLayerByUUID(comp, layerNodeUUID) — if null: return { ok: true } (already gone)
3. Find the effect on the layer whose .comment === nodeUUID:
   var effects = layer.Effects;
   for (var i = 1; i <= effects.numProperties; i++) {
     if (effects.property(i).comment === nodeUUID) {
       effects.property(i).remove();
       break;
     }
   }
4. Return { ok: true, data: { removed: nodeUUID } }
```

Note: if the effect is not found (already removed manually), treat as success — return `{ ok: true }`.

### `setEffectProperty(params)`

```
params: { nodeUUID, hostingCompUUID, layerNodeUUID, matchName, key, value }

Used by onPropertyChange for effector nodes.

1. comp   = findCompByUUID(hostingCompUUID) — if null: return error
2. layer  = findLayerByUUID(comp, layerNodeUUID) — if null: return error
3. Find effect by comment === nodeUUID (same loop as removeEffect)
4. If not found: return error 'Effect not found'
5. Route by matchName + key to the correct effect property sub-id
   (same if/else structure as applyEffect property setting above — one branch per matchName+key)
6. Return { ok: true, data: { key: key } }
```

Add all three to `_route` in `dispatcher.jsx`:

```jsx
if (action === 'applyEffect')      return actionApplyEffect(params);
if (action === 'removeEffect')     return actionRemoveEffect(params);
if (action === 'setEffectProperty') return actionSetEffectProperty(params);
```

---

## PHASE 1 — `graph/nodes/categories/effects/FillEffect.js`

### Identity and classification

| Field | Value |
|---|---|
| `type` | `'effects/fill'` |
| `label` | `'Fill'` |
| `category` | `'Effects'` |
| `version` | `'1.0.0'` |
| `nodeKind` | `'effector'` |
| `dedicated` | `false` |

### Ports — effector pattern, non-negotiable

```javascript
ports: [
  // Main input: layer_in — required, extendable
  // Newborn slots (data wires via picker) bind to effect params
  { id: 'layer_in', category: 'input',  type: 'layer', extendable: true, required: true },
  // Output: same layer reference, passed through
  { id: 'output',   category: 'output', type: 'layer', extendable: false }
  // NO parent ports — effectors have no standalone AE layer
]
```

**Port count: 2. Exactly 2. No exceptions.**

### Params

```javascript
params: [
  { key: 'label',        type: 'string', default: 'Fill',     label: 'Label'                           },
  { key: 'color',        type: 'color',  default: [1, 0, 0, 1], label: 'Color'                         },
  { key: 'opacity',      type: 'number', default: 100,        label: 'Opacity',   min: 0, max: 100     },
  { key: 'blendingMode', type: 'number', default: 0,          label: 'Blend Mode', min: 0, max: 21     }
]
```

Notes:
- `color` is RGBA `[r, g, b, a]` range 0–1. Alpha is stored in the panel but AE Fill only takes RGB — strip alpha when dispatching.
- `blendingMode` is a numeric enum (0 = Normal, AE Fill blending modes are numbered).

### Lifecycle hooks

```javascript
onDrop: function(nodeData) { return null; },

onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
  return {
    action: 'applyEffect',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: hostingCompUUID,
      layerNodeUUID:   upstreamNodeUUID,
      matchName:       'ADBE Fill',
      props: {
        color:        nodeData.props.color,
        opacity:      nodeData.props.opacity,
        blendingMode: nodeData.props.blendingMode
      }
    }
  };
},

onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
  return {
    action: 'removeEffect',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: hostingCompUUID,
      layerNodeUUID:   upstreamNodeUUID
    }
  };
},

onDelete: function(nodeData) {
  if (nodeData.state === 'ghost') return null;
  return {
    action: 'removeEffect',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: nodeData.hostingComps[0] || null,
      layerNodeUUID:   null   // engine resolves before dispatch
    }
  };
},

onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
  return {
    action: 'setEffectProperty',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: hostingCompUUID,
      layerNodeUUID:   upstreamNodeUUID,
      matchName:       'ADBE Fill',
      key:             key,
      value:           value
    }
  };
}
```

### Self-registration

```javascript
nodeRegistry.register(FillEffectNode);
```

---

## PHASE 2 — `graph/nodes/categories/effects/GaussianBlur.js`

### Identity and classification

| Field | Value |
|---|---|
| `type` | `'effects/gaussian-blur'` |
| `label` | `'Gaussian Blur'` |
| `category` | `'Effects'` |
| `version` | `'1.0.0'` |
| `nodeKind` | `'effector'` |
| `dedicated` | `false` |

### Ports

Identical effector pattern — 2 ports, no parent ports.

### Params

```javascript
params: [
  { key: 'label',             type: 'string',  default: 'Gaussian Blur', label: 'Label'                           },
  { key: 'blurriness',        type: 'number',  default: 10,              label: 'Blurriness',  min: 0, max: 1000  },
  { key: 'blurDimensions',    type: 'number',  default: 1,               label: 'Dimensions',  min: 1, max: 3     },
  { key: 'repeatEdgePixels',  type: 'number',  default: 0,               label: 'Repeat Edge', min: 0, max: 1     }
]
```

Notes:
- `blurDimensions`: 1 = Horizontal and Vertical, 2 = Horizontal, 3 = Vertical (AE enum)
- `repeatEdgePixels`: 0 = off, 1 = on (AE checkbox as number)

### Lifecycle hooks

Identical structure to FillEffect with:
- `matchName: 'ADBE Gaussian Blur 2'`
- `props` containing `blurriness`, `blurDimensions`, `repeatEdgePixels`

### Self-registration

```javascript
nodeRegistry.register(GaussianBlurNode);
```

---

## PHASE 3 — `graph/nodes/categories/effects/DropShadow.js`

### Identity and classification

| Field | Value |
|---|---|
| `type` | `'effects/drop-shadow'` |
| `label` | `'Drop Shadow'` |
| `category` | `'Effects'` |
| `version` | `'1.0.0'` |
| `nodeKind` | `'effector'` |
| `dedicated` | `false` |

### Ports

Identical effector pattern — 2 ports, no parent ports.

### Params

```javascript
params: [
  { key: 'label',     type: 'string', default: 'Drop Shadow',  label: 'Label'                          },
  { key: 'color',     type: 'color',  default: [0, 0, 0, 1],   label: 'Color'                          },
  { key: 'opacity',   type: 'number', default: 75,             label: 'Opacity',   min: 0, max: 100    },
  { key: 'direction', type: 'number', default: 135,            label: 'Direction', min: 0, max: 360    },
  { key: 'distance',  type: 'number', default: 5,              label: 'Distance',  min: 0, max: 30000  },
  { key: 'softness',  type: 'number', default: 5,              label: 'Softness',  min: 0, max: 30000  }
]
```

Note: `color` is RGBA — strip alpha when dispatching to AE, same as FillEffect.

### Lifecycle hooks

Identical structure to FillEffect with:
- `matchName: 'ADBE Drop Shadow'`
- `props` containing `color`, `opacity`, `direction`, `distance`, `softness`

### Self-registration

```javascript
nodeRegistry.register(DropShadowNode);
```

---

## PHASE 4 — Engine update (`graph/engine.js`)

Add upstream node resolution for effector hooks. This updates `_propagateAlive` and the corresponding ghost/delete sequences.

### In `_propagateAlive` — resolve `upstreamNodeUUID` before calling `onAlive`

```javascript
function _propagateAlive(nodeId, hostingCompUUID) {
  var nodeData = graphState.getNode(nodeId);
  if (!nodeData) return;
  if (nodeData.hostingComps.indexOf(hostingCompUUID) !== -1) return;

  var def = nodeRegistry.getDefinition(nodeData.type);
  if (!def) return;

  // Resolve upstream layer UUID for effector nodes
  var upstreamNodeUUID = null;
  if (nodeData.nodeKind === 'effector') {
    var allWires = graphState.getAllWires();
    for (var wId in allWires) {
      var w = allWires[wId];
      if (w.toNode === nodeId && w.type === 'layer') {
        upstreamNodeUUID = w.fromNode;
        break;
      }
    }
  }

  var cmd = def.onAlive(nodeData, hostingCompUUID, upstreamNodeUUID);

  // Update state before dispatching
  var newHostingComps = nodeData.hostingComps.slice();
  newHostingComps.push(hostingCompUUID);
  graphState.updateNode(nodeId, { state: 'alive', hostingComps: newHostingComps });

  if (cmd) {
    evalBridge.dispatch(cmd).then(function(res) {
      if (!res.ok) {
        console.error('[engine] onAlive dispatch error:', res.error);
        graphState.updateNode(nodeId, { state: 'error' });
      }
    });
  }

  // Propagate upstream (skip for effectors — they don't propagate further)
  if (nodeData.nodeKind !== 'effector') {
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      var wire = wires[wireId];
      if (wire.toNode === nodeId && wire.type === 'layer') {
        _propagateAlive(wire.fromNode, hostingCompUUID);
      }
    }
  }
}
```

### In `cascadeAlgorithm.js` — resolve `upstreamNodeUUID` before calling `onGhost`

Update `cascadeGhost` step 9 to resolve `upstreamNodeUUID` for effectors before building the command:

```javascript
// When building onGhost commands for each node in ordered cascade set:
for (var i = 0; i < orderedSet.length; i++) {
  var nodeData = orderedSet[i];
  var def      = nodeRegistry.getDefinition(nodeData.type);

  var upstreamNodeUUID = null;
  if (nodeData.nodeKind === 'effector') {
    var allWires = graphState.getAllWires();
    for (var wId in allWires) {
      var w = allWires[wId];
      if (w.toNode === nodeData.id && w.type === 'layer') {
        upstreamNodeUUID = w.fromNode;
        break;
      }
    }
  }

  for (var c = 0; c < losingComps[nodeData.id].length; c++) {
    var compUUID = losingComps[nodeData.id][c];
    var cmd      = def.onGhost(nodeData, compUUID, upstreamNodeUUID);
    if (cmd) batchCommands.push(cmd);
  }
}
```

---

## PHASE 5 — Verification

### Console test — browser

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  function testEffectorNode(defType, expectedLabel, expectedMatchName, expectedParamKeys) {
    var def = nodeRegistry.getDefinition(defType);
    assert(defType + ': registered',              def !== null);
    assert(defType + ': label correct',           def && def.label === expectedLabel);
    assert(defType + ': category is Effects',     def && def.category === 'Effects');
    assert(defType + ': nodeKind is effector',    def && def.nodeKind === 'effector');
    assert(defType + ': dedicated is false',      def && def.dedicated === false);

    // Ports — exactly 2, no parent ports
    assert(defType + ': has exactly 2 ports',     def && def.ports.length === 2);
    var ports = {};
    for (var i = 0; i < def.ports.length; i++) ports[def.ports[i].id] = def.ports[i];
    assert(defType + ': has layer_in port',       ports['layer_in'] !== undefined);
    assert(defType + ': layer_in required',       ports['layer_in'] && ports['layer_in'].required === true);
    assert(defType + ': layer_in extendable',     ports['layer_in'] && ports['layer_in'].extendable === true);
    assert(defType + ': layer_in type is layer',  ports['layer_in'] && ports['layer_in'].type === 'layer');
    assert(defType + ': has output port',         ports['output'] !== undefined);
    assert(defType + ': output type is layer',    ports['output'] && ports['output'].type === 'layer');
    assert(defType + ': no child_of port',        ports['child_of'] === undefined);
    assert(defType + ': no parent_of port',       ports['parent_of'] === undefined);

    // Params
    var params = {};
    for (var p = 0; p < def.params.length; p++) params[def.params[p].key] = def.params[p];
    for (var k = 0; k < expectedParamKeys.length; k++) {
      assert(defType + ': has param ' + expectedParamKeys[k], params[expectedParamKeys[k]] !== undefined);
    }
    var missingDefault = false;
    for (var q = 0; q < def.params.length; q++) {
      if (def.params[q].default === undefined) missingDefault = true;
    }
    assert(defType + ': all params have defaults', missingDefault === false);

    // Hooks
    assert(defType + ': onDrop is function',           typeof def.onDrop === 'function');
    assert(defType + ': onAlive is function',          typeof def.onAlive === 'function');
    assert(defType + ': onGhost is function',          typeof def.onGhost === 'function');
    assert(defType + ': onDelete is function',         typeof def.onDelete === 'function');
    assert(defType + ': onPropertyChange is function', typeof def.onPropertyChange === 'function');

    // onDrop returns null
    assert(defType + ': onDrop returns null', def.onDrop({ id: 'T', props: {} }) === null);

    // onAlive returns applyEffect with correct matchName
    var fakeProps = {};
    for (var r = 0; r < def.params.length; r++) fakeProps[def.params[r].key] = def.params[r].default;
    var aliveCmd = def.onAlive({ id: 'EFF-001', props: fakeProps }, 'COMP-001', 'LAYER-001');
    assert(defType + ': onAlive action is applyEffect',  aliveCmd && aliveCmd.action === 'applyEffect');
    assert(defType + ': onAlive matchName correct',      aliveCmd && aliveCmd.params.matchName === expectedMatchName);
    assert(defType + ': onAlive nodeUUID correct',       aliveCmd && aliveCmd.params.nodeUUID === 'EFF-001');
    assert(defType + ': onAlive layerNodeUUID correct',  aliveCmd && aliveCmd.params.layerNodeUUID === 'LAYER-001');
    assert(defType + ': onAlive hostingCompUUID',        aliveCmd && aliveCmd.params.hostingCompUUID === 'COMP-001');
    assert(defType + ': onAlive has props',              aliveCmd && typeof aliveCmd.params.props === 'object');

    // onGhost returns removeEffect
    var ghostCmd = def.onGhost({ id: 'EFF-001', props: fakeProps, state: 'alive' }, 'COMP-001', 'LAYER-001');
    assert(defType + ': onGhost action is removeEffect', ghostCmd && ghostCmd.action === 'removeEffect');
    assert(defType + ': onGhost nodeUUID',               ghostCmd && ghostCmd.params.nodeUUID === 'EFF-001');
    assert(defType + ': onGhost layerNodeUUID',          ghostCmd && ghostCmd.params.layerNodeUUID === 'LAYER-001');

    // onDelete — ghost state returns null
    var deleteGhostCmd = def.onDelete({ id: 'EFF-001', props: fakeProps, state: 'ghost', hostingComps: [] });
    assert(defType + ': onDelete ghost returns null',  deleteGhostCmd === null);

    // onDelete — alive state returns removeEffect
    var deleteAliveCmd = def.onDelete({ id: 'EFF-001', props: fakeProps, state: 'alive', hostingComps: ['COMP-001'] });
    assert(defType + ': onDelete alive action is removeEffect', deleteAliveCmd && deleteAliveCmd.action === 'removeEffect');

    // onPropertyChange returns setEffectProperty
    var propCmd = def.onPropertyChange('opacity', 50,
      { id: 'EFF-001', props: fakeProps, state: 'alive' }, 'COMP-001', 'LAYER-001');
    assert(defType + ': onPropertyChange action',        propCmd && propCmd.action === 'setEffectProperty');
    assert(defType + ': onPropertyChange matchName',     propCmd && propCmd.params.matchName === expectedMatchName);
    assert(defType + ': onPropertyChange key',           propCmd && propCmd.params.key === 'opacity');
    assert(defType + ': onPropertyChange value',         propCmd && propCmd.params.value === 50);
  }

  testEffectorNode('effects/fill', 'Fill', 'ADBE Fill',
    ['label', 'color', 'opacity', 'blendingMode']);

  testEffectorNode('effects/gaussian-blur', 'Gaussian Blur', 'ADBE Gaussian Blur 2',
    ['label', 'blurriness', 'blurDimensions', 'repeatEdgePixels']);

  testEffectorNode('effects/drop-shadow', 'Drop Shadow', 'ADBE Drop Shadow',
    ['label', 'color', 'opacity', 'direction', 'distance', 'softness']);

  // Verify no parent ports anywhere
  var effectTypes = ['effects/fill', 'effects/gaussian-blur', 'effects/drop-shadow'];
  for (var t = 0; t < effectTypes.length; t++) {
    var d = nodeRegistry.getDefinition(effectTypes[t]);
    var hasParent = false;
    for (var pp = 0; pp < d.ports.length; pp++) {
      if (d.ports[pp].category === 'parent') hasParent = true;
    }
    assert(effectTypes[t] + ': no parent ports anywhere', hasParent === false);
  }

  console.log('---');
  console.log('Effect nodes:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before AE verification.**

**STOP. Paste console output. Wait for confirmation.**

---

### AE integration verification — in After Effects

1. Drop a Text node → wire to Comp node. Text node goes alive.
2. Drop a Fill effect node → wire its `layer_in` to Text node's `output`.
   - Fill effect appears on the text layer in AE (red fill by default).
   - The text layer output port now carries the Fill → Comp wire.
3. Drop a Gaussian Blur node → wire its `layer_in` to Fill node's `output`.
   - Gaussian Blur appears on the text layer in AE, after Fill in the effects stack.
4. Change Fill color to blue in the inspector → AE Fill color updates after 300ms.
5. Change Gaussian Blur blurriness to 20 → AE blur amount updates.
6. Disconnect the Text node wire from the Comp.
   - Cascade: GaussianBlur ghosts first (effect stripped from layer), Fill ghosts second, Text parks.
   - All three effects are removed before the layer parks.
7. Reconnect Text → Comp.
   - Text unparks, Fill and GaussianBlur re-apply in order.
8. Drop a Drop Shadow node → wire to Gaussian Blur output → Comp.
   - Drop Shadow appears on the layer in AE.
9. Delete the Fill node directly (select it on canvas, press Delete).
   - Fill effect is removed from the layer. GaussianBlur and DropShadow remain.

**Checklist:**
- [ ] Fill effect appears in AE on wire — red fill visible on text layer
- [ ] Gaussian Blur appears stacked after Fill in the AE effects list
- [ ] Color and blurriness property changes sync to AE
- [ ] Cascade order: blur ghosts first, fill second, text parks last
- [ ] All effects removed before layer parks (verify by opening Reserved Comp — layer has no effects)
- [ ] Effects re-apply on reconnect
- [ ] Drop Shadow works end-to-end
- [ ] Deleting a single effector removes only its effect — adjacent effectors unaffected

**STOP. Describe what you see in AE. Wait for confirmation.**

---

## Additional Rules for This Task

**AE effect property sub-IDs are stable across versions.** The property IDs used in `applyEffect` (`'ADBE Fill-0002'`, `'ADBE Gaussian Blur 2-0001'`, etc.) are the internal match names for effect sub-properties. They are version-stable. Never access effect sub-properties by index.

**`effect.comment = nodeUUID` stores the effector UUID on the AE effect object.** This is how `removeEffect` and `setEffectProperty` find the correct effect when multiple effects of the same type are applied to the same layer. Without this, two Fill effects on the same layer would be indistinguishable.

**The effector's output carries the same layer reference as its input.** The engine does not create a new node for the output — it passes `upstreamNodeUUID` through. When the engine wires Fill's output to GaussianBlur's input, both effects are applied to the same underlying layer. The layer UUID in `wireMap` for the Fill→GaussianBlur wire is the Text node's UUID.

**Cascade order is non-negotiable — effectors ghost first.** TASK-07's cascade algorithm already orders effectors before affected nodes. Verify this works correctly in step 6 of the AE test. If the text layer parks before effects are stripped, `removeEffect` will try to find the layer in the hosting comp and fail — the layer has already moved to the Reserved Comp.

**`onPropertyChange` for effectors receives a fifth argument `upstreamNodeUUID`.** The engine must resolve this the same way as for `onAlive` and `onGhost`. The existing `engine.setNodeProperty` → `dirtyFlusher.flush` → `def.onPropertyChange` call chain must also pass `upstreamNodeUUID`. Update `dirtyFlusher.js`: before calling `def.onPropertyChange`, resolve `upstreamNodeUUID` from `wireMap` using the same lookup as in `_propagateAlive`.

**No ES6+** throughout all three node definition files and the engine/cascade updates.

---

## On Completion

When both verification phases pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-16 COMPLETE

graph/nodes/categories/effects/FillEffect.js    ✅  [N tests passed]
graph/nodes/categories/effects/GaussianBlur.js  ✅  [N tests passed]
graph/nodes/categories/effects/DropShadow.js    ✅  [N tests passed]
jsx/dispatcher/dispatcher.jsx                   ✅  applyEffect + removeEffect + setEffectProperty
graph/engine.js                                 ✅  upstreamNodeUUID resolution added
graph/cascadeAlgorithm.js                       ✅  upstreamNodeUUID resolution added
flush/dirtyFlusher.js                           ✅  upstreamNodeUUID resolution added

AE integration verified — effects apply, stack, cascade, and re-apply correctly.

New dispatcher actions added:
  - applyEffect
  - removeEffect
  - setEffectProperty

Next task: TASK-17 — Color.js + Number.js data node definitions
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-16-EFFECT-NODES.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 1, 2, 3, 6, 9, 10, 12 — PROCEDIA-V4-ARCHITECTURE.md Sections 1a, 3b, 4*
