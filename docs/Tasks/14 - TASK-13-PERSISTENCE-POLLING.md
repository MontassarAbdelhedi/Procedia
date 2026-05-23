# TASK-13 — persistence.jsx, polling.jsx, poller.js, evalBridge isWriting flag
*Procedia v4 — Thirteenth task. Builds on completed TASK-01 through TASK-12.*
*Requires After Effects to be open for full verification.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 1, 2, 3, 4, 5, 8 in full — all ExtendScript and bridge skills
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 9, 11, 12 in full

Confirm both files are present at repo root before starting.

---

## Context

After TASK-12, Procedia can create and manipulate AE objects in a live session. What it cannot do yet is remember anything across sessions — closing AE and reopening it loses the entire graph. This task adds persistence and polling.

**Four files in this task:**

| File | What it does |
|---|---|
| `jsx/persistence.jsx` | Reads and writes the graph to text layers in the Reserved Comp |
| `jsx/polling.jsx` | Checks alive node UUIDs in a single bridge crossing per tick |
| `polling/poller.js` | Panel-side adaptive tick loop. Calls `evalBridge` on each tick. Respects `isWriting`. |
| `bridge/evalBridge.js` | **Modified** — adds `isWriting` flag management and `isWritingState()` getter |

Additionally, **`index.js` is updated** to wire the full panel-open read sequence and start the poller after graph is loaded.

---

## What This Task Does NOT Do

- No new node definitions
- No dispatcher changes
- No UI changes beyond what `notificationBar.js` already renders
- No new canvas interactions

---

## CRITICAL: ExtendScript Rules

All `.jsx` files in this task are ExtendScript ES3. Every rule from SKILL 1 applies without exception:
- `var` only, named functions, string concatenation, `for` loops
- `JSON` is provided by `jsx/json.jsx` via `#include`
- Every function returns `JSON.stringify({ ok, data, error })`
- All AE calls wrapped in try/catch

---

## PHASE 1 — `bridge/evalBridge.js` — add `isWriting` flag

### What changes

`evalBridge` currently dispatches commands without tracking whether a write is in progress. The poller needs to know when `evalBridge` is busy so it skips its tick rather than queuing up during a cascade batch.

Add these three things to `evalBridge.js`:

**1. A private `_isWriting` flag:**

```javascript
var _isWriting = false;
```

**2. Set `_isWriting = true` before every `csInterface.evalScript` call. Set `_isWriting = false` in the callback — both on success and on error.**

Update `dispatch` and `dispatchBatch` to wrap the `csInterface.evalScript` call:

```javascript
function dispatch(commandObj) {
  return new Promise(function(resolve, reject) {
    if (!_isBridgeAvailable()) {
      reject(new Error('[evalBridge] csInterface not available'));
      return;
    }
    _isWriting = true;                           // ← SET before call
    var json = JSON.stringify(commandObj);
    var call = 'dispatch(' + JSON.stringify(json) + ')';
    csInterface.evalScript(call, function(result) {
      _isWriting = false;                        // ← CLEAR in callback
      try { resolve(JSON.parse(result)); }
      catch(e) { reject(new Error('[evalBridge] parse error: ' + result)); }
    });
  });
}
```

Apply the same pattern to `dispatchBatch`.

**3. Expose a public `isWriting()` getter:**

```javascript
function isWriting() { return _isWriting; }
```

Add `isWriting` to the returned public API object.

### Phase 1 verification — browser console

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  assert('isWriting function exists',      typeof evalBridge.isWriting === 'function');
  assert('isWriting is false initially',   evalBridge.isWriting() === false);

  // dispatch in browser context rejects (no csInterface) — isWriting stays false
  evalBridge.dispatch({ action: 'test', params: {} }).catch(function() {});
  assert('isWriting false outside AE',     evalBridge.isWriting() === false);

  console.log('---');
  console.log('evalBridge isWriting:', PASS, 'passed,', FAIL, 'failed');
})();
```

**Zero failures required before Phase 2.**

**STOP. Paste console output. Wait for confirmation.**

---

## PHASE 2 — `jsx/persistence.jsx`

### What it is

Reads and writes the serialized graph to and from the Reserved Comp. Two text layers inside the Reserved Comp store the JSON:

- Layer named `__PROCEDIA_NODES__` — serialized `tempGraph.nodes`
- Layer named `__PROCEDIA_WIRES__` — serialized `tempGraph.wires`

### AE text layer character limit

AE text layer source text has a practical limit of approximately **30,000 characters** per layer. Large graphs may exceed this. When the serialized string exceeds `MAX_CHUNK_SIZE` (set to 25,000 characters — conservative margin), it is split across multiple layers:

- `__PROCEDIA_NODES_1__`, `__PROCEDIA_NODES_2__`, `__PROCEDIA_NODES_3__`, ...
- `__PROCEDIA_WIRES_1__`, `__PROCEDIA_WIRES_2__`, ...

The reader detects chunk layers by name prefix and concatenates them in order before parsing.

### Preamble

```jsx
// jsx/persistence.jsx
// DEPENDS ON: jsx/json.jsx, jsx/utils.jsx
// MUST be #included or evaluated after json.jsx and utils.jsx

