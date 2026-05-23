# TASK-15 — Shape.js + Adjustment.js Node Definitions
*Procedia v4 — Fifteenth task. Builds on completed TASK-01 through TASK-14.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 9, 10, 12 in full
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 1, 2, 3, and 4 in full
3. `TASK-05-TEXT-NULL-NODES.md` — the full Text and Null node definitions as the pattern reference

Confirm both files are present at repo root before starting.

---

## Context

This task follows the same pattern established in TASK-05. Shape and Adjustment are both standard `affected` layer nodes — `dedicated: false`, no special cases, no exceptions. They follow the identical lifecycle as TextNode and NullNode.

**Key differences from Text and Null:**

| Node | AE Layer Created By | Notable Params |
|---|---|---|
| ShapeNode | `comp.layers.addShape()` | No content — shape is defined via AE tools after creation |
| AdjustmentNode | `comp.layers.addSolid()` with `adjustmentLayer = true` | No content, no color — adjustment layers are transparent by definition |

Both nodes are source nodes — they produce a layer and send it downstream. Neither receives layer wires. Both have the standard three ports: `output`, `child_of`, `parent_of`.

---

## What This Task Does NOT Do

- No dispatcher changes — `createShapeLayer` and `createAdjustmentLayer` actions are declared here but implemented in TASK-12's dispatcher additions
- No other node files
- No canvas or UI changes

Files written: `graph/nodes/categories/layers/Shape.js`, `graph/nodes/categories/layers/Adjustment.js`.

---

## PHASE 1 — `graph/nodes/categories/layers/Shape.js`

### Identity and classification

| Field | Value |
|---|---|
| `type` | `'layers/shape'` |
| `label` | `'Shape'` |
| `category` | `'Layers'` |
| `version` | `'1.0.0'` |
| `nodeKind` | `'affected'` |
| `dedicated` | `false` |

### Ports

Identical to TextNode — source node, no input ports.

```javascript
ports: [
  { id: 'output',    category: 'output', type: 'layer', extendable: false },
  { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'  },
  { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'  }
]
```

### Params

Shape layers in AE are empty containers by default — the actual shapes are added via AE's shape tools after the layer is created. Procedia only manages the layer-level transform properties.

```javascript
params: [
  { key: 'label',    type: 'string',  default: 'Shape',  label: 'Label'                       },
  { key: 'position', type: 'vector2', default: [0, 0],   label: 'Position'                    },
  { key: 'rotation', type: 'number',  default: 0,        label: 'Rotation'                    },
  { key: 'opacity',  type: 'number',  default: 100,      label: 'Opacity',   min: 0, max: 100 },
  { key: 'scale',    type: 'vector2', default: [100,100], label: 'Scale'                      }
]
```

Notes:
- No `content`, `fontSize`, or `color` — shape content is defined in AE directly
- `scale` is `[x%, y%]` — same as NullNode
- `position`, `rotation`, `opacity`, `scale` all map to AE transform properties via `setLayerProperty`

### Lifecycle hooks

**`onDrop`** — returns `null`.

**`onAlive`** — creates a shape layer in the hosting comp.

```javascript
onAlive: function(nodeData, hostingCompUUID) {
  return {
    action: 'createShapeLayer',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: hostingCompUUID,
      position:        nodeData.props.position,
      rotation:        nodeData.props.rotation,
      opacity:         nodeData.props.opacity,
      scale:           nodeData.props.scale,
      label:           nodeData.props.label
    }
  };
}
```

**`onGhost`** — returns `parkLayer` command. Identical to TextNode and NullNode.

**`onDelete`** — returns `deleteParkedLayer` command. Identical to TextNode and NullNode.

**`onPropertyChange`** — returns `setLayerProperty` command. Identical to TextNode and NullNode.

### Self-registration

```javascript
nodeRegistry.register(ShapeNode);
```

### Dispatcher action note

`createShapeLayer` is not yet implemented in `dispatcher.jsx`. Add it now:

Open `jsx/dispatcher/dispatcher.jsx` and add:

**To `_route`:**
```jsx
if (action === 'createShapeLayer') return actionCreateShapeLayer(params);
```

