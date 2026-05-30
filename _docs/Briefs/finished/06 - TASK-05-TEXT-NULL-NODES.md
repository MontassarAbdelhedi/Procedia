# TASK-05 — Text.js and Null.js Node Definitions
*Procedia v4 — Fifth task. Builds on completed TASK-01 through TASK-04.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 9 (Dispatcher Pattern), 10 (Node Definition Contract), 12 (Task Execution Protocol)
2. `arch_specs.md` — Sections 1, 2, 3, and 4 in full

Confirm both files are present at repo root before starting.

---

## Context

Text and Null are both standard `affected` layer nodes. Unlike CompNode, they have no special cases, no exceptions, and no modes. They are the template every future layer node will follow exactly.

**Both nodes:**
- `nodeKind: 'affected'`
- TextNode: `dedicated: false` | NullNode: `dedicated: true` (creates a `FootageItem` solid in the AE project panel)
- Return `null` from `onDrop`
- Return `createTextLayer` / `createNullLayer` from `onAlive`
- Return `parkLayer` from `onGhost`
- Return `deleteParkedLayer` from `onDelete`
- Return `setLayerProperty` from `onPropertyChange`
- Have `output`, `child_of`, and `parent_of` ports
- Have no input ports — they are source nodes, not recipients of layer wires

Getting these two right locks in the pattern. Every node after this follows the same structure.

---

## What This Task Does NOT Do

- No engine implementation
- No dispatcher implementation
- No other node files beyond these two
- No canvas or UI changes

The only files written in this task are:
- `graph/nodes/categories/layers/Text.js`
- `graph/nodes/categories/layers/Null.js`

---

## PHASE 1 — `graph/nodes/categories/layers/Text.js`

### Identity and classification

| Field | Value |
|---|---|
| `type` | `'layers/text'` |
| `label` | `'Text'` |
| `category` | `'Layers'` |
| `version` | `'1.0.0'` |
| `nodeKind` | `'affected'` |
| `dedicated` | `false` |

### Ports

TextNode is a source node. It produces a layer and sends it downstream. It does not receive layer wires — only CompNode and other affected nodes can receive layers. It can participate in AE parenting when alive in a comp.

```javascript
ports: [
  { id: 'output',    category: 'output', type: 'layer', extendable: false },
  { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'  },
  { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'  }
]
```

**Port count: 3.** No input ports.

### Params

```javascript
params: [
  { key: 'label',    type: 'string',  default: 'Text',     label: 'Label'                       },
  { key: 'content',  type: 'string',  default: 'New Text', label: 'Content'                     },
  { key: 'fontSize', type: 'number',  default: 72,         label: 'Font Size', min: 1, max: 999 },
  { key: 'color',    type: 'color',   default: [1, 1, 1, 1], label: 'Color'                     },
  { key: 'position', type: 'vector2', default: [0, 0],     label: 'Position'                    },
  { key: 'rotation', type: 'number',  default: 0,          label: 'Rotation'                    },
  { key: 'opacity',  type: 'number',  default: 100,        label: 'Opacity',   min: 0, max: 100 }
]
```

Notes:
- `color` default is RGBA `[1, 1, 1, 1]` — white, fully opaque, range 0–1 per channel. **Four channels — text layers support alpha unlike comp backgrounds.**
- `position` is `[x, y]` in comp pixel coordinates. `[0, 0]` is the comp center in AE's coordinate space.
- `rotation` is in degrees.
- `opacity` is 0–100, not 0–1. AE's opacity property uses the 0–100 range.

### Lifecycle hooks

**`onDrop`** — returns `null`. No AE object is created until the node is wired to a comp downstream.

```javascript
onDrop: function(nodeData) {
  return null;
}
```

**`onAlive`** — creates a text layer in the hosting comp.

```javascript
onAlive: function(nodeData, hostingCompUUID) {
  return {
    action: 'createTextLayer',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: hostingCompUUID,
      content:         nodeData.props.content,
      fontSize:        nodeData.props.fontSize,
      color:           nodeData.props.color,
      position:        nodeData.props.position,
      rotation:        nodeData.props.rotation,
      opacity:         nodeData.props.opacity,
      label:           nodeData.props.label
    }
  };
}
```