#include "../json.jsx"
#include "../utils.jsx"

var PERSISTENCE_MAX_CHUNK = 25000;
```

### `writeGraph(graphJSON)` — entry point called from panel

```
params: graphJSON — a JSON string of { version, nodes, wires }
        (serialized from graphState.tempGraph by the panel before calling evalBridge)

1. reserved = findOrCreateReservedComp()

2. nodesJSON = the 'nodes' portion — re-serialized from graphJSON.nodes
   wiresJSON = the 'wires' portion — re-serialized from graphJSON.wires
   (Parse graphJSON, extract nodes and wires, re-stringify each separately)

3. Write nodesJSON to Reserved Comp:
   _writeChunks(reserved, '__PROCEDIA_NODES__', nodesJSON)

4. Write wiresJSON to Reserved Comp:
   _writeChunks(reserved, '__PROCEDIA_WIRES__', wiresJSON)

5. Return JSON.stringify({ ok: true, data: { written: true } })
```

### `_writeChunks(comp, layerNameBase, jsonString)` — internal

```
1. Remove all existing layers in comp whose name starts with layerNameBase
   (This cleans up both single-layer and chunked formats from previous writes)

2. If jsonString.length <= PERSISTENCE_MAX_CHUNK:
   — Create one text layer named layerNameBase
   — Set its source text to jsonString
   Return

3. If jsonString.length > PERSISTENCE_MAX_CHUNK:
   — Split into chunks of PERSISTENCE_MAX_CHUNK characters:
     chunk 1: jsonString.substring(0, 25000)
     chunk 2: jsonString.substring(25000, 50000)
     etc.
   — For each chunk at index i (1-based):
     Create text layer named layerNameBase + '_' + i
     Set its source text to the chunk
```

**Setting text layer source text in AE:**

```jsx
function _setLayerText(layer, text) {
  var textProp = layer.property('ADBE Text Properties').property('ADBE Text Document');
  var doc = textProp.value;
  doc.text = text;
  textProp.setValue(doc);
}
```

**Creating a text layer for persistence (not a real visible layer — set it invisible):**

```jsx
function _createPersistenceLayer(comp, name) {
  var layer = comp.layers.addText('');
  layer.name = name;
  layer.enabled = false;  // invisible — this is a data layer
  return layer;
}
```

### `readGraph()` — entry point called from panel on open

```
1. reserved = findReservedComp()
   — If null: return { ok: true, data: { nodes: {}, wires: {}, fresh: true } }
     (No Reserved Comp = first run, empty graph)

2. nodesJSON = _readChunks(reserved, '__PROCEDIA_NODES__')
   wiresJSON  = _readChunks(reserved, '__PROCEDIA_WIRES__')

   — If either returns null:
     return { ok: true, data: { nodes: {}, wires: {}, fresh: true } }
     (Layers missing = treat as first run)

3. Try to parse both:
   var nodes = JSON.parse(nodesJSON)
   var wires = JSON.parse(wiresJSON)
   — If either throws: return { ok: false, error: 'Graph parse failed: ' + e.toString(),
                                data: { nodes: {}, wires: {}, parseError: true } }

4. Return { ok: true, data: { nodes: nodes, wires: wires, fresh: false } }
```

### `_readChunks(comp, layerNameBase)` — internal

```
1. Check for a single layer named exactly layerNameBase:
   — If found: return its source text

2. Check for chunked layers: layerNameBase + '_1', '_2', etc.
   — Collect all layers whose name starts with layerNameBase + '_'
   — Sort by the numeric suffix (ascending)
   — Concatenate their source text in order
   — If any chunks found: return concatenated string

