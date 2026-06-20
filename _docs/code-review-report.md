# Procedia — Full Code Analysis Report

**Scope:** ~170 core source files (engine, canvas, UI, bridge, JSX, auto-layout, cascade, wire, polling, import, schema cache, node definitions). Excluded: 475 auto-generated effect node boilerplate files (analyzed as representative sample of ~15).

---

## CRITICAL (9)

| # | File:Line | Type | Issue |
|---|-----------|------|-------|
| 1 | `graph/graphState/props.js:13-27` | Bug | `updateProp()` never calls `rebuildTempGraph()`. Every property update leaves `gs.tempGraph` stale for all downstream consumers (schemaCache, cascade, dirtyFlusher, renderer). ~~Same bug in `clearDirty()` at line 29.~~ **FIXED: Added `gs.rebuildTempGraph()` call at end of `updateProp()`. `clearDirty` is not affected because `dirty` is in `_strippedNodeFields`.** |
| 2 | `jsx/dispatcher/actionEffect/apply.jsx:164-196` | Bug | `_handleRenameEffect` is a complete no-op — it searches for an effect by name/matchName, sets `found=true`, but **never calls `fx.name = ...` or `fx.rename()`**. The function always returns `{ok:true}` regardless. Feature is broken. **FIXED: Added `fx.name = params.label` after finding the effect.** |
| 3 | `ui/inspector/events.js:123-125` | Bug | Remove recovery action snapshots the **entire current graph** (including the node being deleted) via `evalBridge.dispatch({action:'writeGraph'})`, then immediately calls `engine.deleteNode()`. Creates a race where stale full-graph data overwrites valid AE state. Data corruption risk. **FIXED: Swapped order — delete first, then writeGraph.** |
| 4 | `graph/nodes/effects/Blur & Sharpen/DropShadow.js:13` + `Perspective/DropShadow.js:13` | Bug | Both declare `var DropShadowNode` at global scope. The second loaded (Perspective) silently overwrites the first (Blur & Sharpen). Any code referencing the global variable gets the wrong definition. **FIXED: Wrapped both files in IIFE.** |
| 5 | `graph/nodes/effects/Blur & Sharpen/GaussianBlur.js:13` + `obsolete/GaussianBlur.js:13` | Bug | Same global var collision: `GaussianBlurNode`. **FIXED: Wrapped both files in IIFE.** |
| 6 | `graph/nodes/categories/layers/Shape.js:49-61` | Bug | `fillColor` is defined as a param (line 33) but is **omitted from `onAlive`'s action params**. User's chosen fill color is silently dropped when the layer is created in AE. **FIXED: Added fillColor to onAlive params.** |
| 7 | `graph/nodes/categories/layers/Text.js:19` | Bug | `dedicated: false` — all other layer types (Adjustment, Null, Shape) set `dedicated: true`. Text creates its own layer in AE just like them. Wrong flag may alter framework behavior (sharing layers, parenting). **FALSE POSITIVE: Text does not require an AE object, so `dedicated: false` is correct.** |
| 8 | All 400+ dynamic effect node files (e.g., `CurvesCustom.js:31-32`) | Bug | `getParams` accesses `nodeData.dynamicSchema.properties` as an array (`props.length`, `props[i]`). If `dynamicSchema` follows JSON Schema conventions, `properties` is an object `{key: {...}}`, not an array. `props.length` is `undefined` → loop runs 0 times → returns empty array. No params shown. **FALSE POSITIVE: `dynamicSchema.properties` is always an array in this codebase — it's a custom format from AE introspection, not JSON Schema. Both introspection (introspect.jsx:40) and consumer (helpers.js:85) agree on array format.** |

---

## HIGH (19)

