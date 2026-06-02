# Procedia — File Structure

*CEP · After Effects 2025+ · Windows · ExtendScript ES3*
*Auto-generated from actual disk state — May 2026*

---

## Load Order (index.html)

Scripts load in this exact top-to-bottom sequence. No bundler. No ES modules.

```
 1. lib/CSInterface.js
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
13. ui/settings.js
14. graph/nodes/categories/core/Comp.js
15. graph/nodes/categories/layers/Text.js
16. graph/nodes/categories/layers/Null.js
17. graph/nodes/categories/layers/Shape.js
18. graph/nodes/categories/layers/Adjustment.js
19. graph/nodes/categories/effects/FillEffect.js
20. graph/nodes/categories/effects/GaussianBlur.js
21. graph/nodes/categories/effects/DropShadow.js
22. graph/nodes/categories/data/Color.js
23. graph/nodes/categories/data/Number.js
24. graph/nodes/categories/utility/Blending.js
25. graph/nodes/categories/utility/MatteLuma.js
26. graph/nodes/categories/utility/MatteAlpha.js
27. graph/schemaCache/state.js                 ← schema cache internal state
28. graph/schemaCache/persistence.js           ← schema cache disk persistence
29. graph/schemaCache/diff.js                  ← schema cache version-diff logic
30. graph/schemaCache/index.js                 ← schema cache public API (aggregator)
31. graph/cycleChecker.js
32. graph/wireValidator/portUtils.js
33. graph/wireValidator/matteValidator.js
34. graph/wireValidator/canConnect.js
35. graph/wireValidator/filterPickerList.js
36. graph/wireValidator/index.js
37. graph/cascadeAlgorithm.js
38. flush/dirtyFlusher.js                        ← moved before engine
39. graph/engine/helpers.js
40. graph/engine/propagate.js
41. graph/engine/wires.js
42. graph/engine/nodes/dropNode.js
43. graph/engine/nodes/deleteNode.js
44. graph/engine/nodes/duplicateNode.js
45. graph/engine/nodes/lockNode.js
46. graph/engine/nodes/recreateNode.js
47. graph/engine/nodes/index.js
48. graph/engine/state.js
49. graph/engine/index.js
50. graph/canvas/viewport.js
51. graph/canvas/renderer.js
52. graph/canvas/input/state.js
53. graph/canvas/input/utils.js
54. graph/canvas/input/rubberband.js
55. graph/canvas/input/handlers/titleEdit.js
56. graph/canvas/input/handlers/mouse.js
57. graph/canvas/input/handlers/keyboard.js
58. graph/canvas/input/handlers/wheel.js
59. graph/canvas/input/handlers/index.js
60. graph/canvas/input/index.js
61. graph/canvas/minimap/constants.js
62. graph/canvas/minimap/state.js
63. graph/canvas/minimap/utils.js
64. graph/canvas/minimap/renderer.js
65. graph/canvas/minimap/interaction.js
66. graph/canvas/minimap/index.js
67. graph/canvas/drag.js
68. graph/wire/wireRenderer.js
69. graph/wire/wire.js
70. ui/nodeList.js
71. ui/nodePicker/compatibility.js
72. ui/nodePicker/render.js
73. ui/nodePicker/filter.js
74. ui/nodePicker/events.js
75. ui/nodePicker/index.js
76. ui/inspector.js
77. ui/settingsModal.js
78. polling/missingNodes.js
79. polling/notifications.js
80. polling/externalDeletions.js
81. polling/poller.js
82. ui/topBar.js
83. ui/bottomBar.js
84. ui/statusBar.js
85. ui/sidebarToggle.js
86. index.js
```

---

## File Tree