3. If nothing found: return null
```

**Reading source text from a text layer:**

```jsx
function _getLayerText(layer) {
  return layer.property('ADBE Text Properties')
              .property('ADBE Text Document').value.text;
}
```

### Complete file structure

```jsx
// jsx/persistence.jsx
// DEPENDS ON: jsx/json.jsx, jsx/utils.jsx
// MUST be evaluated after json.jsx and utils.jsx in the evalBridge preamble

#include "../json.jsx"
#include "../utils.jsx"

var PERSISTENCE_MAX_CHUNK = 25000;

function _setLayerText(layer, text) { ... }
function _createPersistenceLayer(comp, name) { ... }
function _getLayerText(layer) { ... }
function _writeChunks(comp, layerNameBase, jsonString) { ... }
function _readChunks(comp, layerNameBase) { ... }

function writeGraph(graphJSON) {
  var result = { ok: false, data: null, error: null };
  try {
    // see algorithm above
  } catch(e) {
    result.error = 'writeGraph error: ' + e.toString();
  }
  return JSON.stringify(result);
}

function readGraph() {
  var result = { ok: false, data: null, error: null };
  try {
    // see algorithm above
  } catch(e) {
    result.error = 'readGraph error: ' + e.toString();
  }
  return JSON.stringify(result);
}
```

### Update `evalBridge.js` — add persistence bridge functions

Add two new public functions to `evalBridge.js` that call the persistence functions:

```javascript
function writeGraph(graphData) {
  // graphData is the tempGraph object from graphState
  return new Promise(function(resolve, reject) {
    if (!_isBridgeAvailable()) {
      reject(new Error('[evalBridge] csInterface not available'));
      return;
    }
    var json = JSON.stringify(graphData);
    var call = 'writeGraph(' + JSON.stringify(json) + ')';
    _isWriting = true;
    csInterface.evalScript(call, function(result) {
      _isWriting = false;
      try { resolve(JSON.parse(result)); }
      catch(e) { reject(new Error('[evalBridge] writeGraph parse error')); }
    });
  });
}

function readGraph() {
  return new Promise(function(resolve, reject) {
    if (!_isBridgeAvailable()) {
      reject(new Error('[evalBridge] csInterface not available'));
      return;
    }
    _isWriting = true;
    csInterface.evalScript('readGraph()', function(result) {
      _isWriting = false;
      try { resolve(JSON.parse(result)); }
      catch(e) { reject(new Error('[evalBridge] readGraph parse error')); }
    });
  });
}
```

Add both to the `evalBridge` public API.

---

### Phase 2 verification — in After Effects

Test via the ESTK or AE Script Editor:

```jsx
#include "jsx/json.jsx"
#include "jsx/utils.jsx"
#include "jsx/persistence.jsx"

// Simulate a graph
var fakeGraph = JSON.stringify({
  version: '4.0',
  nodes: {
    'PROC-TEST-p001': {
      id: 'PROC-TEST-p001', type: 'layers/text', nodeKind: 'affected',
      dedicated: false, state: 'alive', x: 100, y: 200,
      props: { label: 'Hello', content: 'Test', fontSize: 72 },
      hostingComps: ['PROC-TEST-c001']
    }
  },
  wires: {
    'WIRE-TEST-w001': {
      id: 'WIRE-TEST-w001', type: 'layer',
      fromNode: 'PROC-TEST-p001', fromPort: 'output',
      toNode: 'PROC-TEST-c001', toPort: 'layer_in_0',
      boundParam: null
    }
  }
});

// Write
var writeResult = JSON.parse(writeGraph(fakeGraph));
$.writeln('writeGraph ok: ' + writeResult.ok);
$.writeln('PASS write: ' + writeResult.ok);

// Read back
var readResult = JSON.parse(readGraph());
$.writeln('readGraph ok: ' + readResult.ok);
$.writeln('fresh: ' + readResult.data.fresh);
$.writeln('node found: ' + (readResult.data.nodes['PROC-TEST-p001'] !== undefined));
$.writeln('wire found: ' + (readResult.data.wires['WIRE-TEST-w001'] !== undefined));
$.writeln('PASS read: ' + (readResult.ok && !readResult.data.fresh &&
  readResult.data.nodes['PROC-TEST-p001'] !== undefined &&
  readResult.data.wires['WIRE-TEST-w001'] !== undefined));