**Action handler:**
```jsx
function actionCreateShapeLayer(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'Comp not found: ' + params.hostingCompUUID; return result; }

    var layer = comp.layers.addShape();
    layer.comment = params.nodeUUID;
    layer.name    = params.label;

    var xform = layer.property('ADBE Transform Group');
    xform.property('ADBE Position').setValue(params.position);
    xform.property('ADBE Rotate Z').setValue(params.rotation);
    xform.property('ADBE Opacity').setValue(params.opacity);
    xform.property('ADBE Scale').setValue(params.scale);

    result.ok   = true;
    result.data = { layerName: layer.name };
  } catch(e) {
    result.error = e.toString();
  }
  return result;
}
```

---

## PHASE 2 — `graph/nodes/categories/layers/Adjustment.js`

### Identity and classification

| Field | Value |
|---|---|
| `type` | `'layers/adjustment'` |
| `label` | `'Adjustment'` |
| `category` | `'Layers'` |
| `version` | `'1.0.0'` |
| `nodeKind` | `'affected'` |
| `dedicated` | `false` |

### Ports

Identical to ShapeNode — source node, no input ports, three ports total.

```javascript
ports: [
  { id: 'output',    category: 'output', type: 'layer', extendable: false },
  { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'  },
  { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'  }
]
```

### Params

Adjustment layers are transparent — they have no fill color, no content. They only affect layers below them via effects applied on top of them. Procedia manages transform properties only.

```javascript
params: [
  { key: 'label',    type: 'string',  default: 'Adjustment', label: 'Label'                       },
  { key: 'position', type: 'vector2', default: [0, 0],       label: 'Position'                    },
  { key: 'rotation', type: 'number',  default: 0,            label: 'Rotation'                    },
  { key: 'opacity',  type: 'number',  default: 100,          label: 'Opacity',   min: 0, max: 100 },
  { key: 'scale',    type: 'vector2', default: [100, 100],   label: 'Scale'                       }
]
```

Note: No `color` param. Adjustment layers are transparent by definition — they cannot have a fill color.

### Lifecycle hooks

**`onDrop`** — returns `null`.

**`onAlive`** — creates an adjustment layer in the hosting comp.

```javascript
onAlive: function(nodeData, hostingCompUUID) {
  return {
    action: 'createAdjustmentLayer',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: hostingCompUUID,
      position:        nodeData.props.position,
      rotation:        nodeData.props.rotation,
      opacity:         nodeData.props.opacity,
      scale:           nodeData.props.scale,
      label:           nodeData.props.label
    }
  };
}
```

**`onGhost`** — returns `parkLayer` command. Identical to all other affected layer nodes.

**`onDelete`** — returns `deleteParkedLayer` command. Identical.

**`onPropertyChange`** — returns `setLayerProperty` command. Identical.

### Self-registration

```javascript
nodeRegistry.register(AdjustmentNode);
```

### Dispatcher action note

`createAdjustmentLayer` is not yet in `dispatcher.jsx`. Add it now:

**To `_route`:**
```jsx
if (action === 'createAdjustmentLayer') return actionCreateAdjustmentLayer(params);
```

**Action handler:**

AE does not have a `comp.layers.addAdjustmentLayer()` method. An adjustment layer is created by adding a solid layer and setting its `adjustmentLayer` property to `true`:

```jsx
function actionCreateAdjustmentLayer(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'Comp not found: ' + params.hostingCompUUID; return result; }

    // AE adjustment layers are solids with adjustmentLayer = true
    // Color is irrelevant — adjustment layers are transparent
    var layer = comp.layers.addSolid([0.5, 0.5, 0.5], params.label,
                                      comp.width, comp.height, 1.0);
    layer.adjustmentLayer = true;
    layer.comment = params.nodeUUID;
    layer.name    = params.label;

    var xform = layer.property('ADBE Transform Group');
    xform.property('ADBE Position').setValue(params.position);
    xform.property('ADBE Rotate Z').setValue(params.rotation);
    xform.property('ADBE Opacity').setValue(params.opacity);
    xform.property('ADBE Scale').setValue(params.scale);

    result.ok   = true;
    result.data = { layerName: layer.name };
  } catch(e) {
    result.error = e.toString();
  }
  return result;
}
```

Note: `comp.layers.addSolid(color, name, width, height, pixelAspect)` — color `[0.5, 0.5, 0.5]` is mid-gray, irrelevant since `adjustmentLayer = true` makes it transparent. Width and height must match the comp dimensions.

---

## PHASE 3 — Verification

