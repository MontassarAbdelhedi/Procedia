# TASK-02 — graphState.js and nodeRegistry.js

*Procedia — Second task. Builds on a completed TASK-01.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 12 and 13 especially (task execution protocol, grounded decisions)
2. `arch_specs.md` — Section 8 (Data Model) in full

Confirm both files exist at repo root before starting.

---

## Context

`graphState.js` and `nodeRegistry.js` are the two files everything else in the project depends on. No engine, no canvas, no UI, no AE calls can be implemented until these two are solid.

They are pure JavaScript. No AE connection. No DOM. No `csInterface`. They can be fully tested in the browser console by opening `index.html` in a browser tab.

This task implements both files completely and verifies them with a console test script before closing.

---

## What This Task Does NOT Do

- No AE calls. No `evalBridge`. No `csInterface`.
- No DOM manipulation. No UI updates.
- No engine logic. No cascade. No wire validation.
- No node definition files (`Comp.js`, `Text.js`, etc.) — those come later.
- No persistence reads or writes.

If you find yourself touching any file other than `graph/graphState.js` and `graph/nodeRegistry.js` — stop. That is out of scope.

---

## PHASE 1 — `graph/nodeRegistry.js`

### What it is

A thin, self-contained registry. Node definition files call `nodeRegistry.register(def)` on load and self-register. The registry stores them and exposes lookup methods. It has no dependencies — it must be one of the first files loaded.

### Replace the stub with this complete implementation

The file must begin with the dependency header, then declare the registry as an IIFE that exposes a clean public API.

**Exact public API:**

| Method          | Signature    | Returns         | Description                                                                                             |
| --------------- | ------------ | --------------- | ------------------------------------------------------------------------------------------------------- |
| `register`      | `(def)`      | `void`          | Stores the node definition keyed by `def.type`. Throws if `def.type` is missing or already registered. |
| `getDefinition` | `(type)`     | `def` or `null` | Returns the definition for the given type string. Returns `null` if not found — never throws.           |
| `getAll`        | `()`         | `object`        | Returns the full registry map `{ type: def, ... }`.                                                    |
| `getByCategory` | `(category)` | `array`         | Returns all definitions whose `category` matches. Returns empty array if none.                          |
| `listTypes`     | `()`         | `array`         | Returns array of all registered type strings.                                                           |

**Rules:**

- `register` must validate that `def.type` is a non-empty string. If not, throw with message: `'nodeRegistry.register: def.type is required'`
- `register` must validate that `def.type` is not already registered. If it is, throw with message: `'nodeRegistry.register: type already registered: ' + def.type`
- All methods are safe to call before any nodes are registered — `getAll()` returns `{}`, `listTypes()` returns `[]`, `getByCategory()` returns `[]`
- The registry object itself (`_registry`) is private — not accessible from outside the IIFE
- No `class`, no `prototype` manipulation, no ES6+ syntax

**Implementation shape:**

```javascript
// graph/nodeRegistry.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: all node category files, graph/schemaCache.js, graph/engine.js

var nodeRegistry = (function() {

  var _registry = {};

  function register(def) {
    // validate def.type exists
    // validate not already registered
    // store: _registry[def.type] = def
  }

  function getDefinition(type) {
    // return _registry[type] or null
  }

  function getAll() {
    // return _registry
  }

  function getByCategory(category) {
    // iterate _registry, collect matching, return array
  }

  function listTypes() {
    // return Object.keys(_registry)
  }

  return {
    register:      register,
    getDefinition: getDefinition,
    getAll:        getAll,
    getByCategory: getByCategory,
    listTypes:     listTypes
  };

})();
```

Fill in the function bodies completely. The shape above is the contract — do not add extra methods, do not remove any.

---

### Phase 1 verification — run in browser console

Open `index.html` in a browser tab. Open the browser console. Paste and run this test block:

```javascript
(function() {
  var PASS = 0; var FAIL = 0;

  function assert(label, condition) {
    if (condition) { console.log('[PASS]', label); PASS++; }
    else           { console.error('[FAIL]', label); FAIL++; }
  }

  // 1. Registry starts empty
  assert('listTypes returns empty array', nodeRegistry.listTypes().length === 0);
  assert('getAll returns empty object',   Object.keys(nodeRegistry.getAll()).length === 0);
  assert('getDefinition unknown returns null', nodeRegistry.getDefinition('layers/text') === null);
  assert('getByCategory unknown returns []', nodeRegistry.getByCategory('Layers').length === 0);

  // 2. Register a valid definition
  var fakeDef = { type: 'test/fake', label: 'Fake', category: 'Test', version: '1.0.0',
    nodeKind: 'affected', dedicated: false, ports: [], params: [],
    onDrop: function() { return null; }, onAlive: function() { return null; },
    onGhost: function() { return null; }, onDelete: function() { return null; },
    onPropertyChange: function() { return null; }
  };
  nodeRegistry.register(fakeDef);

  assert('listTypes has one entry after register', nodeRegistry.listTypes().length === 1);
  assert('getDefinition returns registered def',   nodeRegistry.getDefinition('test/fake') === fakeDef);
  assert('getAll has one entry',                   Object.keys(nodeRegistry.getAll()).length === 1);
  assert('getByCategory returns match',            nodeRegistry.getByCategory('Test').length === 1);
  assert('getByCategory wrong cat returns []',     nodeRegistry.getByCategory('Layers').length === 0);

  // 3. Duplicate registration throws
  var threw = false;
  try { nodeRegistry.register(fakeDef); } catch(e) { threw = true; }
  assert('duplicate registration throws', threw);

  // 4. Missing type throws
  var threwNoType = false;
  try { nodeRegistry.register({ label: 'No Type' }); } catch(e) { threwNoType = true; }
  assert('registration without type throws', threwNoType);

  console.log('---');
  console.log('nodeRegistry:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**All tests must pass — zero failures — before proceeding to Phase 2.**

**STOP. Paste console output. Wait for confirmation.**

---

## PHASE 2 — `graph/graphState.js`

### What it is

The single source of truth for all in-session graph data. It holds `nodeMap`, `wireMap`, and `tempGraph`. It is the **only** file in the project that mutates these objects directly. All other files call its public API.

### Data structures

Implement these exact shapes. Do not add or remove fields.

**`nodeMap` entry:**

```javascript
{
  id:           'PROC-{timestamp}-{rand4}',  // UUID — never changes after creation
  type:         'layers/text',               // node definition type string
  nodeKind:     'affected',                  // copied from def at creation time
  dedicated:    false,                       // copied from def at creation time
  state:        'ghost',                     // 'ghost' | 'alive' | 'error'
  dirty:        false,                       // true when props changed and not yet flushed to AE
  x:            0,                           // canvas position
  y:            0,
  props:        {},                          // keyed by param.key, values from node def defaults
  hostingComps: [],                          // UUIDs of comps this node is alive in
  hasParkedLayer: false,                     // true when node is ghost and its layer is in Reserved Comp
  portSlots:    {},                          // { portId: slotCount } for extendable ports
  dynamicSchema: null                        // runtime-only — populated for effector nodes with params:'dynamic'
                                             // NEVER written to tempGraph
  // _transplantLayerUUID: null              // transient engine field — set during wire-insertion
                                             // NEVER written to tempGraph
}
```

**`wireMap` entry:**

```javascript
{
  id:               'WIRE-{timestamp}-{rand4}',
  type:             'layer',          // 'layer' | 'data' | 'parent'
  fromNode:         'PROC-aaa',
  fromPort:         'output',
  toNode:           'PROC-bbb',
  toPort:           'layer_in_0',
  boundParam:       null,             // null | param key string — set when data wire binds to a param
  _pathLayerUUID:   null              // terminal-wire-only field. Non-null = active path.
                                      // When active, equals the wire's own id.
                                      // null = dormant path or non-terminal wire.
}
```

**`tempGraph`:**

```javascript
{
  version: '4.0',
  nodes:   {},   // mirror of nodeMap, rebuilt on every structural change — runtime-only fields stripped
  wires:   {}    // mirror of wireMap, rebuilt on every structural change — all fields included
}
```

**`selection`:**

```javascript
var selection = null;   // UUID string of selected node, or null
```

---

### Public API — implement all of these

**Node operations:**

| Method        | Signature       | Description                                                                                                                                                                                      |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `addNode`     | `(nodeData)`    | Adds a complete node entry to `nodeMap`. Calls `rebuildTempGraph()`. Throws if `nodeData.id` is missing or already exists.                                                                       |
| `removeNode`  | `(uuid)`        | Removes node from `nodeMap`. Also removes all wires in `wireMap` that reference this UUID (either `fromNode` or `toNode`). Calls `rebuildTempGraph()`. No-op if UUID not found — does not throw. |
| `updateNode`  | `(uuid, patch)` | Shallow-merges `patch` into `nodeMap[uuid]`. Calls `rebuildTempGraph()`. No-op if UUID not found.                                                                                                |
| `getNode`     | `(uuid)`        | Returns `nodeMap[uuid]` or `null`. Never throws.                                                                                                                                                 |
| `getAllNodes`  | `()`            | Returns `nodeMap`.                                                                                                                                                                               |

**Wire operations:**

| Method        | Signature    | Description                                                                                                                |
| ------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `addWire`     | `(wireData)` | Adds a complete wire entry to `wireMap`. Calls `rebuildTempGraph()`. Throws if `wireData.id` is missing or already exists. |
| `removeWire`  | `(wireId)`   | Removes wire from `wireMap`. Calls `rebuildTempGraph()`. No-op if not found.                                               |
| `updateWire`  | `(wireId, patch)` | Shallow-merges `patch` into `wireMap[wireId]`. Calls `rebuildTempGraph()`. No-op if not found. Used by engine to stamp `_pathLayerUUID` on terminal wires. |
| `getWire`     | `(wireId)`   | Returns `wireMap[wireId]` or `null`.                                                                                       |
| `getAllWires`  | `()`         | Returns `wireMap`.                                                                                                         |

**Property operations:**

| Method       | Signature            | Description                                                                                                                                                                                  |
| ------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `updateProp` | `(uuid, key, value)` | Sets `nodeMap[uuid].props[key] = value` and `nodeMap[uuid].dirty = true`. Does NOT call `rebuildTempGraph()` — property changes are not structural. No-op if UUID not found.                |
| `clearDirty` | `(uuid)`             | Sets `nodeMap[uuid].dirty = false`. No-op if UUID not found.                                                                                                                                 |

**Selection:**

| Method              | Signature    | Description                                                                                                                |
| ------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `setSelection`      | `(uuid)`     | Sets `selection = uuid`. Pass `null` to deselect. Fires `_onSelectionChangeCb` callback if registered.                    |
| `getSelection`      | `()`         | Returns current `selection` value (UUID string or `null`).                                                                 |
| `onSelectionChange` | `(callback)` | Registers a single callback function fired whenever `setSelection` is called. Replaces any previously registered callback. |

**Graph operations:**

| Method             | Signature     | Description                                                                                                                                                                    |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rebuildTempGraph` | `()`          | Rebuilds `tempGraph` from current `nodeMap` and `wireMap`. Called internally after every structural change. Also callable externally.                                          |
| `loadGraph`        | `(graphData)` | Replaces `nodeMap` and `wireMap` entirely from a parsed `tempGraph` object. Used on panel open / crash recovery. Calls `rebuildTempGraph()`. Clears selection.                 |
| `clearGraph`       | `()`          | Resets `nodeMap`, `wireMap`, `tempGraph`, and `selection` to their initial empty states.                                                                                       |

