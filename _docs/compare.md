# Procedia — Implementation Gap Analysis

*Comparing disk state vs `arch_specs.md` (May 2026)*
*Updated: portManager removed, no extendable/spawn ports — all ports visible from drop*

---

## P1 — Missing Files to Create

| # | File | Arch Spec | What It Does | Action |
|---|------|-----------|--------------|--------|
| 1 | `ui/settings.js` | §17a | Persistent key/value store backed by `localStorage`. `get()`, `set()`, `getAll()`. Keys: `minimap`, `wireStyle` | **Create** |

---

## P2 — Existing Files to Verify & Update

| # | File | Arch Spec | What to Verify |
|---|------|-----------|----------------|
| 3 | `jsx/dispatcher/dispatcher.jsx` | §5b | All 30+ registered actions present (especially: `setBlendingMode`, `setLumaMatte`, `setAlphaMatte`, `clearMatte`, `restampLayer`, `introspectEffect`, `readSchemaCache`, `writeSchemaCache`, `getAEVersion`) |
| 4 | `jsx/utils.jsx` | §4 (lookup utils) | `getAEVersion()` exists? All functions return `JSON.stringify({ok,data,error})`? |
| 5 | `jsx/persistence.jsx` | §9 | `readGraph()` / `writeGraph()` with chunking for `__PROCEDIA_NODES__` / `__PROCEDIA_WIRES__`. Only called on AE save, AE quit, panel unload |
| 6 | `jsx/polling.jsx` | §14 | `pollAliveNodes(uuidListJSON)` — single multi-UUID bridge crossing |
| 7 | `graph/engine.js` | §6, §20g | Zero node-type conditionals. Dynamic schema hook on node drop — stores schema on `nodeMap[uuid].dynamicSchema`, all secondary ports visible immediately. `_firePathCreation()` stamps `_pathLayerUUID`. Wire-insertion `_transplantLayerUUID` handling |
| 8 | `graph/cascadeAlgorithm.js` | §7 | `cascadeGhost()`: only `layer` wire deletions trigger cascade. Skips `parent`/`data`. Effectors first, affected last. Never includes CompNode/data/blending/matte. Batched `dispatchBatch()` |
| 9 | `graph/wireValidator.js` | §3c, §12a, §13b | Blending `main_input` ← affected only. Matte three-condition validation (both inputs connected, same hosting comp, output to same comp) |
| 10 | `graph/cycleChecker.js` | §7f | `hasCycle()` — pure graph traversal before confirming wire connection |
| 11 | `graph/schemaCache.js` | §20d | Verify: `init()`, `hasSchema()`, `getSchema()`, `storeSchema()`, `isReady()`. AE version diff. `introspectEffect` temp layer cleanup on both success/failure. Schema populates ports from drop — no spawning |
| 12 | `ui/inspector.js` | §20h | Dynamic rendering for `params: 'dynamic'` nodes. Five param types: color, number, vector2, vector3, boolean. Loading state when schema not yet resolved |
| 13 | `ui/settingsModal.js` | §17b | Depends on `settings.js`. Gear button wiring. Modal open/close. Minimap toggle, wire style select |
| 14 | `graph/canvas/drag.js` | §18, §19 | Wire-insertion: detect drop on active wire, `_transplantLayerUUID` stamp, `restampLayer`. Dormant path: full cascade. Empty canvas wire drop: node picker |
| 15 | `graph/canvas/nodeModel.js` | — | Removed — dead code, not loaded |
| 16 | `graph/canvas/renderer.js` | §16 | Wire style modes: bezier (default), direct, stepped. Reads `settings.get('wireStyle')` per frame |

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

| # | Task | Details |
|---|------|---------|
| 30 | **Integration test** | Follow §12 in arch_specs. Five scenarios: cache miss, cache hit, panel reload, param→AE, version diff |
| 31 | **`data/effectSchemaCache.json` bootstrap** | Verify content is `{ "aeVersion": "", "schemas": {} }` |
| 32 | **`index.html` load order audit** | Verify every `<script>` tag matches actual files. Add missing tags for `settings.js`. Remove `portManager.js` if listed |
| 33 | **Discrepancy: `settings.js`** | Create file — `settingsModal.js` depends on it |
| 34 | **Discrepancy: `nodeModel.js`** | Removed — both files were dead code, not loaded |

---

## Architecture Changes (This Session)

| Change | Detail |
|--------|--------|
| **No extendable ports** | `extendable` field removed from all port declarations. Nodes declare only the ports they need |
| **No port spawning** | `portManager.js` removed. Secondary input ports are resolved from schema cache at drop time and displayed immediately — never "spawned" |
| **All ports visible from drop** | Each node shows all its ports on drop. Effectors: main_input + output (static) + secondary inputs (from dynamic schema). No dynamic slot creation on wire connect |
| **Engine simplified** | Engine no longer calls `portManager.spawnSlot()` / `removeSlot()`. Schema resolution stores `dynamicSchema` on `nodeMap` instance; ports are derived from it |

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
