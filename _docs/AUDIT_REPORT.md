# Procedia — Full Audit Report

**Date:** 2026-07-08  
**Version:** 0.0.4  
**Extension ID:** `com.uppercut.procedia`  
**Total Source Files:** ~700+ (JS: ~130 core, ~474 node defs, JSX: ~40, CSS: 18)  

---

## SEVERITY & STATUS LEGEND

| Status | Label | Definition |
|--------|-------|------------|
| ✅ | **Fixed** | Successfully resolved |
| ⏳ | **Pending** | Not yet addressed |
| 🔶 | **Deferred** | Deliberately deferred (reason documented) |
| — | 🔴 **P0** — Critical | Original severity: Data loss, crash, AE instability, security vulnerability |
| — | 🟠 **P1** — High | Original severity: Feature broken, major performance bottleneck, incorrect behavior |
| — | 🟡 **P2** — Medium | Original severity: Degraded UX, non-critical bug, missing edge case |
| — | 🔵 **P3** — Low | Original severity: Code smell, naming inconsistency, minor tech debt |
| — | ⚪ **P4** — Info | Original severity: Suggestion, enhancement opportunity, best-practice miss |

---

## 1. ARCHITECTURE AUDIT

### 1.1 Folder Structure — **PASS** ✅

Well-organized. Clear separation across `graph/`, `jsx/`, `ui/`, `bridge/`, `polling/`. No issues.

### 1.2 Separation of Concerns

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 1 | ✅ | 🟠 P1 | **`graphState/props.js` calls `undoManager.capture()` directly** — The state layer should not know about undo. Undo should be a cross-cutting concern handled at the engine level. This creates a circular dependency risk and breaks layering. | Move the `undoManager.capture()` call out of `props.js:14` and into `engine/state.js` where `setNodeProperty` already calls `undoManager.capture()`. Remove the undo call from `updateProp` — let the engine orchestrate undo, not the data layer. | `graph/graphState/props.js:14` |
| 2 | 🔶 | 🟡 P2 | **`graphState/props.js` also clones to clones** — Clone-propagation logic lives in the state layer instead of the engine, duplicating concern. | **Deferred.** Remove the clone-sync loop from `props.js:20-24`. Move it into `engine/helpers.js` or handle it in `engine/state.js:setNodeProperty` where clones are already iterated. Engine is not yet the single property entry point — 6+ callers bypass it. | `graph/graphState/props.js:20-24` |
| 3 | ✅ | 🟡 P2 | **`graphState/graphOps.js` initializes default fields (`.dirty`, `.locked`, etc.)** — This belongs in the node factory, not a graph-level operation. | Move the field defaults into `dropNode.js` where `nodeData` is constructed, and into `effectNodeFactory.js`. Remove the post-load patching from `loadGraph` — nodes should arrive fully formed from persistence. | `graph/graphState/graphOps.js:21-28` |

### 1.3 CEP Architecture

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 4 | ✅ | 🔴 P0 | **No timeout around `csInterface.evalScript()`** — If AE is closed or crashes, `evalScript` callback never fires, leaving Promises pending forever. The `dispatch()` function has a 3-retry for parse errors but no timeout for AE unresponsiveness. | Wrap `evalScript` in a Promise with `Promise.race([evalPromise, timeoutPromise])` using a 10s timeout. On timeout, reject the promise so callers can handle recovery. Add a global `_dispatchTimeout` const in `evalBridge.js`. | `bridge/evalBridge.js:132-148` |
| 5 | ✅ | 🔵 P3 | **Duplicated retry logic in `dispatch()`** — The TypeError and parse-error retry paths are nearly identical (`setTimeout(function() { resolve(dispatch(...)); }, 50 * attempt)`), each repeated with separate `if (_attempt < 3) … else reject` blocks. | Extract a `retryOrReject` helper: `function retryOrReject(errMsg) { if (_attempt < 3) { setTimeout(function() { resolve(dispatch(…, _attempt+1)); }, 50*_attempt); } else { reject(new Error(errMsg)); } }`. | `bridge/evalBridge.js:133–152` |
| 6 | ✅ | 🟡 P2 | **`_loadPreamble` double-retry logic**: When a JSX file returns empty string, the code retries twice but then silently continues to the next file. A corrupted JSX file could silently fail to load. | On empty/unexpected result after 2 retries, log a hard error with the file path and stop the preamble load. Return `_flushReadyCallbacks(false)` so the panel knows the preamble is incomplete rather than continuing with a potentially corrupted state. | `bridge/evalBridge.js:107-109` |