// Test chunking — write a string > 25000 chars
var bigNodes = {};
for (var i = 0; i < 200; i++) {
  var uid = 'PROC-CHUNK-' + i;
  bigNodes[uid] = { id: uid, type: 'layers/text', props: { label: 'Node ' + i,
    content: 'Content for node number ' + i + ' in the big graph test' } };
}
var bigGraph = JSON.stringify({ version: '4.0', nodes: bigNodes, wires: {} });
$.writeln('bigGraph length: ' + bigGraph.length);

var bigWrite = JSON.parse(writeGraph(bigGraph));
$.writeln('PASS bigWrite: ' + bigWrite.ok);

var bigRead = JSON.parse(readGraph());
var nodeCount = 0;
for (var k in bigRead.data.nodes) { nodeCount++; }
$.writeln('Nodes read back: ' + nodeCount);
$.writeln('PASS bigRead: ' + (bigRead.ok && nodeCount === 200));

$.writeln('Persistence tests complete.');
```

**Checklist:**
- [ ] `PASS write: true`
- [ ] `PASS read: true` — node and wire round-trip correctly
- [ ] `PASS bigWrite: true` — large graph written without error
- [ ] `PASS bigRead: true` — all 200 nodes read back correctly
- [ ] Reserved Comp in AE project panel contains text layers named `__PROCEDIA_NODES__` and `__PROCEDIA_WIRES__` (or chunked variants for large graph)
- [ ] Persistence layers are invisible in the comp (`layer.enabled === false`)

**STOP. Paste ESTK output. Wait for confirmation.**

---

## PHASE 3 — `jsx/polling.jsx`

### What it is

A single ExtendScript function `pollAliveNodes(uuidListJSON)` that checks all alive node UUIDs in one bridge crossing. For each UUID it finds the AE object, confirms it exists, and optionally syncs back any properties the user changed directly in AE.

### What it checks per node

Each entry in the UUID list has: `{ uuid, nodeKind, type }`.

- If `nodeKind === 'affected'` and `dedicated === true` and `type === 'core/comp'`:
  → Look up by `findCompByUUID(uuid)`. Return comp dimensions if found.
- Else if `nodeKind === 'affected'`:
  → Search all comps for a layer with this UUID (skip Reserved Comp).
- `nodeKind === 'effector'` or `'data'`:
  → Skip — effectors and data nodes have no standalone AE object to poll.

### Return format

```javascript
// Returns JSON.stringify({ ok, data, error })
// data is an array of poll results, one per UUID checked:
[
  { uuid: 'PROC-xxx', found: true,  props: { label: 'My Text' } },
  { uuid: 'PROC-yyy', found: false, props: null },   // object missing → error state
  { uuid: 'PROC-zzz', found: true,  props: { label: 'Main Comp', width: 1920, height: 1080 } }
]
```

`props` contains only the properties that can be changed directly in AE and synced back:
- For layers: `{ label: layer.name }`
- For comps: `{ label: comp.name, width: comp.width, height: comp.height, fps: comp.frameRate, duration: comp.duration }`

### Preamble

```jsx
// jsx/polling.jsx
// DEPENDS ON: jsx/json.jsx, jsx/utils.jsx
// MUST be evaluated after json.jsx and utils.jsx

#include "../json.jsx"
#include "../utils.jsx"
```

### Implementation

```jsx
function pollAliveNodes(uuidListJSON) {
  var result = { ok: false, data: null, error: null };
  try {
    var uuidList = JSON.parse(uuidListJSON);
    var pollResults = [];

    for (var i = 0; i < uuidList.length; i++) {
      var entry   = uuidList[i];
      var uuid    = entry.uuid;
      var kind    = entry.nodeKind;
      var type    = entry.type;

      // Skip non-AE nodes
      if (kind === 'effector' || kind === 'data') continue;

      var found = false;
      var props = null;

      // CompNode — look up as CompItem
      if (kind === 'affected' && type === 'core/comp') {
        var comp = findCompByUUID(uuid);
        if (comp) {
          found = true;
          props = {
            label:    comp.name,
            width:    comp.width,
            height:   comp.height,
            fps:      comp.frameRate,
            duration: comp.duration
          };
        }
      } else {
        // Affected layer node — search all comps
        var proj = app.project;
        for (var j = 1; j <= proj.numItems; j++) {
          var item = proj.item(j);
          if (!(item instanceof CompItem)) continue;
          if (item.name.indexOf('DO NOT DELETE') === 0) continue;
          var layer = findLayerByUUID(item, uuid);
          if (layer) {
            found = true;
            props = { label: layer.name };
            break;
          }
        }
      }

      pollResults.push({ uuid: uuid, found: found, props: props });
    }

    result.ok   = true;
    result.data = pollResults;
  } catch(e) {
    result.error = 'pollAliveNodes error: ' + e.toString();
  }
  return JSON.stringify(result);
}
```

This implementation is complete as written — copy it exactly.

---

### Phase 3 verification — ESTK

```jsx
#include "jsx/json.jsx"
#include "jsx/utils.jsx"
#include "jsx/polling.jsx"

