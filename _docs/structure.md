# Procedia — File Structure

*CEP · After Effects 2025+ · Windows · ExtendScript ES3*
*Auto-generated from actual disk state — June 2026*

---

## Load Order (index.html)

Scripts load in this exact top-to-bottom sequence. No bundler. No ES modules.

```
<!-- 1. CEP interface -->
 1. lib/CSInterface.js

<!-- 2. Infrastructure — no dependencies -->
 2. data/uuidGenerator.js
 3. bridge/evalBridge.js
 4. graph/graphState/state.js
 5. graph/graphState/tempGraph.js
 6. graph/graphState/nodes.js
 7. graph/graphState/wires.js
 8. graph/graphState/props.js
 9. graph/graphState/selection.js
10. graph/graphState/graphOps.js
11. graph/graphState/index.js
12. graph/nodeRegistry.js
13. graph/graphExporter.js
14. ui/settings.js

<!-- 3. Node definitions — depend on nodeRegistry; loaded via dynamic script loader -->
15. graph/nodes/loadNodes.js

<!-- 4. Schema cache -->
16. graph/schemaCache/state.js
17. graph/schemaCache/persistence.js
18. graph/schemaCache/diff.js
19. graph/schemaCache/index.js

<!-- 5. Graph engine -->
20. graph/cycleChecker.js
21. graph/wireValidator/portUtils.js
22. graph/wireValidator/matteValidator.js
23. graph/wireValidator/canConnect.js
24. graph/wireValidator/filterPickerList.js
25. graph/wireValidator/index.js
26. graph/cascade/utils.js
27. graph/cascade/cascadeGhost/collect.js
28. graph/cascade/cascadeGhost/commands.js
29. graph/cascade/cascadeGhost/update.js
30. graph/cascade/cascadeGhost/cleanup.js
31. graph/cascade/cascadeGhost/ghost.js
32. graph/cascade/index.js
33. flush/dirtyFlusher.js
34. graph/engine/helpers.js
35. graph/engine/propagate.js
36. graph/engine/wires.js
37. graph/engine/nodes/dropNode.js
38. graph/engine/nodes/deleteNode.js
39. graph/engine/nodes/duplicateNode.js
40. graph/engine/nodes/lockNode.js
41. graph/engine/nodes/cloneNode.js
42. graph/engine/nodes/recreateNode.js
43. graph/engine/nodes/index.js
44. graph/engine/state.js
45. graph/engine/index.js

<!-- 6. Canvas — depends on engine -->
46. graph/canvas/viewport.js
47. graph/canvas/renderer/categories.js
48. graph/canvas/renderer/helpers.js
49. graph/canvas/renderer/builder.js
50. graph/canvas/renderer/index.js
51. graph/canvas/renderer/nodeToolbar.js
52. graph/canvas/input/state.js
53. graph/canvas/input/utils.js
54. graph/canvas/input/rubberband.js
55. graph/canvas/input/handlers/titleEdit/helpers.js
56. graph/canvas/input/handlers/titleEdit/exit.js
57. graph/canvas/input/handlers/titleEdit/commit.js
58. graph/canvas/input/handlers/titleEdit/cancel.js
59. graph/canvas/input/handlers/titleEdit/dblclick.js
60. graph/canvas/input/handlers/mouse/mousedown.js
61. graph/canvas/input/handlers/mouse/mousemove.js
62. graph/canvas/input/handlers/mouse/mouseup.js
63. graph/canvas/input/handlers/mouse/click.js
64. graph/canvas/input/handlers/keyboard.js
65. graph/canvas/input/handlers/wheel.js
66. graph/canvas/input/handlers/index.js
67. graph/canvas/input/index.js
68. graph/canvas/minimap/constants.js
69. graph/canvas/minimap/state.js
70. graph/canvas/minimap/utils.js
71. graph/canvas/minimap/renderer.js
72. graph/canvas/minimap/interaction.js
73. graph/canvas/minimap/index.js
74. graph/canvas/drag/helpers.js
75. graph/canvas/drag/hitTest.js
76. graph/canvas/drag/insert.js
77. graph/canvas/drag/preview.js
78. graph/wire/wireRenderer/helpers.js
79. graph/wire/wireRenderer/draw.js
80. graph/wire/wireRenderer/render.js
81. graph/wire/wire.js

<!-- 7. Auto layout -->
82. graph/autoLayout/constants.js
83. graph/autoLayout/estimateHeight.js
84. graph/autoLayout/graphBuilder.js
85. graph/autoLayout/layerAssignment.js
86. graph/autoLayout/crossingReduction.js
87. graph/autoLayout/positioning.js
88. graph/autoLayout/index.js

<!-- 7b. Import module -->
89. graph/import/mapNodes/helpers.js
90. graph/import/mapNodes/buildItems.js
91. graph/import/mapNodes/buildEffects.js
92. graph/import/mapWires.js
93. graph/import/stampUUIDs.js
94. graph/import/builder.js
95. graph/import/index.js

<!-- 8. UI — depends on graphState, nodeRegistry, engine -->
96. ui/nodeList/categories.js
97. ui/nodeList/render.js
98. ui/nodeList/search.js
99. ui/nodeList/dragdrop.js
100. ui/nodeList/index.js
101. ui/nodePicker/compatibility.js
102. ui/nodePicker/render.js
103. ui/nodePicker/filter.js
104. ui/nodePicker/events.js
105. ui/nodePicker/index.js
106. ui/inspector/viewModel.js
107. ui/inspector/render.js
108. ui/inspector/colorPicker.js
109. ui/inspector/events.js
110. ui/inspector/index.js
111. ui/settingsModal.js

<!-- 9. Infrastructure services -->
112. polling/missingNodes.js
113. polling/notifications.js
114. polling/externalDeletions.js
115. polling/poller.js
116. notifications/notificationBar.js

<!-- 10. UI chrome — no graph dependencies -->
117. ui/topBar.js
118. ui/statusBar.js
119. ui/sidebarToggle.js
120. ui/compList.js
121. ui/tipField.js

<!-- 11. Walkthrough tutorial — no graph dependencies -->
122. ui/walkthrough.js

<!-- 12. Entry point — depends on everything -->
123. index.js
```

