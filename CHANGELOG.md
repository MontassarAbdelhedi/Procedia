# Changelog

All notable changes to Procedia are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Stripped debug instrumentation from `reorderEffectChain.jsx` and `switchNodes.js` (F-16, F-22, F-23)
- Removed dead `isEffectNode` export from `effectNodeFactory.js` (F-19, F-69)
- Removed `__anchor__` orphan cleanup block from `reorderEffectChain.jsx` (F-20)
- Implemented `enumerateAllEffects` / `buildFullEffectCatalog` handlers in `buildCatalog.jsx` (F-21)
- Removed dead `_NOOP` constant in `refreshUI.js` (F-46)
- Removed dead `CATEGORY_NAMES` stub in `categories.js` (F-69)
- Removed dead `__wt_state.animating` guard from walkthrough nav (F-47)
- Fixed JSDoc drift in `engine/index.js` (F-44)
- Wrapped autoShy dispatchBatch with undoManager capture/commit (F-63)
- Preset-drop undo race fixed: alive-transition now inside capture→commit window (F-05)
- Added `CHANGELOG.md` and `THIRD_PARTY_LICENSES.md` (F-40, F-81)

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