---

### `rebuildTempGraph` — exact behavior

`tempGraph.nodes` is a copy of `nodeMap` with these runtime-only fields stripped per entry:
- `dirty` — excluded
- `portSlots` — excluded
- `dynamicSchema` — excluded
- `_transplantLayerUUID` — excluded (if present)

Everything else — including `hasParkedLayer` and `_pathLayerUUID` on wires — is included.

`tempGraph.wires` is a direct copy of `wireMap` — all fields included (including `_pathLayerUUID`).

Do not use `JSON.parse(JSON.stringify(...))` for the copy — iterate and build manually to keep the strip logic explicit and ES3-safe. Use `for...in` for iteration. Explicitly copy each field by name in the nodes copy, skipping the four stripped fields.

---

### `loadGraph` — exact behavior

When loading a saved graph on panel open:

1. Replace `nodeMap` entirely from `graphData.nodes`
2. Replace `wireMap` entirely from `graphData.wires`
3. For every node entry loaded into `nodeMap`, inject these runtime-only fields if absent:
   - `dirty: false`
   - `portSlots: {}`
   - `hasParkedLayer: false` (if not present in saved data)
   - `dynamicSchema: null`
4. Clear `selection` to `null`
5. Call `rebuildTempGraph()`

Never assume these runtime fields exist in the incoming `graphData`. They are stripped from `tempGraph` on write and must be re-injected on load.

---

### Implementation shape