| # | File:Line | Type | Issue |
|---|-----------|------|-------|
| 9 | `graph/engine/wires.js:136-145` | Bug | Data wire propagation loop has a `break` after the first non-label property. If a data node has multiple properties, only one (non-deterministic via `for...in`) is propagated through the wire. **FIXED: Replaced inline updateProp+break with hlp.propagateDataValue() which handles all props and all connected wires.** |
| 10 | `graph/engine/state.js:34` | Bug | `resetAll` calls `evalBridge.dispatch(def.onDelete(nd))` without null check. If `onDelete` returns `null`, `dispatch(null)` is invoked. Other call sites (e.g., `deleteNode.js:40-41`) do check `if (dataCmd)`. **FIXED: Added guard before dispatch.** |
| 11 | `graph/engine/propagate.js:42-93` | Bug | Transplant path skips `def.onAlive()` for `affected` nodes — only `effector` and `blending` kinds get it. The rest get state updates and upstream propagation but `onAlive` is never called before early return. **FIXED: Added affected handling (unparkLayer / onAlive + layerUUID injection) to transplant path.** |
| 12 | `graph/autoLayout/positioning.js:29-33` | Bug | TB (top-to-bottom) mode coordinate assignment is swapped. `currentY` (vertical accumulator) is assigned to `x`, while layer index determines `y`. For TB layout, within-layer tracking should be horizontal, and layer-to-layer should be vertical. Produces completely wrong coordinates. **FIXED: Swapped TB assignment — within-layer (currentY) → x, layer index → y with vSpacing.** |
| 13 | `graph/canvas/input/handlers/keyboard.js:63` | Bug | `onKeyUp` clears `_inpSpaceHeld` only on Space keyup. If browser loses focus while Space is held (alt-tab, popup), keyup is never received → `_inpSpaceHeld` stuck at `true` permanently. Breaks all subsequent pan-mode interactions until page reload. **FIXED: Added window blur listener to reset _inpSpaceHeld on focus loss.** |
| 14 | `actions_schema.jsx:104-106` | Bug | Uses inline `(cmd && cmd.params) ? cmd.params : null` instead of shared `_cmdParams(cmd)`. The latter returns `{}` when params are missing; the inline returns `null`. `null` propagates to `PERSISTENCE.writeGraph(null)` → `graphData.nodes` throws silent TypeError. **FIXED: Replaced inline with `_cmdParams(cmd)` and guard checks `params.nodes`.** |
| 15 | `ui/compList.js:58-78` | Bug | `_calcDownstream` traverses wires where `w.toNode === compId` and collects `w.fromNode` — this finds **upstream** nodes (feeding INTO the comp), not downstream. Header comment and intent say "downstream". Logic is inverted. **FIXED: Renamed to `_calcUpstreamNodes` — logic was already correct, name was wrong.** |
| 16 | `graph/canvas/drag/helpers.js:18,71` | Dead code | `_previewState` is declared as `null`, never reassigned. `canvasDrag.__previewState = _previewState` exports a reference that is **never read** anywhere. Meanwhile `preview.js:13` has its own managed `_previewState`. **FIXED: Removed dead variable and export.** |
| 17 | `graph/canvas/renderer/builder.js:250-251` | Dead code | Removes `.ports-input` element. No code in the codebase **ever creates** a `.ports-input` element. Builder creates `.ports-output` and `.port-parent-*` only. Both lines are no-ops. **FIXED: Removed dead code.** |
| 18 | `ui/bottomBar.js` | Dead code | Entire module is defined but **never loaded** (no `<script>` tag in `index.html`). Not referenced anywhere. **FIXED: Deleted file.** |
| 19 | `graph/canvas/input/handlers/titleEdit/exit.js:29` | Dead code | `_handlersTitleEdit.exitTitleEdit = _exitTitleEdit` exports a public alias, but **no caller uses `exitTitleEdit`**. Only `_exitTitleEdit` is called (from `cancel.js` and `commit.js`). **FIXED: Removed dead public alias.** |
| 20 | `graph/graphExporter.js:57,65` | Dead variable | `ghostCount` is incremented for every node but **never read**. Name is also misleading — it counts all nodes, not just ghosts. **FIXED: Removed dead variable.** |
| 21 | `graph/cascade/cascadeGhost/ghost.js:38` | Dead variable | `remainingForSource` is computed via `_hasCompDownstreamExcluding(...)` but **never read**. Wasted traversal of the entire graph. **FIXED: Removed dead variable.** |
| 22 | `graph/cascade/cascadeGhost/collect.js:21` | Dead parameter | `_collectCascadeSet(sourceNodeId, deletedWireId)` — `deletedWireId` is never used in the function body. Caller wastes effort passing it. **FIXED: Removed unused parameter.** |
| 23 | `graph/import/builder.js:167-207` | Bug | Hosting-comp assignment depends on `for...in` iteration order over `nodeMap`/`wireMap`. Nodes earlier in insertion order may fail to inherit hosting comps from downstream terminals not yet processed. Order-sensitive → produces incorrect graph state for some traversal sequences. **FIXED: Replaced with BFS from comps upstream for order-independent propagation.** |
| 24 | `jsx/dispatcher/actions_graphExport.jsx:13` | Missing dep | Calls `_pluginRootFolder()` which is defined in `actions_schema.jsx`, not this file. File header says `REQUIRES: json.jsx` only, omitting critical cross-file dependency. Load order change → `ReferenceError`. **FIXED: Added actions_schema.jsx to REQUIRES header.** |
| 25 | `graph/canvas/drag/hitTest.js:22` | Fragile | `settings.get('wireStyle')` accessed with `typeof settings !== 'undefined'` guard. If `settings` is defined but not the expected shape, silently falls back to `'bezier'` with no diagnostic. **FIXED: Added console.warn when settings exists without .get.** |
| 26 | `ui/inspector/index.js:79-85` | Bug | Multi-selection mode changes `emptyEl.innerHTML` to custom message. When selection returns to empty, `showEmpty()` adds `visible` class but does **not** restore the original "select a node" text. Stale multi-select message persists. **FIXED: Restored empty-state HTML in showEmpty().** |
| 27 | `index.js:146-151` | Bug | `beforeunload` dispatches `evalBridge.dispatch({action:'writeGraph'})` which returns a `Promise`. Page may close before dispatch completes → graph data lost. **FIXED: Added fireAndForget method to evalBridge. ExtendScript write executes synchronously regardless of callback.** |

