# Changelog

All notable changes to Procedia are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `CHANGELOG.md`, `RELEASING.md`, `README.md`, `THIRD_PARTY_LICENSES.md` (F-39, F-40, F-81)
- `data/categoryColors.js` — unified category-to-color map (F-49)
- `_validatePluginPath` path-traversal defence in `utils.jsx` (F-73)
- `app.project.afterSave` hook + panel periodic auto-save (F-35)
- Silenced-catch logging: `console.warn` at 7 silent catch sites across 6 files (F-11, F-59)
- `tipField.destroy()` — teardown clears interval + resize listener (F-13)
- Walkthrough `show()` — removes prior overlay before rebuild (F-76)
- Selection change multi-listener: `onSelectionChange` returns unsubscribe fn (F-24)
- `tests/integration/dispatcher-parity.test.js` — locks in 89/89 parity (F-55)
- `tests/unit/lifecycle.test.js` — 83 tests for 5×5 hook contract + port/kind/dedicated contracts (Phase 0.10)

### Changed
- Lifecycle consolidation: inline nodeKind dispatch replaced with `lifecycle.buildLifecycleCommand` in `deleteNode.js`, `recreateNode.js`, `state.js`, `propagate.js` (F-06, F-89)
- Schema-cache internals moved to `window.__procedia_internal.scState/scPersist/scDiff` (quick win #29)
- `enumerateAllEffects`/`buildFullEffectCatalog` handlers implemented from stubs (F-21)
- `createLightLayer.jsx` uses `LightType` enum constants instead of hardcoded numbers (F-48)
- Manifest `HostList` AE range tightened from `[16.0,99.9]` → `[24.0,99.9]` (F-83)
- `engine/index.js` JSDoc corrected to match actual exports (F-44)
- Input import: matte skip now surfaces `notificationBar.push` warning instead of silent loss (F-08)

### Fixed
- Preset-drop undo race: alive-transition now inside capture→commit window (F-05)
- Drag-and-drop listener leak: `mousemove`/`mouseup` handlers removed before re-attach (F-12, F-65)
- Keyframe-bake Promise chain: `.catch()` added, inner dispatch chained with `return` (F-17)
- `dispatcher.jsx` `dispatchBatch` outer catch now closes undo group (F-10)
- `_running` reset in import uses `.finally()` instead of `.then()` (F-36)
- `_pendingPathUUIDs` + `_notifiedMissing` cleared on `clearGraph`/`loadGraph` (F-37)
- Import `hostingComps` mutation uses `graphState.updateNode` instead of direct `.push()` (F-08)
- autoShy `dispatchBatch` calls wrapped with undo capture/commit (F-63)
- `cloneNode.js` merge/multimerge exclusion added (F-77)
- Silent catch sites now logged: presetManager, autoShy, propertyPoller, walkthrough, envSnapshot, setExpression.jsx (F-11, F-59)
- Implicit global `lj` → `var lj` in `actions_park.jsx` (quick win #19)
- `actions_property.jsx` else-branch null-check on `layer.property(key)` (quick win #39)
- `setExpression.jsx` catch now returns error result instead of swallowing (F-11)

### Removed
- Dead debug instrumentation from `reorderEffectChain.jsx`, `switchNodes.js` (F-16, F-22, F-23)
- Dead `__anchor__` cleanup block from `reorderEffectChain.jsx` (F-20)
- Dead `isEffectNode` export from `effectNodeFactory.js` (F-19, F-69)
- Dead `_NOOP` constant in `refreshUI.js` (F-46)
- Dead `CATEGORY_NAMES` stub in `categories.js` (F-69)
- Dead `__wt_state.animating` guard from walkthrough nav (F-47)
- Redundant `graph/canvas/renderer/categories.js` — replaced by `data/categoryColors.js` (F-49)
- `engine/wires.js` dead `boundParam` silent-swallow branch (F-16)

## [0.0.4] — 2026-07-26

### Added
- Import Project feature: scan AE project comps/footage/layers, map to Procedia graph (5 panel files + 4 AE handler files)
- Canvas comments: sticky notes with CMT- UUID, 5-file split (`commentState`, `commentDOM`, `commentColorPicker`, `commentEvents`, `commentManager`)
- Auto-layout graph builder split into `buildGraph.js` + `findComponents.js`
- Startup diagnostics: integration checks on panel load
- Introspection fixes for effect schema resolution

### Changed
- Dispatcher action handlers restructured into subdirectories: `actionLayer/` (22 files), `actionKeyframe/` (6 files), `applyActionEffect/` (8 files)
- Comment module: split single `commentManager.js` into 5 files
- Polling property poller + keyframe state round-trip in `writeGraph` payload
- UI refresh centralized into `refreshUI.js` with per-component skip flags
- Walkthrough: 8-step onboarding overlay with `localStorage` persistence

### Fixed
- Preset drop: comp node auto-alive via onDrop dispatch + wire propagation
- Expression data node: `setExpression` dispatcher + data wire propagation to AE
- Effect reorder: `moveTo(1)` replaces unavailable `moveToBeginning`
- Layer stack deduplication for multi-effector paths

## [0.0.3] — 2026-07-16

### Added
- Solid, Camera, Light, and Polygon layer nodes with dedicated AE handlers
- Graph search widget: live filtering by label with gold highlight + Focus button
- Comp List dropdown: bottom-left comp picker with `setFilteredNodes` view filter
- Walkthrough: dimissable multi-step tutorial overlay with element spotlight
- Settings modal restructured into tabbed interface (General / Wires / Auto Layout)
- Preset Manager: save/load/delete presets via `localStorage`, dynamic Presets palette category
- Save Preset modal: UI for naming and saving graph presets
- Engine lifecycle refactor: shared resolveNodeConnections etc. extracted from propagate + aeReconcile

### Fixed
- Star shape: replaced Polystar with computed parametric path vertices for correct geometry updates
- Adjustment layer: uses `addSolid` instead of `addShape` for proper behavior
- Alpha Matte & Luma Matte nodes: `matte_layer` secondary input, Track Matte category, wireValidator enforcement
- Comp-to-comp wiring: `addCompAsLayer` + upstream propagation stops at comp boundary
- Effector switch: reordering via `moveTo(1)` for AE effect chain alignment

## [0.0.2] — 2026-07-09

### Added
- 474 dynamic effect nodes generated from 22 metadata category stubs via `effectNodeFactory`
- Dynamic effect schema cache: introspect AE on first drop, cache to disk, diff on version change
- Node disable/enable toggle with per-kind behavior
- Property/effect polling to sync external AE changes
- Infinite zoom canvas grid + snap-to-grid
- Cycle checker for no-cycle graph enforcement

### Fixed
- Canvas rendering, drag/hit-test, and UI load-order issues
- Track matte `moveBefore` and matchName property lookup
- UUID collision on node recreate
- Error UI feedback for failed dispatches
- Large-command chunking for serialized JSON exceeding 15k chars

## [0.0.1] — 2026-06-01

### Added
- Initial CEP panel scaffold (ExtendScript ES3, CSXS manifest, `evalBridge`)
- Core node types: Comp, Footage, Merge, Multimerge
- Data nodes: Color, Number
- Layer nodes: Text, Null, Shape, Adjustment
- Shape nodes: Rectangle, Ellipse, Star, Squircle, Gear, Wave, Flower
- Blending node (`nodeKind: 'blending'`) with mode enum
- Wire connection/disconnection with type-based `wireValidator`
- Ghost cascade algorithm: effector-first ordering, matte/dormant-wire activation
- Auto-layout engine: Sugiyama layered graph layout
- Canvas rendering: node body, ports, labels, minimap
- Inspector panel: property editing, color picker
- Graph persistence: read/write via Reserved Comp text layers with chunk reassembly
- Polling: alive-node check, external deletion detection, notification bar
- Walkthrough: first 6 steps
- Undo/redo system: two-phase (fast state restore + AE reconcile via dispatchBatch)
- Export/import: save/load `.procedia.json` files