```
procedia/
│
├── index.html                          ← DOM shell + script load order (single source of truth)
├── index.js                            ← Panel entry point
│                                         Calls: evalBridge.init(), canvasView.init(),
│                                                topBar.init(),
│                                                nodeList.init(), inspector.init(),
│                                                bottomBar.init(), sidebarToggle.init()
│                                         Depends on: everything
│
├── CSXS/
│   └── manifest.xml                    ← CEP extension manifest (panel ID, AE version target)
│
├── lib/
│   └── CSInterface.js                  ← Adobe CEP interface library (vendor, do not edit)
│                                         Exposes: CSInterface constructor
│
├── data/
│   ├── uuidGenerator.js                ← UUID generation utilities
│   │                                     Exposes: uuidGenerator.generateNodeId(),
│   │                                              uuidGenerator.generateWireId()
│   │                                     Depends on: (none)
│   └── effectSchemaCache.json          ← Disk-persisted effect schema cache
│                                         Written by: schemaCache/persistence.js via writeSchemaCache action
│                                         Ships as: { "aeVersion": "", "schemas": {} }
│
├── bridge/
│   └── evalBridge.js                   ← THE ONLY FILE that calls csInterface.evalScript()
│                                         Exposes: evalBridge.init(cs),
│                                                  evalBridge.dispatch(commandObj) → Promise,
│                                                  evalBridge.dispatchBatch(commandArr) → Promise
│                                         Calls: csInterface.evalScript()
│                                         Bootstraps preamble: json.jsx → utils.jsx → actions_schema.jsx → actions_comp.jsx → actions_layer.jsx → actions_property.jsx → actions_park.jsx → actions_matte.jsx → actions_effect.jsx → dispatcher.jsx
│                                         Depends on: lib/CSInterface.js, data/uuidGenerator.js
│
├── graph/
│   │
│   ├── graphState/
│   │   ├── state.js                    ← Shared internal state (nodeMap, wireMap, tempGraph, selection)
│   │   ├── tempGraph.js                ← rebuildTempGraph — stripped snapshot for consumers
│   │   ├── nodes.js                    ← Node CRUD: addNode, removeNode, updateNode, getNode, getAllNodes
│   │   ├── wires.js                    ← Wire CRUD: addWire, removeWire, updateWire, getWire, getAllWires
│   │   ├── props.js                    ← Property/dirty-flag: updateProp, clearDirty
│   │   ├── selection.js                ← Multi-select: setSelection, getSelection, addToSelection, etc.
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
│   ├── schemaCache/                      ← Dynamic effect schema cache (in-memory + disk)
│   │   ├── state.js                      ← Internal state & read accessors
│   │   ├── persistence.js                ─ Disk persistence via evalBridge
│   │   ├── diff.js                       ─ AE version-diff & schema comparison
│   │   └── index.js                      ← Aggregates into schemaCache global
│   │                                     Exposes: schemaCache.init() → Promise,
│   │                                              schemaCache.hasSchema(matchName),
│   │                                              schemaCache.getSchema(matchName),
│   │                                              schemaCache.storeSchema(matchName, data),
│   │                                              schemaCache.isReady()
│   │                                     Calls: evalBridge.dispatch() for readSchemaCache,
│   │                                            writeSchemaCache, getAEVersion, introspectEffect
│   │                                     Depends on: bridge/evalBridge.js, graph/nodeRegistry.js
│   │
│   ├── cycleChecker.js                 ← Cycle detection (pure graph traversal)
│   │                                     Exposes: cycleChecker.hasCycle(fromNodeId, toNodeId)
│   │                                     Depends on: graph/graphState/
│   │
│   ├── wireValidator/                   ← Wire type compatibility checks before connection
│   │   ├── portUtils.js                 ← Port lookup & category validation
│   │   ├── matteValidator.js            ← Matte three-condition validation
│   │   ├── canConnect.js                ← Core connection validation
│   │   ├── filterPickerList.js          ← Picker list filtering
│   │   └── index.js                     ← Aggregates into wireValidator global
│   │                                     Exposes: wireValidator.canConnect(fromNode, fromPort,
│   │                                                                        toNode, toPort),
│   │                                              wireValidator.filterPickerList(wireType, nodeList)
│   │                                     Enforces: blending main_input ← affected only;
│   │                                               matte three-condition validation
│   │                                     Depends on: graph/graphState/, graph/nodeRegistry.js
│   │
│   ├── cascadeAlgorithm.js             ← Ghost cascade logic
│   │                                     Exposes: cascadeAlgorithm.cascadeGhost(deletedWireId),
│   │                                              cascadeAlgorithm.hasCompDownstream(nodeId, excludeWireId),
│   │                                              cascadeAlgorithm.collectPathUpstream(nodeId),
│   │                                              cascadeAlgorithm.isCompNode(nodeId)
│   │                                     Calls: evalBridge.dispatchBatch() (one crossing per cascade)
│   │                                     Depends on: graph/graphState/, graph/nodeRegistry.js,
│   │                                                  bridge/evalBridge.js
│   │
│   ├── engine.js                       ← Dumb executor — zero node-type conditionals
│   │                                     Exposes: engine.dropNode(nodeDef, x, y),
│   │                                              engine.deleteNode(nodeId),
│   │                                              engine.deleteSelectedNodes(),
│   │                                              engine.duplicateSelectedNodes(),
│   │                                              engine.toggleLockSelectedNodes(),
│   │                                              engine.connectWire(fromNode, fromPort, toNode, toPort),
│   │                                              engine.disconnectWire(wireId),
│   │                                              engine._firePathCreation(terminalWireId)
│   │                                     Calls: node lifecycle hooks (onDrop, onAlive, onGhost,
│   │                                            onDelete, onPropertyChange),
│   │                                            evalBridge.dispatch() / dispatchBatch(),
│   │                                            cascadeAlgorithm.cascadeGhost(),
│   │                                            schemaCache.hasSchema() / getSchema() / storeSchema(),
│   │                                            dirtyFlusher.flush() (after _pathLayerUUID stamp)
│   │                                     Depends on: graph/graphState/, graph/nodeRegistry.js,
│   │                                                  graph/cascadeAlgorithm.js,
│   │                                                  graph/wireValidator/index.js, graph/schemaCache/index.js,
│   │                                                  bridge/evalBridge.js
│   │
│   ├── nodes/
│   │   └── categories/
│   │       │
│   │       ├── core/
│   │       │   └── Comp.js             ← CompNode  nodeKind:'affected'  dedicated:true
│   │       │                             Calls: nodeRegistry.register(CompNode)
│   │       │
│   │       ├── layers/
│   │       │   ├── Text.js             ← TextNode  nodeKind:'affected'  dedicated:false
│   │       │   ├── Null.js             ← NullNode  nodeKind:'affected'  dedicated:true
│   │       │   ├── Shape.js            ← ShapeNode  nodeKind:'affected'  dedicated:false
│   │       │   └── Adjustment.js       ← AdjustmentNode  nodeKind:'affected'  dedicated:true
│   │       │                             All call: nodeRegistry.register(NodeName)
│   │       │
│   │       ├── effects/
│   │       │   ├── FillEffect.js       ← FillEffectNode  nodeKind:'effector'  params:'dynamic'
│   │       │   │                         matchName: 'ADBE Fill'
│   │       │   ├── GaussianBlur.js     ← GaussianBlurNode  nodeKind:'effector'  params:'dynamic'
│   │       │   │                         matchName: 'ADBE Gaussian Blur 2'
│   │       │   └── DropShadow.js       ← DropShadowNode  nodeKind:'effector'  params:'dynamic'
│   │       │                             matchName: 'ADBE Drop Shadow'
│   │       │                             All call: nodeRegistry.register(NodeName)
│   │       │
│   │       ├── data/
│   │       │   ├── Color.js            ← ColorNode  nodeKind:'data'  always alive
│   │       │   └── Number.js           ← NumberNode  nodeKind:'data'  always alive
│   │       │                             All call: nodeRegistry.register(NodeName)
│   │       │
│   │       └── utility/
│   │           ├── Blending.js         ← BlendingNode  nodeKind:'blending'  always alive
│   │           ├── MatteLuma.js        ← MatteLumaNode  nodeKind:'matte'  always alive
│   │           └── MatteAlpha.js       ← MatteAlphaNode  nodeKind:'matte'  always alive
│   │                                     All call: nodeRegistry.register(NodeName)
│   │
│   ├── canvas/
│   │   ├── viewport.js                 ← Pan, zoom, coordinate transforms
│   │   │                                 Exposes: canvasView.init(), canvasView.pan(),
│   │   │                                          canvasView.zoom(), canvasView.worldToScreen(),
│   │   │                                          canvasView.screenToWorld()
│   │   │                                 Depends on: (none)
│   │   ├── renderer.js                 ← Draw loop — nodes, wires, grid
│   │   │                                 Depends on: graph/graphState/, graph/nodeRegistry.js,
│   │   │                                              graph/canvas/viewport.js
│   │   ├── input/                       ← Mouse and keyboard events on canvas (split from input.js)
│   │   │   ├── state.js                 ← Shared state variables
│   │   │   ├── utils.js                 ← Utility helpers (wrapOffset, clientToWrap, isEditableTarget)
│   │   │   ├── rubberband.js            ← Rubber-band selection logic
│   │   │   ├── handlers/                  ← Event handlers split by category
│   │   │   │   ├── index.js               ← Assemblies inputHandlers from sub-modules
│   │   │   │   ├── titleEdit.js           ← Inline title editing + double-click
│   │   │   │   ├── mouse.js               ← Mouse down/move/up/click handlers
│   │   │   │   ├── keyboard.js            ← Keyboard down/up handlers
│   │   │   │   └── wheel.js               ← Mouse wheel zoom handler
│   │   │   └── index.js                 ← init() + public API
│   │   │                                 Depends on: graph/graphState/, graph/canvas/viewport.js,
│   │   │                                              graph/canvas/renderer.js
│   │   └── minimap.js                  ← Minimap canvas render
│   │                                     Depends on: graph/graphState/, graph/canvas/viewport.js
│   │
│   └── wire/
│       ├── wireRenderer.js             ← Bezier/direct/stepped wire drawing
│       │                                 Exposes: wireRenderer.drawAll(), wireRenderer.drawWire()
│       │                                 Reads: settings.get('wireStyle') per frame
│       │                                 Depends on: graph/graphState/
│       └── wire.js                     ← Wire drag, commit, delete
│                                         Calls: engine.connectWire(), engine.disconnectWire(),
│                                                cascadeAlgorithm.cascadeGhost()
│                                         Depends on: graph/graphState/, graph/wireValidator/index.js,
│                                                      graph/cycleChecker.js,
│                                                      graph/cascadeAlgorithm.js
│
├── ui/
│   ├── nodeList.js                     ← Node palette — category collapse, search, drag source
│   │                                     Exposes: nodeList.init()
│   │                                     Shows drag ghost with category-colored dot + node name
│   │                                     Depends on: graph/nodeRegistry.js
│   │
│   ├── inspector.js                    ← Inspector panel — renders node params
│   │                                     Exposes: inspector.init(), inspector.render(nodeData)
│   │                                     Renders static params (params array) and dynamic
│   │                                     (schema from nodeData.dynamicSchema)
│   │                                     Calls: graphState.updateProp() on change
│   │                                     Depends on: graph/graphState/, graph/nodeRegistry.js
│   │
│   ├── statusBar.js                    ← Status bar: node/wire/alive/ghost counts, zoom level
│   │                                     Depends on: graph/graphState/, graph/canvas/viewport.js
│   │
│   ├── settingsModal.js                ← Gear-button modal: minimap toggle, wire style select
│   │                                     Exposes: settingsModal.init(), settingsModal.open(),
│   │                                              settingsModal.close()
│   │                                     Depends on: ui/settings.js (not yet created)
│   │
│   ├── topBar.js                       ← Top bar chrome
│   │                                     Exposes: topBar.init(), topBar.refreshSelection()
│   │                                     Buttons: Save, Undo, Redo, Fit View,
│   │                                              Duplicate, Delete,
│   │                                              Reset, Reload, Settings
│   │                                     Depends on: (none)
│   │
│   ├── bottomBar.js                    ← Bottom bar chrome (centered notification only)
│   │                                     Exposes: bottomBar.init(), bottomBar.notify()
│   │                                     Depends on: (none)
│   │
│   └── sidebarToggle.js                ← Left/right panel collapse toggle
│                                         Exposes: sidebarToggle.init()
│                                         Depends on: (none)
│
├── flush/
│   └── dirtyFlusher.js                 ← Dirty flag + 300ms debounce flush
│                                         Exposes: dirtyFlusher.schedule(), dirtyFlusher.flush()
│                                         Internal: _terminalWiresForSource(),
│                                                   _terminalWiresForEffector()
│                                         Calls: nodeRegistry.getDefinition(), evalBridge.dispatch()
│                                         Depends on: graph/graphState/, graph/nodeRegistry.js,
│                                                      bridge/evalBridge.js
│
├── polling/
│   ├── missingNodes.js              ← Wire/node UUID lookup helpers
│   │                                   Exposes: pollerHelpers.getAliveWireUUIDs(),
│   │                                            pollerHelpers.findNodesByWireUUID()
│   │                                   Depends on: graph/graphState.js
│   ├── notifications.js            ← Missing-node notification with dedup cache
│   │                                   Exposes: pollerNotifier.pushMissingNotification()
│   │                                   Depends on: graph/graphState.js
│   ├── externalDeletions.js        ← Checks for comps/effects deleted outside Procedia
│   │                                   Exposes: pollerExternalDeletions.checkEffectDeletions(),
│   │                                            pollerExternalDeletions.checkExternalDeletions()
│   │                                   Depends on: bridge/evalBridge.js, graph/graphState.js,
│   │                                               graph/nodeRegistry.js
│   └── poller.js                    ← Adaptive AE polling (1s active / 5s idle)
│                                         Exposes: poller.start(), poller.stop()
│                                         Calls: evalBridge.dispatch({ action: 'pollAliveNodes' })
│                                         Respects isWriting flag — skips tick if true
│                                         Depends on: bridge/evalBridge.js, graph/graphState.js,
│                                                     polling/missingNodes.js, polling/notifications.js,
│                                                     polling/externalDeletions.js
│
├── graph/canvas/                       ← Canvas interaction & node DOM layer
│   ├── viewport.js, renderer.js, input/, minimap.js
│   └── drag.js                         ← onDrop handler + wire-insertion logic
│                                         Calls: engine.dropNode(), engine.connectWire(),
│                                                engine.disconnectWire(), graphState.removeWire()
│                                         Wire-insertion: stamps _transplantLayerUUID, re-wires
│                                         Depends on: graph/graphState/, graph/nodeRegistry.js
│
├── css/
│   ├── tokens.css                      ← Design tokens (colors, spacing, typography)
│   ├── base.css                        ← Global resets and layout
│   ├── topBar.css
│   ├── leftBar.css
│   ├── rightBar.css
│   ├── canvas.css
│   ├── node.css
│   └── bottomBar.css
│
└── jsx/                                ← ExtendScript (ES3 strict — loaded via evalBridge preamble)
    ├── json.jsx                        ← JSON polyfill — MUST be loaded first in preamble
    │                                     Exposes: JSON.stringify(), JSON.parse()
    │
    ├── utils.jsx                       ← Shared AE lookup utilities
    │                                     Exposes: findCompByUUID(uuid),
    │                                              findLayerByUUID(comp, uuid),
    │                                              findReservedComp(),
    │                                              findOrCreateReservedComp(),
    │                                              getAEVersion()
    │                                     Requires: json.jsx loaded first
    │
    ├── persistence.jsx                 ← Graph read/write to Reserved Comp text layers
    │                                     Exposes: readGraph(), writeGraph()
    │                                     Uses: __PROCEDIA_NODES__, __PROCEDIA_WIRES__ text layers
    │                                     Chunking: splits to _1, _2, ... if over char limit
    │                                     Requires: json.jsx, utils.jsx
    │
    └── dispatcher/
        ├── actions_schema.jsx          ← Schema cache, persistence & version handlers
        │                                 Exposes: _handleReadSchemaCache,
        │                                          _handleWriteSchemaCache,
        │                                          _handleGetAEVersion,
        │                                          _handleReadGraph, _handleWriteGraph,
        │                                          _pluginRootFolder()
        │                                 Requires: json.jsx, utils.jsx
        │
        ├── actions_comp.jsx            ← CompNode handlers
        │                                 Exposes: _handleCreateComp, _handleDeleteComp,
        │                                          _handleSetCompProperty, _handleFocusComp,
        │                                          _handleEnsureReservedComp,
        │                                          findOrCreateReservedComp()
        │                                 Requires: json.jsx, utils.jsx
        │
        ├── actions_layer.jsx           ← Layer create/delete/rename handlers
        │                                 Exposes: _handleCreateTextLayer,
        │                                          _handleCreateNullLayer,
        │                                          _handleCreateAdjustmentLayer,
        │                                          _handleCreateShapeLayer,
        │                                          _handleAddCompAsLayer,
        │                                          _handleDeletePathLayer,
        │                                          _handleRenameNode, _handleRestampLayer
        │                                 Requires: json.jsx, utils.jsx
        │
        ├── actions_property.jsx        ← Layer property/parent/order/blending handlers
        │                                 Exposes: _handleSetLayerProperty,
        │                                          _handleClearLayerParent,
        │                                          _handleSetLayerParent,
        │                                          _handleSetLayerOrder,
        │                                          _handleSetBlendingMode
        │                                 Requires: json.jsx, utils.jsx
        │
        ├── actions_park.jsx            ← Park/unpark/poll handlers
        │                                 Exposes: _handleParkLayer, _handleUnparkLayer,
        │                                          _handleDeleteParkedLayer,
        │                                          _handlePollAliveNodes
        │                                 Requires: json.jsx, utils.jsx, actions_comp.jsx
        │
        ├── actions_matte.jsx           ← Matte track-matte handlers
        │                                 Exposes: _handleSetLumaMatte,
        │                                          _handleSetAlphaMatte,
        │                                          _handleClearMatte
        │                                 Requires: json.jsx, utils.jsx
        │
        ├── actions_effect.jsx          ← Effect-related handlers
        │                                 Exposes: _handleApplyDynamicEffect,
        │                                          _handleRemoveEffect,
        │                                          _handleSetEffectProperty,
        │                                          _handleIntrospectEffect
        │                                 Requires: json.jsx, utils.jsx
        │
        └── dispatcher.jsx              ← THE ONLY EXTENDSCRIPT WRITER
                                          Entry: dispatch(commandJSON),
                                                 dispatchBatch(commandArrayJSON)
                                           Routes via: _route(cmd) — looks up _handlers map
                                          Defines: _handlers map, _cmdParams(),
                                                   _handleGeneric(), _route(),
                                                   dispatch(), dispatchBatch()
                                          Requires: json.jsx, utils.jsx, all actions_*.jsx
                                          Must load LAST in preamble

                                          Registered actions (from all actions_*.jsx):
                                            createComp, deleteComp, setCompProperty,
                                            focusComp, ensureReservedComp,
                                            createTextLayer, createNullLayer,
                                            createShapeLayer, createAdjustmentLayer,
                                            addCompAsLayer, deletePathLayer,
                                            renameNode, restampLayer,
                                            setLayerProperty, clearLayerParent,
                                            setLayerParent, setLayerOrder,
                                            setBlendingMode,
                                            parkLayer, unparkLayer,
                                            deleteParkedLayer, pollAliveNodes,
                                            setLumaMatte, setAlphaMatte, clearMatte,
                                            applyDynamicEffect, removeEffect,
                                            setEffectProperty, introspectEffect,
                                            readSchemaCache, writeSchemaCache,
                                            getAEVersion, readGraph, writeGraph
```