**`onGhost`** — parks the layer in the Reserved Comp.

```javascript
onGhost: function(nodeData, hostingCompUUID) {
  return {
    action: 'parkLayer',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: hostingCompUUID
    }
  };
}
```

**`onDelete`** — layer is already parked when this fires (engine calls `onGhost` first). Delete the parked layer permanently.

```javascript
onDelete: function(nodeData) {
  return {
    action: 'deleteParkedLayer',
    params: {
      nodeUUID: nodeData.id
    }
  };
}
```

**`onPropertyChange`** — update a single property on the live AE layer.

```javascript
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
```

### Self-registration

```javascript
nodeRegistry.register(TextNode);
```

---

## PHASE 2 — `graph/nodes/categories/layers/Null.js`

### Identity and classification

| Field | Value |
|---|---|
| `type` | `'layers/null'` |
| `label` | `'Null'` |
| `category` | `'Layers'` |
| `version` | `'1.0.0'` |
| `nodeKind` | `'affected'` |
| `dedicated` | `true` |

### Ports

NullNode is a source node — identical port structure to TextNode. It produces a layer and sends it downstream. It does not receive layer wires. It can participate in AE parenting when alive in a comp.

```javascript
ports: [
  { id: 'output',    category: 'output', type: 'layer', extendable: false },
  { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'  },
  { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'  }
]
```

**Port count: 3.** No input ports.

### Params

Null layers have no content or font. They are invisible control objects used as parents, proxies, or anchors.

```javascript
params: [
  { key: 'label',    type: 'string',  default: 'Null',     label: 'Label'                       },
  { key: 'position', type: 'vector2', default: [0, 0],     label: 'Position'                    },
  { key: 'rotation', type: 'number',  default: 0,          label: 'Rotation'                    },
  { key: 'opacity',  type: 'number',  default: 100,        label: 'Opacity',   min: 0, max: 100 },
  { key: 'scale',    type: 'vector2', default: [100, 100], label: 'Scale'                       }
]
```

Notes:
- `scale` is `[x, y]` in percentage. `[100, 100]` is 100% on both axes — AE default.
- No `content`, no `fontSize`, no `color` — null layers have no visual content.
- `dedicated: true` — NullNode creates a `FootageItem` (solid) in the AE project panel before adding the null layer to the comp. Creation order: create the `FootageItem` first, then add as a layer. The dispatcher handles this in `createNullLayer`.

### Lifecycle hooks

Identical command structure to TextNode, with one difference: `onAlive` returns `createNullLayer` instead of `createTextLayer`, and sends only the params that null layers have.

**`onDrop`** — returns `null`.

**`onAlive`** — creates a null layer in the hosting comp.