// Create a test comp and layer
var testComp = app.project.items.addComp('_poll_test', 1920, 1080, 1.0, 10, 24);
testComp.comment = 'PROC-POLL-comp01';
var testLayer = testComp.layers.addNull(10);
testLayer.comment = 'PROC-POLL-null01';

var uuidList = JSON.stringify([
  { uuid: 'PROC-POLL-comp01', nodeKind: 'affected', type: 'core/comp'  },
  { uuid: 'PROC-POLL-null01', nodeKind: 'affected', type: 'layers/null' },
  { uuid: 'PROC-POLL-ghost',  nodeKind: 'affected', type: 'layers/text' },
  { uuid: 'PROC-POLL-data',   nodeKind: 'data',     type: 'data/color'  }
]);

var pollResult = JSON.parse(pollAliveNodes(uuidList));
$.writeln('pollAliveNodes ok: ' + pollResult.ok);

var results = pollResult.data;
$.writeln('Result count: ' + results.length);  // 3 — data node skipped

// Comp found
var compRes = null;
var layerRes = null;
var ghostRes = null;
for (var i = 0; i < results.length; i++) {
  if (results[i].uuid === 'PROC-POLL-comp01') compRes = results[i];
  if (results[i].uuid === 'PROC-POLL-null01') layerRes = results[i];
  if (results[i].uuid === 'PROC-POLL-ghost')  ghostRes = results[i];
}

$.writeln('PASS comp found: '    + (compRes  && compRes.found  === true));
$.writeln('PASS comp props: '    + (compRes  && compRes.props.width === 1920));
$.writeln('PASS layer found: '   + (layerRes && layerRes.found === true));
$.writeln('PASS ghost missing: ' + (ghostRes && ghostRes.found === false));
$.writeln('PASS data skipped: '  + (results.length === 3));

// Cleanup
testComp.remove();
$.writeln('Polling tests complete.');
```

**Checklist:**
- [ ] `PASS comp found: true`
- [ ] `PASS comp props: true`
- [ ] `PASS layer found: true`
- [ ] `PASS ghost missing: true`
- [ ] `PASS data skipped: true`

**STOP. Paste ESTK output. Wait for confirmation.**

---

## PHASE 4 — `polling/poller.js`

### What it is

The panel-side adaptive tick loop. Calls `evalBridge` on each tick to run `pollAliveNodes`. Processes results to update `graphState` and trigger notifications.

### Tick rates

| Panel state | Tick interval |
|---|---|
| Active (window focused) | 1000ms |
| Idle (window not focused) | 5000ms |

Track activity with a `_lastActivityAt` timestamp. Any user interaction (mousedown, keydown) resets it. If `Date.now() - _lastActivityAt > 10000` (10 seconds), consider the panel idle.

### Public API

| Function | Description |
|---|---|
| `poller.start()` | Starts the tick loop. Called from `index.js` after graph is loaded. |
| `poller.stop()` | Stops the tick loop. Called on panel unload. |
| `poller.notifyActivity()` | Resets the idle timer. Called by canvas input and keyboard handlers. |

### Tick algorithm

```
_tick():

1. Check evalBridge.isWriting() — if true: skip this tick entirely. Return.

2. Collect alive node UUIDs from nodeMap:
   — Scan graphState.getAllNodes()
   — Include only nodes where state === 'alive'
   — Exclude nodeKind === 'effector' and nodeKind === 'data' (no AE object to poll)
   — Build array: [{ uuid, nodeKind, type }, ...]

3. If array is empty: schedule next tick and return. Nothing to poll.

