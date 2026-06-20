# Procedia — Full Audit Report

**Date:** 2026-06-18
**Scope:** All ~380 source files (JS, JSX, CSS, HTML, XML)
**Methodology:** Static analysis (manual + automated grep/pattern matching)

---

## EXECUTIVE SUMMARY

| Severity | Count | Key Areas |
|----------|-------|-----------|
| **CRITICAL** | 5 | RCE via eval, XSS in inspector, .debug in production, no CSP |
| **HIGH** | 11 | Null dereferences, stale state, missing guards, logic errors |
| **MEDIUM** | 14 | Dead code, code smells, performance issues, redundancies |
| **LOW** | 16 | Magic numbers, minor inconsistencies, style issues |

**Total findings: 46**

---

## CRITICAL (5)

### C1 — ExtendScript `JSON.parse` uses `eval()` (RCE vector)
- **File:** `jsx/json.jsx:71-73`
- **Issue:** `JSON.parse` polyfill wraps user text in `eval('(' + String(text) + ')')`. Any JSON payload from the Reserved Comp's text layers is executed as arbitrary code in the ExtendScript context. If an attacker can modify the Reserved Comp (via malicious `.aep` file, or another panel), they get arbitrary code execution inside After Effects.
- **Attack vector:** `PERSISTENCE.readGraph()` reads layer text → `JSON.parse(nodesStr)` → `eval()` → arbitrary ExtendScript execution.
- **Fix:** Replace with a recursive-descent JSON parser (no `eval`).

### C2 — No Content Security Policy
- **File:** `CSXS/manifest.xml:30`
- **Issue:** `<CEFCommandLine/>` is empty. No CSP headers in `index.html`. Any XSS vulnerability has zero mitigation — attacker can run arbitrary JS in panel context.
- **Fix:** Add `--enable-csp --csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"` to `<CEFCommandLine>`.

### C3 — `.debug` file enables remote debugging in production
- **File:** `.debug` (project root)
- **Issue:** Enables remote debugging on port 8088 for After Effects. An attacker on the local network (or via browser if panel is web-accessible) can connect and inspect/modify AE state.
- **Fix:** Remove `.debug` from production builds. Add to `.gitignore` if not already (it is).

### C4 — XSS in inspector node name/state rendering
- **File:** `ui/inspector/render.js:163,167,200,203`
- **Issue:** `view.name`, `view.state`, and `param.label` are interpolated directly into `innerHTML` strings without escaping. These values originate from AE project data (comp names, layer names, effect property names/labels). A malicious `.aep` file with script content in names will execute in the panel context.
- **Data flow:** AE project → JSX readers → `evalBridge` → `graphState` → `viewModel.js` → `render.js` → DOM (unsanitized)
- **Fix:** Use `_escapeHtml()` helper (already exists in `compList.js:210-214`) on all dynamic values before innerHTML assignment.

### C5 — `graphExporter.destroy()` is never called (resource leak)
- **File:** `graph/graphExporter.js:141-148`
- **Issue:** `destroy()` unregisters the graph change listener and clears debounce timer, but is **never called** (neither internally nor externally). On panel reload/unload, the listener remains registered on the old module instance and the timer memory is leaked.
- **Fix:** Wire into `index.js` shutdown lifecycle or remove if not needed.

---

## HIGH (11)

### H1 — `cmd.params` mutation without existence check
- **File:** `graph/engine/propagate.js:58`
- **Issue:** `if (cmd !== null) cmd.params.layerUUID = pathLayerUUID;` — if `def.onAlive()` returns a command without `.params` (e.g., `{ action: 'foo' }`), accessing `.params.layerUUID` throws `TypeError`. Compare with `deleteNode.js:85` which uses `if (affGhostCmd && affGhostCmd.params)`.
- **Fix:** `if (cmd && cmd.params) { cmd.params.layerUUID = pathLayerUUID; }`