```javascript
// graph/graphState.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/schemaCache.js, graph/engine.js, graph/cascadeAlgorithm.js,
//                   graph/portManager.js, graph/wireValidator.js, graph/cycleChecker.js

var graphState = (function() {

  var nodeMap    = {};
  var wireMap    = {};
  var tempGraph  = { version: '4.0', nodes: {}, wires: {} };
  var selection  = null;
  var _onSelectionChangeCb = null;

  // --- internal helpers ---

  function rebuildTempGraph() {
    // build tempGraph.nodes: copy nodeMap, strip 'dirty', 'portSlots',
    //   'dynamicSchema', '_transplantLayerUUID' per entry
    // build tempGraph.wires: copy wireMap directly (all fields including _pathLayerUUID)
  }

  function _removeWiresForNode(uuid) {
    // iterate wireMap, collect IDs where fromNode === uuid or toNode === uuid
    // delete each from wireMap
  }

  // --- node operations ---

  function addNode(nodeData)         { }
  function removeNode(uuid)          { }
  function updateNode(uuid, patch)   { }
  function getNode(uuid)             { }
  function getAllNodes()              { }

  // --- wire operations ---

  function addWire(wireData)         { }
  function removeWire(wireId)        { }
  function updateWire(wireId, patch) { }
  function getWire(wireId)           { }
  function getAllWires()              { }

  // --- property operations ---

  function updateProp(uuid, key, value) { }
  function clearDirty(uuid)             { }

  // --- selection ---

  function setSelection(uuid)          { }
  function getSelection()              { }
  function onSelectionChange(callback) { }

  // --- graph operations ---

  function loadGraph(graphData) { }
  function clearGraph()         { }

  return {
    addNode:           addNode,
    removeNode:        removeNode,
    updateNode:        updateNode,
    getNode:           getNode,
    getAllNodes:        getAllNodes,

    addWire:           addWire,
    removeWire:        removeWire,
    updateWire:        updateWire,
    getWire:           getWire,
    getAllWires:        getAllWires,

    updateProp:        updateProp,
    clearDirty:        clearDirty,

    setSelection:      setSelection,
    getSelection:      getSelection,
    onSelectionChange: onSelectionChange,

    rebuildTempGraph:  rebuildTempGraph,
    loadGraph:         loadGraph,
    clearGraph:        clearGraph
  };

})();
```

Fill in every function body completely. The shape above is the exact contract — no additions, no removals.

---

### Phase 2 verification — run in browser console

Reload `index.html`. Open the browser console. Paste and run this test block:

```javascript
(function() {
  var PASS = 0; var FAIL = 0;

  function assert(label, condition) {
    if (condition) { console.log('[PASS]', label); PASS++; }
    else           { console.error('[FAIL]', label); FAIL++; }
  }

  // ── INITIAL STATE ──────────────────────────────────────────
  assert('getAllNodes empty on init',   Object.keys(graphState.getAllNodes()).length === 0);
  assert('getAllWires empty on init',   Object.keys(graphState.getAllWires()).length === 0);
  assert('getSelection null on init',  graphState.getSelection() === null);

  // ── ADD NODE ───────────────────────────────────────────────
  var nodeA = {
    id: 'PROC-TEST-aaaa', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'ghost', dirty: false, x: 100, y: 200,
    props: { label: 'Test', content: 'Hello', fontSize: 72 },
    hostingComps: [], hasParkedLayer: false, portSlots: {}, dynamicSchema: null
  };
  graphState.addNode(nodeA);

  assert('addNode adds to nodeMap',             graphState.getNode('PROC-TEST-aaaa') !== null);
  assert('getNode returns correct id',          graphState.getNode('PROC-TEST-aaaa').id === 'PROC-TEST-aaaa');
  assert('getAllNodes has one entry',            Object.keys(graphState.getAllNodes()).length === 1);
  assert('tempGraph.nodes has entry after add', graphState.rebuildTempGraph() === undefined &&
         Object.keys(graphState.getAllNodes()).length === 1); // rebuildTempGraph returns void

  // ── DUPLICATE NODE THROWS ──────────────────────────────────
  var threw = false;
  try { graphState.addNode(nodeA); } catch(e) { threw = true; }
  assert('addNode duplicate throws', threw);

  // ── ADD SECOND NODE ────────────────────────────────────────
  var nodeB = {
    id: 'PROC-TEST-bbbb', type: 'core/comp', nodeKind: 'affected', dedicated: true,
    state: 'alive', dirty: false, x: 300, y: 200,
    props: { label: 'Comp', duration: 10, fps: 24 },
    hostingComps: [], hasParkedLayer: false, portSlots: {}, dynamicSchema: null
  };
  graphState.addNode(nodeB);
  assert('getAllNodes has two entries', Object.keys(graphState.getAllNodes()).length === 2);

  // ── ADD WIRE ───────────────────────────────────────────────
  var wireX = {
    id: 'WIRE-TEST-xxxx', type: 'layer',
    fromNode: 'PROC-TEST-aaaa', fromPort: 'output',
    toNode:   'PROC-TEST-bbbb', toPort: 'layer_in_0',
    boundParam: null, _pathLayerUUID: null
  };
  graphState.addWire(wireX);
  assert('addWire adds to wireMap',           graphState.getWire('WIRE-TEST-xxxx') !== null);
  assert('getAllWires has one entry',         Object.keys(graphState.getAllWires()).length === 1);
  assert('getWire returns correct fromNode', graphState.getWire('WIRE-TEST-xxxx').fromNode === 'PROC-TEST-aaaa');

  // ── DUPLICATE WIRE THROWS ──────────────────────────────────
  var threwWire = false;
  try { graphState.addWire(wireX); } catch(e) { threwWire = true; }
  assert('addWire duplicate throws', threwWire);

  // ── UPDATE WIRE (_pathLayerUUID stamp) ─────────────────────
  graphState.updateWire('WIRE-TEST-xxxx', { _pathLayerUUID: 'WIRE-TEST-xxxx' });
  assert('updateWire stamps _pathLayerUUID',
    graphState.getWire('WIRE-TEST-xxxx')._pathLayerUUID === 'WIRE-TEST-xxxx');
  assert('updateWire preserves other fields',
    graphState.getWire('WIRE-TEST-xxxx').fromNode === 'PROC-TEST-aaaa');

  // ── UPDATE NODE ────────────────────────────────────────────
  graphState.updateNode('PROC-TEST-aaaa', { state: 'alive' });
  assert('updateNode changes state', graphState.getNode('PROC-TEST-aaaa').state === 'alive');
  assert('updateNode preserves other fields', graphState.getNode('PROC-TEST-aaaa').type === 'layers/text');

  // ── UPDATE PROP ────────────────────────────────────────────
  graphState.updateProp('PROC-TEST-aaaa', 'fontSize', 48);
  assert('updateProp sets prop value', graphState.getNode('PROC-TEST-aaaa').props.fontSize === 48);
  assert('updateProp sets dirty flag', graphState.getNode('PROC-TEST-aaaa').dirty === true);

  // ── CLEAR DIRTY ────────────────────────────────────────────
  graphState.clearDirty('PROC-TEST-aaaa');
  assert('clearDirty resets dirty flag', graphState.getNode('PROC-TEST-aaaa').dirty === false);

  // ── SELECTION ──────────────────────────────────────────────
  var selectionFired = false;
  var selectedId     = null;
  graphState.onSelectionChange(function(uuid) { selectionFired = true; selectedId = uuid; });
  graphState.setSelection('PROC-TEST-aaaa');
  assert('setSelection updates getSelection',     graphState.getSelection() === 'PROC-TEST-aaaa');
  assert('setSelection fires callback',           selectionFired === true);
  assert('callback receives correct uuid',        selectedId === 'PROC-TEST-aaaa');
  graphState.setSelection(null);
  assert('setSelection null clears selection',    graphState.getSelection() === null);

  // ── TEMPGRAPH — runtime fields stripped ────────────────────
  graphState.rebuildTempGraph();
  var nodeEntry = graphState.getNode('PROC-TEST-aaaa');
  assert('nodeMap entry has dirty field (runtime — present in nodeMap)',
    nodeEntry.dirty !== undefined);
  // tempGraph is not directly exposed — its strip logic is verified via loadGraph round-trip below

  // ── REMOVE WIRE ────────────────────────────────────────────
  graphState.removeWire('WIRE-TEST-xxxx');
  assert('removeWire removes from wireMap',   graphState.getWire('WIRE-TEST-xxxx') === null);
  assert('getAllWires empty after remove',    Object.keys(graphState.getAllWires()).length === 0);

  // ── REMOVE NODE — cascades wire removal ────────────────────
  // Re-add wire to test cascade
  graphState.addWire(wireX);
  assert('wire re-added for cascade test', graphState.getWire('WIRE-TEST-xxxx') !== null);
  graphState.removeNode('PROC-TEST-aaaa');
  assert('removeNode removes node',                graphState.getNode('PROC-TEST-aaaa') === null);
  assert('removeNode also removes its wires',      graphState.getWire('WIRE-TEST-xxxx') === null);
  assert('removeNode leaves unrelated node intact',graphState.getNode('PROC-TEST-bbbb') !== null);

  // ── LOAD GRAPH ─────────────────────────────────────────────
  graphState.clearGraph();
  assert('clearGraph empties nodes', Object.keys(graphState.getAllNodes()).length === 0);
  assert('clearGraph empties wires', Object.keys(graphState.getAllWires()).length === 0);
  assert('clearGraph clears selection', graphState.getSelection() === null);

  // Simulate a persisted tempGraph — runtime fields are absent (stripped on write)
  var savedGraph = {
    version: '4.0',
    nodes: {
      'PROC-LOAD-1111': {
        id: 'PROC-LOAD-1111', type: 'core/comp', nodeKind: 'affected', dedicated: true,
        state: 'alive', x: 0, y: 0, props: { label: 'Loaded Comp' },
        hostingComps: [], hasParkedLayer: false
        // dirty, portSlots, dynamicSchema intentionally absent — stripped on write
      }
    },
    wires: {}
  };
  graphState.loadGraph(savedGraph);
  assert('loadGraph restores node',           graphState.getNode('PROC-LOAD-1111') !== null);
  assert('loadGraph restored label prop',     graphState.getNode('PROC-LOAD-1111').props.label === 'Loaded Comp');
  assert('loadGraph injects dirty: false',    graphState.getNode('PROC-LOAD-1111').dirty === false);
  assert('loadGraph injects portSlots: {}',   typeof graphState.getNode('PROC-LOAD-1111').portSlots === 'object');
  assert('loadGraph injects dynamicSchema: null', graphState.getNode('PROC-LOAD-1111').dynamicSchema === null);

  // ── UNKNOWN UUID SAFETY ────────────────────────────────────
  assert('getNode unknown returns null',      graphState.getNode('PROC-DOES-NOT-EXIST') === null);
  assert('removeNode unknown is no-op',       (graphState.removeNode('PROC-DOES-NOT-EXIST'), true));
  assert('updateNode unknown is no-op',       (graphState.updateNode('PROC-DOES-NOT-EXIST', { state: 'alive' }), true));
  assert('updateProp unknown is no-op',       (graphState.updateProp('PROC-DOES-NOT-EXIST', 'x', 1), true));
  assert('clearDirty unknown is no-op',       (graphState.clearDirty('PROC-DOES-NOT-EXIST'), true));
  assert('removeWire unknown is no-op',       (graphState.removeWire('WIRE-DOES-NOT-EXIST'), true));
  assert('updateWire unknown is no-op',       (graphState.updateWire('WIRE-DOES-NOT-EXIST', { _pathLayerUUID: 'x' }), true));
  assert('getWire unknown returns null',      graphState.getWire('WIRE-DOES-NOT-EXIST') === null);

  console.log('---');
  console.log('graphState:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**All tests must pass — zero failures — before closing this task.**

**STOP. Paste console output. Wait for confirmation.**

---

## Additional Rules for This Task

**No mutation from outside `graphState`.** The IIFE pattern enforces this — `nodeMap`, `wireMap`, `tempGraph`, and `selection` are closed over and not exposed directly. The only mutation path is through the public API. Do not add `nodeMap` or `wireMap` to the returned object.

**`rebuildTempGraph` is called by the public API, not by callers.** `addNode`, `removeNode`, `updateNode`, `addWire`, `removeWire`, `updateWire` all call `rebuildTempGraph()` internally at the end. Callers never need to call it manually (though they can).

**`updateProp` does not call `rebuildTempGraph`.** Property changes are not structural. They do not change the graph topology. They only update a value and set the dirty flag. Rebuilding `tempGraph` on every keystroke would be wasteful.

**`loadGraph` injects four runtime-only fields on every loaded node** if those fields are missing: `dirty: false`, `portSlots: {}`, `dynamicSchema: null`, and `hasParkedLayer: false`. These fields are stripped from `tempGraph` on write and must always be re-injected on load. Never assume they exist in the incoming `graphData`.

**No ES6+.** No `const`, `let`, arrow functions, `Object.assign`, `Object.entries`, spread, destructuring, template literals. Use `var`, `for...in` loops, and explicit property assignment throughout.

---

## On Completion

When both phase test scripts return zero failures, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-02 COMPLETE

graph/nodeRegistry.js    ✅  [N tests passed]
graph/graphState.js      ✅  [N tests passed]

Both verified in browser console. Zero failures.
Next task: TASK-03 — uuidGenerator.js + evalBridge.js
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-02-GRAPHSTATE-REGISTRY.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md, arch_specs.md Section 8*