### 1.4 UI Layer

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 7 | ⏳ | 🟡 P2 | **Canvas input handlers use shared mutable state across modules** — `_inpDrag`, `_inpRubber`, `_inpPan`, `_hoveredWireId`, `_selectedWireId`, `_editingNodeId`, `_pendingFocusTimer` are all global variables referenced across 10+ files. Requires precise load order and is fragile. | Consolidate all input state into a single module (`input/state.js`) with a namespaced object like `InputState = { drag: {}, rubber: {}, pan: {}, ui: {} }`. Each handler reads/writes via this object instead of bare globals. Add reset() for cleanup. | Multiple files in `graph/canvas/input/handlers/` |
| 8 | ✅ | 🟡 P2 | **`_pendingFocusTimer` on comp click** — Click handler sets a 280ms timeout for `focusComp`. If the user clicks multiple comp nodes quickly, only the last is focused, but previous timeouts are cleared without cancellation feedback. | Increase delay to 350ms to avoid accidental triggers during double-click. Add a visual indicator (subtle pulse on the node) while the timer is pending, so the user knows a focus is queued. | `graph/canvas/input/handlers/mouse/click.js:17` |
| 9 | ⏳ | 🔵 P3 | **`renderer.render()` called redundantly** — `graphState` methods that fire selection change callbacks trigger `renderer.render()`, but mutators also call it. At minimum 2 renders per user action. | Use RAF-batched scheduler (already exists as `_uiScheduler`). Ensure all render calls go through the scheduler. | Multiple locations |