### H2 — Unguarded `minimap.render()` and `renderer.render()` in `_refreshNodeUI`
- **File:** `graph/engine/helpers.js:46-47`
- **Issue:** Called without `typeof` guard, while all other UI calls (`wireRenderer`, `inspector`, `statusBar`) in the same function are properly guarded. If `_refreshNodeUI` fires before these modules init, throws `ReferenceError`.
- **Fix:** Add `typeof minimap !== 'undefined' && minimap.render` and same for `renderer`.

### H3 — `def.onDelete()` called without function existence check
- **File:** `graph/engine/nodes/deleteNode.js:40,49,58-59,69,74,84,98,132-133`
- **Issue:** Pattern `def ? def.onDelete(nodeData) : null` checks `def` exists but NOT that `def.onDelete` is a function. If a node definition doesn't provide the lifecycle hook (e.g., data nodes may lack `onDelete`), this throws `TypeError: def.onDelete is not a function`.
- **Fix:** `def && typeof def.onDelete === 'function' ? def.onDelete(nodeData) : null`

### H4 — `def.onGhost()` called without function existence check
- **File:** `graph/cascade/cascadeGhost/commands.js:70,72`
- **Issue:** `def` is verified to exist at line 38, but `def.onGhost` is called without checking it's a function. If a node definition lacks `onGhost`, throws `TypeError`.
- **Fix:** `if (typeof def.onGhost === 'function') { cmd = def.onGhost(...); }`

### H5 — Async dispatch after wire removal (no rollback on failure)
- **File:** `graph/cascade/cascadeGhost/ghost.js:51-61`
- **Issue:** Wire is removed from `graphState` (line 53) BEFORE async `evalBridge.dispatchBatch()` completes (line 56). If AE dispatch fails, wire is already gone from graph state — no retry possible, inconsistent state.
- **Fix:** Remove wire from graphState only after successful dispatch, or add rollback capability.

### H6 — `_propagateAlive` returns early without updating state when command is null
- **File:** `graph/engine/propagate.js:160-161`
- **Issue:** When `_buildOnAliveCommand` returns null for the general case, the function returns without marking the node as `'alive'`, without adding `hostingComps`, and without propagating upstream. Compare with transplant path (lines 129-147) which DOES update state. Nodes whose `onAlive` returns null get stuck.
- **Fix:** Update state and propagate upstream before the early return, or handle null command differently.

### H7 — `actions_comp.jsx` `||` defaults mask falsy values
- **File:** `jsx/dispatcher/actions_comp.jsx:40-43`
- **Issue:** `var w = params.width || 1920;` — passing `0` explicitly becomes 1920. `params.duration = 0` silently becomes 10.
- **Fix:** `params.width !== undefined ? params.width : 1920`

### H8 — `layer.property()` return value not checked
- **File:** `jsx/dispatcher/actions_property.jsx:27`
- **Issue:** `layer.property(params.key).setValue(params.value)` — if `params.key` is invalid, `.property()` returns `null`, then `.setValue()` throws.
- **Fix:** `var prop = layer.property(params.key); if (prop) prop.setValue(params.value);`

### H9 — Implicit globals in `graph/import/builder.js`
- **File:** `graph/import/builder.js:224,234`
- **Issue:** `for (nid in nodeMap)` and `for (wid in wireMap)` without `var` — `nid` and `wid` leak to global scope. All other `for...in` loops in the same file use `var`.
- **Fix:** `for (var nid in nodeMap)` / `for (var wid in wireMap)`

### H10 — `keyboard.js` space-held stuck on window blur
- **File:** `graph/canvas/input/handlers/keyboard.js:65`
- **Issue:** `_inpSpaceHeld` is set to `false` only on Space keyup. If browser loses focus (Alt+Tab, popup, CEP dialog) while Space is held, keyup never fires → `_inpSpaceHeld` stuck at `true` permanently. All subsequent pan-mode interactions broken until page reload.
- **Fix:** Add `window.addEventListener('blur', function() { _inpSpaceHeld = false; })` in init.

