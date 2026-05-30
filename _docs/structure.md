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
 4. graph/graphState.js
 5. graph/nodeRegistry.js
 6. graph/nodes/categories/core/Comp.js
 7. graph/nodes/categories/layers/Text.js
 8. graph/nodes/categories/layers/Null.js
 9. graph/nodes/categories/layers/Shape.js
10. graph/nodes/categories/layers/Adjustment.js
11. graph/nodes/categories/effects/FillEffect.js
12. graph/nodes/categories/effects/GaussianBlur.js
13. graph/nodes/categories/effects/DropShadow.js
14. graph/nodes/categories/data/Color.js
15. graph/nodes/categories/data/Number.js
16. graph/nodes/categories/utility/Blending.js
17. graph/nodes/categories/utility/MatteLuma.js
18. graph/nodes/categories/utility/MatteAlpha.js
19. graph/schemaCache.js                         ← after node defs, before engine
20. graph/cycleChecker.js
21. graph/portManager.js
22. graph/wireValidator.js
23. graph/cascadeAlgorithm.js
24. graph/engine.js
25. graph/canvas/viewport.js
26. graph/canvas/renderer.js
27. graph/canvas/input.js
28. graph/canvas/minimap.js
29. graph/wire/wireRenderer.js
30. graph/wire/wire.js
31. ui/nodeList.js
32. canvas/drag.js
33. ui/inspector.js
34. canvas/layerOrderList.js
35. ui/statusBar.js
36. canvas/keyboard.js
37. ui/settingsModal.js
38. flush/dirtyFlusher.js
39. polling/poller.js
40. notifications/notificationBar.js
41. ui/topBar.js
42. ui/bottomBar.js
43. ui/sidebarToggle.js
44. canvas/node.js
45. index.js
```

---

## File Tree

```
procedia/
│
├── index.html                          ← DOM shell + script load order (single source of truth)
├── index.js                            ← Panel entry point
│                                         Calls: evalBridge.init(), canvasView.init(),
│                                                nodeModel.init(), topBar.init(),
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
│                                         Written by: schemaCache.js via writeSchemaCache action
│                                         Ships as: { "aeVersion": "", "schemas": {} }
│
├── bridge/
│   └── evalBridge.js                   ← THE ONLY FILE that calls csInterface.evalScript()
│                                         Exposes: evalBridge.init(cs),
│                                                  evalBridge.dispatch(commandObj) → Promise,
│                                                  evalBridge.dispatchBatch(commandArr) → Promise
│                                         Calls: csInterface.evalScript()
│                                         Bootstraps preamble: json.jsx → utils.jsx → dispatcher.jsx
│                                         Depends on: lib/CSInterface.js, data/uuidGenerator.js
│
├── graph/
│   │
│   ├── graphState.js                   ← nodeMap, wireMap, tempGraph — ONLY mutator of graph state
│   │                                     Exposes: addNode(), removeNode(), updateNode(),
│   │                                              addWire(), removeWire(), updateWire(),
│   │                                              updateProp(), clearDirty(),
│   │                                              setSelection(uuid), getSelection(),
│   │                                              onSelectionChange(fn),
│   │                                              loadGraph(), clearGraph(), getTempGraph()
│   │                                     Depends on: data/uuidGenerator.js
│   │
│   ├── nodeRegistry.js                 ← Node definition registry
│   │                                     Exposes: nodeRegistry.register(def),
│   │                                              nodeRegistry.getDefinition(type),
│   │                                              nodeRegistry.getAll(),
│   │                                              nodeRegistry.getByCategory(cat),
│   │                                              nodeRegistry.listTypes()
│   │                                     Depends on: (none)
│   │
│   ├── schemaCache.js                  ← Dynamic effect schema cache (in-memory + disk)
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
│   │                                     Depends on: graph/graphState.js
│   │
│   ├── portManager.js                  ← Extendable port slot lifecycle
│   │                                     Exposes: portManager.spawnSlot(nodeId, portId),
│   │                                              portManager.removeSlot(nodeId, portId),
│   │                                              portManager.resolveSlotName(portId, index),
│   │                                              portManager.getOpenSlot(nodeId, portId),
│   │                                              portManager.afterDisconnect(nodeId, portId)
│   │                                     Depends on: graph/graphState.js, graph/nodeRegistry.js
│   │
│   ├── wireValidator.js                ← Wire type compatibility checks before connection
│   │                                     Exposes: wireValidator.canConnect(fromNode, fromPort,
│   │                                                                        toNode, toPort),
│   │                                              wireValidator.filterPickerList(wireType, nodeList)
│   │                                     Enforces: blending main_input ← affected only;
│   │                                               matte three-condition validation
│   │                                     Depends on: graph/graphState.js, graph/nodeRegistry.js
│   │
│   ├── cascadeAlgorithm.js             ← Ghost cascade logic
│   │                                     Exposes: cascadeAlgorithm.cascadeGhost(deletedWireId),
│   │                                              cascadeAlgorithm.hasCompDownstream(nodeId, excludeWireId),
│   │                                              cascadeAlgorithm.collectPathUpstream(nodeId),
│   │                                              cascadeAlgorithm.isCompNode(nodeId)
│   │                                     Calls: evalBridge.dispatchBatch() (one crossing per cascade)
│   │                                     Depends on: graph/graphState.js, graph/nodeRegistry.js,
│   │                                                  bridge/evalBridge.js
│   │
│   ├── engine.js                       ← Dumb executor — zero node-type conditionals
│   │                                     Exposes: engine.dropNode(nodeDef, x, y),
│   │                                              engine.deleteNode(nodeId),
│   │                                              engine.connectWire(fromNode, fromPort, toNode, toPort),
│   │                                              engine.disconnectWire(wireId),
│   │                                              engine._firePathCreation(terminalWireId)
│   │                                     Calls: node lifecycle hooks (onDrop, onAlive, onGhost,
│   │                                            onDelete, onPropertyChange),
│   │                                            evalBridge.dispatch() / dispatchBatch(),
│   │                                            cascadeAlgorithm.cascadeGhost(),
│   │                                            portManager.spawnSlot() / removeSlot(),
│   │                                            schemaCache.hasSchema() / getSchema() / storeSchema(),
│   │                                            dirtyFlusher.flush() (after _pathLayerUUID stamp)
│   │                                     Depends on: graph/graphState.js, graph/nodeRegistry.js,
│   │                                                  graph/cascadeAlgorithm.js, graph/portManager.js,
│   │                                                  graph/wireValidator.js, graph/schemaCache.js,
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
│   │   │                                 Depends on: graph/graphState.js, graph/nodeRegistry.js,
│   │   │                                              graph/canvas/viewport.js
│   │   ├── input.js                    ← Mouse and keyboard events on canvas
│   │   │                                 Depends on: graph/graphState.js, graph/canvas/viewport.js
│   │   └── minimap.js                  ← Minimap canvas render
│   │                                     Depends on: graph/graphState.js, graph/canvas/viewport.js
│   │
│   └── wire/
│       ├── wireRenderer.js             ← Bezier/direct/stepped wire drawing
│       │                                 Exposes: wireRenderer.drawAll(), wireRenderer.drawWire()
│       │                                 Reads: settings.get('wireStyle') per frame
│       │                                 Depends on: graph/graphState.js
│       └── wire.js                     ← Wire drag, commit, delete
│                                         Calls: engine.connectWire(), engine.disconnectWire(),
│                                                cascadeAlgorithm.cascadeGhost(),
│                                                portManager.afterDisconnect()
│                                         Depends on: graph/graphState.js, graph/wireValidator.js,
│                                                      graph/cycleChecker.js,
│                                                      graph/cascadeAlgorithm.js,
│                                                      graph/portManager.js
│
├── ui/
│   ├── nodeList.js                     ← Node palette — category collapse, search, drag source
│   │                                     Exposes: nodeList.init()
│   │                                     Depends on: graph/nodeRegistry.js
│   │
│   ├── inspector.js                    ← Inspector panel — renders node params
│   │                                     Exposes: inspector.init(), inspector.render(nodeData)
│   │                                     Renders static params (params array) and dynamic
│   │                                     (schema from nodeData.dynamicSchema)
│   │                                     Calls: graphState.updateProp() on change
│   │                                     Depends on: graph/graphState.js, graph/nodeRegistry.js
│   │
│   ├── statusBar.js                    ← Status bar: node/wire/alive/ghost counts, zoom level
│   │                                     Depends on: graph/graphState.js, graph/canvas/viewport.js
│   │
│   ├── settingsModal.js                ← Gear-button modal: minimap toggle, wire style select
│   │                                     Exposes: settingsModal.init(), settingsModal.open(),
│   │                                              settingsModal.close()
│   │                                     Depends on: ui/settings.js (not yet created)
│   │
│   ├── topBar.js                       ← Top bar chrome
│   │                                     Exposes: topBar.init()
│   │                                     Depends on: (none)
│   │
│   ├── bottomBar.js                    ← Bottom bar chrome
│   │                                     Exposes: bottomBar.init()
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
│                                         Depends on: graph/graphState.js, graph/nodeRegistry.js,
│                                                      bridge/evalBridge.js
│
├── polling/
│   └── poller.js                       ← Adaptive AE polling (1s active / 5s idle)
│                                         Exposes: poller.start(), poller.stop()
│                                         Calls: evalBridge.dispatch({ action: 'pollAliveNodes' })
│                                         Respects isWriting flag — skips tick if true
│                                         Depends on: bridge/evalBridge.js
│
├── notifications/
│   └── notificationBar.js              ← Panel-level notification bar
│                                         Exposes: notificationBar.show(msg, level),
│                                                  notificationBar.hide()
│                                         Depends on: (none)
│
├── canvas/                             ← Canvas interaction & node DOM layer
│   ├── canvasView.js                   ← Stub (moved to graph/canvas/viewport.js, not loaded)
│   ├── drag.js                         ← onDrop handler + wire-insertion logic
│   │                                     Calls: engine.dropNode(), engine.connectWire(),
│   │                                            engine.disconnectWire(), graphState.removeWire()
│   │                                     Wire-insertion: stamps _transplantLayerUUID, re-wires
│   │                                     Depends on: graph/graphState.js, graph/nodeRegistry.js
│   ├── keyboard.js                     ← Delete/Backspace shortcuts
│   │                                     Calls: engine.deleteNode(), wire.deleteSelected()
│   │                                     Depends on: graph/graphState.js
│   ├── layerOrderList.js               ← Drag-to-reorder for CompNode layer stacking
│   │                                     Calls: evalBridge.dispatch({ action: 'setLayerOrder' })
│   │                                     Depends on: graph/graphState.js
│   └── node.js                         ← nodeModel — node DOM layer, positioned divs
│                                         Exposes: nodeModel.init()
│                                         Depends on: canvas/canvasView.js (resolves to viewport.js)
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
    ├── polling.jsx                     ← Single multi-UUID alive check
    │                                     Exposes: pollAliveNodes(uuidListJSON)
    │                                     Requires: json.jsx, utils.jsx
    │
    └── dispatcher/
        └── dispatcher.jsx              ← THE ONLY EXTENDSCRIPT WRITER
                                          Entry: dispatch(commandJSON),
                                                 dispatchBatch(commandArrayJSON)
                                          Routes via: _route(action, params)
                                          Requires: json.jsx, utils.jsx loaded first

                                          Registered actions:
                                            createComp, createTextLayer, createNullLayer,
                                            createShapeLayer, createAdjustmentLayer,
                                            addCompAsLayer, parkLayer, unparkLayer,
                                            deleteParkedLayer, deletePathLayer, deleteComp,
                                            setLayerProperty, setCompProperty,
                                            setLayerParent, clearLayerParent,
                                            setLayerOrder, renameNode, focusComp,
                                            applyEffect, applyDynamicEffect,
                                            removeEffect, setEffectProperty,
                                            restampLayer, pollAliveNodes,
                                            setBlendingMode, setLumaMatte,
                                            setAlphaMatte, clearMatte,
                                            introspectEffect, readSchemaCache,
                                            writeSchemaCache, getAEVersion
```

---

## Key Call Flows

### Node drop → AE layer created
```
canvas/drag.js
  └─ engine.dropNode(nodeDef, x, y)
       ├─ graphState.addNode()
       ├─ [if params:'dynamic'] schemaCache.getSchema() or introspectEffect
       └─ portManager.spawnSlot() [for dynamic secondary ports]

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

*Update this file whenever files are added, moved, or removed.*
*Do not add architectural decisions here — those belong in the Architecture Specification.*