---

## Key Call Flows

### Node drop → AE layer created
```
graph/canvas/drag.js
  └─ engine.dropNode(nodeDef, x, y)
       ├─ graphState.addNode()
       └─ [if params:'dynamic'] schemaCache.getSchema() or introspectEffect
            └─ nodeMap[uuid].dynamicSchema populated → all secondary ports visible

  (wire drawn to CompNode)
  └─ engine.connectWire()
       └─ engine._firePathCreation(terminalWireId)
            ├─ stamps wireMap[id]._pathLayerUUID
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
            ├─ hasCompDownstream() — checks remaining live paths
            ├─ collectPathUpstream() — builds cascade set
            ├─ orders: effectors first, affected last
            ├─ calls node.onGhost() → command objects (batch)
            └─ evalBridge.dispatchBatch(batchArr)
                 └─ csInterface.evalScript (one crossing)
                      └─ dispatcher.jsx: actionParkLayer() → moves layer to Reserved Comp
```

### Property change → AE update
```
ui/inspector.js
  └─ graphState.updateProp(uuid, key, value)
       └─ dirtyFlusher.schedule()
            └─ [300ms debounce] dirtyFlusher.flush()
                 ├─ node.onPropertyChange(key, value, nodeData, hostingCompUUID)
                 └─ evalBridge.dispatch(commandObj)
                      └─ dispatcher.jsx: actionSetLayerProperty() → AE API
```