---

## File Tree

```
procedia/
│
├── index.html                          ← DOM shell + 123 script tags (single source of truth for load order)
├── index.js                            ← Panel entry point — init(), wires up all systems
│                                         Calls: evalBridge.init(), schemaCache.init(),
│                                                canvasView.init(), canvasInput.init(),
│                                                wireRenderer.init(), wireTool.init(),
│                                                topBar.init(), nodeList.init(),
│                                                inspector.init(), settingsModal.init(),
│                                                sidebarToggle.init(),
│                                                poller.start()
│                                         Depends on: everything
│
├── CSXS/
│   └── manifest.xml                    ← CEP extension manifest (bundle v0.0.4, AE 25.0-99.9, CSXS 11.0)
│
├── lib/
│   └── CSInterface.js                  ← Adobe CEP interface library (vendor, v12.0.0, 1291 lines)
│                                         Exposes: CSInterface constructor
│
├── data/
│   ├── uuidGenerator.js                ← UUID generation utilities
│   │                                     Exposes: uuidGenerator.generateNodeId() (PROC-*),
│   │                                              uuidGenerator.generateWireId() (WIRE-*)
│   │                                     Depends on: (none)
│   ├── effectSchemaCache.json          ← Disk-persisted effect property schemas
│   │                                     Ships as: { "aeVersion": "", "schemas": {} }
│   │                                     Written by schemaCache/persistence.js via writeSchemaCache action
│   ├── effectsCatalog.json             ← Catalog of known AE effects
│   └── graphExport.json                ← Graph export data
│
├── bridge/
│   └── evalBridge.js                   ← THE ONLY FILE that calls csInterface.evalScript()
│                                         Exposes: evalBridge.init(cs),
│                                                  evalBridge.dispatch(commandObj) → Promise,
│                                                  evalBridge.dispatchBatch(commandArr) → Promise
│                                         Bootstraps preamble: json.jsx → utils.jsx → actions_*.jsx → dispatcher.jsx
│                                         Depends on: lib/CSInterface.js, data/uuidGenerator.js
│
├── graph/
│   │
│   ├── graphState/                     ← In-memory state — ONLY mutator of nodeMap & wireMap
│   │   ├── state.js                    ← Shared internal state (nodeMap, wireMap, tempGraph, selection)
│   │   ├── tempGraph.js                ← rebuildTempGraph — stripped snapshot for persistence
│   │   ├── nodes.js                    ← Node CRUD: addNode, removeNode, updateNode, getNode, getAllNodes
│   │   ├── wires.js                    ← Wire CRUD: addWire, removeWire, updateWire, getWire, getAllWires
│   │   ├── props.js                    ← Property/dirty-flag: updateProp, clearDirty
│   │   ├── selection.js                ← Multi-select: setSelection, getSelection, addToSelection, toggleSelection, etc.
│   │   ├── graphOps.js                 ← loadGraph, clearGraph — full state load/reset
│   │   └── index.js                    ← Assembles graphState from sub-modules
│   │                                     Exposes: addNode(), removeNode(), updateNode(),
│   │                                              addWire(), removeWire(), updateWire(),
│   │                                              updateProp(), clearDirty(),
│   │                                              setSelection(uuid), getSelection(),
│   │                                              onSelectionChange(fn),
│   │                                              loadGraph(), clearGraph(), rebuildTempGraph()
│   │                                     Depends on: (none — all internal)
│   │
│   ├── nodeRegistry.js                 ← Node definition registry
│   │                                     Exposes: nodeRegistry.register(def),
│   │                                              nodeRegistry.getDefinition(type),
│   │                                              nodeRegistry.getAll(),
│   │                                              nodeRegistry.getByCategory(cat),
│   │                                              nodeRegistry.listTypes()
│   │                                     Depends on: (none)
│   │
│   ├── graphExporter.js                ← Graph export to JSON
│   │                                     Exposes: graphExporter.exportGraph()
│   │                                     Depends on: graph/graphState/
│   │
│   ├── schemaCache/                    ← Dynamic effect schema cache (in-memory + disk)
│   │   ├── state.js                    ← Internal state & read accessors (_memoryCache, _aeVersion, _ready)
│   │   ├── persistence.js              ← Disk persistence via evalBridge (writeToDisk)
│   │   ├── diff.js                     ← AE version-diff & schema comparison (schemasAreDifferent, runVersionDiff)
│   │   └── index.js                    ← Aggregates into schemaCache global
│   │                                     Exposes: schemaCache.init() → Promise,
│   │                                              schemaCache.hasSchema(matchName),
│   │                                              schemaCache.getSchema(matchName),
│   │                                              schemaCache.storeSchema(matchName, data),
│   │                                              schemaCache.fetchSchema(matchName) → Promise,
│   │                                              schemaCache.isReady()
│   │                                     Calls: evalBridge.dispatch() for readSchemaCache,
│   │                                            writeSchemaCache, getAEVersion, introspectEffect
│   │                                     Depends on: bridge/evalBridge.js, graph/nodeRegistry.js
│   │
│   ├── cycleChecker.js                 ← Cycle detection (pure graph traversal)
│   │                                     Exposes: cycleChecker.hasCycle(fromNodeId, toNodeId)
│   │                                     Depends on: graph/graphState/
│   │
│   ├── wireValidator/                  ← Wire type compatibility checks before connection
│   │   ├── portUtils.js                ← Port lookup & category validation
│   │   ├── matteValidator.js           ← Matte three-condition validation
│   │   ├── canConnect.js               ← Core connection validation (calls cycleChecker, portUtils, matteValidator)
│   │   ├── filterPickerList.js         ← Picker list filtering
│   │   └── index.js                    ← Aggregates into wireValidator global
│   │                                     Exposes: wireValidator.canConnect(fromNode, fromPort, toNode, toPort),
│   │                                              wireValidator.filterPickerList(wireType, nodeList)
│   │                                     Depends on: graph/graphState/, graph/nodeRegistry.js
│   │
│   ├── cascade/                        ← Ghost cascade algorithm (split from cascadeAlgorithm.js)
│   │   ├── utils.js                    ← _hasCompDownstreamExcluding(), collectPathUpstream(), isCompNode()
│   │   ├── cascadeGhost/               ← 5 files (collect, commands, update, cleanup, ghost)
│   │   └── index.js                    ← Aggregates into cascadeAlgorithm global
│   │                                     Exposes: cascadeAlgorithm.cascadeGhost(deletedWireId)
│   │                                     Depends on: graph/graphState/, graph/nodeRegistry.js, bridge/evalBridge.js
│   │
│   ├── engine/                         ← Dumb executor — zero node-type conditionals
│   │   ├── helpers.js                  ← buildInitialProps, refreshNodeUI, resolveDynamicSchema,
│   │   │                                  findPathLayerUUID, propagateDataValue, applyDynamicSchema
│   │   ├── propagate.js                ← Alive propagation: propagateAlive, checkMatteActivation, firePathCreation
│   │   ├── wires.js                    ← Wire connect/disconnect logic
│   │   ├── nodes/
│   │   │   ├── dropNode.js             ← dropNode() — node creation with onDrop dispatch & schema resolution
│   │   │   ├── deleteNode.js           ← deleteNode(), deleteSelectedNodes()
│   │   │   ├── duplicateNode.js        ← duplicateSelectedNodes()
│   │   │   ├── lockNode.js             ← toggleLockSelectedNodes()
│   │   │   ├── cloneNode.js            ← cloneNode() — deep copy for duplication
│   │   │   ├── recreateNode.js         ← recreateNode() — error-state recovery
│   │   │   └── index.js                ← Aggregates into __e_nodes IIFE
│   │   ├── state.js                    ← resetAll(), setNodeProperty()
│   │   └── index.js                    ← Public API — aggregates all engine IIFEs
│   │                                     Exposes: engine.dropNode(), engine.deleteNode(),
│   │                                              engine.deleteSelectedNodes(),
│   │                                              engine.duplicateSelectedNodes(),
│   │                                              engine.toggleLockSelectedNodes(),
│   │                                              engine.connectWire(), engine.disconnectWire(),
│   │                                              engine._firePathCreation(), engine.resetAll()
│   │                                     Depends on: graph/graphState/, graph/nodeRegistry.js,
│   │                                                  graph/cascade/, graph/wireValidator/,
│   │                                                  graph/schemaCache/, bridge/evalBridge.js
│   │
│   ├── nodes/
│   │   ├── loadNodes.js                ← Dynamic script loader — writes <script> tags for all 474 node definitions
│   │   │                                  Reads node manifest, injects tags in order at runtime
│   │   │                                  Depends on: graph/nodeRegistry.js
│   │   └── categories/                 ← 25 categories of node definitions (474 .js files)
│   │       ├── Core/                   ← 4 files: Comp.js, Footage.js, Merge.js, Multimerge.js
│   │       ├── Layers/                 ← 4 files: Text.js, Null.js, Shape.js, Adjustment.js
│   │       ├── Data/                   ← 2 files: Color.js, Number.js
│   │       ├── Shapes/                 ← 1 file: Rectangle.js
│   │       ├── Effects/utility/        ← 8 files: Blending.js, MatteLuma.js, MatteAlpha.js,
│   │       │                              Compander.js, GrowBounds.js, HDRToneMap.js,
│   │       │                              ProfileToProfile.js, CCOverbrights.js
│   │       ├── Blur & Sharpen/         ← 20 files (includes FillEffect, GaussianBlur, DropShadow)
│   │       ├── 3D Channel/             ← 8 files
│   │       ├── Audio/                  ← 10 files
│   │       ├── Boris FX Mocha/         ← 1 file
│   │       ├── Channel/                ← 13 files
│   │       ├── Color Correction/       ← 39 files
│   │       ├── Distort/                ← 37 files
│   │       ├── Expression Controls/    ← 8 files
│   │       ├── Generate/               ← 26 files
│   │       ├── Immersive Video/        ← 12 files
│   │       ├── Keying/                 ← 10 files
│   │       ├── Matte/                  ← 4 files
│   │       ├── Noise & Grain/          ← 12 files
│   │       ├── obsolete/               ← 48 files
│   │       ├── Perspective/            ← 10 files
│   │       ├── Simulation/             ← 18 files
│   │       ├── Stylize/                ← 25 files
│   │       ├── Text/                   ← 2 files
│   │       ├── Time/                   ← 8 files
│   │       ├── Transition/             ← 17 files
│   │       └── Uncategorized/          ← 130 files
│   │
│   ├── canvas/                         ← Canvas interaction & node DOM rendering
│   │   ├── viewport.js                 ← Pan, zoom, coordinate transforms
│   │   │                                 Exposes: canvasView.init(), setPan(), setZoom(),
│   │   │                                          screenToCanvas(), canvasToScreen()
│   │   │                                 Depends on: (none)
│   │   ├── renderer/                   ← DOM sync renderer (split from renderer.js)
│   │   │   ├── categories.js           ← Category color mapping
│   │   │   ├── helpers.js              ← DOM creation helpers
│   │   │   ├── builder.js              ← Build node cards
│   │   │   ├── nodeToolbar.js          ← Per-node action buttons (duplicate, delete, lock)
│   │   │   └── index.js                ← Aggregates into canvasRenderer global
│   │   │                                 Exposes: renderer.render(), renderer.getNodeElement()
│   │   │                                 Depends on: graph/graphState/, graph/nodeRegistry.js, viewport.js
│   │   ├── minimap/                    ← Minimap canvas (split from minimap.js)
│   │   │   ├── constants.js            ← Dimensions, colors, padding
│   │   │   ├── state.js                ← Internal state
│   │   │   ├── utils.js                ← fitAll, bounding box calc
│   │   │   ├── renderer.js             ← Canvas draw logic
│   │   │   ├── interaction.js          ← Mouse pan on minimap
│   │   │   └── index.js                ← Aggregates into __minimap global
│   │   │                                 Exposes: minimap.init(), minimap.render(), minimap.fitAll()
│   │   ├── input/                      ← Event handling (split from input.js)
│   │   │   ├── state.js                ← Shared input state variables
│   │   │   ├── utils.js                ← wrapOffset, clientToWrap, isEditableTarget
│   │   │   ├── rubberband.js           ← Rubber-band multi-select
│   │   │   ├── handlers/
│   │   │   │   ├── titleEdit/
│   │   │   │   │   ├── helpers.js      ← Graph-traversal helpers (_findInputWire, etc.)
│   │   │   │   │   ├── exit.js         ← _exitTitleEdit / exitTitleEdit
│   │   │   │   │   ├── commit.js       ← commitTitleEdit
│   │   │   │   │   ├── cancel.js       ← cancelTitleEdit
│   │   │   │   │   └── dblclick.js     ← onDblClick + event helpers
│   │   │   │   ├── mouse/
│   │   │   │   │   ├── mousedown.js    ← onMouseDown handler
│   │   │   │   │   ├── mousemove.js    ← onMouseMove handler
│   │   │   │   │   ├── mouseup.js      ← onMouseUp handler
│   │   │   │   │   └── click.js        ← onClick handler
│   │   │   │   ├── keyboard.js         ← Keyboard down/up handlers (delete, escape, space)
│   │   │   │   ├── wheel.js            ← Mouse wheel zoom handler
│   │   │   │   └── index.js            ← Assembles inputHandlers from sub-modules
│   │   │   └── index.js                ← init() + public API
│   │   │                                 Exposes: canvasInput.init()
│   │   │                                 Depends on: graph/graphState/, viewport.js, renderer/
│   │   ├── drag/
│   │   │   ├── helpers.js              ← Math helpers (Bezier, distance, port pos) + declares canvasDrag
│   │   │   ├── hitTest.js              ← Wire hit-testing (bezier/direct/stepped)
│   │   │   ├── insert.js               ← Wire-insertion (split wire on node drop)
│   │   │   └── preview.js              ← Drag-over-wire preview state
│   │   │                                 Exposes: canvasDrag.findWireAt(), canvasDrag.insertNodeOnWire()
│   │                                     Depends on: graph/graphState/, graph/nodeRegistry.js
│   │
│   ├── wire/                           ← Wire rendering & interaction
│   │   ├── wireRenderer/               ← 3 files (helpers, draw, render)
│   │   │                                 Exposes: wireRenderer.init(), wireRenderer.render(preview)
│   │   │                                 Reads: settings.get('wireStyle') per frame, settings.get('animatedDash')
│   │   │                                 Depends on: graph/graphState/, graph/canvas/viewport.js
│   │   └── wire.js                     ← Wire drag, commit, delete
│   │                                     Exposes: wireTool.init()
│   │                                     Calls: engine.connectWire(), engine.disconnectWire()
│   │                                     Depends on: graph/graphState/, wireValidator/, cycleChecker.js,
│   │                                                  graph/cascade/
│   │
│   ├── autoLayout/                     ← Sugiyama layered graph layout
│   │   ├── constants.js                ← Spacing, padding defaults
│   │   ├── estimateHeight.js           ← Node height estimation
│   │   ├── graphBuilder.js             ← Adjacency list from wires
│   │   ├── layerAssignment.js          ← Longest-path layer assignment
│   │   ├── crossingReduction.js        ← Barycenter heuristic crossing reduction
│   │   ├── positioning.js              ← Coordinate assignment + data node positioning
│   │   └── index.js                    ← Aggregates into autoLayout global
│   │                                     Exposes: autoLayout.run(options)
│   │                                     Depends on: graph/graphState/, ui/settings.js
│   │
│   └── import/                         ← Project import module
│       ├── mapNodes/                   ← 3 files (helpers, buildItems, buildEffects)
│       ├── mapWires.js                 ← Infer wire connections from AE layer structure
│       ├── stampUUIDs.js               ← Stamp UUIDs on imported nodes/wires
│       ├── builder.js                  ← Build complete import graph
│       └── index.js                    ← Aggregates into graphImporter global
│                                         Exposes: graphImporter.importProject()
│                                         Depends on: graph/graphState/, graph/nodeRegistry.js,
│                                                      bridge/evalBridge.js, data/uuidGenerator.js
│
├── ui/                                 ← User interface panels
│   ├── topBar.js                       ← Top bar: selection info, Save/Undo/Redo/Fit/Duplicate/Delete/
│   │                                      Reset/Reload/AutoLayout/Settings buttons
│   │                                     Exposes: topBar.init(), topBar.refreshSelection()
│   │                                     Depends on: (none)
│   │                                     Depends on: (none)
│   ├── statusBar.js                    ← Status bar: node/wire/alive/ghost counts, zoom level
│   │                                     Depends on: graph/graphState/, viewport.js
│   ├── sidebarToggle.js                ← Left/right panel collapse toggle
│   │                                     Exposes: sidebarToggle.init()
│   │                                     Depends on: (none)
│   ├── settings.js                     ← Persistent key/value store (localStorage)
│   │                                     Exposes: settings.get(key), settings.set(key, value), settings.getAll()
│   │                                     Keys: minimap, wireStyle, animatedDash, layoutDirection,
│   │                                            layoutHSpacing, layoutVSpacing
│   │                                     Depends on: (none)
│   ├── settingsModal.js                ← Gear-button modal: minimap toggle, wire style select,
│   │                                      layout direction, spacing sliders
│   │                                     Exposes: settingsModal.init(), settingsModal.open(), settingsModal.close()
│   │                                     Depends on: ui/settings.js
│   ├── nodeList/                       ← Node palette (split from nodeList.js)
│   │   ├── categories.js               ← Category definitions (Comps, Data, Effects, Layers, Utility)
│   │   ├── render.js                   ← Category collapse & node item rendering
│   │   ├── search.js                   ← Search/filter logic
│   │   ├── dragdrop.js                 ← Drag-to-canvas with ghost preview
│   │   └── index.js                    ← Aggregates into nodeList global
│   │                                     Exposes: nodeList.init()
│   │                                     Depends on: graph/nodeRegistry.js
│   ├── nodePicker/                     ← Popup node picker on wire drop to empty canvas
│   │   ├── compatibility.js            ← Compatible node filtering by wire type
│   │   ├── render.js                   ← Popup DOM rendering
│   │   ├── filter.js                   ← Search filter
│   │   ├── events.js                   ← Keyboard navigation & selection
│   │   └── index.js                    ← Aggregates into nodePicker global
│   │                                     Exposes: nodePicker.show(), nodePicker.close()
│   │                                     Depends on: graph/nodeRegistry.js, graph/engine/
│   └── inspector/                      ← Property editor panel (split from inspector.js)
│       ├── viewModel.js                ← Build view model from node data/definition/schema
│       ├── render.js                   ← DOM rendering for all param types
│       ├── colorPicker.js              ← Color picker widget
│       ├── events.js                   ← Inspector change/keyboard/recover button handlers
│       └── index.js                    ← Aggregates into inspector global
│                                         Exposes: inspector.init(), inspector.refresh()
│                                         Depends on: graph/graphState/, graph/nodeRegistry.js,
│                                                      graph/engine/, flush/dirtyFlusher.js
│
├── flush/
│   └── dirtyFlusher.js                 ← Dirty flag + 300ms debounced property flush to AE
│                                         Exposes: dirtyFlusher.schedule(), dirtyFlusher.flush()
│                                         Internal: _terminalWiresForSource(), _terminalWiresForEffector(),
│                                                   _findPathLayerUUID(), _resolveUpstreamNodeUUID()
│                                         Depends on: graph/graphState/, graph/nodeRegistry.js, bridge/evalBridge.js
│
├── polling/                            ← Adaptive AE polling system
│   ├── missingNodes.js                 ← Wire/node UUID lookup helpers: getAliveWireUUIDs(), findNodesByWireUUID()
│   │                                     Depends on: graph/graphState/
│   ├── notifications.js                ← Missing-node notification with dedup cache: pushMissingNotification()
│   │                                     Depends on: graph/graphState/
│   ├── externalDeletions.js            ← Detect comps/effects deleted outside Procedia
│   │                                     Exposes: checkEffectDeletions(), checkExternalDeletions()
│   │                                     Depends on: bridge/evalBridge.js, graph/graphState/, graph/nodeRegistry.js
│   └── poller.js                       ← Adaptive timer (1s active / 5s idle), respects isWriting flag
│                                         Exposes: poller.start(), poller.stop(), poller.markActivity()
│                                         Depends on: bridge/evalBridge.js, graph/graphState/,
│                                                     polling/missingNodes.js, polling/notifications.js,
│                                                     polling/externalDeletions.js
│
├── notifications/
│   └── notificationBar.js              ← Toast notification UI (in-canvas overlay)
│                                         Exposes: notificationBar.push(opts), notificationBar.dismiss(id)
│                                         Severities: info, warning, error, success
│                                         Depends on: (none — pure DOM)
│
├── css/                                ← 16 stylesheets (dark theme design tokens)
│   ├── tabler-icons.min.css            ← Tabler icon font CSS
│   ├── tokens.css                      ← Design tokens (colors, spacing, typography)
│   ├── base.css                        ← Global resets and layout
│   ├── topBar.css                      ← Top bar styles
│   ├── leftBar.css                     ← Left panel (node list) styles
│   ├── rightBar.css                    ← Right panel (inspector) styles
│   ├── canvas.css                      ← Canvas grid & container styles
│   ├── node.css                        ← Node card styles

│   ├── settingsModal.css               ← Settings modal styles
│   ├── nodePicker.css                  ← Node picker popup styles
│   ├── notificationBar.css             ← Notification toast styles
│   ├── compList.css                    ← Comp list panel styles
│   ├── tipField.css                    ← Node tip tooltip styles
│   ├── walkthrough.css                 ← Walkthrough tutorial overlay styles
│   ├── colorPicker.css                 ← Color picker widget styles
│   └── bottomBar.css                   ← Bottom bar styles
│
├── fonts/
│   ├── tabler-icons.ttf                ← Tabler icon font
│   ├── tabler-icons.woff
│   └── tabler-icons.woff2
│
└── jsx/                                ← ExtendScript (ES3 strict — runs inside After Effects)
    ├── json.jsx                        ← JSON polyfill — MUST be first loaded in evalBridge preamble
    │                                     Exposes: JSON.stringify(), JSON.parse()
    ├── utils.jsx                       ← Shared AE lookup utilities
    │                                     Exposes: findCompByUUID(uuid), findLayerByUUID(comp, uuid),
    │                                              findReservedComp(), findOrCreateReservedComp(),
    │                                              findOrCreateProcediaFolder(), getAEVersion(),
    │                                              resolveReservedComp()
    │                                     Requires: json.jsx loaded first
    ├── persistence.jsx                 ← Graph read/write to Reserved Comp text layers (chunking)
    │                                     Exposes: readGraph(), writeGraph()
    │                                     Uses: __PROCEDIA_NODES__, __PROCEDIA_WIRES__ text layers
    │                                     Requires: json.jsx, utils.jsx
    ├── tools/
    │   └── buildEffectsCatalog.jsx     ← Tool to build effects catalog
    │                                     Standalone utility, not part of main extension
    └── dispatcher/                     ← THE ONLY ExtendScript that writes AE API calls
        ├── dispatcher.jsx              ← Entry: dispatch(commandJSON), dispatchBatch(commandArrayJSON)
        │                                  Routes via _route(cmd) → _handlers map
        │                                  Must load LAST in preamble
        ├── actions_schema.jsx          ← Schema cache, persistence & version handlers
        │                                  _handleReadSchemaCache, _handleWriteSchemaCache,
        │                                  _handleGetAEVersion, _handleReadGraph, _handleWriteGraph
        ├── actions_comp.jsx            ← CompNode handlers
        │                                  _handleCreateComp, _handleDeleteComp, _handleSetCompProperty,
        │                                  _handleFocusComp, _handleEnsureReservedComp
        ├── actions_layer.jsx           ← Layer create/delete/rename handlers
        │                                  _handleCreateTextLayer, _handleCreateNullLayer,
        │                                  _handleCreateAdjustmentLayer, _handleCreateShapeLayer,
        │                                  _handleAddCompAsLayer, _handleDeletePathLayer,
        │                                  _handleRenameNode, _handleRestampLayer
        ├── actions_property.jsx        ← Layer property/parent/order/blending handlers
        │                                  _handleSetLayerProperty, _handleClearLayerParent,
        │                                  _handleSetLayerParent, _handleSetLayerOrder,
        │                                  _handleSetBlendingMode
        ├── actions_park.jsx            ← Park/unpark/poll handlers
        │                                  _handleParkLayer, _handleUnparkLayer,
        │                                  _handleDeleteParkedLayer, _handlePollAliveNodes
        ├── actions_matte.jsx           ← Track-matte handlers
        │                                  _handleSetLumaMatte, _handleSetAlphaMatte, _handleClearMatte
        ├── actions_compList.jsx        ← Comp list panel UI handlers
        ├── actionEffect/               ← 3 files (apply, introspect, pollAlive)
        │                                  _handleApplyDynamicEffect, _handleRemoveEffect,
        │                                  _handleSetEffectProperty, _handleIntrospectEffect
        ├── actions_footage.jsx         ← Footage item handlers
        │                                  _handleImportFootage
        ├── actionImport/               ← 3 files (helpers, read, handler)
        │                                  _handleImportProject
        └── actions_graphExport.jsx     ← Graph export handlers
                                           _handleExportGraph

    Registered dispatcher actions (from all actions_*.jsx):
      createComp, deleteComp, setCompProperty, focusComp, ensureReservedComp,
      createTextLayer, createNullLayer, createShapeLayer, createAdjustmentLayer,
      addCompAsLayer, deletePathLayer, renameNode, restampLayer, importFootage,
      setLayerProperty, clearLayerParent, setLayerParent, setLayerOrder, setBlendingMode,
      parkLayer, unparkLayer, deleteParkedLayer, pollAliveNodes,
      setLumaMatte, setAlphaMatte, clearMatte,
      applyDynamicEffect, removeEffect, setEffectProperty, introspectEffect,
      readSchemaCache, writeSchemaCache, getAEVersion, readGraph, writeGraph,
      importProject, exportGraph
```

