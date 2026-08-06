# Progress Log

## Thu 2026-08-06

[x] Add Cloner node (instances/cloner) — Linear/Radial/Grid modes; new "Instances" category (orange); createCloner/removeCloner/updateCloner AE action handlers in actionInstances/ subdirectory
[x] Extract shared blend_map.jsx ExtendScript module — single BLEND_MAP source for blending handler + import scanner
[x] Extract introspect/constants.jsx — _INTROSPECT_SKIP_BROWSE blacklist for reuse
[x] Large-file refactoring (panel side): 12 files split into subdirectory modules — builder.js→builder/{params,ports}.js, helpers.js→helpers/{wireState,display,portUtils}.js, nodeToolbar.js→nodeToolbar/{colorPicker,switchMode}.js, viewport.js→viewport/grid.js, cascade/utils.js→cascade/utils/{graph,pathLayer}.js, commentDOM.js→commentElement.js, deleteNode.js→deleteNode/wireUtils.js, switchNodes.js→switchNodes/{chain,reorder}.js
[x] Large-file refactoring (ExtendScript): 6 files split — dispatcher.jsx→_handlers.jsx+actions_undo.jsx, actions_comp.jsx→actionComp/ (3 files), actions_park.jsx→actionPark/ (5 files), actions_property.jsx→actions_{parent,order,blending}.jsx, introspect.jsx→introspect/{constants,walk}.jsx, scanCompLayers.jsx→scanCompLayers/ (5 files)
[x] evalBridge.js JSX preamble updated with new handler files + data/scripts.json manifest updated (161→175 entries)
[x] Fix race condition: effector/blending onAlive deferred with setTimeout(fn, 0) in propagate.js + wires.js to prevent racing with upstream layer creation
[x] Variable naming cleanup: _writeCount→_writeLockCount, private-underscore removal in index.js, loop variable naming in 10 files
[x] Schema cache reset for AE 2026: aeVersion→26.3x86, schemas cleared
[x] Undo group handlers extracted from inline dispatcher.jsx to dedicated actions_undo.jsx
[x] _docs/CLAUDE.md action table updated, _docs/forMont.md updated with save/open/merge graph TODOs
[x] Test dispatcher parity count: 89→92 (createCloner/removeCloner/updateCloner actions + jsxSetup stubs)

## Sun 2026-08-02

