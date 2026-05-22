# TASK-04 — Comp.js Node Definition
*Procedia v4 — Fourth task. Builds on completed TASK-01, TASK-02, TASK-03.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 9 (Dispatcher Pattern), 10 (Node Definition Contract), 12 (Task Execution Protocol)
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 1, 2, 3, and 4 in full

Confirm both files are present at repo root before starting.

---

## Context

`Comp.js` is the first real node definition in the project. Every other node's alive/ghost state is governed by whether it has a CompNode downstream — so getting this right establishes the template every future node will follow.

CompNode has two modes of existence:

**Standalone mode:** Dropped onto the canvas and not wired into any parent comp. It creates its own AE comp and is alive immediately on drop. It is the terminal node in its chain — nothing is downstream of it in the layer-wire sense.

**Pre-comp mode:** Wired into another CompNode's `layer_in` port via a standard `layer` wire. In this mode it behaves like any other affected node — it follows the standard alive/ghost lifecycle. It can ghost if unwired from its hosting comp. The AE representation is a pre-comp layer inside the hosting comp.

Both modes are handled by the same node definition. The distinction is runtime state, not definition structure.

**Key properties that distinguish CompNode from all other nodes:**

| Property | Value | Reason |
|---|---|---|
| `dedicated: true` | Creates an AE `CompItem` in the project panel | Comps exist in the project panel, not just as layers |
| Has both `child_of` and `parent_of` parent ports | Comps can be parents or children of other AE layers inside a hosting comp | |
| Has both `layer_in` input and `output` ports | Can receive layers (standalone mode) and wire into a parent comp (pre-comp mode) | |
| `onDrop` returns `createComp` command | Comp must exist in AE immediately, before any wiring happens | |
| `onDelete` never parks | Comps are deleted directly — never moved to the Reserved Comp | |

---

## What This Task Does NOT Do

- No engine implementation
- No AE calls — the node returns command objects only
- No canvas rendering changes
- No other node files

The only file written in this task is `graph/nodes/categories/core/Comp.js`.

---

## PHASE 1 — Write `graph/nodes/categories/core/Comp.js`

### Identity

| Field | Value |
|---|---|
| `type` | `'core/comp'` |
| `label` | `'Comp'` |
| `category` | `'Core'` |
| `version` | `'1.0.0'` |

### Classification

| Field | Value |
|---|---|
| `nodeKind` | `'affected'` |
| `dedicated` | `true` |

---

### Ports

```javascript
ports: [
  // Receives layer wires from upstream affected nodes (standalone mode: layers inside this comp)
  // extendable: true — unlimited layers can wire into it
  // required: false — a comp with no layers is valid
  { id: 'layer_in',  category: 'input',  type: 'layer', extendable: true,  required: false },

  // Output port — used in pre-comp mode: wires this comp as a layer into a parent comp
  // In standalone mode this port is unconnected
  { id: 'output',    category: 'output', type: 'layer', extendable: false },

  // Parent ports — used when this comp is hosted inside another comp
  // child_of: this comp's pre-comp layer can be a child of another layer in the hosting comp
  // parent_of: other layers in the hosting comp can be children of this comp's pre-comp layer
  // Constraint: both nodes in a parent wire must be alive in the same hosting comp
  { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent' },
  { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent' }
]
```

**Port count: 4 total** — `layer_in`, `output`, `child_of`, `parent_of`.

---

### Params

```javascript
params: [
  { key: 'label',    type: 'string', default: 'Comp',    label: 'Label'                          },
  { key: 'width',    type: 'number', default: 1920,      label: 'Width',    min: 1, max: 30000   },
  { key: 'height',   type: 'number', default: 1080,      label: 'Height',   min: 1, max: 30000   },
  { key: 'fps',      type: 'number', default: 24,        label: 'FPS',      min: 1, max: 99      },
  { key: 'duration', type: 'number', default: 10,        label: 'Duration', min: 0.1             },
  { key: 'bgColor',  type: 'color',  default: [0, 0, 0], label: 'Background'                     }
]
```

Notes:
- `label` maps to the AE comp name (`comp.name`)
- `duration` is in **seconds** — passed directly to the AE API
- `bgColor` is **RGB only, range 0–1** — AE comps have no background alpha. Three channels, not four.

---

### Lifecycle Hooks

**`onDrop(nodeData)`**

CompNode is the only node that creates an AE object on drop, before any wiring. Return a `createComp` command immediately. The engine, after executing this command, sets the node state to `alive`.

```javascript
onDrop: function(nodeData) {
  return {
    action: 'createComp',
    params: {
      nodeUUID: nodeData.id,
      label:    nodeData.props.label,
      width:    nodeData.props.width,
      height:   nodeData.props.height,
      fps:      nodeData.props.fps,
      duration: nodeData.props.duration,
      bgColor:  nodeData.props.bgColor
    }
  };
}
```