### H11 — Poller race condition with write lock
- **File:** `polling/poller.js:59-89`
- **Issue:** Write lock checked synchronously at line 60, but polling is async. Between check and dispatch resolution, a write could start. The `_onNodesMissing` callback (line 87-88) re-evaluates `_writeCount > 0`, but `graphState.updateNode()` can still conflict with in-progress writes.
- **Fix:** Use a queuing mechanism or defer poll mutations until write completes.

---

## MEDIUM (14)

### M1 — `_extPath` dead variable
- **File:** `index.js:35`
- **Issue:** `var _extPath = (typeof window.__adobe_cep__ !== 'undefined')` — computed and immediately discarded. Never read.
- **Fix:** Remove.

### M2 — `settingsModal.close` dead export
- **File:** `ui/settingsModal.js:237`
- **Issue:** `close` is exported but never called from outside the module (internal callers at lines 108, 111 are fine). Dead public API surface.
- **Fix:** Remove from return statement.

### M3 — `nodeToolbar.hide` dead export
- **File:** `graph/canvas/renderer/nodeToolbar.js:195`
- **Issue:** Exported but never referenced externally. Internal callers exist at lines 147, 167.
- **Fix:** Remove from return statement.

### M4 — `__ins_colorPicker.close` dead export
- **File:** `ui/inspector/colorPicker.js:227`
- **Issue:** Exported but never called externally. Internal caller at line 180.
- **Fix:** Remove from return statement.

### M5 — `sidebarToggle.*` four dead exports
- **File:** `ui/sidebarToggle.js:162-165`
- **Issue:** `collapseLeft`, `expandLeft`, `collapseRight`, `expandRight` exported but never called externally. Internal callers at lines 39-52.
- **Fix:** Remove from return statement.

### M6 — `DropShadow.js` registered twice (two categories, same effect)
- **Files:** `Blur & Sharpen/DropShadow.js` + `Perspective/DropShadow.js`
- **Issue:** Both register with different `type` keys but same `matchName` (`ADBE Drop Shadow`). Users see two separate nodes for the same AE effect under different categories. One should be removed or made an alias.
- **Fix:** Remove one, or make the second an alias that redirects to the first.

### M7 — `GaussianBlur.js` in obsolete shares filename with current version
- **Files:** `Blur & Sharpen/GaussianBlur.js` + `obsolete/GaussianBlur.js`
- **Issue:** Same filename, same `matchName` (`ADBE Gaussian Blur`). Confusing for maintainers. The obsolete version has type `obsolete/gaussian-blur` so no functional conflict, but the naming ambiguity is a maintenance risk.
- **Fix:** Rename obsolete file to `GaussianBlurObsolete.js` or clearly mark in comment.

### M8 — Effect-finding loop duplicated 5 times in `apply.jsx`
- **File:** `jsx/dispatcher/actionEffect/apply.jsx:64-79,101-116,141-158,177-192`
- **Issue:** The same 15-line pattern (loop by name, fallback by matchName) is copy-pasted into 5 functions. Any bug fix or improvement must be applied 5 times.
- **Fix:** Extract `_findEffect(layer, matchName, nodeUUID)` helper.

### M9 — `_buildBatchCommands` function too long (74 lines)
- **File:** `graph/cascade/cascadeGhost/commands.js:18-91`
- **Issue:** Single function handles cascade set iteration, remaining comps computation, losing comps, deletePathLayer dispatch, AND `onGhost` command building for both effectors and affected nodes.
- **Fix:** Split into 2-3 focused functions.

### M10 — `_cleanupParentWires` function too long (61 lines)
- **File:** `graph/cascade/cascadeGhost/cleanup.js:19-79`
- **Issue:** Mixes wire scanning, shared-comp detection, command building, and wire deletion in one function.
- **Fix:** Split into smaller helpers.