[x] CHANGELOG.md + RELEASING.md + README.md + THIRD_PARTY_LICENSES.md added (F-39, F-40, F-81)
[x] data/categoryColors.js unified color map — deletes graph/canvas/renderer/categories.js (F-49)
[x] _validatePluginPath path-traversal defence (F-73)
[x] afterSave hook + 5s periodic auto-save for Ctrl+S persistence (F-35)
[x] 7 silent catch sites now log console.warn / result.error (F-11, F-59): presetManager, autoShy x2, propertyPoller x2, walkthrough, envSnapshot, setExpression.jsx
[x] tipField.js destroy() — clears setInterval + resize listener (F-13)
[x] Walkthrough show() removes prior overlay DOM before rebuild (F-76)
[x] Selection change multi-listener: _onSelectionChangeCbs[] + unsubscribe returns (F-24)
[x] tests/integration/dispatcher-parity.test.js locks 89/89 parity (F-55)
[x] tests/unit/lifecycle.test.js — 83 tests for 5×5 hook contract + port/kind/dedicated (Phase 0.10)
[x] Lifecycle consolidation: deleteNode/recreateNode/state/propagate use buildLifecycleCommand — inline nodeKind dispatch removed (F-06, F-89)
[x] Schema-cache internals → window.__procedia_internal.scState/scPersist/scDiff (qw #29)
[x] buildCatalog.jsx stub → real (F-21): enumerateAllEffects/builFullEffectCatalog walk app.effects
[x] createLightLayer.jsx uses LightType.POINT/SPOT/PARALLEL/AMBIENT enum constants (F-48)
[x] Manifest HostList tightened [16.0,99.9] → [24.0,99.9] (F-83)
[x] engine/index.js JSDoc exports corrected — _firePathCreation/_applyDynamicSchema removed, +4 added (F-44)
[x] Import matte skip surfaces notificationBar.push warning instead of silent data loss (F-08)
[x] Preset-drop undo race fixed (F-05)
[x] Dragdrop document listener leak fixed — removeEventListener before re-attach (F-12, F-65)
[x] Keyframe-bake Promise chain: .catch() + return for inner dispatch (F-17)
[x] dispatchBatch outer catch closes undo group via app.endUndoGroup() (F-10)
[x] Import _running reset uses .finally() not .then() (F-36)
[x] _pendingPathUUIDs + _notifiedMissing cleared on clearGraph/loadGraph (F-37)
[x] Import hostingComps.push → graphState.updateNode (F-08)
[x] autoShy dispatchBatch wrapped in undo capture/commit (F-63)
[x] cloneNode.js merge/multimerge exclusion parity with duplicateNode.js (F-77)
[x] JSX fix: var lj implicit global (qw #19), setExpression catch → result.error, actions_property else-branch null guard (qw #39)
[x] JSX fix: _docs/CLAUDE.md arch_specs.md reference corrected (F-72)
[x] Dead code stripped: reorderEffectChain.jsx debug + __anchor__ block; switchNodes.js console.log; effectNodeFactory isEffectNode; refreshUI _NOOP; categories CATEGORY_NAMES; walkthrough animating guard; renderer/categories.js; engine/wires boundParam dead branch
[x] Remaining stale docs references to engine._applyDynamicSchema → hlp.applyDynamicSchema (flow.md)

## Sun 2026-07-26

[x] Rebuild import project feature: new 5-file panel side (`graph/import/scanner.js`, `mapper.js`, `graphBuilder/helpers.js`, `graphBuilder/build.js`, `index.js` — flattened `mapNodes/`+`mapWires`+`stampUUIDs`+`builder` into a 3-stage flow: scan → map → build) and 4-file AE side (`actionImport/scanComps.jsx`, `scanFootage.jsx`, `scanCompLayers.jsx`, `stampUUIDs.jsx`, barrel `actions_import.jsx`). Mapper assigns PROC- node UUIDs and WIRE- terminal-wire UUIDs and stamps layers with the WIRE UUID (consistent with SKILL 8). Builder clears graph + undoManager.reset(); per-comp per-layer node creation; wires layer→comp terminal wire with the stamped wire id; effector dynamicSchema resolution; effector chain re-wiring; parent wires for layer.parentIndex; extra BlendingNode auto-inserted for non-NORMAL blending modes; matte relationships deliberately NOT reconstructed. Confirmation flow with optional saveAsDialog "Save a Copy First" option.
[x] Split `graph/comment/commentManager.js` into 5 files: `commentState.js` (state + COLORS palette; internal namespace `__procedia_internal.cm`), `commentDOM.js` (CRUD + render), `commentColorPicker.js` (popover UI), `commentEvents.js` (drag/mouse/text handlers — uses `viewport.getTransform().zoom` to scale deltas), `commentManager.js` (public API aggregator that deletes the internal namespace).
[x] Split `graph/autoLayout/graphBuilder.js` into `graphBuilder/buildGraph.js` + `graphBuilder/findComponents.js`.
[x] Dispatcher action-handler restructuring: split single `actions_layer.jsx` into a barrel + `actionLayer/` subdirectory (22 handler files — 14 create*Layer, addCompAsLayer, deletePathLayer, renameNode, setLayerEnabled, setLayerShy, setCompHideShyLayers, restampLayer); split `actions_keyframe.jsx` barrel → `actionKeyframe/` subdir (6 files: shared, add, remove, times, currentTime, data); split `applyActionEffect` handlers out of `actionEffect/apply.jsx` into `applyActionEffect/` subdir (8 files: findPropByMatchName, applyDynamicEffect, removeEffect, setEffectProperty, setEffectEnabled, reorderEffect, reorderEffectChain, renameEffect). Each subdir handler is `$.evalFile`d by its barrel on preamble load.
[x] Add `actions_propertyGet.jsx` (`batchGetLayerProperties`), `actions_masks.jsx` (`getMasksForLayer`), `actions_compList.jsx` (`listComps`, `focusCompByName`), `actions_cmdChunk.jsx` (`writeCmdChunk`, `executeCmdFile`, `cleanupCmdFile` — internal: large-command chunking), `actions_import.jsx` barrel.
[x] Add `polling/propertyPoller.js` with `poll()` for affected nodes + `pollEffects()` for effector nodes — dispatches `batchGetLayerProperties` / `batchGetEffectProperties` and writes AE-side changes back into `nodeMap` (skip if dirty or pending flush to avoid racing the dirty flusher). Wired into `polling/poller.js:_tick()` after the aliveness check. Poller cadence tightened to ACTIVE_INTERVAL=500ms / IDLE_INTERVAL=2000ms.
[x] Add `graph/keyframeState.js` (per-node per-param keyframe tracking + playhead time; TIME_TOLERANCE=0.01). On startup `index.js:_syncKeyframeState` dispatches `batchGetKeyframeTimes` for every animatable param + alive node; on `beforeunload` the full keyframe snapshot is appended to the `writeGraph` payload (round-trips keyframes across reloads).
[x] Add `graph/autoShy.js`: `handleSelectionChange(sel)` — gated by `settings.get('autoShy')`; dispatches `setLayerShy` batch + `setCompHideShyLayers` via `evalBridge.dispatchBatch()`. Wired into `graphState.onSelectionChange` chain in `index.js`. Auto-Shy toggle exposed in Settings → General.
[x] Restructure UI weak-link refresh into `ui/refreshUI.js` (single helper exposes `window.__procedia_internal.refreshUI(opts)` with per-component skip flags) + `ui/uiUpdateScheduler.js` (RAF-batched scheduler with `markDirty(component)`). Moved `uiUpdateScheduler.js` from project root to `ui/`.
[x] Add `ui/presetModal/` (3 files: dom, events, index) — Save Preset modal opened by the node-toolbar Save Preset button (`graph/canvas/renderer/nodeToolbar.js:_ensureSavePresetBtn`); presetManager persists to `localStorage['procedia_presets']`, registers presets as dynamic `nodeKind: 'data'` nodes under the `Presets` palette category; drop wraps in `undoManager.capture()` → `_activatePresetNodes` + `_fireTerminalLayerWires` → `commit('Drop Preset ' + name)`.
[x] Add `ui/walkthrough/` (6 files: steps, dom, render, nav, events, index) — 8-step onboarding; persisted via `localStorage['procedia_walkthrough_done']`; `walkthrough.init()` runs last on the `index.js` startup chain; `walkthrough.show()` toggled from Settings → General → Replay Tutorial (`settingsModal/events.js`).
[x] Add `ui/compList.js` (bottom-left comp dropdown + setFilteredNodes view filter), `ui/graphSearch.js` (top-left search icon/field; gold border/glow highlight + Focus button pan/select), `ui/tipField.js` (rotating tip strip; 7 tips, 20s cycle).
[x] Add `ui/loadingOverlay.js` (ref-counted overlay + spinner; injects own CSS).
[x] Add `graph/undoManager/` (4 files: state, aeReconcile, restore, index) — two-phase undo: fast state restore via `graphState._replaceState` then slow AE reconcile via `lifecycle.buildLifecycleCommand` wrapped in `beginUndoGroup`/`endUndoGroup`. MAX_DEPTH=50. Top-bar undo/redo buttons wired; UI not auto-snapshot, mutation sites must call `capture()`/`commit()`.
[x] Add `graph/engine/lifecycle.js` (`__procedia_internal.lifecycle`): shared `resolveNodeConnections`, `forEachHostingComp`, `buildLifecycleCommand`, `injectLayerUUID` — extracted from duplicated logic in `propagate.js` + `undoManager/aeReconcile.js`.
[x] Add `graph/engine/registry.js` (`__procedia_internal.registry`): central DI table for engine sub-modules (register/get/has). Replaces ad-hoc `__e_*` globals.
[x] Add `graph/engine/nodes/switchNodes.js` + `engine.switchEffectors(id1, id2)`: swaps two effector nodes' x/y + re-wires their input/output + dispatches `reorderEffectChain` to re-align AE effect order. Wired to the node-toolbar Switch action when two sibling effectors share the same affected upstream.
[x] Vendor Sentry + html2canvas into `lib/` (SRI-pinned). Add `reporting/envSnapshot.js` + `reporting/reporter.js` for error capture and the top-bar Bug Report form. Index.html's body now only loads CSInterface + Sentry + html2canvas + reporting/ + ui/scriptLoader.js.
[x] Manifest reset: `HostList` AE range widened to `[16.0, 99.9]` and `CSXS` `RequiredRuntime` set to 9.0 to broaden installer compatibility (panel-tested target remains AE 2025+).
[x] Documentation sweep: AGENTS.md, `_docs/CLAUDE.md` (SKILL 2/8/9/10/12 + File Directory + Absolute Rules substantially rewritten), `_docs/flow.md` (polling intervals corrected, sc2 shutdown switched to `fireAndForget` + keyframe round-trip, scenarios 66-78 added for undo/import/comment/preset/compList/graphSearch/walkthrough), `_docs/node-definitions.md` (matte `nodeKind`/path fixes, Node Inventory table of 25 non-effect nodes added, expression node + new layer/shape nodes covered, effect-node on-disk Absence disclosed), `_docs/arch_specs.md` (§14 polling intervals fixed, §5b dispatcher table extended to ~89 grouped actions, new §23 "Auxiliary Subsystems" added), `_docs/AUDIT_REPORT.md` summary refreshed, `_docs/prez.md` counts+features+CStack+CEP version refreshed, `_docs/guide.md` (Canvas Comments + Presets user-facing sections added), `_docs/forMont.md` Save Preset marked done, `_docs/Track/feature.md` (action counts/whitelist/stylesheet counts polished; portrait of `Effect Nodes` corrected to 22 metadata categories).

## Tue 2026-07-21

[x] Remove import project feature entirely for clean rebuild: deleted graph/import/ (7 files), jsx/dispatcher/actionImport/ (3 files), tests/import.test.js; cleaned registrations in scripts.json, evalBridge.js (whitelist + preamble), dispatcher.jsx, index.js (click handler), topBar/init.js (button HTML), keyboard.js (Ctrl+I shortcut), jsxSetup.js (stub)
[x] Fix missing buildCatalog.jsx: created _handleEnumerateAllEffects and _handleBuildFullEffectCatalog stubs so evalBridge preamble loads successfully
[x] Fix 13 missing handler stubs in tests/jsxSetup.js (createCameraLayer, createLightLayer, createSolidLayer, createPolygonLayer, setExpression, setLayerShy, setCompHideShyLayers, enumerateAllEffects, buildFullEffectCatalog, writeTextFile, getProjectIdentifier, beginUndoGroup, endUndoGroup)

## Sun 2026-07-19

[x] Fix preset drop: comp node auto-alive via onDrop dispatch + wire propagation in presetManager.dropPreset(); _activatePresetNodes dispatches onDrop for dedicated nodes (CompNode), sets data/blending/matte alive immediately, _fireTerminalLayerWires propagates upstream through layer wires after onDrop success

## Thu 2026-07-16

[x] Add Expression data node (data/expression): string expression wired to effect/layer properties via data wires; setExpression dispatcher handler that finds property by match name or shorthand accessor; propagateDataValue intercepts expression key and dispatches to AE instead of in-memory prop update
[x] Add canvas comments: sticky notes on graph canvas with CMT- UUID, double-click empty canvas creates comment, Delete key removes selected comment, selection/deselect integration with mouse handlers, cleared on graph reset
[x] Add Save Preset feature: presetManager (save/load/delete/drop presets via localStorage), preset save button above multi-selection, presets appear as dynamic node types in Presets category with delete button; nodeRegistry.unregister added for cleanup; nodeList refresh() for dynamic category rebuild
[x] Fix effect reorder: replace moveToBeginning/moveToEnd with moveTo(1)/moveTo(numProperties) in reorderEffect.jsx and applyDynamicEffect.jsx for reliable AE positioning
[x] Fix engine: prevent wire insertion on data wires; fix effector propagate fallback to pathLayerUUID; add per-comp terminal wire resolution in deleteNode (resolveLayerUUIDForComp) for correct multi-comp layer parking; cleanup comments on graph reset
[x] Fix layer stack deduplication: resolve affected nodes upstream of terminal wires and deduplicate so multiple effectors on same layer don't create duplicate entries
[x] Fix Merge warning: per-project localStorage key via new getProjectIdentifier AE action (fullPath or unsaved_name); refactored into _maybeWarnMerge helper
[x] Add getProjectIdentifier dispatcher action: returns fullPath if saved or "unsaved_name" for unsaved projects

## Mon 2026-07-13

[x] Add canvas comment feature: double-click empty canvas creates a sticky-note comment with textarea for editing, color swatches via floating picker (palette button in header), delete button, collapse/expand, drag from header. No AE presence — pure canvas annotation. Comment UUID generator (`CMT-` prefix). Cleared on graph reset.

## Sun 2026-07-12

[x] Create Solid layer node (layers/solid): color, width, height params; createSolidLayer AE action handler using addSolid(); strip alpha from RGBA array; store layer.comment = params.layerUUID (terminal wire UUID, not nodeUUID)
[x] Create Camera layer node (layers/camera): zoom, depthOfField, focusDistance, aperture, blurLevel params; createCameraLayer AE action handler; camera property support in setLayerProperty; CameraLayer 3D position in batch get
[x] Create Light layer node (layers/light): light type enum (point/spot/parallel/ambient), intensity, color, cone angle/feather, shadow params; createLightLayer AE action handler
[x] Create Polygon shape node (shapes/polygon): N-sided regular polygon with computed parametric path vertices; createPolygonLayer AE action handler; onPropertyChange recreates shape for geometry changes
[x] Refactor Star node: replace Polystar with computed parametric path vertices; fix onPropertyChange to recreate shape for geometry (points/radii/fill/stroke) and use setLayerProperty for transform only
[x] Add graph search widget: search icon button at top-left of canvas (same 12px margin as complist), expands to search field on click, filters nodes by label with live highlighting (gold border/glow), shows match count ("N found"), focus button centers first result and selects it. Clicking outside clears search and reverts to icon. Highlights persist across re-renders via `window.__graphSearchMatches`.
[x] Fix duplicate comp node not creating AE CompItem: `duplicateSelectedNodes` dispatches `def.onDrop()` lifecycle command after adding ghost copy, matching dropNode.js async dispatch pattern
[x] Fix Adjustment layer: use addSolid instead of addShape for proper adjustment layer behavior
[x] Fix Squircle default roundness to 99, rename Ellipse effect label to "Ellipse Effect"
[x] Fix parent wire handling: hide insert button on parent wires, disconnect existing parent wire before reparenting, allow multiple parent wires to occupy same port
[x] Fix effector re-trigger on wire connect: re-dispatch effector onAlive to move effect to bottom of layer stack
[x] Fix propagate: lookup upstream UUID from wireMap for effector/blending/merge nodes; allow effector nodes through command execution gate
[x] Add camera layer import support: map AE camera layer type to layers/camera node type in import builder
[x] Optimistic layer reorder for up/down/top/bottom buttons and drag-and-drop: recalculate _layerOrder before AE dispatch
[x] Fix newly added wires without _layerOrder: auto-assign top position in layer stack

## Sat 2026-07-11

[x] Fix Alpha Matte & Luma Matte nodes: add matte_layer secondary input, change nodeKind to 'matte', move to new Track Matte top-level category, fix secondaryInput port rendering, fix wire validator to allow partial connections, fix wire insertion and forward wiring port resolution
[x] Add auto-shy feature: when enabled, selecting an affected node automatically shies all other affected layers in the same comp and enables the Hide Shy Layers toggle; on deselect, unshies all and disables the toggle. Configurable via Settings -> General -> Auto Shy.
[x] Add Comp List and Report a Bug steps to walkthrough (now 8 steps)
[x] Restructure settings modal into three tabs: General (minimap, port labels, reporting, tutorial replay), Wires (wire style, animated dash), Auto Layout (snap, direction, spacing)

## Wed 2026-07-08

[x] Fix comp node deletion: ghost upstream with correct path UUID, remove downstream pre-comp layers, guard missing onGhost

## Mon 2026-07-06

[x] Add recordable stacked layers UI component in comp inspector

## Wed 2026-07-01

[x] Split actions_keyframe.jsx into actionKeyframe/ subdirectory

## Sun 2026-06-28

[x] Add property/effect polling to sync external AE changes + node body value formatting
[x] Fix node param types to match AE: add enum dropdown, conditional enable/disable, dynamic mask lookup
[x] Fix effector switch reordering using moveTo(1) (AE lacks moveToBeginning/moveAfter)

## Fri 2026-06-26

[x] Infinite zoom grid + snap-to-grid

## Sat 2026-06-20

[x] Various fixes: load order, canvas rendering, drag/hit-test, duck typing node states, auto-layout, import module, inspector UX
[x] Implement Merge & Multimerge nodes (utility/merge, utility/multimerge) on mergeAndMultimerge branch

## Tue 2026-06-16

[x] Split large files into subdirectories + remove console.log
[x] UI restructure, comp filter, auto-wire chain replacement, visibility fixes
[x] Add node disable/enable toggle with per-kind behavior

## Mon 2026-06-15

[x] Node menu: category accent colors, scroll fix, color scheme updates

## Sat 2026-06-13

[x] Fix track matte moveBefore, matchName property lookup, error UI feedback, UUID collision on recreate, empty chunk crash, redundant dragdrop branch
[x] Audit documentation against disk state + add 474 AE effect node files

## Fri 2026-06-12

[x] Fix comp-to-comp wiring: addCompAsLayer + stop upstream propagation at comp boundary

## Sun 2026-06-07

[x] Implement node toolbar actions: clone, duplicate, color, collapse, delete + clone mirroring (prop sync + downstream propagation)
[x] Add Footage node under Core with browse/import functionality

## Tue 2026-06-02

[x] Split poller.js into polling/missingNodes.js, polling/notifications.js, polling/externalDeletions.js
[x] Restructure graph modules into subdirectories

## Mon 2026-06-01

[x] Implement inline title editing, wire selection, external deletion detection, notification bar
[x] Fix auto layout wire offset

## Sun 2026-05-31

[x] Refactor: restructure modules into subdirectories + auto layout feature

## Sat 2026-05-30

[x] Initial commit - Procedia CEP panel foundation
[x] UI overhaul: top bar reorganized, bottom bar simplified, minimap improvements, node drag ghost
[x] Add panel-integrated test runner (Tests button in top bar), wire into index.html
[x] Rewrite integration test suite with real introspection (schemaCache, graphState, evalBridge, DOM)
[x] Implement error state recovery — recreateNode in engine, wire inspector Re-create button
[x] Implement resetAll (engine) + layer order up/down (dispatcher + inspector) + fix layer actions gate
[x] Fix deleteNode: cascade upstream layer wires before removing CompNode
[x] Fix cascade: inject layerUUID (terminal wire UUID) into affected node ghost commands so parkLayer finds AE layer
[x] Fix findNodesByType — nodeMap is object (not array), use Object.keys