```javascript
onAlive: function(nodeData, hostingCompUUID) {
  return {
    action: 'createNullLayer',
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

**`onGhost`** — identical to TextNode: `parkLayer` command.

**`onDelete`** — identical to TextNode: `deleteParkedLayer` command.

**`onPropertyChange`** — identical to TextNode: `setLayerProperty` command.

### Self-registration

```javascript
nodeRegistry.register(NullNode);
```

---

## PHASE 3 — Verification

### Test in browser console

Open `index.html` in a browser tab. Reload. Open browser console. Paste and run:

```javascript
(function() {
  var PASS = 0; var FAIL = 0;

  function assert(label, condition) {
    if (condition) { console.log('[PASS]', label); PASS++; }
    else           { console.error('[FAIL]', label); FAIL++; }
  }

  function testNode(defType, expectedLabel, expectedCategory, expectedOnAliveAction,
                    expectedParams, expectedParamCount) {

    var def = nodeRegistry.getDefinition(defType);
    assert(defType + ': registered',          def !== null);
    assert(defType + ': label correct',       def !== null && def.label === expectedLabel);
    assert(defType + ': category correct',    def !== null && def.category === expectedCategory);
    assert(defType + ': version is 1.0.0',    def !== null && def.version === '1.0.0');
    assert(defType + ': nodeKind is affected', def !== null && def.nodeKind === 'affected');
    assert(defType + ': dedicated flag',  def !== null && (defType === 'layers/null' ? def.dedicated === true : def.dedicated === false));

    // Ports
    assert(defType + ': ports is array',      def !== null && Array.isArray(def.ports));
    assert(defType + ': has 3 ports',         def !== null && def.ports.length === 3);

    var ports = {};
    for (var i = 0; i < def.ports.length; i++) { ports[def.ports[i].id] = def.ports[i]; }

    assert(defType + ': has output port',           ports['output'] !== undefined);
    assert(defType + ': output category is output', ports['output'] && ports['output'].category === 'output');
    assert(defType + ': output type is layer',      ports['output'] && ports['output'].type === 'layer');

    assert(defType + ': has child_of port',         ports['child_of'] !== undefined);
    assert(defType + ': child_of role is child',    ports['child_of'] && ports['child_of'].role === 'child');
    assert(defType + ': child_of type is parent',   ports['child_of'] && ports['child_of'].type === 'parent');

    assert(defType + ': has parent_of port',        ports['parent_of'] !== undefined);
    assert(defType + ': parent_of role is parent',  ports['parent_of'] && ports['parent_of'].role === 'parent');
    assert(defType + ': parent_of type is parent',  ports['parent_of'] && ports['parent_of'].type === 'parent');

    // Guard against any input-category ports (mainInput or secondaryInput)
    var hasInputPort = false;
    for (var j = 0; j < def.ports.length; j++) {
      var cat = def.ports[j].category;
      if (cat === 'mainInput' || cat === 'secondaryInput') hasInputPort = true;
    }
    assert(defType + ': has no input ports', hasInputPort === false);

    // Params
    assert(defType + ': params is array',           Array.isArray(def.params));
    assert(defType + ': param count correct',       def.params.length === expectedParamCount);

    var params = {};
    for (var p = 0; p < def.params.length; p++) { params[def.params[p].key] = def.params[p]; }

    for (var k = 0; k < expectedParams.length; k++) {
      var ep = expectedParams[k];
      assert(defType + ': has param ' + ep.key,     params[ep.key] !== undefined);
      assert(defType + ': ' + ep.key + ' type',     params[ep.key] && params[ep.key].type === ep.type);
      if (ep.default !== undefined) {
        if (Array.isArray(ep.default)) {
          assert(defType + ': ' + ep.key + ' default is array',
            params[ep.key] && Array.isArray(params[ep.key].default));
          assert(defType + ': ' + ep.key + ' default length',
            params[ep.key] && params[ep.key].default.length === ep.default.length);
        } else {
          assert(defType + ': ' + ep.key + ' default value',
            params[ep.key] && params[ep.key].default === ep.default);
        }
      }
    }

    var missingDefault = false;
    for (var q = 0; q < def.params.length; q++) {
      if (def.params[q].default === undefined) { missingDefault = true; break; }
    }
    assert(defType + ': all params have defaults', missingDefault === false);

    // Hooks
    assert(defType + ': onDrop is function',           typeof def.onDrop === 'function');
    assert(defType + ': onAlive is function',          typeof def.onAlive === 'function');
    assert(defType + ': onGhost is function',          typeof def.onGhost === 'function');
    assert(defType + ': onDelete is function',         typeof def.onDelete === 'function');
    assert(defType + ': onPropertyChange is function', typeof def.onPropertyChange === 'function');

    // onDrop returns null
    var dropResult = def.onDrop({ id: 'TEST-001', props: {} });
    assert(defType + ': onDrop returns null', dropResult === null);

    // onAlive returns correct action
    var fakeProps = {};
    for (var r = 0; r < def.params.length; r++) {
      fakeProps[def.params[r].key] = def.params[r].default;
    }
    var aliveCmd = def.onAlive({ id: 'TEST-001', props: fakeProps }, 'COMP-HOST-001');
    assert(defType + ': onAlive returns object',        aliveCmd !== null && typeof aliveCmd === 'object');
    assert(defType + ': onAlive action correct',        aliveCmd.action === expectedOnAliveAction);
    assert(defType + ': onAlive has nodeUUID',          aliveCmd.params.nodeUUID === 'TEST-001');
    assert(defType + ': onAlive has hostingCompUUID',   aliveCmd.params.hostingCompUUID === 'COMP-HOST-001');
    assert(defType + ': onAlive has label',             aliveCmd.params.label !== undefined);

    // onGhost returns parkLayer
    var ghostCmd = def.onGhost({ id: 'TEST-001', props: fakeProps }, 'COMP-HOST-001');
    assert(defType + ': onGhost returns object',        ghostCmd !== null && typeof ghostCmd === 'object');
    assert(defType + ': onGhost action is parkLayer',   ghostCmd.action === 'parkLayer');
    assert(defType + ': onGhost has nodeUUID',          ghostCmd.params.nodeUUID === 'TEST-001');
    assert(defType + ': onGhost has hostingCompUUID',   ghostCmd.params.hostingCompUUID === 'COMP-HOST-001');

    // onDelete returns deleteParkedLayer
    var deleteCmd = def.onDelete({ id: 'TEST-001', props: fakeProps });
    assert(defType + ': onDelete returns object',             deleteCmd !== null && typeof deleteCmd === 'object');
    assert(defType + ': onDelete action is deleteParkedLayer', deleteCmd.action === 'deleteParkedLayer');
    assert(defType + ': onDelete has nodeUUID',               deleteCmd.params.nodeUUID === 'TEST-001');

    // onPropertyChange returns setLayerProperty
    var propCmd = def.onPropertyChange('opacity', 50, { id: 'TEST-001', props: fakeProps }, 'COMP-HOST-001');
    assert(defType + ': onPropertyChange returns object',           propCmd !== null && typeof propCmd === 'object');
    assert(defType + ': onPropertyChange action is setLayerProperty', propCmd.action === 'setLayerProperty');
    assert(defType + ': onPropertyChange has nodeUUID',             propCmd.params.nodeUUID === 'TEST-001');
    assert(defType + ': onPropertyChange has hostingCompUUID',      propCmd.params.hostingCompUUID === 'COMP-HOST-001');
    assert(defType + ': onPropertyChange has key',                  propCmd.params.key === 'opacity');
    assert(defType + ': onPropertyChange has value',                propCmd.params.value === 50);
  }

  // ── TEXT NODE ──────────────────────────────────────────────
  testNode(
    'layers/text',
    'Text',
    'Layers',
    'createTextLayer',
    [
      { key: 'label',    type: 'string'  },
      { key: 'content',  type: 'string',  default: 'New Text' },
      { key: 'fontSize', type: 'number',  default: 72         },
      { key: 'color',    type: 'color',   default: [1,1,1,1]  },
      { key: 'position', type: 'vector2', default: [0,0]      },
      { key: 'rotation', type: 'number',  default: 0          },
      { key: 'opacity',  type: 'number',  default: 100        }
    ],
    7
  );

  // TextNode specific: color has 4 channels (RGBA)
  var textDef = nodeRegistry.getDefinition('layers/text');
  var colorParam = null;
  for (var i = 0; i < textDef.params.length; i++) {
    if (textDef.params[i].key === 'color') { colorParam = textDef.params[i]; break; }
  }
  assert('layers/text: color default has 4 channels (RGBA)', colorParam && colorParam.default.length === 4);

  // TextNode: onAlive sends content and fontSize
  var textFakeProps = { label: 'T', content: 'Hello', fontSize: 72,
    color: [1,1,1,1], position: [0,0], rotation: 0, opacity: 100 };
  var textAlive = textDef.onAlive({ id: 'T-001', props: textFakeProps }, 'COMP-001');
  assert('layers/text: onAlive sends content',  textAlive.params.content === 'Hello');
  assert('layers/text: onAlive sends fontSize', textAlive.params.fontSize === 72);
  assert('layers/text: onAlive sends color',    Array.isArray(textAlive.params.color));

  // ── NULL NODE ──────────────────────────────────────────────
  testNode(
    'layers/null',
    'Null',
    'Layers',
    'createNullLayer',
    [
      { key: 'label',    type: 'string'  },
      { key: 'position', type: 'vector2', default: [0,0]       },
      { key: 'rotation', type: 'number',  default: 0           },
      { key: 'opacity',  type: 'number',  default: 100         },
      { key: 'scale',    type: 'vector2', default: [100,100]   }
    ],
    5
  );

  // NullNode: no content, no fontSize, no color params
  var nullDef = nodeRegistry.getDefinition('layers/null');
  var nullParams = {};
  for (var n = 0; n < nullDef.params.length; n++) {
    nullParams[nullDef.params[n].key] = true;
  }
  assert('layers/null: has no content param',  nullParams['content']  === undefined);
  assert('layers/null: has no fontSize param', nullParams['fontSize'] === undefined);
  assert('layers/null: has no color param',    nullParams['color']    === undefined);

  // NullNode: onAlive sends scale
  var nullFakeProps = { label: 'N', position: [0,0], rotation: 0, opacity: 100, scale: [100,100] };
  var nullAlive = nullDef.onAlive({ id: 'N-001', props: nullFakeProps }, 'COMP-001');
  assert('layers/null: onAlive sends scale', Array.isArray(nullAlive.params.scale));

  // ── BOTH REGISTERED ────────────────────────────────────────
  var allTypes = nodeRegistry.listTypes();
  var hasText = false; var hasNull = false; var hasComp = false;
  for (var t = 0; t < allTypes.length; t++) {
    if (allTypes[t] === 'layers/text') hasText = true;
    if (allTypes[t] === 'layers/null') hasNull = true;
    if (allTypes[t] === 'core/comp')   hasComp = true;
  }
  assert('nodeRegistry has layers/text',  hasText);
  assert('nodeRegistry has layers/null',  hasNull);
  assert('nodeRegistry still has core/comp (not overwritten)', hasComp);

  console.log('---');
  console.log('Text + Null nodes:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before closing this task.**

**STOP. Paste console output. Wait for confirmation.**

---

## Additional Rules for This Task

**`onDrop` always returns `null` for these nodes.** No exceptions. The AE layer does not exist until the node is wired to a comp downstream and `onAlive` is called by the engine.

**`onDelete` assumes `onGhost` has already run.** The engine always calls `onGhost` before `onDelete` for alive nodes. By the time `onDelete` fires, the layer is already parked in the Reserved Comp. `deleteParkedLayer` finds and deletes it there. If the node was already ghost when deleted, the parked layer still exists — `deleteParkedLayer` handles both cases.

**`color` in TextNode is RGBA `[r, g, b, a]` — four channels, range 0–1.** Text layers in AE support per-character color with alpha. Do not confuse with `bgColor` in CompNode which is RGB only.

**`scale` in NullNode is `[x, y]` percentage — not 0–1, not pixels.** AE's scale property is percentage-based. `[100, 100]` is unchanged scale. Pass this value directly to `setLayerProperty` — no conversion.

**`position` is `[x, y]` in comp pixel coordinates.** `[0, 0]` is the comp center in AE's default coordinate space (not top-left). The dispatcher passes this directly to AE's position property.

**No new dispatcher actions are introduced in this task.** All four action names used — `createTextLayer`, `createNullLayer`, `parkLayer`, `deleteParkedLayer`, `setLayerProperty` — are already declared in the dispatcher's registered actions table in `arch_specs.md` Section 5b. Do not invent new names.

**No ES6+.** `var`, named functions, no arrow functions, no template literals throughout.

---

## On Completion

When the test script returns zero failures, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-05 COMPLETE

graph/nodes/categories/layers/Text.js    ✅  [N tests passed]
graph/nodes/categories/layers/Null.js    ✅  [N tests passed]

Verified in browser console. Zero failures.

No new dispatcher actions introduced.
Existing actions used: createTextLayer, createNullLayer,
  parkLayer, deleteParkedLayer, setLayerProperty

Next task: TASK-06 — engine.js
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-05-TEXT-NULL-NODES.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 9 & 10, arch_specs.md Sections 1–4*