---

## Key Call Flows

### Node drop → AE layer created
```
graph/canvas/drag/ (4 files)
  └─ engine.dropNode(nodeDef, x, y)
       ├─ graphState.addNode()
       └─ [if params:'dynamic'] schemaCache.fetchSchema(matchName)
            └─ nodeMap[uuid].dynamicSchema populated → all secondary ports visible

  (wire drawn to CompNode)
  └─ engine.connectWire()
       └─ engine._firePathCreation(terminalWireId)
            ├─ stamps wireMap[id]._pathLayerUUID
            ├─ dirtyFlusher.flush() — pushes any pending data values
            ├─ calls node.onAlive(nodeData, hostingCompUUID) → commandObj
            └─ evalBridge.dispatch(commandObj)
                 └─ csInterface.evalScript('dispatch(...)')
                      └─ dispatcher.jsx: actionCreateTextLayer() → AE API
```

### Wire delete → ghost cascade
```
graph/wire/wire.js
  └─ engine.disconnectWire(wireId)
       └─ cascadeAlgorithm.cascadeGhost(deletedWireId)
            ├─ hasCompDownstream() — checks remaining live paths (layer wires only)
            ├─ collectPathUpstream() — builds cascade set
            ├─ orders: effectors first (outermost), affected last
            ├─ calls node.onGhost() → command objects (batch)
            └─ evalBridge.dispatchBatch(batchArr)
                 └─ csInterface.evalScript (one crossing)
                      └─ dispatcher.jsx: actionParkLayer() → moves layer to Reserved Comp
```