### Panel load → graph restored
```
index.js: init()
  └─ evalBridge.init(csInterface)          ← wires up csInterface
  └─ schemaCache.init()                    ← loads effectSchemaCache.json, diffs AE version
  └─ persistence.jsx: readGraph()          ← reads __PROCEDIA_NODES__ + __PROCEDIA_WIRES__ layers
  └─ graphState.loadGraph(parsed)          ← rebuilds nodeMap, wireMap, tempGraph
  └─ poller.start()                        ← begins alive-node polling
```

---

## Discrepancies: Spec vs Disk (May 2026)

| File | Status | Notes |
| ---- | ------ | ----- |
| `graph/portManager.js` | 🗑️ Removed | Extendable port slot lifecycle removed from arch_specs — concept deprecated |
| `graph/canvas/drag.js` | ✅ Exists | Wire-insertion drag handler |
| `graph/canvas/layerOrderList.js` | 🗑️ Removed | Drag-to-reorder stub — removed |
| `ui/settings.js` | ✅ Exists | Persistent key/value store (localStorage) |
| `ui/nodePicker/` (5 files) | ✅ Exists | Popup picker when dropping wire on empty canvas |
| `css/nodePicker.css` | ✅ Exists | Styles for node picker |
| `css/settingsModal.css` | ✅ Exists | Styles for settings modal |
| `data/effectSchemaCache.json` | ✅ Exists | Ships as `{ "aeVersion": "", "schemas": {} }` — matches arch_specs §20c |
| `graph/schemaCache/` (4 files) | ✅ Exists | Split from schemaCache.js: state.js, persistence.js, diff.js, index.js — resolved schema populates all secondary ports from drop (no spawning) |

---

## Code Documentation

File header comments (file description, dependency declarations, and public API) and JSDoc function-level comments have been added to every source file (`.js` and `.jsx`). Each file documents its own dependencies and exposed symbols.

---

*Update this file whenever files are added, moved, or removed.*
*Do not add architectural decisions here — those belong in the Architecture Specification.*