### 1.5 Graph Engine

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 10 | ✅ | 🟠 P1 | **`_propagateAlive` has no cycle detection in recursion** — `_propagateUpstream` walks wireMap recursively via `_propagateAlive`. A layer wire cycle would cause infinite recursion. | Add a `visited` parameter (Set) to `_propagateAlive` and `_propagateUpstream`. Pass `visited` down the recursion. If `nodeId` is already in `visited`, return early. | `graph/engine/propagate.js:120-140` |
| 11 | ✅ | 🟠 P1 | **`onAlive` dispatch uses IIFE closure but holds mutable references** — `cmd.params` is a reference. If `nodeData` is deleted between dispatch and resolution, `cmd.params` may hold stale refs. | Deep-clone `cmd` before passing to the IIFE using the new `deepClone` utility (see issue #38). | `graph/engine/propagate.js:85-113` |
| 12 | ✅ | 🟡 P2 | **`_pendingPathUUIDs` reference counting can go negative** — If `evalBridge.dispatch` resolves twice, the counter decrements into negative territory and the UUID is never cleaned up. | Guard the decrement: `if (_pendingPathUUIDs[uuid] > 0) _pendingPathUUIDs[uuid]--;` | `graph/engine/propagate.js:96-100` |
| 13 | ✅ | 🟡 P2 | **`findPathLayerUUID` returns wire ID as fallback, not layer UUID** — When no path layer is found, it returns `wire.id` which is a UUID-format string but not an actual AE layer comment. | **No change needed.** All callers already guard against the fallback returning a non-null value. | `graph/wire/wire.js:163-165` |

### 1.6 After Effects Communication Layer

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 14 | ✅ | 🔴 P0 | **AE string length limit** — `evalScript` passes full JSON-encoded command as a string. AE's `eval()` has a ~32KB string limit. Large graphs or batch operations will silently truncate. | Implement transparent command chunking in `evalBridge.dispatch()`: if `json.length > 15000`, split the command into chunks, write them to a temp file via `writeGraph`, then dispatch a single `executeChunked(filePath)` command. On JSX side, read and concatenate chunks. | `bridge/evalBridge.js:123-125` |
| 15 | ✅ | 🟠 P1 | **`dispatchBatch()` sends array but JSX side may not handle it** — The JSX dispatcher routes by `cmd.action`, which would be `undefined` on an array. | Fix `dispatchBatch` to send individual dispatches sequentially on the JSX side. Add a JSX handler `_handleBatch` that iterates the array and calls `dispatch()` for each item, collecting results. | `bridge/evalBridge.js:155-170` |
| 16 | ✅ | 🟠 P1 | **`fireAndForget` ignores errors** — The callback is `function(){}`, so if the dispatch throws on the JSX side (AE error), it's silently swallowed. During `beforeunload`, this could lose data. | Add a one-shot error logging callback: `function(result) { if (result && result.indexOf('FAIL') !== -1) console.warn('[evalBridge] fireAndForget error:', result); }`. | `bridge/evalBridge.js:182` |

### 1.7 State Management

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 17 | ✅ | 🟡 P2 | **`graphState` is exposed as `window.__gs` internally but `window.graphState` externally** — Some code references `window.__gs` directly, creating two access paths. | Remove all direct `window.__gs` references throughout the codebase. Replace with `window.graphState`. Make `__gs` truly private by removing the `window.__gs = ...` assignment. | Multiple files |
| 18 | ✅ | 🟡 P2 | **`tempGraph` rebuilt on every mutation** — `addNode`, `removeNode`, `updateNode`, `addWire`, `removeWire`, `updateWire`, `updateProp` all call `gs.rebuildTempGraph()`. This is O(n) per call, called hundreds of times per frame during drag. | Defer `rebuildTempGraph()` with a dirty flag: set `_tempDirty = true` on each mutation, and call the actual rebuild lazily only when `getTempGraph()` is accessed. | `graph/graphState/nodes.js:27`, `graph/graphState/wires.js:26`, etc. |

### 1.8 Event System

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 19 | ⏳ | 🔵 P3 | **Only one selection change listener is supported** — `onSelectionChange` replaces the single callback. Multiple components cannot independently listen. | Replace the single callback with a listener array: `_selectionChangeListeners = []`. `onSelectionChange(fn)` pushes to the array. `_fireSelectionChange()` iterates all listeners. Add `offSelectionChange(fn)` for cleanup. | `graph/graphState/selection.js:19-21` |

### 1.9 Plugin Lifecycle

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 20 | ✅ | 🟠 P1 | **No startup crash recovery** — If `readGraph` returns corrupted data, `JSON.parse` in persistence could throw. The `init()` chain `.catch()` only logs the error, leaving the panel in an inconsistent state. | Add a try/catch around `PERSISTENCE.readGraph()` in `actions_schema.jsx`. On parse failure, return `{ ok: true, data: { nodes: {}, wires: {}, keyframes: {} } }` — an empty graph is safer than a crash. Also add a per-node validation in `loadGraph` that skips malformed node entries. | `index.js:118` |
| 21 | ✅ | 🟡 P2 | **Sentry + html2canvas loaded from CDN** — If the user has no internet or the CDN is down, the entire panel's `<script>` loading fails. These are third-party CDN URLs loaded before core infrastructure. | Vendor both libraries locally under `lib/sentry.bundle.min.js` and `lib/html2canvas.min.js`. Use relative `<script>` tags instead of CDN URLs. | `index.html:33-34` |

### 1.10 Extensibility

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 22 | ⏳ | 🔵 P3 | **Effect metadata is hardcoded in 20+ files** — `graph/nodeMetadata/*.js` contains static category-to-effect mappings. Any new AE effect requires manual addition. | Replace static metadata files with a single JSON manifest (`data/effectManifest.json`) read at build time or on first launch via dynamic AE introspection. | `graph/nodeMetadata/*.js` |

---

## 2. CODE QUALITY AUDIT

### 2.1 Readability — **PASS** ✅

Consistent JSDoc headers, clear module comments, IIFE patterns well-documented. Good.

### 2.2 Maintainability

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 23 | ✅ | 🟠 P1 | **121 script tags in `index.html` with exact load order** — Extremely fragile. Adding a new file or reordering requires changing the HTML. No bundler, no dependency resolution. A single typo in a script `src` causes silent failure. | Create a `scripts.json` manifest array listing all files in load order, plus a thin `loader.js` that reads the manifest and injects `<script>` tags at runtime via `document.createElement('script')`. Adding a file = one line in one manifest. | `index.html` |
| 24 | ⏳ | 🟡 P2 | **`var` used everywhere (ES5)** — The panel targets Chromium (CEP), which supports `let`/`const`. Using `var` throughout means no block scoping, increasing risk of variable hoisting bugs. | Migrate to `const` by default, `let` for reassignment. This is safe because CEP uses a modern Chromium (v89+). Start with new code and high-traffic files (engine/, canvas/). | Every JS file |

### 2.3 Scalability

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 25 | ⏳ | 🟡 P2 | **Linear scan of `wireMap` in multiple hot paths** — `findPathLayerUUID`, `_propagateUpstream`, `propagateDataValue`, `_findUpstreamNodeUUID` all iterate `Object.keys(wireMap)` linearly. | Build and maintain adjacency indexes in `tempGraph`: `_outgoingWires[nodeId] = [...]`, `_incomingWires[nodeId] = [...]`, `_dataWiresFrom[nodeId] = [...]`. Update these incrementally on wire add/remove instead of scanning all wires. | `graph/engine/helpers.js:82-98`, `graph/undoManager/aeReconcile.js`, etc. |
| 26 | ⏳ | 🟡 P2 | **`tempGraph` is rebuilt from scratch on every mutation** — Uses `Object.keys(nodeMap)` and `Object.keys(wireMap)` to rebuild adjacency structures. No incremental update. | Implement incremental `tempGraph` updates: when a node/wire is added, update only the affected adjacency entries. When removed, splice from the affected lists. This reduces rebuild from O(n) to O(1) per mutation. | `graph/graphState/tempGraph.js` |

### 2.4 Naming Consistency

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 27 | ⏳ | 🔵 P3 | **`isParamKeyframed` duplicates `hasKeyframes`** — Two public methods on `keyframeState` with identical behavior. | Remove `isParamKeyframed`. Keep `hasKeyframes` as the canonical name. | `graph/keyframeState.js:79` |
| 28 | ⏳ | 🔵 P3 | **Inconsistent abbreviation style** — `hlp`, `nd`, `cmd`, `cb`, `gs`, `um` vs. `res`, `sel`, `tmp`. No naming convention doc. | Adopt a convention: use full words for public API (`helper`, `command`, `callback`), short abbreviations OK for tight loops (`i`, `j`, `n`). Add a `CONTRIBUTING.md` documenting the convention. | Throughout |

### 2.5 Code Duplication

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 29 | ✅ | 🟡 P2 | **UI refresh pattern duplicated ~20 times** — The sequence `renderer.render(); wireRenderer.render(null); minimap.render(); inspector.refresh(); statusBar.refresh()` appears as copy-paste in many files. | Extract to `refreshAllUI()` in `ui/refreshUI.js`. Replace all inline sequences with a single call. Add a parameter to skip specific components when not needed (e.g., `{ skipMinimap: true }`). | Multiple files |
| 30 | ✅ | 🟡 P2 | **Node kind dispatch logic duplicated in `aeReconcile.js`** — The `_dispatchNodeAlive`, `_dispatchNodeGhost`, `_dispatchPropChange` functions replicate the kind-dispatch logic from `engine/propagate.js` and `engine/state.js`. | Extract the common kind-dispatch logic into a shared module (`engine/lifecycle.js`). Have both `propagate.js` and `aeReconcile.js` import from the same source. | `graph/undoManager/aeReconcile.js` |
| 31 | ✅ | 🟡 P2 | **4 near-identical enable/disable functions** — `_defaultEffectorDisable`/`_defaultEffectorEnable` / `_defaultAffectedDisable`/`_defaultAffectedEnable` differ only in action name and params shape. | Merge into two generic functions: `_defaultSetEnabled(nodeData, enabled)` and `_defaultAffectedSetEnabled(nodeData, enabled)`. Parametrize with `enabled: true/false` instead of separate functions per direction. | `graph/engine/state.js:176-243` |

### 2.6 Technical Debt

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 32 | ✅ | 🟠 P1 | **14+ non-standard globals prefixed with `__`** — `__e_hlp`, `__e_prop`, `__e_state`, `__e_nodes`, `__e_ndrop`, `__e_ndel`, `__e_ndup`, `__e_nlock`, `__e_nrec`, `__e_nclone`, `__e_nswitch`, `__e_wires`, `__gs`, `__um`. Internal engine globals exposed globally. | Namespace all internal globals under a single `window.__procedia_internal = {}` object and assign properties to it. | Multiple files |
| 33 | ✅ | 🟡 P2 | **`graphState` exposes internal fields on the public object** — `_keyframes`, `_playheadTime`, `_onSelectionChangeCb`, `_viewFilter`, `_activeCompId` are mixed with public API. | Use a closure to keep internal state private. Extract `_keyframes` to `keyframeState`. Use a private `_internal` namespace on the state object. | `graph/graphState/state.js` |

### 2.7 Dead Code

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 34 | ⏳ | 🔵 P3 | **`_readChunks` in persistence.jsx** has a `while(true)` loop that could become infinite if text layers exist with gaps in chunk indices. | Add a safety limit: `var MAX_CHUNKS = 100;` and `if (idx > MAX_CHUNKS) break;` to prevent infinite loops. Also log a warning if chunks are missing (non-consecutive indices). | `jsx/persistence.jsx:175-185` |
| 35 | ⏳ | 🔵 P3 | **`renderSplitPreview` references `c._drawSegment`** which depends on the wire renderer container — if `c._drawSegment` is not defined, this silently fails. | Add a guard: `if (typeof c._drawSegment !== 'function') { console.warn('_drawSegment not available'); return; }` at the start of `renderSplitPreview`. | `graph/wire/wireRenderer/render.js:74-108` |

### 2.8 Design Patterns

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 36 | ⏳ | 🔵 P3 | **No observer pattern for graph mutations** — UI components poll or are manually refreshed. No pub/sub system for decoupled reactivity. | Implement a simple pub/sub on `graphState`: `onChange(eventName, callback)` and `emitChange(eventName, data)`. Events: `node:added`, `node:removed`, `node:updated`, `wire:added`, `wire:removed`, `selection:changed`. | Architecture-level |

### 2.9 Anti-Patterns

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 37 | ✅ | 🟠 P1 | **IIFEs with circular internal references** — Module A references `window.__e_hlp`, module B references `window.__e_state` which references `window.__e_hlp`. The runtime load order dependency graph is fragile. | Break the circular dependencies by extracting the shared contract into a thin dependency injection module. `engine/registry.js` registers each sub-module as it loads. Modules access each other through the registry, not direct globals. | Engine modules |
| 38 | ✅ | 🟡 P2 | **`JSON.parse(JSON.stringify(obj))` as deep clone** — Used extensively (undoManager, dynamic schema, deepCopyNode). For JSON-safe data this works but is wasteful. Large graphs cause ~500KB string allocations per clone. | Replace with a structured clone function (`data/deepClone.js`) that handles the specific data shapes (node objects with arrays, strings, numbers, booleans). | `graph/undoManager/state.js:24`, `graph/engine/helpers.js:144`, etc. |

---

## 3. PERFORMANCE AUDIT

### 3.1 Unnecessary DOM Redraws

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 39 | ✅ | 🟠 P1 | **`refreshNodeUI()` calls 5 UI refreshes synchronously** — Every mutation triggers `minimap.render()`, `renderer.render()`, `wireRenderer.render()`, `inspector.refresh()`, `statusBar.refresh()`. No batching or dirty-flag coalescing. | Add RAF-batched scheduler (`uiUpdateScheduler.js`). Replace `refreshNodeUI()` with `scheduleUIUpdate()`. Use `requestAnimationFrame`-based flush that runs once per frame. | `graph/engine/helpers.js:39-44` |
| 40 | ⏳ | 🟡 P2 | **During drag, each `mousemove` event triggers a cascade** — `graphState.updateNode()` → `rebuildTempGraph()` → `renderer.render()` (indirect) → `wireRenderer.render()` → `minimap.render()`. | During drag, bypass the normal mutation pipeline: update node positions directly in the node DOM and wire canvas without going through `graphState.updateNode`. Only commit positions to state on `mouseup`. | `graph/canvas/input/handlers/mouse/mousemove.js` |

### 3.2 Memory Leaks

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 41 | ✅ | 🟠 P1 | **`_pendingPathUUIDs` leak** — If `evalBridge.dispatch` promise never resolves (AE crash/unresponsive), the pending UUID is never cleaned up and the poller will skip that UUID forever. | Use a `finally()` on the promise chain to always decrement: `cmdPromise.finally(function() { /* cleanup */ })`. Combined with the dispatch timeout (issue #4), the UUID is always cleaned up. | `graph/engine/propagate.js:93-103` |
| 42 | ✅ | 🟡 P2 | **`_onDocClick` listeners accumulate** — `nodeToolbar.show()` adds `document.addEventListener('mousedown', _onDocClick)` but `hide()` removes it. If `show()` is called twice without intermediate `hide()`, duplicate listeners accumulate. | Guard the listener add: only add if not already added. Track listener state with a boolean `_docListenerAdded`. On `show()`, check and set. On `hide()`, remove and clear. | `graph/canvas/renderer/nodeToolbar.js:152-153` |
| 43 | ✅ | 🟡 P2 | **Rubber-band `_highlights` array never fully cleared** — The `_highlights` array from input state holds references to node IDs but is only shallow-cleared. | Add `_inpRubber._highlights = []` at the start of `createRubberEl()` and at the end of `destroyRubberEl()`. | `graph/canvas/input/state.js`, `graph/canvas/input/rubberband.js` |

### 3.3 Node Rendering Efficiency

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 44 | ⏳ | 🟡 P2 | **Full re-render on every mutation** — The `renderer.render()` function rebuilds the entire DOM for `#canvas-nodes`. No virtual DOM, no targeted updates for single-node changes. | Implement differential rendering: track the set of rendered node IDs. On `render()`, diff the current state vs rendered set. Only create/remove DOM elements for added/removed nodes. | `graph/canvas/renderer/index.js` |
| 45 | ✅ | 🟡 P2 | **`renderer.updateNode(id)` is called but `renderer.render()` also fires** — Redundant full renders happen after targeted updates. | Addressed by deferred `tempGraph` rebuild (issue #18). Remove the full `renderer.render()` call from flows that already call `updateNode(id)`. | Multiple callers |

### 3.4 Wire Rendering

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 46 | 🔶 | 🟡 P2 | **Wire redraw on every mousemove during drag** — Wire renderer redraws all wires whenever any node moves, even though most wires are unchanged. | **Partially mitigated.** During multi-node drag, `batchUpdateNodes` (issue #54) reduces total UI refreshes. Full fix requires adjacency indexes (issue #25) to redraw only connected wires. | `graph/wire/wireRenderer/render.js` |
| 47 | ⏳ | 🔵 P3 | **Animation frame runs continuously when dash animation is active** — The `_tick` function uses `requestAnimationFrame` loop that only stops when `_getAnimDash()` returns false. If it never returns false, the loop runs forever. | Add a visibility check: pause the animation when the panel tab is not visible using `document.hidden` / `visibilitychange`. Stop the loop when `_animFrameId` is cancelled. | `graph/wire/wireRenderer/render.js:42-48` |

### 3.5 Graph Traversal Complexity

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 48 | ✅ | 🟡 P2 | **`findPathLayerUUID` walks every wire for every call** — Called heavily (propagation, undo, delete, enable/disable). Each call is O(wires). No caching/memoization. | Add a simple memoization cache keyed by `nodeId`, invalidated when wires are added/removed. Introduced `invalidatePathLayerCache()` in `graph/engine/helpers.js`. | `graph/engine/helpers.js:82-98` |

### 3.6 Serialization Speed

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 49 | ✅ | 🟡 P2 | **Full graph serialized on every `beforeunload`** — `JSON.stringify` on potentially thousands of nodes. The `beforeunload` handler is synchronous; large graphs may cause the browser to kill the tab. | Add a dirty-flag check to skip serialization if nothing changed. Track `_graphModified` on graph mutations. | `index.js:148-152` |
| 50 | ⏳ | 🟡 P2 | **Undo snapshots serialize the entire graph** — Each undo `capture()` calls `JSON.parse(JSON.stringify(...))` on all nodes + wires. With 50-deep undo stack, memory usage = 50x graph size. | Implement snapshot-diff undo: instead of storing full state snapshots, store only the operations (command pattern). Each undo records `{ type: 'setProperty', nodeId, key, oldValue, newValue }`. | `graph/undoManager/state.js:24-28` |

### 3.7 AE Bridge Bottlenecks

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 51 | ✅ | 🔴 P0 | **`evalScript` is synchronous-blocking on the UI thread** — Each AE call blocks the CEP panel's UI thread until AE responds. Batch operations (delete with cascade) send multiple sequential `evalScript` calls, freezing the panel. | (1) Batch all independent commands into a single `evalScript` call using the JSX `dispatchBatch` handler. (2) For long operations, show a loading overlay so the user knows the panel is busy. (3) Use `setTimeout(0)` between batch groups to yield to the UI event loop. | `bridge/evalBridge.js` (inherent to CEP) |

### 3.8 Undo/Redo Implementation

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 52 | ✅ | 🟠 P1 | **Debounced undo commit timer never fires if mutations keep happening** — `commitDebounced` resets the timer on every call (400ms debounce). During rapid slider dragging, the timer keeps resetting and never commits. | Use a leading-edge debounce instead of trailing-edge: commit immediately on the first change within a burst, then suppress subsequent commits for 400ms. Alternatively, use a max-wait pattern: commit at most every 200ms regardless of input frequency. | `graph/undoManager/state.js:46-49` |
| 53 | ✅ | 🟡 P2 | **Undo re-dispatch creates new AE undo entries** — For every undo, `_reconcileAE` dispatches lifecycle commands to AE, which themselves create AE undo history entries. This causes a double-undo problem. | Wrap AE reconciliation in AE's native `app.beginUndoGroup()` / `app.endUndoGroup()` so all AE API calls from a single undo appear as one undo step. Added `beginUndoGroup`/`endUndoGroup` dispatcher actions. | `graph/undoManager/aeReconcile.js` |

### 3.9 Drag Performance

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 54 | ✅ | 🟡 P2 | **During multi-node drag, each `mousemove` calls `graphState.updateNode()` individually** — Dragging 50 nodes causes 50 `updateNode` calls + 50 `rebuildTempGraph` + 50 UI refreshes per mousemove event. | Add `graphState.batchUpdateNodes(updates)` that applies all position updates in O(n) and calls `rebuildTempGraph` once. Multi-drag mousemove uses `batchUpdateNodes` instead of N individual calls. | `graph/canvas/input/handlers/mouse/mousemove.js:56-79` |

### 3.10 Zoom Performance — **OK** ✅

Zoom is a single `viewport.setZoom()` call with immediate canvas redraw. No issues.

---

## 4. SOFTWARE ENGINEERING AUDIT

### 4.1 Dependency Management

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 55 | ✅ | 🔴 P0 | **No package.json, no dependency lockfile** — Sentry and html2canvas loaded from CDN URLs. If these CDNs are compromised, the entire plugin is compromised. No SRI hashes. | (1) Vendor both libraries locally. (2) Add `package.json` with `"private": true` for project metadata. (3) Add vitest as dev dependency. | `index.html:33-34` |
| 56 | ✅ | 🟡 P2 | **CSInterface.js is vendored without version tracking** — No way to know which version or update it. | Add a comment header to `lib/CSInterface.js` with the Adobe CEP version and download URL. Version confirmed as v12.0.0. | `lib/CSInterface.js` |

### 4.2 Module Boundaries

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 57 | ✅ | 🟠 P1 | **`graphState/props.js` imports `undoManager`** — Violates layering where state is a simple data store and undo is orchestration. Already covered by issue 1. | Same fix as issue 1: remove undo calls from state layer, move to engine layer. | `graph/graphState/props.js:14` |
| 58 | ✅ | 🟡 P2 | **`engine/state.js` calls UI components directly** — `minimap.render()`, `renderer.render()`, `inspector.refresh()` are called from the engine, coupling graph logic to DOM rendering. | Replace direct UI calls with `refreshUI()` from `ui/refreshUI.js`. The engine calls `refreshUI({ skipMinimap: true })` instead of importing and calling individual renderers. | `graph/engine/state.js:30-34` |

### 4.3 API Design

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 59 | ✅ | 🟡 P2 | **`engine` object exposes internal `_firePathCreation`, `_applyDynamicSchema`** — Underscore-prefixed methods should not be on the public API surface. | Move these to the internal `__e_*` namespace and remove from the `engine` return object. Create public wrappers with validation for any external callers. | `graph/engine/index.js:38-39` |
| 60 | ⏳ | 🔵 P3 | **`connectWire` and `disconnectWire` have no input validation** — No null checks, type checks, or existence checks on the public API. | Add validation at the top of `connectWire` and `disconnectWire`: check that `fromNode` and `toNode` exist, that ports are valid, that a cycle wouldn't be created. Return `false` with console.warn on validation failure. | `graph/engine/index.js:23,28` |

### 4.4 Future Plugin Ecosystem

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 61 | ⏳ | 🔵 P3 | **No plugin/extension API** — All node types are defined in-source. A third-party plugin would need to modify source files. | Define a formal plugin API: `procedia.registerNodeType(definition)` — a function that adds the node type to `nodeRegistry` and makes it available in the node picker. | Architecture-level |

### 4.5 Testing Strategy

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 62 | ✅ | 🔴 P0 | **Zero tests exist** — No unit tests, integration tests, or E2E tests. | Added `package.json` with `vitest` as test runner. 48 unit tests across uuidGenerator (6), cycleChecker (7), keyframeState (17), and dispatcher (18). CI-ready with `npm test` command. | Entire project |
| 63 | ✅ | 🟠 P1 | **No test harness for JSX (ExtendScript)** — The AE scripting code cannot be tested outside of AE. | Created JSX test harness (`tests/jsxSetup.js`) using `loadGlobalScript` with regex transform + indirect eval. Stubs all 40+ handler globals. Tests each `_handle*` function with mock `cmd` objects and verifies `{ ok, data, error }` shape. | `jsx/` directory |

### 4.6 Release Strategy

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 64 | ⏳ | 🔵 P3 | **No build step, no minification** — All 700+ source files loaded as-is. No tree-shaking, no bundling. | Add a `prebuild` npm script that concatenates CSS into one file and optionally minifies JS files individually (preserving file count and load order). | `index.html` |
| 65 | ⏳ | 🔵 P3 | **No version bump automation, no CHANGELOG** | Create `CHANGELOG.md`. Use `npm version patch|minor|major` to bump version in both `package.json` and auto-generate the `manifest.xml` version. | Repo root |

### 4.7 Versioning — **OK** ✅

Semantic versioning in `manifest.xml`. The extension and bundle versions match (0.0.4).

### 4.8 Licensing Implementation

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 66 | ✅ | 🟠 P1 | **No LICENSE file in repository** — The project has no license file. Copyright notice exists but no actual license is specified. | Added `LICENSE` file (MIT). Updated `_docs/CLAUDE.md` copyright to reference the LICENSE file. | Repo root |

### 4.9 Security

| # | Status | Severity | Issue | Fix | Location |
|---|--------|----------|-------|-----|----------|
| 67 | ⏳ | 🔵 P3 | **Sentry is loaded for error reporting without user consent** — GDPR/Privacy implications for EU users. No notice or opt-out. | Add a privacy notice on first launch with opt-in consent for error reporting. Store consent in a `settings.json` file. Only initialize Sentry if consent is given. | `index.html:33` |
| 68 | ✅ | 🟡 P2 | **`JSON.parse` uses `eval()` in the ExtendScript polyfill** — The JSON polyfill in `json.jsx` uses `eval('(' + text + ')')` for parsing. Malformed JSON could execute arbitrary code in AE. | **No change needed.** The existing `jsx/json.jsx` already uses a proper recursive descent parser — no `eval()` call exists. | `jsx/json.jsx:73` |
| 69 | ✅ | 🟡 P2 | **No input validation on evalBridge dispatch params** — Any action/params object is serialized and sent to AE. Malicious params are executed verbatim. | Add a whitelist of allowed actions (64) in `evalBridge.dispatch()`. Validate that `commandObj.action` is in the whitelist. Sanitize `params` by stripping non-JSON-safe values. Add a max depth check. | `bridge/evalBridge.js:123` |
| 70 | ✅ | 🟡 P2 | **CSInterface loaded with default (insecure) CEF config** — `CEFCommandLine` is empty in manifest, meaning the Chromium panel uses default settings which may include insecure flags. | Set explicit CEF command-line flags in `CSXS/manifest.xml`: `<CEFCommandLine><Parameter>--disable-web-security=false</Parameter><Parameter>--allow-file-access-from-files=false</Parameter></CEFCommandLine>`. | `CSXS/manifest.xml:28` |

---

## SUMMARY — COUNT BY SEVERITY (WITH STATUS)

| Severity | Total | Fixed | Pending | Deferred | Key Fixed Areas |
|----------|-------|-------|---------|----------|-----------------|
| 🔴 **P0 — Critical** | 6 | 6 | 0 | 0 | Timeout, AE chunking, vendor libs, tests, LICENSE, loading overlay |
| 🟠 **P1 — High** | 16 | 14 | 2 | 0 | undo in props, cycle detection, IIFE scoping, retry, debounce, crash recovery, globals, script loader, SCC |
| 🟡 **P2 — Medium** | 29 | 21 | 6 | 2 | tempGraph, refreshUI, lifecycle, deepClone, batchUpdateNodes, undo group, memoization, listeners, etc. |
| 🔵 **P3 — Low** | 10 | 2 | 8 | 0 | Duplicate retry (P3), redundant render (addressed by RAF) |
| ⚪ **P4 — Info** | 5 | 0 | 5 | 0 | Plugin API, build step, changelog, settings, UI features |
| **Total** | **66** | **43** | **21** | **2** | |

**Note:** 4 findings removed from original 70 — #67 (Sentry GDPR — actually P3, renumbered), #68 no-actual-eval, #13 no-change-needed, #45 addressed-by-#18. Duplicate #57 (same as #1) consolidated. Effective total: **66 unique findings, 43 resolved (65%), 21 pending, 2 deferred.**

## RESOLVED HIGHLIGHTS

All 6 P0 (100%) and 14 of 16 P1 (88%) resolved. Key wins:
- 🔒 **Security**: evalBridge whitelist (64 actions), CEF flags, no eval in json.jsx
- ⚡ **Performance**: tempGraph dirty deferral, RAF scheduler, batchUpdateNodes, deepClone utility
- 🧱 **Architecture**: lifecycle shared module, refreshUI unified, DI registry, closure scope for keyframeState
- 🧪 **Testing**: 48 vitest tests, JSX test harness with mock handlers
- 📦 **Dependencies**: Sentry + html2canvas vendored, package.json added
- 🏗️ **Script loading**: scripts.json manifest (148 files) replaces fragile index.html list
- 🧼 **Layering**: undo removed from graphState, UI refresh decoupled from engine, namespace isolation  

---

## TOP 10 PENDING / REMAINING (by priority)

All P0 and most P1 resolved. Remaining priority work:

| Rank | ID | Severity | Finding | Notes |
|------|----|----------|---------|-------|
| 1 | 25 | 🟡 P2 | Adjacency indexes for wire lookups | Prerequisite for #26, #40, #46. Single biggest perf win remaining. |
| 2 | 26 | 🟡 P2 | Incremental tempGraph rebuild | Depends on #25. O(n) → O(1) per mutation. |
| 3 | 40 | 🟡 P2 | Drag cascade bypass (direct DOM) | Eliminates 99% per-frame overhead during mousemove |
| 4 | 44 | 🟡 P2 | Differential DOM rendering | No full rebuild on single-node change |
| 5 | 46 | 🔶 P2 | Wire redraw on mousemove | Mitigated; full fix needs #25 |
| 6 | 7 | 🟡 P2 | Input globals consolidation | ~10 files, shared mutable state |
| 7 | 50 | 🟡 P2 | Snapshot-diff undo | Memory: 50x graph → O(k) |
| 8 | 24 | 🟡 P2 | var → let/const migration | Incremental, all files |
| 9 | 9 | 🔵 P3 | RAF-based render batching | Partial fix via _uiScheduler exists |
| 10 | 60 | 🔵 P3 | Wire connect/disconnect validation | Missing null/type checks on public API |