### Property change → AE update
```
ui/inspector/events.js
  └─ engine.setNodeProperty(uuid, key, value)
       └─ graphState.updateProp(uuid, key, value)
            └─ dirtyFlusher.schedule()
                 └─ [300ms debounce] dirtyFlusher.flush()
                      ├─ resolves pathLayerUUID / upstreamNodeUUID
                      ├─ node.onPropertyChange(key, value, nodeData, hostingCompUUID, upstreamUUID)
                      └─ evalBridge.dispatch(commandObj)
                           └─ dispatcher.jsx: actionSetLayerProperty() → AE API
```

### Panel load → graph restored
```
index.js: init()
  └─ evalBridge.init(csInterface)          ← wires up csInterface, loads JSX preamble
  └─ schemaCache.init()                    ← loads effectSchemaCache.json, diffs AE version
  └─ ensureReservedComp()                  ← find-or-create Reserved Comp
  └─ readGraph()                           ← reads __PROCEDIA_NODES__ + __PROCEDIA_WIRES__ layers
  └─ graphState.loadGraph(parsed)          ← rebuilds nodeMap, wireMap, tempGraph
  └─ poller.start()                        ← begins adaptive alive-node polling
```

---

## Discrepancies: Docs vs Disk (June 2026)

The following files exist on disk but were absent from prior documentation:

| Area | Previously Undocumented | Status |
| ---- | ----------------------- | ------ |
| `graph/graphExporter.js` | Not in load order or file tree | ✅ Added |
| `graph/nodes/loadNodes.js` | Dynamic script loader for 474 nodes | ✅ Added |
| `graph/engine/nodes/cloneNode.js` | Clone utility for duplication | ✅ Added |
| `graph/cascade/` (7 files) | Split from `cascadeAlgorithm.js` | ✅ Added |
| `graph/canvas/renderer/` (5 files) | Split from `renderer.js` | ✅ Added |
| `graph/canvas/minimap/` (6 files) | Split from `minimap.js` | ✅ Added |
| `graph/canvas/input/` (6 files) | Split from `input.js` | ✅ Added |
| `graph/autoLayout/` (7 files) | Entire module undocumented | ✅ Added |
| `graph/import/` (5 files) | Entire module undocumented | ✅ Added |
| `ui/nodeList/` (5 files) | Split from `nodeList.js` | ✅ Added |
| `ui/nodePicker/` (5 files) | Split from `nodePicker.js` | ✅ Added |
| `ui/inspector/` (5 files) | Split from `inspector.js` | ✅ Added |
| `notifications/notificationBar.js` | Toast notification UI | ✅ Added |
| `jsx/dispatcher/actions_footage.jsx` | Footage item handlers | ✅ Added |
| `jsx/dispatcher/actions_graphExport.jsx` | Graph export handlers | ✅ Added |
| `jsx/dispatcher/actionImport/` (3 files) | Import handlers | ✅ Added |
| `jsx/tools/buildEffectsCatalog.jsx` | Catalog build tool | ✅ Added |
| `graph/nodes/categories/Core/Footage.js` | Footage node definition | ✅ Added |
| `graph/nodes/categories/Effects/utility/` (5 extra) | Utility nodes beyond Blending/Matte | ✅ Added |
| `data/effectsCatalog.json` | Effects catalog | ✅ Added |
| `data/graphExport.json` | Graph export data | ✅ Added |
| `fonts/` (3 files) | Tabler icon font files | ✅ Added |
| `graph/nodes/categories/Effects/Blur & Sharpen/` | 20 effect nodes (replaces flat `Effects/`) | ✅ Added |
| 23 additional category dirs | 450+ AE effect node definitions | ✅ Noted |

