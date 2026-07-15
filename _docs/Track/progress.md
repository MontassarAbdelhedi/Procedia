# Progress Log

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
