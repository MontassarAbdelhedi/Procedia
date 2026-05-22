# TASK-03 — uuidGenerator.js and evalBridge.js
*Procedia v4 — Third task. Builds on completed TASK-01 and TASK-02.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 2 (evalScript Bridge), 3 (Error Handling), 12 (Task Execution Protocol), 13 (Grounded Decisions)
2. `PROCEDIA-V4-ARCHITECTURE.md` — Section 5 (Centralized ExtendScript Dispatcher) in full

Confirm both files are present at repo root before starting.

---

## Context

This task builds two small but foundational files:

- `data/uuidGenerator.js` — generates UUIDs for nodes and wires. Pure JS, no dependencies, fully testable in the browser console.
- `bridge/evalBridge.js` — the only door between the panel and After Effects. Wraps `csInterface.evalScript()` in a Promise-based API. Exposes exactly two functions: `dispatch` and `dispatchBatch`.

These two files are prerequisites for everything that crosses the JS/AE boundary. Nothing in the engine, cascade algorithm, or dirty flusher can run without them.

**Important:** `evalBridge.js` cannot be fully tested without a live AE connection. This task verifies its API surface and error handling in the browser console only. Full integration testing happens in a later task when `dispatcher.jsx` is implemented.

---

## What This Task Does NOT Do

- No AE calls. No `csInterface.evalScript()` calls during testing.
- No dispatcher implementation — `jsx/dispatcher/dispatcher.jsx` is out of scope.
- No engine, no cascade, no graph state changes.
- No UI changes.

If you find yourself touching any file other than `data/uuidGenerator.js` and `bridge/evalBridge.js` — stop.

---

## PHASE 1 — `data/uuidGenerator.js`

### What it does

Generates two kinds of UUID strings:
- Node UUIDs: `PROC-{timestamp}-{rand4}` — e.g. `PROC-1716000000000-a3f2`
- Wire UUIDs: `WIRE-{timestamp}-{rand4}` — e.g. `WIRE-1716000000001-b7k9`

`{timestamp}` is `Date.now()` — a 13-digit millisecond timestamp.
`{rand4}` is a 4-character random alphanumeric string, lowercase.

### Public API — exactly two functions

| Function | Returns | Description |
|---|---|---|
| `uuidGenerator.node()` | `string` | Generates a node UUID: `PROC-{timestamp}-{rand4}` |
| `uuidGenerator.wire()` | `string` | Generates a wire UUID: `WIRE-{timestamp}-{rand4}` |

### Implementation rules

- Exposed as a global `uuidGenerator` object — not an IIFE, not a class
- `{rand4}` must use `Math.random().toString(36).substr(2, 4)` — exactly 4 chars, lowercase alphanumeric
- If `toString(36).substr(2, 4)` produces fewer than 4 characters (extremely rare), pad with `'0'` to ensure exactly 4
- No dependencies — this file loads before everything else
- No ES6+: no `const`, no `let`, no arrow functions, no template literals

### Implementation shape

```javascript
// data/uuidGenerator.js
// DEPENDS ON: none
// MUST LOAD BEFORE: everything

var uuidGenerator = (function() {

  function rand4() {
    // generate 4-char random alphanumeric string
    // pad with '0' if shorter than 4 chars
  }

  function node() {
    // return 'PROC-' + Date.now() + '-' + rand4()
  }

  function wire() {
    // return 'WIRE-' + Date.now() + '-' + rand4()
  }

  return {
    node: node,
    wire: wire
  };

})();
```

---

### Phase 1 verification — run in browser console

Open `index.html` in a browser tab. Open browser console. Paste and run:

```javascript
(function() {
  var PASS = 0; var FAIL = 0;

  function assert(label, condition) {
    if (condition) { console.log('[PASS]', label); PASS++; }
    else           { console.error('[FAIL]', label); FAIL++; }
  }

  // Format checks
  var n = uuidGenerator.node();
  var w = uuidGenerator.wire();

  assert('node() returns a string',          typeof n === 'string');
  assert('wire() returns a string',          typeof w === 'string');
  assert('node() starts with PROC-',         n.indexOf('PROC-') === 0);
  assert('wire() starts with WIRE-',         w.indexOf('WIRE-') === 0);
  assert('node() has 3 segments',            n.split('-').length === 3);
  assert('wire() has 3 segments',            w.split('-').length === 3);

  var nParts = n.split('-');
  var wParts = w.split('-');

  assert('node() timestamp is 13 digits',    nParts[1].length === 13 && !isNaN(Number(nParts[1])));
  assert('wire() timestamp is 13 digits',    wParts[1].length === 13 && !isNaN(Number(wParts[1])));
  assert('node() rand segment is 4 chars',   nParts[2].length === 4);
  assert('wire() rand segment is 4 chars',   wParts[2].length === 4);
  assert('node() rand is alphanumeric',      /^[a-z0-9]{4}$/.test(nParts[2]));
  assert('wire() rand is alphanumeric',      /^[a-z0-9]{4}$/.test(wParts[2]));

  // Uniqueness — generate 100 pairs and check for collisions
  var seen = {};
  var collision = false;
  for (var i = 0; i < 100; i++) {
    var id = uuidGenerator.node();
    if (seen[id]) { collision = true; break; }
    seen[id] = true;
  }
  assert('100 node() calls produce no collisions', collision === false);

  // node() and wire() produce different prefixes
  assert('node() and wire() are distinct formats', uuidGenerator.node().indexOf('PROC-') === 0 &&
         uuidGenerator.wire().indexOf('WIRE-') === 0);

  console.log('---');
  console.log('uuidGenerator:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before Phase 2.**

**STOP. Paste console output. Wait for confirmation.**

---

## PHASE 2 — `bridge/evalBridge.js`

### What it is

The single gateway between panel JavaScript and After Effects ExtendScript. Every AE operation in Procedia passes through this file. No other file calls `csInterface.evalScript()` directly — ever.

### Architecture

The panel calls `evalBridge.dispatch(commandObj)`. `evalBridge` serializes the command, builds the ExtendScript call string, sends it through `csInterface.evalScript()`, parses the JSON response, and resolves the Promise.

The dispatcher in AE (`jsx/dispatcher/dispatcher.jsx`) receives the serialized command and routes it to the correct action handler.

```
Panel JS                         AE (ExtendScript)
──────────────────────────────   ──────────────────────────────
evalBridge.dispatch({            dispatch('{"action":"...","params":{...}}')
  action: 'createTextLayer',  →    → routes to actionCreateTextLayer(params)
  params: { ... }                  → returns JSON.stringify({ ok, data, error })
})                            ←
.then(function(res) { ... })
```

### Public API — exactly two functions

| Function | Signature | Returns | Description |
|---|---|---|---|
| `evalBridge.dispatch` | `(commandObj)` | `Promise<{ok, data, error}>` | Sends a single command to the dispatcher. Resolves with the parsed response. |
| `evalBridge.dispatchBatch` | `(commandArray)` | `Promise<{ok, data, error}>` | Sends an array of commands in a single bridge crossing. Dispatcher executes them in order. |

### Behavior rules

**`dispatch(commandObj)`:**
1. Serialize `commandObj` to JSON string: `JSON.stringify(commandObj)`
2. Build the ExtendScript call string: `'dispatch(' + JSON.stringify(json) + ')'`
   - The inner `JSON.stringify(json)` wraps the already-serialized string in quotes, making it a valid ExtendScript string argument
3. Call `csInterface.evalScript(callString, callback)`
4. In the callback: `JSON.parse(result)` the response and `resolve` the Promise
5. If `JSON.parse` throws: `reject` with a clear error message that includes the raw `result` string

**`dispatchBatch(commandArray)`:**
1. Serialize the entire array: `JSON.stringify(commandArray)`
2. Build the call string: `'dispatchBatch(' + JSON.stringify(json) + ')'`
3. Same callback pattern as `dispatch`

**Guard — `csInterface` not available:**
- In the browser (outside AE), `csInterface` is not defined
- `evalBridge` must detect this and reject the Promise with a clear message: `'[evalBridge] csInterface not available — panel is running outside After Effects'`
- This guard allows the panel UI to load and render in a browser tab without crashing
- Check with: `typeof csInterface === 'undefined'` before every call

**Logging:**
- Before every `csInterface.evalScript` call, log to console: `'[evalBridge] dispatch: ' + commandObj.action`
- On every successful response: log `'[evalBridge] ok: ' + commandObj.action`
- On every error response (`res.ok === false`): log `'[evalBridge] error: ' + commandObj.action + ' — ' + res.error`
- On parse failure: log `'[evalBridge] parse error — raw result: ' + result`

**No Promise polyfill needed** — the CEP Chromium environment supports native Promises. Modern JS is allowed in panel files.

### Implementation shape

```javascript
// bridge/evalBridge.js
// DEPENDS ON: lib/CSInterface.js
// MUST LOAD BEFORE: graph/graphState.js, graph/engine.js, flush/dirtyFlusher.js, polling/poller.js