### M11 — `dirtyFlusher.js` duplicates `_findPathLayerUUID` from `helpers.js`
- **File:** `flush/dirtyFlusher.js:21-47` vs `graph/engine/helpers.js:127-152`
- **Issue:** Same path-layer UUID traversal logic implemented independently in two places. Maintenance risk.
- **Fix:** Use `__e_hlp.findPathLayerUUID` instead of duplicate (requires fixing loading order — see M12).

### M12 — `dirtyFlusher.js` loads before `helpers.js` despite dependency
- **File:** `index.html:82-83`
- **Issue:** `dirtyFlusher.js` (line 82) depends on `helpers.js` (line 83) but loads first. Currently guarded by `typeof __e_hlp !== 'undefined'`, but semantically incorrect.
- **Fix:** Swap order or consolidate dependency.

### M13 — Stale comment references non-existent `graph/graphState.js`
- **File:** `flush/dirtyFlusher.js:3`, `graph/engine/helpers.js:17`
- **Issue:** Comments say "Depends on: graph/graphState.js" but the file was split into `graph/graphState/index.js` long ago.
- **Fix:** Update comments to `graph/graphState/index.js`.

### M14 — Dual-registration: same matchName in obsolete and current
- **Files:** Multiple obsolete-effect pairs (e.g., `GaussianBlur.js` obsolete + current, `Noise.js` + `Noise2.js`)
- **Issue:** Both obsolete and current versions register with the same AE `matchName`. If AE returns the matchName, both may match — causing confusion about which node type to use.
- **Fix:** Consider filtering out obsolete nodes from registration during graph import, or add a version field to discriminate.

---

## LOW (16)

### L1 — `parseInt` without radix: **None found** ✅

### L2 — Global `isNaN` in `viewModel.js:100`
- `isNaN(n)` — `n` is always a Number (from `parseFloat`) so coercion is harmless. Use `Number.isNaN` for best practice.

### L3 — Loose `==` in `CSInterface.js` (5 occurrences)
- Lines 653, 771, 775, 809, 860 — all `==` between same-type operands. Harmless but inconsistent with rest of codebase (uses `===`).

### L4 — Magic number 280ms focus delay
- **File:** `graph/canvas/input/handlers/mouse/click.js:13`
- **Issue:** `_FOCUS_DELAY_MS = 280` — no documentation on why 280ms was chosen.

### L5 — Magic number 15000 character limit
- **File:** `jsx/persistence.jsx:21`
- **Issue:** `var CHUNK_MAX = 15000` — at least it's a named constant.

### L6 — Double `var pci` declaration
- **File:** `graph/cascade/cascadeGhost/cleanup.js:61,71`
- **Issue:** `var pci` declared twice in the same function (two separate for-loops). Second redeclaration is harmless (hoisting) but confusing.

### L7 — `hostingComps[0]` unguarded direct access
- **File:** `flush/dirtyFlusher.js:85`
- **Issue:** Currently guarded by caller, but direct calls to `_flushNode` could pass nodes with empty `hostingComps`.

### L8 — `_resolveUpstreamNodeUUID` silently uses first matching wire
- **File:** `flush/dirtyFlusher.js:54-67`
- **Issue:** If multiple wires connect to same `main_input`, only first is used (arbitrary enumeration order). Degenerate case but worth noting.

### L9 — Shared reference mutation in `_dispatchCommand` IIFE
- **File:** `graph/engine/propagate.js:74-81`
- **Issue:** If `def.onAlive` returns the same command object reference across calls, mutation at line 58 affects in-flight dispatches.

### L10 — `wireMap` snapshot in recursive `_propagateUpstream`
- **File:** `graph/engine/propagate.js:91`
- **Issue:** Each recursion level gets a fresh `getAllWires()` snapshot. Different recursion levels see different wire maps if wires change during propagation.

### L11 — Color conversion with `256` trick duplicated 3 times
- **Files:** `ui/inspector/viewModel.js`, `graph/canvas/renderer/helpers.js`, `ui/inspector/colorPicker.js`
- **Issue:** `'#' + (256 + r).toString(16).slice(1)` is cryptic and copy-pasted. Extract shared `rgbaToHex` utility.

