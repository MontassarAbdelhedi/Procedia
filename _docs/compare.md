# Procedia — Implementation Gap Analysis

*Comparing disk state vs `arch_specs.md` (May 2026)*
*Updated: portManager removed, no extendable/spawn ports — all ports visible from drop*

---

## P1 — Missing Files to Create

| # | File | Arch Spec | What It Does | Status |
|---|------|-----------|--------------|--------|
| 1 | `ui/settings.js` | §17a | Persistent key/value store backed by `localStorage`. `get()`, `set()`, `getAll()`. Keys: `minimap`, `wireStyle` | ✅ Done |

---

## P2 — Existing Files to Verify & Update

| # | File | Arch Spec | What to Verify | Status |
|---|------|-----------|----------------|--------|
| 3 | `jsx/dispatcher/dispatcher.jsx` | §5b | All 30+ registered actions present | ✅ Done |
| 4 | `jsx/utils.jsx` | §4 (lookup utils) | `getAEVersion()` exists? All functions return `JSON.stringify({ok,data,error})`? | ✅ Done |
| 5 | `jsx/persistence.jsx` | §9 | `readGraph()` / `writeGraph()` with chunking | ✅ Done |
| 6 | `jsx/polling.jsx` | §14 | `pollAliveNodes(uuidListJSON)` — single multi-UUID bridge crossing | ✅ Done |
| 7 | `graph/engine.js` | §6, §20g | Zero node-type conditionals. Dynamic schema hook. `_firePathCreation()`, `_transplantLayerUUID` | ✅ Done |
| 8 | `graph/cascadeAlgorithm.js` | §7 | `cascadeGhost()`: layer-only cascade, batched `dispatchBatch()` | ✅ Done |
| 9 | `graph/wireValidator.js` | §3c, §12a, §13b | Blending `main_input` ← affected only. Matte three-condition validation | ✅ Done |
| 10 | `graph/cycleChecker.js` | §7f | `hasCycle()` — pure graph traversal | ✅ Done |
| 11 | `graph/schemaCache.js` | §20d | `init()`, `hasSchema()`, `getSchema()`, `storeSchema()`, `isReady()`. AE version diff | ✅ Done |
| 12 | `ui/inspector.js` | §20h | Dynamic rendering for `params: 'dynamic'` nodes. Five param types | ✅ Done |
| 13 | `ui/settingsModal.js` | §17b | Depends on `settings.js`. Gear button wiring. Modal open/close | ✅ Done |
| 14 | `graph/canvas/drag.js` | §18, §19 | Wire-insertion: `_transplantLayerUUID` stamp, `restampLayer`. Empty canvas wire drop: node picker | ✅ Done |
| 15 | `graph/canvas/nodeModel.js` | — | Removed — dead code, not loaded | 🗑️ Removed |
| 16 | `graph/canvas/renderer.js` | §16 | Wire style modes: bezier, direct, stepped. Reads `settings.get('wireStyle')` per frame | ✅ Done |
| 17 | `ui/topBar.js` | — | Duplicate/Delete/Reset/Reload/Settings. No lock button. No selection badge | ✅ Done |
| 18 | `ui/bottomBar.js` | — | Centered notification only. No action buttons | ✅ Done |
| 19 | `graph/canvas/input.js` | — | Multi-node drag uses saved start positions. Minimap updates during drag | ✅ Done |
| 20 | `graph/canvas/minimap.js` | — | No selection highlight stroke. Real-time render during node drag | ✅ Done |

---

## P3 — Features & Systems to Complete

