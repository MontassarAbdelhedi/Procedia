# Progress Log

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