4. Call evalBridge.dispatch({ action: 'pollAliveNodes', params: { uuidList: array } })

   Wait — this needs a dispatcher route.
   Add 'pollAliveNodes' to dispatcher.jsx _route():
     if (action === 'pollAliveNodes') return pollAliveNodes(JSON.stringify(params.uuidList));
   And ensure polling.jsx is #included in dispatcher.jsx.
   (See dispatcher update in Phase 4b below.)

5. In .then(res):
   — If !res.ok: log error, return
   — For each result in res.data:
     a. uuid = result.uuid
     b. nodeData = graphState.getNode(uuid)
     c. If !nodeData: continue (node was deleted during the poll)

     d. If result.found === false:
        — graphState.updateNode(uuid, { state: 'error' })
        — notificationBar.showError(uuid, nodeData.props.label || nodeData.type)
        — renderer.updateNode(uuid)

     e. If result.found === true AND result.props exists:
        — Sync props back if they differ from nodeData.props:
          For each key in result.props:
            if result.props[key] !== nodeData.props[key]:
              graphState.updateProp(uuid, key, result.props[key])
              — Do NOT call dirtyFlusher — this is an AE→panel sync, not panel→AE
              — DO call graphState.clearDirty(uuid) after sync to avoid false flush
          renderer.updateNode(uuid)

6. Schedule next tick:
   var interval = _isIdle() ? 5000 : 1000;
   _timer = setTimeout(_tick, interval);
```

### Implementation shape

```javascript
// polling/poller.js
// DEPENDS ON: bridge/evalBridge.js, graph/graphState.js, graph/canvas/renderer.js,
//             notifications/notificationBar.js
// MUST LOAD BEFORE: index.js

var poller = (function() {

  var _timer         = null;
  var _running       = false;
  var _lastActivity  = Date.now();
  var IDLE_THRESHOLD = 10000;

  function _isIdle() {
    return (Date.now() - _lastActivity) > IDLE_THRESHOLD;
  }

  function notifyActivity() {
    _lastActivity = Date.now();
  }

  function _tick() {
    if (!_running) return;

    if (evalBridge.isWriting()) {
      _timer = setTimeout(_tick, 1000);
      return;
    }

    var nodes     = graphState.getAllNodes();
    var uuidList  = [];
    for (var id in nodes) {
      var n = nodes[id];
      if (n.state === 'alive' && n.nodeKind !== 'effector' && n.nodeKind !== 'data') {
        uuidList.push({ uuid: n.id, nodeKind: n.nodeKind, type: n.type });
      }
    }

    if (uuidList.length === 0) {
      _timer = setTimeout(_tick, _isIdle() ? 5000 : 1000);
      return;
    }

    evalBridge.dispatch({ action: 'pollAliveNodes', params: { uuidList: uuidList } })
      .then(function(res) {
        if (!res.ok) {
          console.warn('[poller] poll error:', res.error);
          return;
        }
        _processPollResults(res.data);
      })
      .catch(function(e) {
        console.warn('[poller] dispatch error:', e.message);
      })
      .then(function() {
        if (_running) {
          _timer = setTimeout(_tick, _isIdle() ? 5000 : 1000);
        }
      });
  }

  function _processPollResults(results) {
    // see tick algorithm step 5 above
  }

  function start() {
    if (_running) return;
    _running = true;
    _timer   = setTimeout(_tick, 1000);
  }

  function stop() {
    _running = false;
    if (_timer) { clearTimeout(_timer); _timer = null; }
  }

  return { start: start, stop: stop, notifyActivity: notifyActivity };

})();
```

Fill `_processPollResults` completely. Everything else is provided — copy exactly.

---

### Phase 4b — Update `jsx/dispatcher/dispatcher.jsx`

Add the `pollAliveNodes` route and `#include`:

**Add to preamble:**
```jsx
#include "../polling.jsx"
```

**Add to `_route`:**
```jsx
if (action === 'pollAliveNodes') return _routePollAliveNodes(params);
```

**Add handler:**
```jsx
function _routePollAliveNodes(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var listJSON = JSON.stringify(params.uuidList);
    var parsed   = JSON.parse(pollAliveNodes(listJSON));
    result.ok    = parsed.ok;
    result.data  = parsed.data;
    result.error = parsed.error;
  } catch(e) {
    result.error = 'pollAliveNodes route error: ' + e.toString();
  }
  return result;
}
```

