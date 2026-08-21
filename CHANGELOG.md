# Changelog

All notable changes to Procedia are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Cloner node (`instances/cloner`) — Linear/Radial/Grid modes, `createCloner`/`removeCloner`/`updateCloner` AE action handlers in `actionInstances/`
- "Instances" category (orange `#E67E22`) with Cloner node registered in `loadNodes.js`, `categoryColors.js`, `nodeList/categories.js`
- Shared `blend_map.jsx` ExtendScript module — single BLEND_MAP source for blending handler and import scanner
- `introspect/constants.jsx` — extracted `_INTROSPECT_SKIP_BROWSE` blacklist for reuse
- Version control system (`versioning/`) — repository, branches, snapshots, semantic diff/merge/conflict resolution, graph activation; UI modals (save/restore/compare/new-branch); AE persistence handlers (`vcsReadRepo.jsx`/`vcsWriteRepo.jsx`); CSS stylesheet (`versionControl.css`); unit tests for snapshot, repository, diff, and merge
- In-app update system (`updater/` — `core.js`, `nodeAdapter.js`, `updateService.js`, `helper.ps1`): stable `latest.json` GitHub feed, semver + compatibility gates, 24h auto-check throttle, trusted-host HTTPS download with streamed SHA-256 verification, external PowerShell helper for ZIP inspection (traversal/symlink rejection), staging extraction, package validation, AE-exit-wait install swap with backup/rollback; restart-required flow; persistent state in `%APPDATA%\Uppercut Studio\Procedia\`
- Settings modal **Updates** tab (`ui/settingsModal/updates.js`) — installed/latest version, status line, determinate/indeterminate progress, Check/Install/Retry/release-notes buttons; `settingsModal.open(tabName)` / `openUpdates()` API
- Top-bar update badge — glowing dot when update available/ready/restart-required; click opens Settings → Updates
- Release tooling: `scripts/package-release.js` (dist ZIP + SHA-256 checksum + `latest.json`), `scripts/sync-version.js` (`npm run version:sync` — package.json as single version authority syncing manifest/installer/reporting fallbacks), `npm run release` pipeline, Inno Setup installer (`scripts/installer.iss`), `_docs/update-system.md`, RELEASING.md rewritten
- Updater tests: `tests/updater/{core,service,ui}.test.js` + `tests/integration/updater-packaging.test.js`; deleteNode bypass tests (`tests/deleteNode.test.js`, `tests/unit/deleteNode.test.js`) and wire-insertion restamp tests (`tests/unit/propagate.test.js`)

### Changed
- Large-file refactoring: 12 panel-side files split into subdirectory modules — `builder.js` → `builder/{params,ports}.js`, `helpers.js` → `helpers/{wireState,display,portUtils}.js`, `nodeToolbar.js` → `nodeToolbar/{colorPicker,switchMode}.js`, `viewport.js` → `viewport/grid.js`, `cascade/utils.js` → `cascade/utils/{graph,pathLayer}.js`, `commentDOM.js` → `commentElement.js`, `deleteNode.js` → `deleteNode/wireUtils.js`, `switchNodes.js` → `switchNodes/{chain,reorder}.js`
- Large-file refactoring: 6 ExtendScript files split — `dispatcher.jsx` → `_handlers.jsx` + `actions_undo.jsx`, `actions_comp.jsx` → `actionComp/{reservedComp,compLifecycle,compProject}.jsx`, `actions_park.jsx` → `actionPark/{parkLayer,unparkLayer,deleteParkedLayer,pollAliveNodes,pollExternalDeletions}.jsx`, `actions_property.jsx` → `actions_{parent,order,blending}.jsx`, `introspect.jsx` → `introspect/{constants,walk}.jsx`, `scanCompLayers.jsx` → `scanCompLayers/{layerType,readProps,scanEffects,maps,buildEntry}.jsx`
- `evalBridge.js` JSX preamble + `data/scripts.json` load manifest updated with 14 new entries for split files + Cloner handlers
- Propagation/wire-connect timing: effector and blending `onAlive` writes now deferred with `setTimeout(fn, 0)` to prevent racing with upstream layer creation
- Variable naming cleanup: `_writeCount`→`_writeLockCount`, private-underscore removal in `index.js` (`_extPath`, `_startupMissing`, `__reportTx`), loop variable naming in 10 files
- Schema cache reset for AE 2026: `aeVersion` bumped to `26.3x86`, schemas cleared
- Undo group handlers relocated from inline `dispatcher.jsx` to dedicated `actions_undo.jsx`
- `_docs/CLAUDE.md` action table + `_docs/forMont.md` updated
- Test dispatcher parity count: 89 → 92 (3 new Cloner actions added to whitelist + test stubs)
- `data/scripts.json`: 161 → 175 → 202 entries
- Large-file refactoring (panel side): 9 additional files split — inspector/{viewModel,render,colorPicker,events,layerStack}.js → 23 sub-files (viewModel/3, render/4, colorPicker/3, events/8, layerStack/5); compList.js→compList/{dom,render,logic,index}.js; nodeList/dragdrop.js→nodeList/dragdrop/{dragdrop,mergeWarning,drop}.js; sidebarToggle.js→sidebarToggle/{handles,events,index}.js; topBar/init.js split into dom.js+events.js; reporter.js→reporter/{core,form,index}.js
- Large-file refactoring (ExtendScript): persistence.jsx→persistence/{chunkUtils,readGraph,writeGraph,afterSave}.jsx; clonerUpdate.jsx extracted into cloner/{findDataLayer,rebuildClones,applyDelta}.jsx
- Polling refactoring: _handleMissingNode extracted from poller.js→missingNodeHandler.js; propertyPoller.js split into pollHelpers.js+pollAffected.js+pollEffectors.js
- NodeList refactoring: effectsSubcategories.js+categoryBuilder.js extracted from categories.js
- `evalBridge.js` JSX preamble updated with new persistence/ and cloner/ sub-files
- `index.html` reporter.js split into 3 sub-files (core/form/index)
- Cloner JSX files reorganized under `actionInstances/cloner/` subdirectory (6 files)
- Version control large-file refactoring: `versionControlService.js` → `versionControl{Activation,DiffMerge,Helpers,Init,Mutations,Queries,Resolve,State}.js`; `repositoryStore.js` → `repository/{artifacts,branchCRUD,branchState,invariants,revisions,snapshots,storeCore}.js`; `activationCoordinator.js` → `activation/{actions,commands,state,verify}.js`; `semanticDiff.js` → `diff/{buildSummary,diffCollection,diffObjects,semanticDiffUtils}.js`; `conflictFactory.js` → `conflictFactory/{propertyConflicts,shared,structuralConflicts,topologyConflicts}.js`; `conflictResolver.js` → `conflictResolver/{bulkOps,singleConflict}.js`; `threeWayMerge.js` → `threeWayMerge/{collectionMerge,fieldMerge,helpers,nodeMerge,wireMerge}.js`; + `merge/{duplicateWireDetector,layerCycleDetector}.js`
- `data/scripts.json`: 202 → 238 → 249 entries
- Test dispatcher parity count + jsxSetup stubs updated for new versioning entries
- Large-file refactoring (panel side): `bridge/evalBridge.js` → extracted `allowedActions.js` + `jsxFiles.js` (2 new files); `graph/engine/helpers.js` → `helpers/{buildInitialProps,refreshUI,pathLayer,dynamicSchema,expressionDispatch,dataPropagation,deepCopyNode,index}.js` (8 new files); `flush/dirtyFlusher.js` → `flush/{flushNode,pathLayerUtil}.js` + barrel kept (2 new files)
- Manifest compatibility widened to AE 2020+: CSXS manifest Version 11.0 → 7.0, HostList `[24.0,99.9]` → `[17.0,99.9]`; `--enable-nodejs` CEF parameter added (updater requirement)
- Per-user writable data migration off the replaceable extension folder: schema cache → `%APPDATA%/Uppercut Studio/Procedia/cache/` (legacy copy-on-read, atomic tmp+rename write), graph export diagnostics → `diagnostics/` subfolder, cmd-chunk temp files → OS temp `/Procedia`, `writeTextFile` under per-user data root (`_procediaDataFolder` in `jsx/utils.jsx`)
- Startup log relocated to `%APPDATA%\Uppercut Studio\Procedia\logs\startup.log`
- Build secrets config moved `.debug/build.config.json` → `.secrets/build.config.json` (`.debug` reserved for CEP remote debugging manifest); build excludes more root entries from bundle
- `envSnapshot` version read via relative manifest URL (survives updater swap) + attribute-form regex; version fallback literals injected by `version:sync`
- README updated (AE 2020+, `.secrets` note)

### Fixed
- Deleting an alive effector hosted in the active comp no longer cascade-ghosts the whole path — input wire is re-routed directly to the downstream target (`_bypassActiveCompEffector` in `graph/engine/nodes/deleteNode.js`)
- Wire-insertion restamp race in `propagate.js`: `restampLayer` now awaited before firing the transplant `onAlive` command; effector/blending transplant commands receive `layerNodeUUID = pathLayerUUID`; failure marks node state `error`
- Stale memoized `findPathLayerUUID` cache: invalidated on all `graphState` mutation methods, not just `rebuildTempGraph` (CRUD modules call internal rebuilds directly)
- Startup chain errors (Reserved Comp / graph restore / version control init) now surface instead of silently continuing
- XSS hardening: node labels/types/category names escaped in `nodeList/render.js` + `nodePicker/render.js`; drag ghost built via DOM APIs instead of `innerHTML`
- Preset names >80 chars or containing `<>"'`` rejected on save and skipped on load
- Race condition: effector/blending `onAlive` racing with upstream layer creation during propagation — deferred via `setTimeout(fn, 0)` in `propagate.js` and `wires.js`
- Variable naming inconsistencies: private-underscore misuse in `index.js`, `poller.js`, `propagate.js`, `wires.js`, `deleteNode.js`, `switchNodes.js`, `cascadeGhost/*.js`, `aeReconcile.js`, `graphOps.js`, `helpers.js`
- `offGraphChange` callback parameter renamed from `cb` to `callback` in `graphState/index.js`

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