| # | Feature | Arch Spec | Verification Criteria |
|---|---------|-----------|----------------------|
| 17 | **Reserved Comp** | §11 | Created on panel init: `"DO NOT DELETE — Procedia Reserved"`. Skip `DO NOT DELETE` comps in traversal. Parked layers preserve keyframes natively. Not auto-repaired |
| 18 | **Node lifecycle** | §2, §10 | OnDrop→ghost (exceptions). OnAlive→creates AE layer. OnGhost→parks layer. OnDelete→removes parked layer. Property change→dirty flush |
| 19 | **Alive/ghost transitions** | §2, §7 | Wire connect→alive. Wire disconnect→cascade→ghost. Reconnect dormant→unpark. `hasCompDownstream()` checks all paths. Multi-comp support |
| 20 | **Dirty flush** | §10 | `dirtyFlusher.schedule()` 300ms debounce. `flush()` calls `onPropertyChange` then `evalBridge.dispatch()`. After `_pathLayerUUID` stamp: sync flush |
| 21 | **Polling** | §14 | 1s active / 5s idle tick. Skips if `isWriting`. `pollAliveNodes(uuidList)`. Error→`error` state |
| 22 | **Persistence** | §9 | Written on AE save, AE quit, panel unload. Two text layers: `__PROCEDIA_NODES__`, `__PROCEDIA_WIRES__`. Chunked if over char limit. Read on panel open |
| 23 | **Settings system** | §17 | `settings.js` loads from `localStorage`. `settingsModal.js` re-syncs on open. Minimap toggle, wire style selector functional |
| 24 | **Wire styles** | §16 | Bezier, direct, stepped. All three modes in `drawAll()`, `drawWire()`, drag preview. Hit testing always bezier |
| 25 | **Wire-insertion** | §18 | Drop node on active wire → graph-only remove + `_transplantLayerUUID` + drop + re-wire + `restampLayer`. Drop on dormant wire → full cascade |
| 26 | **Wire drop on empty canvas** | §19 | DOM node picker filtered by `main_input` compatibility. On selection: drop node + wire connect |
| 27 | **Parent ports** | §3c | `child_of`/`parent_of` on affected nodes. `layer.parent = targetLayer`. Not traversed by cascade |
| 28 | **Layer ordering** | — | Drag-to-reorder in CompNode. `setLayerOrder`. `moveToBeginning()` bottom-to-top. 0-based panel ↔ 1-based AE |
| 29 | **Error state recovery** | §2 | Node→`error` when AE object missing. `[Re-create in AE]`→unpark. `[Remove from Graph]`→remove parked |

---

## P4 — Integration & Verification

| # | Task | Details | Status |
|---|------|---------|--------|
| 30 | **Integration test** | Follow §12 in arch_specs. Five scenarios: cache miss, cache hit, panel reload, param→AE, version diff | — |
| 31 | **`data/effectSchemaCache.json` bootstrap** | Verify content is `{ "aeVersion": "", "schemas": {} }` | ✅ Done |
| 32 | **`index.html` load order audit** | Verify every `<script>` tag matches actual files | ✅ Done |
| 33 | **Discrepancy: `settings.js`** | File created — `settingsModal.js` now loads after it | ✅ Done |
| 34 | **Discrepancy: `nodeModel.js`** | Removed — dead code, not loaded | ✅ Done |

---

## Architecture Changes (This Session)

| Change | Detail |
|--------|--------|
| **No extendable ports** | `extendable` field removed from all port declarations. Nodes declare only the ports they need |
| **No port spawning** | `portManager.js` removed. Secondary input ports are resolved from schema cache at drop time and displayed immediately — never "spawned" |
| **All ports visible from drop** | Each node shows all its ports on drop. Effectors: main_input + output (static) + secondary inputs (from dynamic schema). No dynamic slot creation on wire connect |
| **Engine simplified** | Engine no longer calls `portManager.spawnSlot()` / `removeSlot()`. Schema resolution stores `dynamicSchema` on `nodeMap` instance; ports are derived from it |

## Architecture Changes (May 2026 UI Session)

| Change | Detail |
|--------|--------|
| **Top bar reorganized** | Selection badge removed. Lock button removed. Duplicate and Delete buttons wired to engine. Reset and Reload buttons moved from bottom bar |
| **Bottom bar simplified** | Action buttons (reset, reload, settings) removed. Notification text centered |
| **Minimap improvements** | Selection highlight stroke removed. Real-time render during node drag |
| **Node drag ghost** | Node list drag now shows a floating header with category-colored dot and node name that follows the cursor |
| **Multi-node drag fix** | Fixed position compounding bug — start positions saved at drag start instead of reading current graphState |
| **Node duplication** | `engine.duplicateSelectedNodes()` — deep-copies selected nodes with offset, selects copies |
| **Node locking** | `engine.toggleLockSelectedNodes()` — toggles `locked` boolean on selected nodes. Field persisted via graphState |

---

## Legend

| Status | Meaning |
| ------ | ------- |
| ❌ Missing | File does not exist on disk |
| ⚠️ Needs audit | Exists but may not match spec |
| ✅ Done | Verified against spec |
| 🗑️ Deprecated | Concept removed from architecture |

---

*Generated from `arch_specs.md` vs actual disk state.*
*Use this as the tracking document for implementation.*