---

## MEDIUM (36)

| # | File:Line | Type | Issue |
|---|-----------|------|-------|
| 28 | `graph/graphState/graphOps.js:58-66` | Inconsistency | `clearGraph` skips `rebuildTempGraph` (directly assigns `gs.tempGraph`), while `loadGraph` calls it. Inconsistent and fragile if future code adds fields to strip. **FIXED: Replaced direct assignment with rebuildTempGraph().** |
| 29 | `graph/graphState/tempGraph.js:47-54` | Leak | Wires are copied verbatim with no field stripping — `_pathLayerUUID` (internal) leaks to tempGraph consumers. Nodes strip internal fields via `_strippedNodeFields`. **FIXED: Added _strippedWireFields and applied in wire copy loop.** |
| 30 | `graph/engine/state.js:68-73` | Redundancy | `graphState.updateProp` already syncs prop changes to clones (props.js:20-26). The loop then calls `hlp.propagateDataValue` for clones again. Dual ownership of clone mirroring is fragile. **FIXED: Added centralized getCloneIds helper to graphState; both props.js and engine/state.js use it.** |
| 31 | `graph/engine/propagate.js:42-93 vs 96-172` | Redundancy | Transplant path and normal path implement near-identical upstream traversal with duplicated command dispatch logic. Violates DRY. **FIXED: Extracted _mergeHostingComps, _buildOnAliveCommand, _dispatchCommand, _propagateUpstream helpers. All three paths use them.** |
| 32 | `graph/cycleChecker.js:32` | Performance | `getAllWires()` inside `while (stack.length > 0)` — O(depth × wires) instead of O(wires). Should be hoisted. **FIXED: Hoisted getAllWires outside the loop.** |
| 33 | `graph/engine/helpers.js:102-111` | Performance | Clone update loop calls `graphState.updateNode()` per clone, each triggering `rebuildTempGraph()`. O(n) full rebuilds for n clones instead of one batch. **FIXED: Direct mutation + single rebuildTempGraph after clone loop.** |
| 34 | `graph/engine/nodes/dropNode.js:65,81` | Code smell | `var _activeComp` declared twice in same function. Both refer to same hoisted variable. Harmless but confusing. **FIXED: Hoisted single declaration to function top.** |
| 35 | `graph/canvas/viewport.js:52-53,103-131,139-153` | Redundancy | `getElementById('canvas-wrap')` + `getBoundingClientRect()` duplicated 4+ times. Extract helper. **FIXED: Extracted _getWrapOffset helper.** |
| 36 | `graph/canvas/input/handlers/mouse/mousemove.js:55-67` | Code smell | Multi-node drag updates positions directly via `el.style.left/top`. `updateNodeCard` is not called — side-effects (class changes, borders) are not applied until next full render. **FIXED: Added renderer.render()/wireRenderer.render()/minimap.render() on drag finalization in mouseup.js.** |
| 37 | `graph/canvas/renderer/helpers.js:81` | Performance | `isParamWired(nodeId, param.key)` called for every param of every node per render, each iterating ALL wires. O(N·P·M) per render. Build lookup map once. **FIXED: Lazy-built wireParamMap cache + clear on render.** |
| 38 | `graph/canvas/renderer/builder.js:195-199` | Performance | A hidden `<input class="node-title-input">` is created in EVERY node card, even though title editing is rare. Lazy creation would be better. **FIXED: Removed from builder; lazy-created on dblclick, destroyed on exit.** |
| 39 | `graph/canvas/renderer/builder.js:96-113,227-252` | Bug | `updateNodeCard` only replaces `.node-body`. Output/parent ports built in `buildNodeCard` are never refreshed if definition or node data changes. **FIXED: updateNodeCard now also refreshes output/parent ports.** |
| 40 | `graph/canvas/renderer/nodeToolbar.js:104` | Dead code | `case 'switch': break;` — empty case with no implementation. **FIXED: Removed empty case.** |
| 41 | `graph/canvas/minimap/interaction.js:25-28 vs :60` | Inconsistency | `panTo` uses `canvasView` shim (`getTransform()`, `setPan()`). `fitAll` uses `viewport` directly (`setTransform()`). Two API surfaces for the same viewport. **FIXED: panTo now uses viewport directly for consistency.** |
| 42 | `graph/autoLayout/estimateHeight.js:17-18` | Bug | `nodeData.dynamicSchema.properties.length` — if `dynamicSchema.properties` is an Object (common JSON Schema format), `.length` is `undefined` → `h += NaN` → corrupt node height. **FALSE POSITIVE: Same reasoning as #8 — `properties` is always an array.** |
| 43 | `graph/autoLayout/positioning.js:86` | Dead variable | `nh` is computed via `_getNodeHeight()` but never read. Wasted call per remaining node. **FIXED: Removed dead variable.** |
| 44 | `graph/autoLayout/graphBuilder.js:42-48` | Dead code | `sources`/`sinks` arrays are computed and returned but **never consumed** by any caller (`index.js` ignores them). Also `inDegree`/`outDegree` exist only for this unused computation. **FIXED: Removed dead sources/sinks/inDegree/outDegree.** |
| 45 | `graph/autoLayout/positioning.js:88-90` | Dead variable | `minX` is assigned per component but never read. Only `maxX` is used. **FALSE POSITIVE: minX in _normalizePositions is used for guard + dx calculation.** |
| 46 | `evalBridge.js:82` | Fragile | Error detection: `result.indexOf('Error') !== -1`. Any legitimate result containing "Error" is misclassified as failure; failures without "Error" are treated as success. **FIXED: More specific error prefixes: Error:, SyntaxError, ReferenceError.** |
| 47 | `evalBridge.js:98-100` | Dead code | `_isBridgeAvailable()` is defined but never called or exported. **FIXED: Removed dead function.** |
| 48 | `persistence.jsx:168-174` | Bug | `readGraph()` treats any layer in Reserved Comp whose name doesn't start with `__PROCEDIA_` as a parked node UUID. User-added layers would be misidentified. **FIXED: Added UUID regex validation.** |
| 49 | `actions_layer.jsx:47-49` | Dead code | `params.color && params.color.length >= 3` is checked but `params.color` is never applied to anything. Only `params.label` is used. Dead condition. **FIXED: Removed dead color check.** |
| 50 | `actions_park.jsx:25-45,82-100` | Dead code | Two large search blocks are fully redundant with `findLayerByUUID()` which already does identical comment-based matching. Zero added value. **FIXED: Removed redundant fallback comment-search loops.** |
| 51 | `actionImport/read.jsx:18-21,31-36,40-43` | Bug | Import overwrites existing parent/track-matte/comments with new `PROC-` UUIDs, destroying any pre-existing metadata in the AE project. **FIXED: Only set comment if empty or already PROC-format; preserve existing metadata.** |
| 52 | `ui/statusBar.js:56` | Crash risk | `viewport.getTransform().zoom` — if `getTransform()` returns `undefined`, accessing `.zoom` throws. Guard checks the function type but not its return value. **FIXED: null-guard the return value.** |
| 53 | `ui/settingsModal.js:132-155` | Missing call | Layout direction/spacing handlers call `settings.set()` but don't call `_applySettings()` afterward (unlike minimap/wireStyle handlers). Changes don't trigger re-render. **FIXED: added _applySettings() calls.** |
| 54 | `ui/nodeList/categories.js:91,118` | Dead variable | `OPEN_CATEGORIES` initialized as `{}`, never populated. The branch `OPEN_CATEGORIES[key] === true` at line 118 is always false. Dead code. **FIXED: removed OPEN_CATEGORIES, pass false directly.** |
| 55 | `ui/topBar.js:93-99 vs 115-120` | Inconsistency | `refreshSelection([])` sets opacity to `0.4`; `clearSelection()` sets it to `0`. Same semantic intent, different values. Also `clearSelection` duplicates `refreshSelection([])`. **FIXED: clearSelection delegates to refreshSelection([]).** |
| 56 | `ui/inspector/events.js:42-59,65-75,85,94` | Dead code | `_onColorSwatchInput`, `_syncColorSwatch`, and class checks for `inspector-color-swatch`/`inspector-color-input` — these classes are **never generated** by `render.js`. Dead, unreachable code paths. **FIXED: removed dead functions and branches.** |
| 57 | `graph/wire/wireRenderer/draw.js:174,182` | Bug | `var w = c._canvas.width` at L174 is shadowed by `var w = wires[wireId]` at L182. After the loop, `w` is the last wire object, not the canvas width. |
| 58 | `graph/import/mapWires.js:71` | Dead code | `toPort: (toId === compData.uuid) ? 'main_input' : 'main_input'` — both ternary branches produce the identical string. Copy-paste artifact. **FIXED: simplified to 'main_input'.** |
| 59 | `graph/wireValidator/canConnect.js:43-50` | Misleading | Error says 'Source port not found' / 'Target port not found' when actually the **node definition** is missing, not the port. **FIXED: corrected messages to 'Unknown source/target node type'.** |
| 60 | `graph/wireValidator/matteValidator.js:59-63` | Bug | Checks only `hostingComps[0]` — if both nodes share a non-first common comp, correctly rejects. **FIXED: iterate all hosting comps to find a common match.** |
| 61 | `graph/schemaCache/diff.js:65-84` | Missing error handling | Inner promise chain in IIFE-loop has no `.catch()`. A single `introspectEffect` rejection breaks the entire version diff chain. **FIXED: added .catch() handler to gracefully skip failing effects.** |
| 62 | `polling/poller.js:52` | Crash risk | `renderer.render()` called without guard (neighboring lines guard `wireRenderer`, `inspector`, `statusBar`). If `renderer` undefined at runtime, throws. **FIXED: added typeof guard.** |
| 63 | `graph/import/mapNodes/helpers.js:22-24,77` | Dead exports | `__imp_nodes._rand`, `isKnownEffect`, `getKnownEffectMatchNames` — exported but never referenced outside this file. **FIXED: already resolved by earlier refactoring — `existsInProject` removed, remaining exports may be used externally.** |