### Console test — browser

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  function testLayerNode(defType, expectedLabel, expectedOnAliveAction, expectedParams, expectedParamCount) {
    var def = nodeRegistry.getDefinition(defType);
    assert(defType + ': registered',              def !== null);
    assert(defType + ': label',                   def && def.label === expectedLabel);
    assert(defType + ': category is Layers',      def && def.category === 'Layers');
    assert(defType + ': nodeKind is affected',    def && def.nodeKind === 'affected');
    assert(defType + ': dedicated is false',      def && def.dedicated === false);
    assert(defType + ': version is 1.0.0',        def && def.version === '1.0.0');

    // Ports
    assert(defType + ': has 3 ports',             def && def.ports.length === 3);
    var ports = {};
    for (var i = 0; i < def.ports.length; i++) ports[def.ports[i].id] = def.ports[i];
    assert(defType + ': has output port',         ports['output'] !== undefined);
    assert(defType + ': has child_of port',       ports['child_of'] !== undefined);
    assert(defType + ': has parent_of port',      ports['parent_of'] !== undefined);
    var hasInput = false;
    for (var j = 0; j < def.ports.length; j++) {
      if (def.ports[j].category === 'input') hasInput = true;
    }
    assert(defType + ': no input ports',          hasInput === false);

    // Params
    assert(defType + ': param count',             def && def.params.length === expectedParamCount);
    var params = {};
    for (var p = 0; p < def.params.length; p++) params[def.params[p].key] = def.params[p];
    for (var k = 0; k < expectedParams.length; k++) {
      assert(defType + ': has ' + expectedParams[k], params[expectedParams[k]] !== undefined);
    }

    // All params have defaults
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

    // Hook return values
    var fakeProps = {};
    for (var r = 0; r < def.params.length; r++) {
      fakeProps[def.params[r].key] = def.params[r].default;
    }
    var fakeNode = { id: 'TEST-001', props: fakeProps };

    var dropCmd = def.onDrop(fakeNode);
    assert(defType + ': onDrop returns null',          dropCmd === null);

    var aliveCmd = def.onAlive(fakeNode, 'COMP-HOST-001');
    assert(defType + ': onAlive returns object',       aliveCmd !== null && typeof aliveCmd === 'object');
    assert(defType + ': onAlive action correct',       aliveCmd.action === expectedOnAliveAction);
    assert(defType + ': onAlive has nodeUUID',         aliveCmd.params.nodeUUID === 'TEST-001');
    assert(defType + ': onAlive has hostingCompUUID',  aliveCmd.params.hostingCompUUID === 'COMP-HOST-001');
    assert(defType + ': onAlive has position',         Array.isArray(aliveCmd.params.position));
    assert(defType + ': onAlive has scale',            Array.isArray(aliveCmd.params.scale));
    assert(defType + ': onAlive has label',            aliveCmd.params.label !== undefined);

    var ghostCmd = def.onGhost(fakeNode, 'COMP-HOST-001');
    assert(defType + ': onGhost action is parkLayer',  ghostCmd.action === 'parkLayer');
    assert(defType + ': onGhost has nodeUUID',         ghostCmd.params.nodeUUID === 'TEST-001');

    var deleteCmd = def.onDelete(fakeNode);
    assert(defType + ': onDelete action is deleteParkedLayer', deleteCmd.action === 'deleteParkedLayer');

    var propCmd = def.onPropertyChange('opacity', 50, fakeNode, 'COMP-HOST-001');
    assert(defType + ': onPropertyChange action is setLayerProperty', propCmd.action === 'setLayerProperty');
    assert(defType + ': onPropertyChange has key',     propCmd.params.key === 'opacity');
    assert(defType + ': onPropertyChange has value',   propCmd.params.value === 50);
  }

  // ── Shape node ────────────────────────────────────────────
  testLayerNode(
    'layers/shape',
    'Shape',
    'createShapeLayer',
    ['label', 'position', 'rotation', 'opacity', 'scale'],
    5
  );

  // ShapeNode: no color, no content, no fontSize
  var shapeDef = nodeRegistry.getDefinition('layers/shape');
  var shapeParams = {};
  for (var i = 0; i < shapeDef.params.length; i++) shapeParams[shapeDef.params[i].key] = true;
  assert('layers/shape: no color param',   shapeParams['color']   === undefined);
  assert('layers/shape: no content param', shapeParams['content'] === undefined);

  // ── Adjustment node ───────────────────────────────────────
  testLayerNode(
    'layers/adjustment',
    'Adjustment',
    'createAdjustmentLayer',
    ['label', 'position', 'rotation', 'opacity', 'scale'],
    5
  );

  // AdjustmentNode: no color, no content
  var adjDef = nodeRegistry.getDefinition('layers/adjustment');
  var adjParams = {};
  for (var j = 0; j < adjDef.params.length; j++) adjParams[adjDef.params[j].key] = true;
  assert('layers/adjustment: no color param',   adjParams['color']   === undefined);
  assert('layers/adjustment: no content param', adjParams['content'] === undefined);

  // ── Both registered alongside previous nodes ──────────────
  var types = nodeRegistry.listTypes();
  var found = {};
  for (var t = 0; t < types.length; t++) found[types[t]] = true;
  assert('core/comp still registered',         found['core/comp']          === true);
  assert('layers/text still registered',       found['layers/text']        === true);
  assert('layers/null still registered',       found['layers/null']        === true);
  assert('layers/shape registered',           found['layers/shape']       === true);
  assert('layers/adjustment registered',      found['layers/adjustment']  === true);

  console.log('---');
  console.log('Shape + Adjustment nodes:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before AE verification.**

**STOP. Paste console output. Wait for confirmation.**

---

### AE integration verification — in After Effects

1. Drop a Shape node from the palette — wire it to a Comp node.
   - A shape layer appears in the AE comp. It is empty (no paths yet — expected).
   - Layer comment equals the node UUID.

2. Drop an Adjustment node — wire it to the same Comp node.
   - An adjustment layer appears above the shape layer in the AE comp.
   - `layer.adjustmentLayer === true` (verify in ESTK: `app.project.activeItem.layer(1).adjustmentLayer`).
   - Layer comment equals the node UUID.

3. Disconnect the Shape node wire from the Comp.
   - Shape layer parks in the Reserved Comp. Adjustment layer parks too (cascade).

4. Reconnect — both layers return from the Reserved Comp.

5. Change the Shape node's `label` in the inspector — the AE layer name updates after 300ms.

6. Change the Adjustment node's `opacity` to 50 — the AE layer opacity updates.

**Checklist:**
- [ ] Shape layer created in AE comp on wire — empty but present
- [ ] Adjustment layer created with `adjustmentLayer = true`
- [ ] Both layer comments match their node UUIDs
- [ ] Both park correctly on wire disconnect
- [ ] Both return on wire reconnect
- [ ] Label and opacity property changes sync to AE via inspector

**STOP. Describe what you see in AE. Wait for confirmation.**

---

## Additional Rules for This Task

**`comp.layers.addShape()` creates a completely empty shape layer.** No paths, no fills, no strokes. This is correct — Procedia does not manage shape contents. The user adds shapes via AE's native shape tools after the layer is created. The node manages only transform properties.

**`comp.layers.addSolid()` for adjustment layers takes comp dimensions.** The solid must be the same size as the comp — otherwise it would not cover the full frame and the adjustment effect would only apply to part of the comp. Pass `comp.width` and `comp.height` directly. Do not hardcode 1920×1080.

**`layer.adjustmentLayer = true` must be set immediately after creation.** Before setting any other properties. If the layer is used as a regular solid even briefly (e.g. if `adjustmentLayer` is set after `name`), it can cause AE to cache it differently in the undo stack. Set it first.

**Neither ShapeNode nor AdjustmentNode introduces a new `onPropertyChange` action name.** Both use `setLayerProperty` — the same action as Text and Null nodes. `setPropertyByKey` in `utils.jsx` already handles `position`, `rotation`, `opacity`, `scale`, and `label`. No changes to `utils.jsx` are needed.

**ShapeNode and AdjustmentNode have identical params.** This is intentional — they are both pure transform containers with no content-level properties. The only difference between them is the AE layer type created by `onAlive`.

**No ES6+** throughout both node definition files.

---

## On Completion

When both verification phases pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-15 COMPLETE

graph/nodes/categories/layers/Shape.js       ✅  [N tests passed]
graph/nodes/categories/layers/Adjustment.js  ✅  [N tests passed]
jsx/dispatcher/dispatcher.jsx                ✅  createShapeLayer + createAdjustmentLayer added

Both verified in browser console and AE.

New dispatcher actions added:
  - createShapeLayer
  - createAdjustmentLayer

Next task: TASK-16 — FillEffect.js, GaussianBlur.js, DropShadow.js
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-15-SHAPE-ADJUSTMENT-NODES.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 9, 10, 12 — PROCEDIA-V4-ARCHITECTURE.md Sections 1, 2, 3, 4 — TASK-05-TEXT-NULL-NODES.md*