Note: `_routePollAliveNodes` returns a plain object — not `JSON.stringify`. The dispatcher's entry points handle serialization.

---

### Phase 4 verification — browser console (partial)

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  assert('poller.start is function',           typeof poller.start === 'function');
  assert('poller.stop is function',            typeof poller.stop === 'function');
  assert('poller.notifyActivity is function',  typeof poller.notifyActivity === 'function');

  // Start and stop — no throw
  var noThrow = true;
  try { poller.start(); poller.stop(); } catch(e) { noThrow = false; }
  assert('poller start/stop no-op outside AE', noThrow);

  console.log('---');
  console.log('poller:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

Full poller behavior is verified in AE (Phase 5).

**STOP. Paste console output. Wait for confirmation.**

---

## PHASE 5 — Update `index.js` — full panel-open sequence

Replace the current `index.js` initialization with the full production sequence. This wires together persistence read on open, graph restoration, and poller start.

### Full initialization sequence

```javascript
(function init() {

  console.log('[Procedia] registered nodes:', nodeRegistry.listTypes());

  // 1. Viewport
  viewport.reset();

  // 2. Canvas and wire interaction
  canvasInput.init();
  wireInteraction.init();

  // 3. UI
  nodeList.init();
  drag.init();
  keyboard.init();

  // 4. Consolidated selection callback
  graphState.onSelectionChange(function(uuid) {
    renderer.render();
    wireRenderer.render();
    inspector.renderInspector(uuid);
  });

  // 5. Activity tracking for poller idle detection
  var canvasWrap = document.getElementById('canvas-wrap');
  if (canvasWrap) {
    canvasWrap.addEventListener('mousedown', function() { poller.notifyActivity(); });
  }
  document.addEventListener('keydown', function() { poller.notifyActivity(); });

  // 6. Panel-open graph read sequence
  evalBridge.readGraph()
    .then(function(res) {

      if (!res.ok) {
        // Parse error — start with empty graph, show warning
        console.error('[Procedia] Graph read error:', res.error);
        notificationBar.showMessage(
          'Could not read saved graph. Starting fresh. (' + res.error + ')'
        );
        _finishInit(false);
        return;
      }

      if (res.data.fresh) {
        // First run — no saved graph
        console.log('[Procedia] No saved graph found. Starting fresh.');
        _finishInit(false);
        return;
      }

      // Restore graph from saved data
      graphState.loadGraph({ version: '4.0', nodes: res.data.nodes, wires: res.data.wires });
      console.log('[Procedia] Graph loaded.',
        Object.keys(res.data.nodes).length, 'nodes,',
        Object.keys(res.data.wires).length, 'wires.');

      _finishInit(true);
    })
    .catch(function(e) {
      // evalBridge not available (browser context) — start fresh silently
      console.log('[Procedia] Running outside AE. Starting fresh.');
      _finishInit(false);
    });

  // 7. AE lifecycle events — save/quit/unload triggers persistence write
  if (typeof CSInterface !== 'undefined') {
    var cs = new CSInterface();
    cs.addEventListener('documentAfterSave', _onAESave);
    cs.addEventListener('applicationBeforeQuit', _onAEQuit);
    window.addEventListener('beforeunload', _onPanelUnload);
  }

  console.log('[Procedia] Panel initialized.');

})();

// Called after graph read (or fresh start) completes
function _finishInit(graphWasLoaded) {
  renderer.render();
  wireRenderer.render();
  poller.start();
  console.log('[Procedia] Init complete. Poller started.');
}

// Persistence write handlers
function _writeGraphNow() {
  var tg = graphState.getAllNodes(); // indirect — use tempGraph via rebuildTempGraph
  graphState.rebuildTempGraph();
  // evalBridge.writeGraph expects the tempGraph structure
  // Access tempGraph via a new graphState method: graphState.getTempGraph()
  // Add getTempGraph() to graphState.js: returns the current tempGraph object
  evalBridge.writeGraph({ version: '4.0',
    nodes: graphState.getTempGraph().nodes,
    wires: graphState.getTempGraph().wires })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] writeGraph error:', res.error);
      else console.log('[Procedia] Graph saved.');
    })
    .catch(function(e) { console.warn('[Procedia] writeGraph failed:', e.message); });
}

function _onAESave()      { _writeGraphNow(); }
function _onAEQuit()      { _writeGraphNow(); }
function _onPanelUnload() { _writeGraphNow(); }
```

### Required `graphState.js` addition

Add `getTempGraph()` to `graphState.js`:

```javascript
function getTempGraph() {
  return tempGraph;
}
```

Add it to the public API returned object.

---

### Phase 5 verification — in After Effects

**Test sequence:**

1. Open AE. Open the Procedia panel.
2. Console shows `[Procedia] No saved graph found. Starting fresh.` (first run)
3. Drop a Comp node and a Text node. Wire Text → Comp.
4. Press Cmd/Ctrl+S in AE to save.
5. Console shows `[Procedia] Graph saved.`
6. Close and reopen the panel (or restart AE).
7. Console shows `[Procedia] Graph loaded. 2 nodes, 1 wires.`
8. The graph is restored — Text and Comp nodes visible on canvas, wire present.
9. Delete the Text layer directly in AE (not via Procedia).
10. Within 1–5 seconds, the Text node turns to `error` state on the canvas.
11. A notification appears in the notification bar.

**Checklist:**
- [ ] Steps 1–8 pass — graph persists across panel close/reopen
- [ ] Steps 9–11 pass — polling detects missing layer and sets error state
- [ ] Saving a large graph (20+ nodes) works without AE errors
- [ ] Poller pauses when AE is busy (no console errors during render or heavy operations)
- [ ] `isWriting` correctly prevents poll ticks during cascade batch operations

**STOP. Describe what you see in AE. Wait for confirmation.**

---

## Additional Rules for This Task

**`_writeChunks` must delete old layers before writing new ones.** If a previous save wrote 3 chunk layers and the current graph fits in 1, there must be no leftover `__PROCEDIA_NODES_2__` or `__PROCEDIA_NODES_3__` layers. The cleanup step at the top of `_writeChunks` is non-optional.

**`_readChunks` sorts chunks by numeric suffix before concatenating.** AE layers are not guaranteed to be in creation order. Sorting by the number after the last underscore ensures correct reassembly.

**Persistence layers must have `layer.enabled = false`.** They are data layers inside a comp that may be opened in the AE viewer. Invisible layers prevent them from affecting renders or confusing users.

**`_processPollResults` must call `graphState.clearDirty(uuid)` after syncing AE→panel props.** If a node is dirty (inspector change pending in dirtyFlusher) AND polling syncs a different prop back from AE, the dirty flag would cause dirtyFlusher to overwrite the AE value with the stale panel value on next flush. `clearDirty` after sync prevents this race condition.

**The poller uses `evalBridge.dispatch` with action `'pollAliveNodes'`** — not a new `evalBridge` function. The dispatcher routes it to `pollAliveNodes` in `polling.jsx`. This keeps all AE calls going through the same dispatch/route pattern.

**`graphState.getTempGraph()` must be added to `graphState.js`.** The write sequence in `index.js` needs access to `tempGraph`. Currently `tempGraph` is private inside the `graphState` IIFE. Add the getter — it is a read-only window into internal state.

**AE lifecycle events use `CSInterface` event names.** The event name for document save is `'documentAfterSave'`. For quit: `'applicationBeforeQuit'`. These are CEP standard events. If the event names are wrong, the write-on-save handler silently never fires.

**`poller.start()` is called inside `_finishInit`, not at the top level.** The poller must not start before the graph read completes. If it started immediately, it would poll an empty `nodeMap` during graph restoration, find nothing, and potentially cause a race condition with the `loadGraph` call.

**No ES6+** in `poller.js` or any panel JS file.

---

## On Completion

When all five phase checklists pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-13 COMPLETE

bridge/evalBridge.js         ✅  isWriting flag added
jsx/persistence.jsx          ✅  ESTK verified — read/write/chunk
jsx/polling.jsx              ✅  ESTK verified
polling/poller.js            ✅  browser + AE verified
index.js                     ✅  full init sequence wired
graph/graphState.js          ✅  getTempGraph() added
jsx/dispatcher/dispatcher.jsx ✅ pollAliveNodes route added

Graph persistence confirmed across panel close/reopen.
Error detection confirmed — missing layer → error state.

Next task: TASK-14 — notifications/notificationBar.js
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-13-PERSISTENCE-POLLING.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 1, 2, 3, 4, 5, 8 — PROCEDIA-V4-ARCHITECTURE.md Sections 9, 11, 12*