**Previously documented but since split into directories:**

| Old Reference | New Location | Status |
| ------------- | ------------ | ------ |
| `graph/cascadeAlgorithm.js` | `graph/cascade/utils.js`, `cascadeGhost/` (5 files), `index.js` | ✅ Updated |
| `graph/canvas/renderer.js` | `graph/canvas/renderer/categories.js`, `helpers.js`, `builder.js`, `index.js`, `nodeToolbar.js` | ✅ Updated |
| `graph/canvas/minimap.js` | `graph/canvas/minimap/constants.js`, `state.js`, `utils.js`, `renderer.js`, `interaction.js`, `index.js` | ✅ Updated |
| `graph/canvas/input.js` | `graph/canvas/input/` (6 files) | ✅ Updated |
| `ui/nodeList.js` | `ui/nodeList/categories.js`, `render.js`, `search.js`, `dragdrop.js`, `index.js` | ✅ Updated |
| `ui/nodePicker.js` | `ui/nodePicker/compatibility.js`, `render.js`, `filter.js`, `events.js`, `index.js` | ✅ Updated |
| `ui/inspector.js` | `ui/inspector/viewModel.js`, `render.js`, `colorPicker.js`, `events.js`, `index.js` | ✅ Updated |
| `graph/nodes/categories/Effects/` | `graph/nodes/categories/Effects/Blur & Sharpen/` | ✅ Updated |

---

## Code Documentation

File header comments (file description, dependency declarations, and public API) are present on every source file (`.js` and `.jsx`). Each file documents its own dependencies and exposed symbols.

---

*Update this file whenever files are added, moved, or removed.*
*Do not add architectural decisions here — those belong in the Architecture Specification.*