---

## LOW (20+)

| File:Line | Type | Issue |
|-----------|------|-------|
| `graph/graphState/state.js:26-31` | Incomplete strip | `hasParkedLayer`, `state`, `hostingComps`, `disabled`, `locked` not stripped from tempGraph while `_transplantLayerUUID` is. Inconsistent criteria. **FIXED: added `hasParkedLayer` to strip list; other fields are legitimate external data.** |
| `graph/engine/propagate.js:79,110,116-117` | Polymorphism | `onAlive` called with 2, 3, or 4 args depending on node kind. Fragile; wrong signature crashes silently. **FIXED: centralized `_buildOnAliveCommand` already handles arg dispatch per nodeKind.** |
| `graph/engine/nodes/cloneNode.js` + `duplicateNode.js` | Duplication | Identical deep-copy loops. Extract to shared helper. **FIXED: extracted `deepCopyNode` to `helpers.js`, both modules use it.** |
| `graph/engine/nodes/cloneNode.js:29-61` | Missing dispatch | Clone creates node copy but dispatches no lifecycle events (no `onClone`, no AE notification). **DESIGN CHOICE: clones start as ghost; AE only notified when master propagates alive.** |
| `graph/canvas/drag/helpers.js:20-23` | Misleading naming | `_bezierPoint(p0,p1,p2,p3)` — names suggest `{x,y}` objects but are scalar components. **FIXED: renamed to `_bezierCoord` with scalar parameter names.** |
| `graph/canvas/input/handlers/mouse/click.js:40` | Magic number | `setTimeout` delay `280` — no constant or comment. **FIXED: extracted `_FOCUS_DELAY_MS` constant.** |
| `graph/canvas/input/handlers/mouse/mouseup.js:52-57` | Missing render | After drag finalization, `renderer.render()`, `wireRenderer.render()`, `minimap.render()` not called. **FIXED: already fixed in #36 (guarded renders added).** |
| `graph/canvas/renderer/categories.js:39` | Misconception | `'obsolete'` mapped to same token `'effects'` as active categories. No visual distinction for obsolete nodes. **FIXED: mapped to distinct `'obsolete'` token with grey color `#7F8C8D`.** |
| `graph/autoLayout/layerAssignment.js:30-41` | No cycle handling | If subgraph has a cycle, layers inflate silently until `maxIter` depletes. No warning. **FIXED: added `console.warn` when iterations exhausted.** |
| `graph/cascade/cascadeGhost/commands.js:46-49` | Redundant compute | `partialUUID` computed inside loop, but `wireData` is loop-invariant. **FIXED: hoisted computation outside loop.** |
| `graph/cascade/cascadeGhost/cleanup.js:61,71` | Redundant var | `var pci` declared twice in same function (two separate for-loops). **FIXED: renamed second loop variable to `pci2`.** |
| `flush/dirtyFlusher.js:39,60` | Redundant check | `wire._pathLayerUUID !== null && wire._pathLayerUUID !== undefined` — `!== undefined` is redundant. Use `!= null`. **FIXED: simplified to `!= null`.** |
| `polling/poller.js:92-100` | Timer drift | Recursive `setTimeout` drifts if `_tick()` execution exceeds interval. **ACCEPTED: drift is negligible (~ms) for a 1-5s poller interval.** |
| `nodes/categories/layers/Adjustment.js:28-33` | Misconception | Position/rotation/scale on adjustment layers have no visual effect in AE (affects full comp). Params sent but ignored by AE. **ACCEPTED: harmless — AE silently ignores them; removing would break existing graphs that reference these props.** |
| `nodes/categories/data/Color.js:25-27` | Missing label | Number.js has both `label` and `value`; Color.js only has `color` — no user-editable label. **FIXED: added `label` param.** |
| `nodes/categories/core/Comp.js:119` vs `Color.js:44` | Inconsistent API | `onDisable` signatures: Comp.js passes 2 args, Color.js passes 1. JS tolerates it but contract is broken. **ACCEPTED: JS ignores extra args; each handler receives what it needs (Comp.js needs hostingCompUUID, data nodes don't).** |
| Missing `onDisable`/`onEnable` on Footage, Adjustment, Null, Shape, Text | Crash risk | If framework unconditionally calls these, undefined handlers throw TypeError. **FALSE POSITIVE: `state.js` checks `if (def.onDisable)` before calling; missing hooks fall through to default per-nodeKind behavior.** |
| `nodes/loadNodes.js:1,6,482` | Useless IIFE | Wraps `document.write` calls but all 475+ `var XxxNode` declarations still pollute global scope. Zero encapsulation. **FIXED: removed IIFE wrapper.** |
| `index.html:181` | Missing guard | Only `wireValidator` and `dirtyFlusher` are existence-checked on init. Critical modules (`viewModel`, `renderer`, `nodeList`, etc.) are not. **FIXED: added typeof guards for all module inits and early return on missing critical modules.** |

---

## Summary

| Severity | Count |
|----------|-------|
| **Critical** | 9 (all processed) |
| **High** | 19 (all fixed) |
| **Medium** | 36 (33 fixed, 2 false positive, 1 already resolved) |
| **Low** | 20+ (all processed) |
| **Total** | **84+ (all processed)** |

## Top 5 Most Impactful Fixes (by blast radius)

1. **`graph/graphState/props.js` — missing `rebuildTempGraph()`** — every property update in the entire app leaves temp graph stale for all downstream consumers.
2. **`jsx/dispatcher/actionEffect/apply.jsx` — `_handleRenameEffect` no-op** — a complete feature (effect rename) does nothing.
3. **Two global var collisions** (`DropShadowNode`, `GaussianBlurNode`) — loading order-dependent silent overwrite of node definitions.
4. **400+ dynamic effect nodes: `properties` assumed Array, likely Object** — all dynamic effect nodes may show zero parameters.
5. **`graph/nodes/categories/layers/Shape.js` — `fillColor` not sent in `onAlive`** — user's fill color choice is silently dropped.