var evalBridge = (function() {

  function _isBridgeAvailable() {
    return typeof csInterface !== 'undefined';
  }

  function dispatch(commandObj) {
    return new Promise(function(resolve, reject) {

      if (!_isBridgeAvailable()) {
        reject(new Error('[evalBridge] csInterface not available — panel is running outside After Effects'));
        return;
      }

      // log the outgoing action
      // serialize commandObj
      // build call string: 'dispatch(' + JSON.stringify(json) + ')'
      // call csInterface.evalScript(callString, callback)
      // in callback: parse result, resolve or reject

    });
  }

  function dispatchBatch(commandArray) {
    return new Promise(function(resolve, reject) {

      if (!_isBridgeAvailable()) {
        reject(new Error('[evalBridge] csInterface not available — panel is running outside After Effects'));
        return;
      }

      // log batch size
      // serialize commandArray
      // build call string: 'dispatchBatch(' + JSON.stringify(json) + ')'
      // call csInterface.evalScript(callString, callback)
      // in callback: parse result, resolve or reject

    });
  }

  return {
    dispatch:      dispatch,
    dispatchBatch: dispatchBatch
  };

})();
```

Fill in every comment block completely. The shape is the contract.

---

### Phase 2 verification — run in browser console

This test runs in a browser tab where `csInterface` is not available. It verifies the API surface and the guard behavior — not actual AE communication.

Open `index.html` in a browser tab. Reload to pick up the new file. Open browser console. Paste and run:

```javascript
(function() {
  var PASS = 0; var FAIL = 0;

  function assert(label, condition) {
    if (condition) { console.log('[PASS]', label); PASS++; }
    else           { console.error('[FAIL]', label); FAIL++; }
  }

  // API surface checks
  assert('evalBridge exists',               typeof evalBridge === 'object');
  assert('evalBridge.dispatch is function', typeof evalBridge.dispatch === 'function');
  assert('evalBridge.dispatchBatch is function', typeof evalBridge.dispatchBatch === 'function');

  // dispatch rejects when csInterface unavailable (browser context)
  var dispatchRejected = false;
  var dispatchRejectMsg = '';
  evalBridge.dispatch({ action: 'test', params: {} })
    .then(function() {
      console.error('[FAIL] dispatch should have rejected outside AE');
      FAIL++;
    })
    .catch(function(err) {
      dispatchRejected  = true;
      dispatchRejectMsg = err.message;
    });

  // dispatchBatch rejects when csInterface unavailable
  var batchRejected = false;
  evalBridge.dispatchBatch([{ action: 'test', params: {} }])
    .then(function() {
      console.error('[FAIL] dispatchBatch should have rejected outside AE');
      FAIL++;
    })
    .catch(function(err) {
      batchRejected = true;
    });

  // Promises are async — check results after microtask queue drains
  setTimeout(function() {
    assert('dispatch() rejects outside AE',           dispatchRejected === true);
    assert('dispatch() reject message mentions csInterface',
      dispatchRejectMsg.indexOf('csInterface') !== -1);
    assert('dispatchBatch() rejects outside AE',      batchRejected === true);

    // dispatch returns a Promise (has .then and .catch)
    var p = evalBridge.dispatch({ action: 'ping', params: {} });
    assert('dispatch() returns a thenable',  typeof p.then === 'function');
    assert('dispatch() returns a catchable', typeof p.catch === 'function');
    p.catch(function() {}); // suppress unhandled rejection

    var b = evalBridge.dispatchBatch([]);
    assert('dispatchBatch() returns a thenable',  typeof b.then === 'function');
    assert('dispatchBatch() returns a catchable', typeof b.catch === 'function');
    b.catch(function() {}); // suppress unhandled rejection

    console.log('---');
    console.log('evalBridge:', PASS, 'passed,', FAIL, 'failed');
    if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
  }, 50);

})();
```

**Zero failures required before closing this task.**

**STOP. Paste console output. Wait for confirmation.**

---

## Additional Rules for This Task

**`evalBridge` never imports or references `graphState`.** It is a pure communication layer. It does not know about nodes, wires, or graph state.

**The `dispatch` call string format is critical and must be exact.** The ExtendScript dispatcher function is named `dispatch`. The call string must be:

```javascript
'dispatch(' + JSON.stringify(JSON.stringify(commandObj)) + ')'
```

Breaking this down:
- `JSON.stringify(commandObj)` → produces a JSON string, e.g. `'{"action":"createTextLayer","params":{}}'`
- `JSON.stringify(thatString)` → wraps it in quotes and escapes it, e.g. `'"{\\"action\\":\\"createTextLayer\\",...}"'`
- The full call becomes: `dispatch("{\"action\":\"createTextLayer\",...}")` — a valid ExtendScript function call with a string argument

The dispatcher in ExtendScript then does `JSON.parse(commandJSON)` to recover the object. This double-serialization is required because `csInterface.evalScript` only accepts a string, and the argument to `dispatch()` must itself be a quoted string.

**`dispatchBatch` uses the same double-serialization pattern** with `dispatchBatch` as the function name.

**Never buffer or queue calls.** Each `dispatch` call fires immediately and independently. Batching is handled by the caller (the engine or cascade algorithm) before calling `dispatchBatch` — not inside `evalBridge`.

---

## On Completion

When both phase test scripts return zero failures, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-03 COMPLETE

data/uuidGenerator.js    ✅  [N tests passed]
bridge/evalBridge.js     ✅  [N tests passed]

Both verified in browser console. Zero failures.
Note: evalBridge AE integration verified in browser only.
      Full bridge test pending TASK-07 (dispatcher.jsx).

Next task: TASK-04 — Comp.js node definition
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-03-UUID-EVALBRIGE.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 2 & 3, PROCEDIA-V4-ARCHITECTURE.md Section 5*