**`onAlive(nodeData, hostingCompUUID)`**

Called when this CompNode is wired into a parent comp as a pre-comp layer. Return a command to add this comp as a layer inside the hosting comp.

```javascript
onAlive: function(nodeData, hostingCompUUID) {
  return {
    action: 'addCompAsLayer',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: hostingCompUUID
    }
  };
}
```

Note: `addCompAsLayer` is a dispatcher action not yet implemented. Its name must be exactly `'addCompAsLayer'`. The dispatcher implements it in a later task.

**`onGhost(nodeData, hostingCompUUID)`**

Called when this CompNode is unwired from a parent comp (pre-comp mode only). Remove the pre-comp layer from the hosting comp and park it in the Reserved Comp — the same park behavior as any other affected node. The AE `CompItem` itself is never deleted or moved — only the layer reference inside the hosting comp is removed.

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

**`onDelete(nodeData)`**

When a CompNode is deleted, the AE `CompItem` it created is deleted from the project panel. There is no park step — comps are never moved to the Reserved Comp. If this comp is currently a pre-comp layer inside a parent comp, the layer is removed before the comp is deleted (the dispatcher handles both steps atomically).

```javascript
onDelete: function(nodeData) {
  return {
    action: 'deleteComp',
    params: {
      nodeUUID: nodeData.id
    }
  };
}
```

**`onPropertyChange(key, value, nodeData, hostingCompUUID)`**

When a CompNode param is changed in the inspector, update the corresponding AE comp property.

```javascript
onPropertyChange: function(key, value, nodeData, hostingCompUUID) {
  return {
    action: 'setCompProperty',
    params: {
      nodeUUID: nodeData.id,
      key:      key,
      value:    value
    }
  };
}
```

Note: `setCompProperty` is a dispatcher action not yet implemented. Its name must be exactly `'setCompProperty'`.

---

### Self-registration

Last line of the file:

```javascript
nodeRegistry.register(CompNode);
```

No changes to `nodeRegistry.js`. No changes to `index.html` — the `<script>` tag was added in TASK-01.

---

### Complete file structure

```javascript
// graph/nodes/categories/core/Comp.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var CompNode = {

  type:     'core/comp',
  label:    'Comp',
  category: 'Core',
  version:  '1.0.0',

  nodeKind:  'affected',
  dedicated: true,

  ports: [
    { id: 'layer_in',  category: 'input',  type: 'layer', extendable: true,  required: false },
    { id: 'output',    category: 'output', type: 'layer', extendable: false  },
    { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'   },
    { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'   }
  ],

  params: [
    { key: 'label',    type: 'string', default: 'Comp',    label: 'Label'                        },
    { key: 'width',    type: 'number', default: 1920,      label: 'Width',    min: 1, max: 30000 },
    { key: 'height',   type: 'number', default: 1080,      label: 'Height',   min: 1, max: 30000 },
    { key: 'fps',      type: 'number', default: 24,        label: 'FPS',      min: 1, max: 99    },
    { key: 'duration', type: 'number', default: 10,        label: 'Duration', min: 0.1           },
    { key: 'bgColor',  type: 'color',  default: [0, 0, 0], label: 'Background'                   }
  ],

  onDrop:           function(nodeData) { ... },
  onAlive:          function(nodeData, hostingCompUUID) { ... },
  onGhost:          function(nodeData, hostingCompUUID) { ... },
  onDelete:         function(nodeData) { ... },
  onPropertyChange: function(key, value, nodeData, hostingCompUUID) { ... }

};

nodeRegistry.register(CompNode);
```

Fill every hook from the specification above.

---

## PHASE 2 — Verification

### Test in browser console

Open `index.html` in a browser tab. Reload. Open browser console. Paste and run:

```javascript
(function() {
  var PASS = 0; var FAIL = 0;

  function assert(label, condition) {
    if (condition) { console.log('[PASS]', label); PASS++; }
    else           { console.error('[FAIL]', label); FAIL++; }
  }

  // ── REGISTRATION ───────────────────────────────────────────
  var def = nodeRegistry.getDefinition('core/comp');
  assert('CompNode is registered',         def !== null);
  assert('type is core/comp',              def.type === 'core/comp');
  assert('label is Comp',                  def.label === 'Comp');
  assert('category is Core',               def.category === 'Core');
  assert('version is 1.0.0',               def.version === '1.0.0');

  // ── CLASSIFICATION ─────────────────────────────────────────
  assert('nodeKind is affected',           def.nodeKind === 'affected');
  assert('dedicated is true',              def.dedicated === true);

  // ── PORTS ──────────────────────────────────────────────────
  assert('ports is an array',              Array.isArray(def.ports));
  assert('has exactly 4 ports',            def.ports.length === 4);

  var ports = {};
  for (var i = 0; i < def.ports.length; i++) {
    ports[def.ports[i].id] = def.ports[i];
  }

  // layer_in
  assert('has layer_in port',              ports['layer_in'] !== undefined);
  assert('layer_in category is input',     ports['layer_in'].category === 'input');
  assert('layer_in type is layer',         ports['layer_in'].type === 'layer');
  assert('layer_in is extendable',         ports['layer_in'].extendable === true);
  assert('layer_in required is false',     ports['layer_in'].required === false);

  // output
  assert('has output port',               ports['output'] !== undefined);
  assert('output category is output',     ports['output'].category === 'output');
  assert('output type is layer',          ports['output'].type === 'layer');

  // child_of
  assert('has child_of port',             ports['child_of'] !== undefined);
  assert('child_of category is parent',   ports['child_of'].category === 'parent');
  assert('child_of role is child',        ports['child_of'].role === 'child');
  assert('child_of type is parent',       ports['child_of'].type === 'parent');

  // parent_of
  assert('has parent_of port',            ports['parent_of'] !== undefined);
  assert('parent_of category is parent',  ports['parent_of'].category === 'parent');
  assert('parent_of role is parent',      ports['parent_of'].role === 'parent');
  assert('parent_of type is parent',      ports['parent_of'].type === 'parent');

  // ── PARAMS ─────────────────────────────────────────────────
  assert('params is an array',            Array.isArray(def.params));
  assert('has 6 params',                  def.params.length === 6);

  var params = {};
  for (var p = 0; p < def.params.length; p++) {
    params[def.params[p].key] = def.params[p];
  }

  assert('has label param',               params['label'] !== undefined);
  assert('has width param',               params['width'] !== undefined);
  assert('has height param',              params['height'] !== undefined);
  assert('has fps param',                 params['fps'] !== undefined);
  assert('has duration param',            params['duration'] !== undefined);
  assert('has bgColor param',             params['bgColor'] !== undefined);

  assert('width default is 1920',         params['width'].default === 1920);
  assert('height default is 1080',        params['height'].default === 1080);
  assert('fps default is 24',             params['fps'].default === 24);
  assert('duration default is 10',        params['duration'].default === 10);
  assert('bgColor default is array',      Array.isArray(params['bgColor'].default));
  assert('bgColor has 3 channels',        params['bgColor'].default.length === 3);
  assert('bgColor default is black',      params['bgColor'].default[0] === 0 &&
                                          params['bgColor'].default[1] === 0 &&
                                          params['bgColor'].default[2] === 0);

  var missingDefault = false;
  for (var q = 0; q < def.params.length; q++) {
    if (def.params[q].default === undefined) { missingDefault = true; break; }
  }
  assert('all params have defaults',      missingDefault === false);

  // ── LIFECYCLE HOOKS ────────────────────────────────────────
  assert('onDrop is function',            typeof def.onDrop === 'function');
  assert('onAlive is function',           typeof def.onAlive === 'function');
  assert('onGhost is function',           typeof def.onGhost === 'function');
  assert('onDelete is function',          typeof def.onDelete === 'function');
  assert('onPropertyChange is function',  typeof def.onPropertyChange === 'function');

  // ── HOOK RETURN VALUES ─────────────────────────────────────
  var fakeNode = {
    id: 'PROC-TEST-comp1',
    props: {
      label: 'Test Comp', width: 1920, height: 1080,
      fps: 24, duration: 10, bgColor: [0, 0, 0]
    }
  };

  // onDrop → createComp
  var dropCmd = def.onDrop(fakeNode);
  assert('onDrop returns object',          dropCmd !== null && typeof dropCmd === 'object');
  assert('onDrop action is createComp',    dropCmd.action === 'createComp');
  assert('onDrop has nodeUUID',            dropCmd.params.nodeUUID === 'PROC-TEST-comp1');
  assert('onDrop has label',               dropCmd.params.label === 'Test Comp');
  assert('onDrop has width',               dropCmd.params.width === 1920);
  assert('onDrop has height',              dropCmd.params.height === 1080);
  assert('onDrop has fps',                 dropCmd.params.fps === 24);
  assert('onDrop has duration',            dropCmd.params.duration === 10);
  assert('onDrop has bgColor',             Array.isArray(dropCmd.params.bgColor));

  // onAlive → addCompAsLayer (pre-comp mode)
  var aliveCmd = def.onAlive(fakeNode, 'PROC-PARENT-9999');
  assert('onAlive returns object',              aliveCmd !== null && typeof aliveCmd === 'object');
  assert('onAlive action is addCompAsLayer',    aliveCmd.action === 'addCompAsLayer');
  assert('onAlive has nodeUUID',                aliveCmd.params.nodeUUID === 'PROC-TEST-comp1');
  assert('onAlive has hostingCompUUID',         aliveCmd.params.hostingCompUUID === 'PROC-PARENT-9999');

  // onGhost → parkLayer (pre-comp mode)
  var ghostCmd = def.onGhost(fakeNode, 'PROC-PARENT-9999');
  assert('onGhost returns object',         ghostCmd !== null && typeof ghostCmd === 'object');
  assert('onGhost action is parkLayer',    ghostCmd.action === 'parkLayer');
  assert('onGhost has nodeUUID',           ghostCmd.params.nodeUUID === 'PROC-TEST-comp1');
  assert('onGhost has hostingCompUUID',    ghostCmd.params.hostingCompUUID === 'PROC-PARENT-9999');

  // onDelete → deleteComp
  var deleteCmd = def.onDelete(fakeNode);
  assert('onDelete returns object',        deleteCmd !== null && typeof deleteCmd === 'object');
  assert('onDelete action is deleteComp',  deleteCmd.action === 'deleteComp');
  assert('onDelete has nodeUUID',          deleteCmd.params.nodeUUID === 'PROC-TEST-comp1');

  // onPropertyChange → setCompProperty
  var propCmd = def.onPropertyChange('width', 2560, fakeNode, null);
  assert('onPropertyChange returns object',          propCmd !== null && typeof propCmd === 'object');
  assert('onPropertyChange action is setCompProperty', propCmd.action === 'setCompProperty');
  assert('onPropertyChange has nodeUUID',            propCmd.params.nodeUUID === 'PROC-TEST-comp1');
  assert('onPropertyChange has key',                 propCmd.params.key === 'width');
  assert('onPropertyChange has value',               propCmd.params.value === 2560);

  console.log('---');
  console.log('CompNode:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before closing this task.**

**STOP. Paste console output. Wait for confirmation.**

---

## Additional Rules for This Task

**`onDrop` creates the AE comp immediately — before any wiring.** The AE `CompItem` exists from the moment the node is dropped. In standalone mode, the node is alive and the comp has no layers yet. Layers arrive as other nodes wire into it.

**`onAlive` handles pre-comp mode only.** When this CompNode is wired into a parent comp, `onAlive` fires and places the comp as a layer inside the hosting comp. The AE `CompItem` already exists (created in `onDrop`) — `addCompAsLayer` only adds a reference to it as a layer.

**`onGhost` handles pre-comp mode only.** When this CompNode is unwired from a parent comp, `onGhost` fires with a `parkLayer` command. This removes the pre-comp layer from the hosting comp and parks it in the Reserved Comp. The underlying AE `CompItem` is never touched — only the layer reference is moved.

**`onDelete` always deletes the `CompItem`.** Regardless of mode, deleting a CompNode deletes the AE comp from the project panel. The dispatcher's `deleteComp` action must handle both cases: removing the pre-comp layer first if the comp is currently hosted inside a parent comp, then deleting the `CompItem`.

**Same-comp constraint on parent wires.** The `child_of` and `parent_of` ports are only usable when this comp is in pre-comp mode (hosted inside another comp). The wire validator enforces this — a parent wire between a CompNode and another node is only valid if both share a `hostingComps` entry. The node definition does not enforce this — that is the wire validator's responsibility.

**No parenting loops.** A CompNode wired into parent comp A cannot be the parent of parent comp A via a parent wire. The cycle checker enforces this. Again, the node definition does not enforce it — the cycle checker does.

**`bgColor` is RGB, range 0–1, three channels.** Never four. AE comps do not support background alpha.

**Two dispatcher actions declared but not yet implemented:** `addCompAsLayer` and `setCompProperty`. Both are named here for the first time. Do not implement them — do not touch `dispatcher.jsx`. These names are now part of the project contract and must be used exactly as written when the dispatcher is built.

**No ES6+.** `var`, named functions, no arrow functions, no template literals throughout.

---

## On Completion

When the test script returns zero failures, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-04 COMPLETE

graph/nodes/categories/core/Comp.js    ✅  [N tests passed]

Verified in browser console. Zero failures.

New dispatcher actions declared (not yet implemented):
  - addCompAsLayer
  - setCompProperty

Next task: TASK-05 — Text.js and Null.js node definitions
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-04-COMP-NODE.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 9 & 10, PROCEDIA-V4-ARCHITECTURE.md Sections 1–4*
*Architecture doc updated: Section 3d (parent ports), Section 1a (CompNode exception), Section 2 (state transitions)*