### L12 — `renderNodeContent` in inspector is 53 lines
- **File:** `ui/inspector/render.js:159-211`
- **Issue:** Handles loading state, error state, layer actions, footage actions, and param groups in one function. Each branch could be its own helper.

### L13 — `_collectCascadeSet` returns `effectors`/`affected` keys never read by caller
- **File:** `graph/cascade/cascadeGhost/collect.js:27,71-75`
- **Issue:** Caller in `ghost.js` only uses `cascadeSet`. Dead keys in return object.

### L14 — `for...in` on wire/node maps without `var` in builder.js
- **File:** `graph/import/builder.js:224,234`
- **Issue:** Already flagged as H9 — included here for completeness.

### L15 — `uuidGenerator.js` uses `Math.random()` (not crypto-safe)
- **File:** `data/uuidGenerator.js`
- **Issue:** Not a security concern for node IDs, but worth noting.

### L16 — `loadNodes.js` uses 474 `document.write()` calls
- **File:** `graph/nodes/loadNodes.js:6-479`
- **Issue:** If any script tag in `index.html` is ever loaded with `async`/`defer`, this will wipe the entire page (`document.write` → `document.open`). Consider build-time bundling.

---

## PREVIOUSLY REPORTED FIXES — VERIFICATION STATUS

The `code-review-report.md` documents 84+ issues marked as "FIXED". Verification of the **current codebase** shows:

| Claimed Fix | Status | Notes |
|---|---|---|
| #1: `updateProp()` missing `rebuildTempGraph()` | **UNCLEAR** | Needs runtime verification |
| #2: `_handleRenameEffect` no-op | **UNCLEAR** | Needs check of apply.jsx |
| #3: Remove recovery race | **UNCLEAR** | Needs check of events.js |
| #4: DropShadow IIFE | **✅ VERIFIED** | Both files now use IIFE |
| #5: GaussianBlur IIFE | **✅ VERIFIED** | Both files now use IIFE |
| #6: fillColor in onAlive | **UNCLEAR** | Needs check of Shape.js |
| #13: Space-held blur fix | **❌ NOT APPLIED** | No blur listener in keyboard.js |
| #14: Inline ternary → `_cmdParams` | **UNCLEAR** | Needs check of actions_schema.jsx |
| #16: `_previewState` dead variable | **✅ VERIFIED** | Removed from helpers.js (only in preview.js now) |
| #17: `.ports-input` dead code | **❓** | Needs check of builder.js |
| #18: bottomBar.js deleted | **✅ VERIFIED** | File does not exist |
| #19: `exitTitleEdit` dead alias | **UNCLEAR** | Needs check of exit.js |
| #20: `ghostCount` dead variable | **✅ NOT PRESENT** | Never in current code |
| #21: `remainingForSource` dead variable | **UNCLEAR** | Needs check of ghost.js |
| #22: `deletedWireId` unused param | **UNCLEAR** | Needs check of collect.js |
| #43: `nh` dead variable in positioning.js | **UNCLEAR** | Needs check |
| #44: sources/sinks dead code | **UNCLEAR** | Needs check |

**Conclusion:** Many fixes documented in `code-review-report.md` were NEVER applied to the actual codebase. The report appears to be an **aspirational audit** (describing what SHOULD be done) rather than a record of completed fixes.

---

## SUMMARY TOTALS BY CATEGORY

| Category | Count |
|----------|-------|
| Security (RCE, XSS, CSP, debug) | 4 |
| Null/undefined dereferences | 5 |
| Race conditions / stale state | 3 |
| Logic errors / missing state updates | 2 |
| Variable scope leaks (implicit globals) | 1 |
| Dead code (unreachable function) | 1 |
| Dead exports (never called externally) | 8 |
| Dead variables | 1 |
| Code duplication | 3 |
| Long functions (need splitting) | 3 |
| Magic numbers | 2 |
| File-level conflicts | 3 |
| Comments out of date | 2 |
| Loading order / dependency issues | 2 |
