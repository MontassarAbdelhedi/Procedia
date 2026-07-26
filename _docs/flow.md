# Procedia — All Scenarios & Flow of Command

> **Convention for node actions:** Each node type defines lifecycle hooks (`onDrop`, `onAlive`, `onGhost`, `onDelete`, `onPropertyChange`, `onDisable`, `onEnable`) that **return command objects** (action + params). The engine dispatches these via `evalBridge.dispatch()` (`bridge/evalBridge.js:99`) → `csInterface.evalScript()` → `dispatcher.jsx:85 dispatch(jsonStr)` routes by action string to the registered `_handle*` function (`dispatcher.jsx:40-78`). Below are all 17 node definitions and their exact hook→handler lines.

## Node Definitions — Lifecycle Hooks & Corresponding AE Handlers

| Node type | File | Hook | Returns action | Panel definition line | Dispatcher handler line |
|---|---|---|---|---|---|---|
| `core/comp` | `Core/Comp.js` | `onDrop` | `createComp` | `Comp.js:41-53` | `actions_comp.jsx:30 _handleCreateComp` |
| `core/comp` | `Core/Comp.js` | `onAlive` | `createComp` | `Comp.js:71-92` | `actions_comp.jsx:30 _handleCreateComp` |
| `core/comp` | `Core/Comp.js` | `onDelete` | `deleteComp` | `Comp.js:56-63` | `actions_comp.jsx:60 _handleDeleteComp` |
| `core/comp` | `Core/Comp.js` | `onPropertyChange` | `setCompProperty` | `Comp.js:101-111` | `actions_comp.jsx:83 _handleSetCompProperty` |
| `core/comp` | `Core/Comp.js` | `onDisable` | `setLayerEnabled` | `Comp.js:119-129` | — |
| `core/comp` | `Core/Comp.js` | `onEnable` | `setLayerEnabled` | `Comp.js:137-147` | — |
| `core/footage` | `Core/Footage.js` | `onDrop` | `null` (no-op) | `Footage.js:23-25` | — |
| `core/footage` | `Core/Footage.js` | `onAlive` | `createFootageLayer` | `Footage.js:27-36` | — |
| `core/footage` | `Core/Footage.js` | `onGhost` | `parkLayer` | `Footage.js:38-46` | `actions_park.jsx:16 _handleParkLayer` |
| `core/footage` | `Core/Footage.js` | `onDelete` | `deleteFootageItem` | `Footage.js:48-55` | — |
| `core/footage` | `Core/Footage.js` | `onPropertyChange` | `setLayerProperty` | `Footage.js:57-67` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `layers/text` | `Layers/Text.js` | `onDrop` | `null` (no-op) | `Text.js:42-44` | — |
| `layers/text` | `Layers/Text.js` | `onAlive` | `createTextLayer` | `Text.js:52-67` | `actions_layer.jsx:18 _handleCreateTextLayer` |
| `layers/text` | `Layers/Text.js` | `onGhost` | `parkLayer` | `Text.js:75-83` | `actions_park.jsx:16 _handleParkLayer` |
| `layers/text` | `Layers/Text.js` | `onDelete` | `deleteParkedLayer` | `Text.js:90-97` | `actions_park.jsx:114 _handleDeleteParkedLayer` |
| `layers/text` | `Layers/Text.js` | `onPropertyChange` | `setLayerProperty` | `Text.js:107-117` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `layers/null` | `Layers/Null.js` | `onDrop` | `null` (no-op) | `Null.js:40-42` | — |
| `layers/null` | `Layers/Null.js` | `onAlive` | `createNullLayer` | `Null.js:50-63` | `actions_layer.jsx:63 _handleCreateNullLayer` |
| `layers/null` | `Layers/Null.js` | `onGhost` | `parkLayer` | `Null.js:71-79` | `actions_park.jsx:16 _handleParkLayer` |
| `layers/null` | `Layers/Null.js` | `onDelete` | `deleteParkedLayer` | `Null.js:86-93` | `actions_park.jsx:114 _handleDeleteParkedLayer` |
| `layers/null` | `Layers/Null.js` | `onPropertyChange` | `setLayerProperty` | `Null.js:103-113` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `layers/shape` | `Layers/Shape.js` | `onDrop` | `null` (no-op) | `Shape.js:41` | — |
| `layers/shape` | `Layers/Shape.js` | `onAlive` | `createShapeLayer` | `Shape.js:49-63` | `actions_layer.jsx:109 _handleCreateShapeLayer` |
| `layers/shape` | `Layers/Shape.js` | `onGhost` | `parkLayer` | `Shape.js:71-79` | `actions_park.jsx:16 _handleParkLayer` |
| `layers/shape` | `Layers/Shape.js` | `onDelete` | `deleteParkedLayer` | `Shape.js:86-93` | `actions_park.jsx:114 _handleDeleteParkedLayer` |
| `layers/shape` | `Layers/Shape.js` | `onPropertyChange` | `setLayerProperty` | `Shape.js:103-113` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `layers/adjustment` | `Layers/Adjustment.js` | `onDrop` | `null` (no-op) | `Adjustment.js:40` | — |
| `layers/adjustment` | `Layers/Adjustment.js` | `onAlive` | `createAdjustmentLayer` | `Adjustment.js:48-61` | `actions_layer.jsx:89 _handleCreateAdjustmentLayer` |
| `layers/adjustment` | `Layers/Adjustment.js` | `onGhost` | `parkLayer` | `Adjustment.js:69-77` | `actions_park.jsx:16 _handleParkLayer` |
| `layers/adjustment` | `Layers/Adjustment.js` | `onDelete` | `deleteParkedLayer` | `Adjustment.js:84-91` | `actions_park.jsx:114 _handleDeleteParkedLayer` |
| `layers/adjustment` | `Layers/Adjustment.js` | `onPropertyChange` | `setLayerProperty` | `Adjustment.js:101-111` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `effects/fill` | `Effects/Blur & Sharpen/FillEffect.js` | `onDrop` | `null` (no-op) | `FillEffect.js:43` | — |
| `effects/fill` | `Effects/Blur & Sharpen/FillEffect.js` | `onAlive` | `applyDynamicEffect` | `FillEffect.js:52-63` | `actionEffect/apply.jsx _handleApplyDynamicEffect` |
| `effects/fill` | `Effects/Blur & Sharpen/FillEffect.js` | `onGhost` | `removeEffect` | `FillEffect.js:72-82` | `actionEffect/apply.jsx _handleRemoveEffect` |
| `effects/fill` | `Effects/Blur & Sharpen/FillEffect.js` | `onDelete` | `null` (no-op) | `FillEffect.js:85` | — |
| `effects/fill` | `Effects/Blur & Sharpen/FillEffect.js` | `onPropertyChange` | `setEffectProperty` | `FillEffect.js:96-108` | `actionEffect/apply.jsx _handleSetEffectProperty` |
| `effects/gaussian-blur` | `Effects/Blur & Sharpen/GaussianBlur.js` | `onDrop` | `null` (no-op) | `GaussianBlur.js:44` | — |
| `effects/gaussian-blur` | `Effects/Blur & Sharpen/GaussianBlur.js` | `onAlive` | `applyDynamicEffect` | `GaussianBlur.js:53-64` | `actionEffect/apply.jsx _handleApplyDynamicEffect` |
| `effects/gaussian-blur` | `Effects/Blur & Sharpen/GaussianBlur.js` | `onGhost` | `removeEffect` | `GaussianBlur.js:73-83` | `actionEffect/apply.jsx _handleRemoveEffect` |
| `effects/gaussian-blur` | `Effects/Blur & Sharpen/GaussianBlur.js` | `onDelete` | `null` (no-op) | `GaussianBlur.js:86` | — |
| `effects/gaussian-blur` | `Effects/Blur & Sharpen/GaussianBlur.js` | `onPropertyChange` | `setEffectProperty` | `GaussianBlur.js:97-109` | `actionEffect/apply.jsx _handleSetEffectProperty` |
| `effects/drop-shadow` | `Effects/Blur & Sharpen/DropShadow.js` | `onDrop` | `null` (no-op) | `DropShadow.js:44` | — |
| `effects/drop-shadow` | `Effects/Blur & Sharpen/DropShadow.js` | `onAlive` | `applyDynamicEffect` | `DropShadow.js:53-64` | `actionEffect/apply.jsx _handleApplyDynamicEffect` |
| `effects/drop-shadow` | `Effects/Blur & Sharpen/DropShadow.js` | `onGhost` | `removeEffect` | `DropShadow.js:73-83` | `actionEffect/apply.jsx _handleRemoveEffect` |
| `effects/drop-shadow` | `Effects/Blur & Sharpen/DropShadow.js` | `onDelete` | `null` (no-op) | `DropShadow.js:86` | — |
| `effects/drop-shadow` | `Effects/Blur & Sharpen/DropShadow.js` | `onPropertyChange` | `setEffectProperty` | `DropShadow.js:97-109` | `actionEffect/apply.jsx _handleSetEffectProperty` |
| `data/color` | `Data/Color.js` | all hooks | `null` (no-op) | `Color.js:35-43` | — |
| `data/number` | `Data/Number.js` | all hooks | `null` (no-op) | `Number.js:35-43` | — |
| `utility/blending` | `Effects/utility/Blending.js` | all hooks | `null` (no-op) | `Blending.js:36-44` | — |
| `utility/matte-luma` | `Effects/utility/MatteLuma.js` | `onDrop` | `null` (no-op) | `MatteLuma.js:36` | — |
| `utility/matte-luma` | `Effects/utility/MatteLuma.js` | `onAlive` | `setLumaMatte` | `MatteLuma.js:45-55` | `actions_matte.jsx:16 _handleSetLumaMatte` |
| `utility/matte-luma` | `Effects/utility/MatteLuma.js` | `onGhost` | `clearMatte` | `MatteLuma.js:64-73` | `actions_matte.jsx:61 _handleClearMatte` |
| `utility/matte-luma` | `Effects/utility/MatteLuma.js` | `onDelete` | `null` (no-op) | `MatteLuma.js:76` | — |
| `utility/matte-luma` | `Effects/utility/MatteLuma.js` | `onPropertyChange` | `setLayerProperty` | `MatteLuma.js:87-97` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `utility/matte-alpha` | `Effects/utility/MatteAlpha.js` | `onDrop` | `null` (no-op) | `MatteAlpha.js:36` | — |
| `utility/matte-alpha` | `Effects/utility/MatteAlpha.js` | `onAlive` | `setAlphaMatte` | `MatteAlpha.js:45-55` | `actions_matte.jsx:39 _handleSetAlphaMatte` |
| `utility/matte-alpha` | `Effects/utility/MatteAlpha.js` | `onGhost` | `clearMatte` | `MatteAlpha.js:64-73` | `actions_matte.jsx:61 _handleClearMatte` |
| `utility/matte-alpha` | `Effects/utility/MatteAlpha.js` | `onDelete` | `null` (no-op) | `MatteAlpha.js:76` | — |
| `utility/matte-alpha` | `Effects/utility/MatteAlpha.js` | `onPropertyChange` | `setLayerProperty` | `MatteAlpha.js:87-97` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `core/merge` | `Core/Merge.js` | all hooks | `null` (no-op) | `Merge.js:24-28` | — |
| `core/multimerge` | `Core/Multimerge.js` | all hooks | `null` (no-op) | `Multimerge.js:23-27` | — |
| `shapes/rectangle` | `Shapes/Rectangle.js` | `onDrop` | `null` (no-op) | `Rectangle.js:55` | — |
| `shapes/rectangle` | `Shapes/Rectangle.js` | `onAlive` | `createRectangleLayer` | `Rectangle.js:57-76` | — |
| `shapes/rectangle` | `Shapes/Rectangle.js` | `onGhost` | `parkLayer` | `Rectangle.js:78-86` | `actions_park.jsx:16 _handleParkLayer` |
| `shapes/rectangle` | `Shapes/Rectangle.js` | `onDelete` | `deleteParkedLayer` | `Rectangle.js:88-95` | `actions_park.jsx:114 _handleDeleteParkedLayer` |
| `shapes/rectangle` | `Shapes/Rectangle.js` | `onPropertyChange` | `setLayerProperty` | `Rectangle.js:97-107` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `shapes/rectangle` | `Shapes/Rectangle.js` | `onDisable` | `setLayerEnabled` | `Rectangle.js:109-119` | — |
| `shapes/rectangle` | `Shapes/Rectangle.js` | `onEnable` | `setLayerEnabled` | `Rectangle.js:121-131` | — |

## Startup & Shutdown

1. **Panel startup** — `index.js:init()` first runs `_checkModule()` (`index.js` startup diagnostic that renders an error card if required modules are missing), then calls `evalBridge.init()` (`bridge/evalBridge.js:203`) which loads the entire JSX preamble (json.jsx → utils.jsx → persistence → barrels `actions_*.jsx` which `$.evalFile` their `action*/` subdirectories → `dispatcher.jsx`) into AE via `csInterface.evalScript()` with a probe-and-retry loop, then on ready (`evalBridge.onReady()`, `bridge/evalBridge.js:185`) calls `schemaCache.init()` (`graph/schemaCache/index.js`), chains `evalBridge.dispatch({action:'ensureReservedComp'})` (`jsx/dispatcher/actions_comp.jsx:ensureReservedComp`), then `evalBridge.dispatch({action:'readGraph'})` (`jsx/persistence.jsx:readGraph`), then `graphState.loadGraph()` (`graph/graphState/graphOps.js:loadGraph`) — for restored effector nodes triggers schema resolution; the keyframe state is rebuilt via `_syncKeyframeState(allNodes)` (`index.js`) which dispatches `batchGetKeyframeTimes`; then `commentManager.init()` (`index.js`), `renderer.render()`, `poller.start()` (`polling/poller.js`), then `presetModal.init()` / `compList.init()` / `graphSearch.init()` / `tipField.init()` (`index.js`), then `statusBar.refresh()`, and finally — at the very end of the startup chain — `walkthrough.init()` (`index.js:222`).

2. **Panel shutdown (save)** — `index.js` `window.beforeunload` calls `evalBridge.fireAndForget({action:'writeGraph', params: graphData})` (not `dispatch` — `fireAndForget` is best-effort one-shot, `bridge/evalBridge.js`). The shipped `graphData` payload now includes a `keyframes` snapshot pulled from `keyframeState.getAllKeyframedParams()` per node — persistence thus round-trips keyframe state across panel reloads. `writeGraph` (`jsx/persistence.jsx`) serializes the graph + keyframes back to the `__PROCEDIA_NODES__` and `__PROCEDIA_WIRES__` text layers in the Reserved Comp, then `poller.stop()` (`polling/poller.js`) is called.

3. **Panel reload** — `ui/topBar/index.js:74` reload btn click calls `window.location.reload()`.

## Node Creation (Drop & Duplicate)

4. **Drag node from node list to empty canvas** — `ui/nodeList/dragdrop.js:21` `__nl_dragdrop.wireCanvasDrop()` on mouseup hits canvas-wrap → calls `viewport.screenToCanvas()` (`graph/canvas/viewport.js`) → `engine.dropNode()` (`graph/engine/nodes/dropNode.js:31`) which calls `uuidGenerator.node()` (`data/uuidGenerator.js`), `hlp.buildInitialProps()` (`graph/engine/helpers.js:buildInitialProps`), `graphState.addNode()` (`graph/graphState/nodes.js:addNode`), `hlp.refreshNodeUI()`, and for data/blending/matte nodes sets `state:'alive'` immediately, for effector nodes resolves dynamic schema via `hlp.resolveDynamicSchema()` (`graph/engine/helpers.js:resolveDynamicSchema`) + `schemaCache.fetchSchema()` (`graph/schemaCache/index.js:fetchSchema`) + `engine._applyDynamicSchema()` (`graph/engine/helpers.js:applyDynamicSchema`), for affected nodes calls `def.onDrop(nodeData)` then `evalBridge.dispatch(command)` which on success sets `state:'alive'` → then `graphState.setSelection()` (`graph/graphState/selection.js:setSelection`) → `renderer.render()` → `wireRenderer.render(null)` → `inspector.refresh()` → `statusBar.refresh()`.

5. **Drag node onto existing wire (mid-path insertion)** — `ui/nodeList/dragdrop.js:87` `canvasDrag.findWireAt()` (`graph/canvas/drag/hitTest.js`) hits a wire → `canvasDrag.insertNodeOnWire()` (`graph/canvas/drag/insert.js`) creates node data with `_transplantLayerUUID` copied from the existing wire, calls `graphState.addNode()`, `schemaCache.fetchSchema()` for effector nodes, `graphState.removeWire(wireId)`, then `engine.connectWire(wire.fromNode→node.main_input)` and `engine.connectWire(node.output→wire.toNode)` → `graphState.setSelection()` → `renderer.render()` → `wireRenderer.render()` → `inspector.refresh()` → `statusBar.refresh()`.

6. **Duplicate selected nodes** — `ui/topBar/index.js:48` dupe btn click → `engine.duplicateSelectedNodes()` (`graph/engine/nodes/duplicateNode.js:23`) iterates `graphState.getSelection()`, deep-copies each node (excluding id/dirty/`_transplantLayerUUID`) with `uuidGenerator.node()`, +30 offset on x/y, empty `hostingComps`, `state:'ghost'` for non-data nodes, calls `graphState.addNode()` for each, then `graphState.replaceSelection(newIds)`.

## Wire Creation & Connection

7. **Drag wire from source port to target port** — `graph/wire/wire.js:111` `wireTool._onMouseDown()` on `.port-dot` → `_findPortDef()` to identify source port → starts drag state, calls `wireRenderer.render({from,to})` (`graph/wire/wireRenderer/render.js`) to show preview → `wireTool._onMouseMove()` (`wire.js:148`) updates preview → `wireTool._onMouseUp()` (`wire.js:162`) on target `.port-dot` → `_findPortDef()` to identify target port → `engine.connectWire(fromNode, fromPort, toNodeId, toPort)` → `wireRenderer.render(null)`.

8. **Drag wire to empty canvas (node picker creation)** — `wireTool._onMouseUp()` (`graph/wire/wire.js:162`) on empty canvas-wrap → `nodePicker.show(clientX, clientY, fromNode, fromPort, wireType)` (`ui/nodePicker/index.js:45`) calls `__np_compat.compatibleNodes(wireType)` (`ui/nodePicker/compatibility.js`) which filters `nodeRegistry.getAll()` by matching input port type, renders popup via `__np_render`, and returns a Promise → on user selection `close(type)` (`ui/nodePicker/index.js:122`) calls `nodeRegistry.getDefinition(type)`, `viewport.screenToCanvas()`, `engine.dropNode(def, canvasX, canvasY)`, then `engine.connectWire(fromNodeId, fromPortId, node.id, 'main_input')`, then `graphState.setSelection(node.id)`, `renderer.render()`, `wireRenderer.render(null)`, `inspector.refresh()`, `statusBar.refresh()`.

9. **Engine connect wire (core logic)** — `graph/engine/wires.js:38` `connectWire(fromNodeId, fromPort, toNodeId, toPort, boundParam)` looks up node data/definitions, determines `wireType` from source port, calls `wireValidator.canConnect()` (`graph/wireValidator/canConnect.js`) which checks port existence/type compatibility/capacity/`cycleChecker.hasCycle()` (`graph/cycleChecker.js:22`), then calls `uuidGenerator.wire()`, `graphState.addWire(wireData)`, `hlp.refreshNodeUI()`, then branches by wire type: for `parent` wires calls `evalBridge.dispatch({action:'setLayerParent'})` (`jsx/dispatcher/actions_property.jsx:setLayerParent`); for `data` wires calls `graphState.updateProp()` (`graph/graphState/props.js:updateProp`) and `dirtyFlusher.schedule()`; for layer-to-comp wires calls `prop.firePathCreation(wireData.id)` (`graph/engine/propagate.js:204`); for matte targets calls `prop.checkMatteActivation(toNodeId)` (`graph/engine/propagate.js:151`); for nodes with existing `hostingComps` calls `prop.propagateAlive(fromNodeId, hostingComp, pathLayerUUID)` (`graph/engine/propagate.js:31`).

10. **Cycle detection** — `graph/wireValidator/canConnect.js` calls `cycleChecker.hasCycle(fromNodeId, toNodeId)` (`graph/cycleChecker.js:22`) which DFS-walks from toNodeId through all layer wires and returns true if fromNodeId is reachable, preventing circular layer dependencies.

## Wire Deletion & Cascade Ghost

11. **Disconnect wire** — `graph/engine/wires.js:148` `disconnectWire(wireId)` looks up wire data, then branches: for `parent` wires calls `evalBridge.dispatch({action:'clearLayerParent'})` (`jsx/dispatcher/actions_property.jsx:clearLayerParent`) then `graphState.removeWire()` and `hlp.refreshNodeUI()`; for `data` wires directly `graphState.removeWire()`; for `layer` wires calls `cascadeAlgorithm.cascadeGhost(wireId)` (`graph/cascade/cascadeGhost/ghost.js`) then `hlp.refreshNodeUI()`.

12. **Cascade ghost on layer wire delete** — `cascadeGhost(deletedWireId)` (`graph/cascade/cascadeGhost/ghost.js`) looks up wire, rejects non-layer types, identifies source node, checks `util._hasCompDownstreamExcluding()` (`graph/cascade/utils.js:_hasCompDownstreamExcluding`), collects upstream nodes via `util.collectPathUpstream()` (`graph/cascade/utils.js:collectPathUpstream`), separates into effectors-first then affected-last order, computes `losingComps` per node by comparing `hostingComps` against remaining comps, builds `onGhost` batch commands (effectors get `upstreamNodeUUID`, affected get `layerUUID` from `_pathLayerUUID`), calls `evalBridge.dispatchBatch(commands)` (`bridge/evalBridge.js:135`), updates each node's `hostingComps`/`state`/`hasParkedLayer`, clears `_pathLayerUUID` on the deleted wire, calls `graphState.removeWire()`, then `graphState.rebuildTempGraph()` (`graph/graphState/tempGraph.js:rebuildTempGraph`).

## Node Lifecycle (Delete)

13. **Delete selected nodes** — `graph/engine/nodes/deleteNode.js:140` `deleteSelectedNodes()` iterates selection → `deleteNode(nodeId)` (`graph/engine/nodes/deleteNode.js:29`) which branches by `nodeKind`: for `data` nodes calls `def.onDelete()` then `evalBridge.dispatch()`; for `blending`/`matte` nodes builds `onGhost` batch per hosting comp (effector upstream UUID resolution or matte top_layer UUID), calls `evalBridge.dispatchBatch()` then `def.onDelete()` then `evalBridge.dispatch()`; for `affected`/`effector` nodes builds `onGhost` batch per alive hosting comp, calls `evalBridge.dispatchBatch()`, then for comp nodes iterates all layer terminal wires calling `cascadeAlgorithm.cascadeGhost()` for each, for non-comp nodes cascades all incoming layer wires, then calls `def.onDelete()` → `evalBridge.dispatch()` → `graphState.removeNode(nodeId)` → `hlp.refreshNodeUI()` → `graphState.removeFromSelection(nodeId)`.

14. **Delete selected wire (keyboard)** — `graph/canvas/input/handlers/keyboard.js:42` `onKeyDown()` Delete/Backspace when `_selectedWireId` is set → `engine.disconnectWire(wireId)` then `wireRenderer.render(null)`.

## Propagation & Lifecycle

15. **Propagate alive upstream** — `graph/engine/propagate.js:31` `propagateAlive(nodeId, hostingCompUUID, pathLayerUUID)` checks `hostingComps` for duplicates, for transplant nodes (`_transplantLayerUUID`) dispatches `{action:'restampLayer'}` (`jsx/dispatcher/actions_layer.jsx:restampLayer`), updates node with `state:'alive'` and clears transplant, then recurses upstream; for affected nodes with `hasParkedLayer` dispatches `{action:'unparkLayer'}` (`jsx/dispatcher/actions_park.jsx:unparkLayer`), without parked layer calls `def.onAlive(nodeData, hostingCompUUID)` and injects `layerUUID`; for effector nodes calls `def.onAlive(nodeData, hostingCompUUID, pathLayerUUID)`; for blending nodes calls `def.onAlive(nodeData, hostingCompUUID, pathLayerUUID)`; then appends `hostingCompUUID` to `hostingComps`, sets `state:'alive'`, clears `hasParkedLayer`, recursively walks upstream layer wires skipping data/matte nodes, then dispatches each `onAlive` command via `evalBridge.dispatch()` and sets `state:'error'` on failure.

16. **Fire path creation (terminal wire to comp)** — `graph/engine/propagate.js:204` `firePathCreation(terminalWireId)` sets `_pathLayerUUID: terminalWireId` on the wire data via `graphState.updateWire()`, resolves `hostingCompUUID` from the comp node, calls `propagateAlive(wireData.fromNode, hostingCompUUID, terminalWireId)`, then calls `dirtyFlusher.flush()`.

17. **Matte activation check** — `graph/engine/propagate.js:151` `checkMatteActivation(matteNodeId)` scans wires for `top_layer` and `matte_layer` inputs, finds path layer UUIDs via `hlp.findPathLayerUUID()` (`graph/engine/helpers.js:findPathLayerUUID`), verifies both upstream nodes share the same `hostingComps[0]`, finds the output layer wire targetting that comp, then calls `def.onAlive(matteNodeData, sharedCompUUID, topLayerUUID, matteLayerUUID)` and dispatches via `evalBridge.dispatch()`.

## Canvas Interaction

18. **Click node to select** — `graph/canvas/input/handlers/mouse/mousedown.js` `onMouseDown()` on `.node` → `nodeEl.getAttribute('data-node-id')` → for ctrl/meta: `graphState.toggleSelection()`; for shift: `graphState.addToSelection()` or `removeFromSelection()`; plain: `graphState.setSelection()` if not already selected → `renderer.render()` → triggers `graphState.onSelectionChange()` callback chain → `wireRenderer.render(null)` → `inspector.refresh()` → `statusBar.refresh()` → `topBar.refreshSelection(sel)` → `nodeToolbar.refresh()`.

19. **Click empty canvas (rubberband multi-select)** — `onMouseDown()` on empty (`graph/canvas/input/handlers/mouse/mousedown.js`) → `canvasDrag.findWireAt()` misses → `graphState.clearSelection()` if no modifier → `_inpRubber.active` → `inputRubberband.createRubberEl()` → `onMouseMove()` (`graph/canvas/input/handlers/mouse/mousemove.js`) calls `inputRubberband.updateRubberEl()` → `onMouseUp()` (`graph/canvas/input/handlers/mouse/mouseup.js`) calls `inputRubberband.getNodesInRect()` → `graphState.replaceSelection()` with ctrl/shift modifier logic → `renderer.render()` → `inputRubberband.destroyRubberEl()`.

20. **Click wire to select** — `onMouseDown()` (`graph/canvas/input/handlers/mouse/mousedown.js`) → `canvasDrag.findWireAt(clientX, clientY)` (`graph/canvas/drag/hitTest.js`) returns wire via `hitTestWire()` (`graph/canvas/drag/hitTest.js`) using bezier/direct/stepped distance sampling → `_selectedWireId = wire.id` → `graphState.clearSelection()` → `renderer.render()` → `wireRenderer.render(null)`.

21. **Drag node on canvas** — `onMouseDown()` on node (`graph/canvas/input/handlers/mouse/mousedown.js`) → `_inpDrag.active`, captures `dragStartCanvas` via `viewport.screenToCanvas()`, stores `nodeStartPos` and `selectionStartPositions` for all selected nodes → `onMouseMove()` (`graph/canvas/input/handlers/mouse/mousemove.js`) computes delta from drag start, calls `graphState.updateNode(draggedNodeId, {x,y})`, then for each other selected node calls `graphState.updateNode(selId, {x,y})` and `renderer.getNodeElement(selId).style` updates for immediate DOM feedback → `wireRenderer.render(null)` → `minimap.render()`.

22. **Pan canvas** — `onKeyDown()` (`keyboard.js:33`) Space sets `_inpSpaceHeld` → `onMouseDown()` (`graph/canvas/input/handlers/mouse/mousedown.js`) with button 1 or button 0+Space → `_inpPan.active` → `onMouseMove()` (`graph/canvas/input/handlers/mouse/mousemove.js`) calls `viewport.setPan(startPan.x + dx, startPan.y + dy)` (`graph/canvas/viewport.js:setPan`) → `onMouseUp()` clears pan.

23. **Zoom canvas** — `graph/canvas/input/handlers/wheel.js` `onWheel()` calls `viewport.setZoom()` (`graph/canvas/viewport.js:setZoom`) with mouse position as zoom origin.

24. **Double-click comp node (focus in AE)** — `graph/canvas/input/handlers/mouse/click.js` `onClick()` on a `core/comp` node sets a 280ms timer → `evalBridge.dispatch({action:'focusComp', params:{nodeUUID:nodeId}})` (`jsx/dispatcher/actions_comp.jsx:focusComp`).

25. **Double-click node title (inline edit)** — `graph/canvas/input/handlers/titleEdit/dblclick.js` `onDblClick()` makes title `contenteditable` → Enter key in `onKeyDown()` (`keyboard.js:22`) calls `commitTitleEdit()` which dispatches `evalBridge.dispatch({action:'renameNode'})` (`jsx/dispatcher/actions_layer.jsx:renameNode`); Escape calls `cancelTitleEdit()`.

## Property System & Dirty Flush

26. **Inspector property change** — `ui/inspector/events.js:31/41` `onInspectorChange/Input` reads `data-node-id`, `data-param-key`, `data-param-type`, parses value via `__ins_vm.parseInputValue()` (`ui/inspector/viewModel.js:parseInputValue`), calls `engine.setNodeProperty(nodeId, key, parsedValue)` (`graph/engine/state.js:57`) which calls `graphState.updateProp(nodeId, key, value)` (`graph/graphState/props.js:updateProp`) marking it dirty, and if the node is a data node with non-label key calls `hlp.propagateDataValue(nodeId, key, value)` (`graph/engine/helpers.js:propagateDataValue`) to push the value downstream, then calls `dirtyFlusher.schedule()` (`flush/dirtyFlusher.js:147`).

27. **Dirty flush to AE (debounced)** — `dirtyFlusher.schedule()` (`flush/dirtyFlusher.js:147`) cancels any pending timer and sets `setTimeout(flush, 300)` → `flush()` (`dirtyFlusher.js:130`) iterates `graphState.getAllNodes()`, for each dirty alive node with hostingComps resolves `pathLayerUUID` via `_findPathLayerUUID()` (upstream walk) or `_resolveUpstreamNodeUUID()` for effectors, calls `def.onPropertyChange(key, value, nodeData, hostingCompUUID, upstreamNodeUUID)` to build commands, then chains `evalBridge.dispatch(command)` for each, and on success calls `graphState.clearDirty(nodeId)`.

28. **Data value propagation downstream** — `hlp.propagateDataValue()` (`graph/engine/helpers.js:propagateDataValue`) scans wires from the data node, for each downstream node calls `graphState.updateProp(targetNodeId, targetPort, value)` and `dirtyFlusher.schedule()`.

## Error Recovery

29. **Recreate errored node** — `ui/inspector/events.js:64` `onRecoverClick` with `data-action="recreate"` → `engine.recreateNode(nodeId)` (`graph/engine/nodes/recreateNode.js:27`) checks `state === 'error'`, then for comp nodes calls `def.onAlive(nodeData, null)` → `evalBridge.dispatch()` and sets `state:'alive'` on success; for affected nodes calls `def.onAlive(nodeData, hostUUID)` with `pathLayerUUID` from `hlp.findPathLayerUUID()` → `evalBridge.dispatch()`; for effectors calls `def.onAlive(nodeData, hostUUID, upstreamUUID)` resolved from main_input wire → `evalBridge.dispatch()`; for blending calls `def.onAlive(nodeData, hostUUID, blendUpstreamUUID)` resolved from main_input → `evalBridge.dispatch()`; for matte calls `def.onAlive(nodeData, hostUUID, matteTopUUID, matteLayerUUID)` resolved from top_layer/matte_layer wires → `evalBridge.dispatch()`.

30. **Remove errored node** — `ui/inspector/events.js:71` `onRecoverClick` with `data-action="remove"` → `evalBridge.dispatch({action:'writeGraph'})` then `engine.deleteNode(nodeId)`.

## Layer Management

31. **Layer order buttons** — `ui/inspector/events.js:82` `onLayerActionClick` with `.inspector-layer-btn` → `evalBridge.dispatch({action:'setLayerOrder', params:{layerUUID, hostingCompUUID, direction}})` (`jsx/dispatcher/actions_property.jsx:setLayerOrder`).

32. **Lock/unlock selected nodes** — `graph/engine/nodes/lockNode.js:22` `toggleLockSelectedNodes()` checks if all selected nodes are already locked → toggles `locked` property on each via `graphState.updateNode()` → `hlp.refreshNodeUI()`.

## Polling System

33. **Polling tick (aliveness + property sync)** — `polling/poller.js` `_tick()` (called every 500ms when active, 2000ms when idle — see scenario 37) skips if `_isWriting`, calls `pollerHelpers.getAliveWireUUIDs()` (`polling/missingNodes.js:getAliveWireUUIDs`) to collect all non-null `_pathLayerUUID` from live layer wires, dispatches `evalBridge.dispatch({action:'pollAliveNodes', params:{uuidListJSON}})` (`jsx/dispatcher/actions_park.jsx:pollAliveNodes`), on response resolves missing UUIDs to node IDs via `pollerHelpers.findNodesByWireUUID()`, calls `_onNodesMissing(nodeIds)` which for each node calls `_handleMissingNode(uuid)` — skips effector nodes without `main_input` wires (cascaded), otherwise sets `graphState.updateNode(uuid, {state:'error'})` and calls `pollerNotifier.pushMissingNotification(uuid)`. After the aliveness check the poller also calls `propertyPoller.poll()` and `propertyPoller.pollEffects()` (`polling/propertyPoller.js`), which dispatch `batchGetLayerProperties` / `batchGetEffectProperties` and apply AE-side edits back to `nodeMap` via `graphState.updateProp` (skipping nodes that are currently `dirty` or have a pending `_flushCount` to avoid racing the dirty flusher), then `renderer.render()`, `wireRenderer.render(null)`, `inspector.refresh()`, `statusBar.refresh()` (typically funneled through `refreshUI()` / the RAF-batched `_uiScheduler`).

34. **Poll external comp deletions** — `polling/externalDeletions.js:74` `checkExternalDeletions()` collects UUIDs of all alive `core/comp` nodes, dispatches `{action:'pollExternalDeletions', params:{compNodeUUIDs}}` (`jsx/dispatcher/actions_schema.jsx:pollExternalDeletions`), passes missing comp UUIDs to `onMissing()` callback.

35. **Poll external effect deletions** — `polling/externalDeletions.js:12` `checkEffectDeletions()` collects all alive effector nodes with `matchName`, `hostingComps[0]`, and a `_pathLayerUUID` from outgoing layer wire, dispatches `{action:'pollAliveEffects', params:{entries}}` (`jsx/dispatcher/actionEffect/pollAlive.jsx:pollAliveEffects`), passes missing effector node UUIDs to `onMissing()`.

36. **Missing node notification with dedup** — `polling/notifications.js:15` `pushMissingNotification(uuid)` checks `_notifiedMissing[uuid]` cache, creates `notificationBar.push()` (`notifications/notificationBar.js:43`) with severity `'error'`, message `"<label> is deleted outside Procedia"`, CTA button "Recreate" (calls `engine.recreateNode(uuid)`) and secondary "Remove node" (calls `engine.deleteNode(uuid)` + `renderer.render()` + `wireRenderer.render(null)`).

37. **Polling adaptive schedule** — `polling/poller.js` `_schedule()` computes elapsed since `_lastActivity`: if < 3s sets ACTIVE_INTERVAL (500ms), else IDLE_INTERVAL (2000ms); `markActivity()` updates `_lastActivity` timestamp; `withWriteLock(fn)` sets the write lock before executing `fn()` and releases it after the returned promise resolves, preventing the poller from ticking during AE writes.

## Auto Layout

38. **Auto layout execution** — `ui/topBar/index.js:58` autoLayout btn click → `autoLayout.run(options)` (`graph/autoLayout/index.js:31`) reads `settings.get('layoutDirection'/'layoutHSpacing'/'layoutVSpacing')`, calls `C._buildGraph()` (`graph/autoLayout/graphBuilder/buildGraph.js:_buildGraph`) which builds adjacency list from layer wires, calls `C._findComponents()` (`graph/autoLayout/graphBuilder/findComponents.js:_findComponents`) to find connected components, for each component calls `C._assignLayers()` (`graph/autoLayout/layerAssignment.js:_assignLayers`) using longest-path from sources to comps, `C._buildOrdering()`, `C._reduceCrossings()` (`graph/autoLayout/crossingReduction.js:_reduceCrossings`) with barycenter heuristic, `C._assignCoordinates()` (`graph/autoLayout/positioning.js:_assignCoordinates`) using Sugiyama coordinates, then `C._positionDataNodes()` (`graph/autoLayout/positioning.js:_positionDataNodes`) for data nodes, `C._positionRemaining()` for unpositioned nodes, `C._normalizePositions()` to shift origin, then `graphState.updateNode()` for each position (skipping locked nodes), then `renderer.render()`, `wireRenderer.render(null)`, `minimap.fitAll()`.

## Inspector & Status Bar

39. **Inspector refresh** — `ui/inspector/index.js:69` `refresh()` reads `graphState.getSelection()` → if empty: `showEmpty()`; if multi-select: shows count; if single: calls `__ins_vm.buildViewModel(nodeData, def)` (`ui/inspector/viewModel.js:buildViewModel`) which extracts params from nodeData.props and definition (handling static vs dynamic schemas), then calls `showNode(view)` which renders via `__ins_render.renderNodeContent(view)` (`ui/inspector/render.js:renderNodeContent`) into `#inspector-content`.

40. **Status bar refresh** — `statusBar.refresh()` reads `graphState.getSelection()`, `graphState.getAllNodes()`, `graphState.getAllWires()` and counts alive/ghost/total nodes + wires + zoom level, updates DOM elements in the bottom bar.

## Settings

41. **Settings modal open** — settings btn click → `settingsModal.open()` (`ui/settingsModal/index.js:18`) → `__sm_sync.sync(_refs)` (`ui/settingsModal/sync.js:14`) reads `settings.getAll()` from localStorage (`ui/settings.js`), populates minimap checkbox, wire style select, animated dash checkbox, layout direction select, spacing range sliders → shows overlay.

42. **Settings toggle change** — minimap/wireStyle/animatedDash control `change` → `settings.set(key, value)` (`ui/settings.js:set`) writes to localStorage → `__sm_apply.apply()` (`ui/settingsModal/apply.js:14`) toggles minimap canvas display and calls `wireRenderer.render(null)`.

43. **Settings layout direction/spacing change** — layout direction select / spacing range `change`/`input` → `settings.set()` writes to localStorage.

44. **Settings modal close** — close btn or overlay backdrop click → `settingsModal.close()` (`ui/settingsModal/index.js:26`) hides overlay → `__sm_apply.apply()`.

## Notifications

45. **Notification push** — `notifications/notificationBar.js:43` `push(opts)` generates `notif-{timestamp}-{rand}` id, creates DOM card with severity accent (`notif-info/warning/error/success`), escaped message, optional CTA/secondary buttons and dismiss button, appends to `#notification-container` inside `canvas-wrap`, optionally sets auto-dismiss timeout.

46. **Notification CTA action** — `_bindCardEvents()` (`notificationBar.js:87`) binds `.notif-cta` click → `opts.cta.action()` then `dismiss(id)`; CTA "Recreate" calls `engine.recreateNode(uuid)`; secondary "Remove node" calls `engine.deleteNode(uuid)` + `renderer.render()` + `wireRenderer.render(null)`.

47. **Notification dismiss** — `notificationBar.js:118` `dismiss(id)` adds `notif-exit` CSS class for exit animation, removes card element after 200ms, cleans up `_active[id]`.

## Minimap

48. **Minimap init** — `graph/canvas/minimap/index.js:11` `init()` creates `.minimap-container` and `.minimap-fit-btn` around `#minimap-canvas`, binds mousedown/mousemove for panning via `__minimap.panTo()` (`graph/canvas/minimap/interaction.js:panTo`) → `viewport.setPan()`, fit btn calls `m.fitAll()`.

49. **Minimap fit all** — `__minimap.fitAll()` (`graph/canvas/minimap/utils.js:fitAll`) calculates bounding box of all nodes, calls `viewport.setZoom()` and `viewport.setPan()` to show all nodes.

50. **Minimap render** — `__minimap.render()` (`graph/canvas/minimap/renderer.js:render`) clears canvas, draws scaled rectangles for each node (color-coded by category) and a viewport rectangle outline.

## Node Picker

51. **Node picker keyboard navigation** — `ui/nodePicker/events.js:38` `onKeyDown()`: Escape calls `close(null)`; ArrowDown/Up updates `state.selIndex` and calls `__np_render.updateList()`; Enter calls `closeFn(def.type)`.

52. **Node picker search filter** — search input `input` event → `__np_filter.applyFilter(compatible, query)` (`ui/nodePicker/filter.js:applyFilter`) filters by label/type match → `__np_render.updateList()`.

## Schema Cache

53. **Dynamic schema resolution on drop** — `dropNode()` (`graph/engine/nodes/dropNode.js:68`) for effector with `params === 'dynamic'` calls `hlp.resolveDynamicSchema(id, matchName)` → `schemaCache.fetchSchema(matchName)` (`graph/schemaCache/index.js:fetchSchema`) which checks in-memory cache, then disk cache (`persistence.js:readSchemaCache`), then introspects AE via `evalBridge.dispatch({action:'introspectEffect', params:{matchName}})` (`jsx/dispatcher/actionEffect/introspect.jsx:introspectEffect`), stores via `storeSchema()`, then calls `engine._applyDynamicSchema(nodeId, schema)` (`graph/engine/helpers.js:applyDynamicSchema`) which sets `dynamicSchema` and `secondaryPorts` on the node data.

54. **Schema cache init on startup** — `schemaCache.init()` (`graph/schemaCache/index.js:init`) calls `evalBridge.dispatch({action:'readSchemaCache'})` (`jsx/dispatcher/actions_schema.jsx:readSchemaCache`) to load disk cache, then `runVersionDiff()` (`graph/schemaCache/diff.js:runVersionDiff`) compares cached AE version with `getAEVersion()`, re-introspects schemas for mismatched versions.

## UI Infrastructure

55. **Node list search/filter** — `ui/nodeList/search.js` search input → `__nl_render.renderCategory()` filtered by query matching label/type.

56. **Node list category rendering** — `ui/nodeList/render.js` `renderCategory()` builds collapsible category sections with node items from `ui/nodeList/categories.js` definitions (Comps, Data, Effects, Layers, Utility).

57. **Sidebar collapse** — `ui/sidebarToggle.js` `init()` creates edge handle elements on left/right of canvas-wrap → hover/toggle adds/removes collapsed CSS classes on `#left-bar` / `#right-bar`.

58. **Notifications** — `notifications/notificationBar.js` displays toast notifications; bottom bar removed (absorbed into notification system).

## Global State Reset

59. **Full graph reset** — `ui/topBar/index.js:66` reset btn with confirm → `engine.resetAll()` (`graph/engine/state.js:27`) iterates all nodes in reverse and calls `def.onDelete(nodeData)` then `evalBridge.dispatch()`, calls `graphState.clearGraph()` (`graph/graphState/graphOps.js:clearGraph`), then `viewport.reset()`, `renderer.render()`, `wireRenderer.render(null)`, `inspector.refresh()`, `statusBar.refresh()`, `topBar.refreshSelection([])`.

## Wire Rendering

60. **Wire canvas render** — `wireRenderer.render(preview)` (`graph/wire/wireRenderer/render.js`) if preview is set (wire drag) draws immediately and stops animation; if `animatedDash` setting is true starts `requestAnimationFrame` loop incrementing `_animOffset` and re-drawing all wires with `setLineDash([6,4])` and `lineDashOffset = -_animOffset`; otherwise draws once with no dash; each wire is drawn via `_drawWire()` (`graph/wire/wireRenderer/draw.js`) which reads port positions via `_portPosInWrap()`, picks color by wire type (layer=`#06D6A0`, data=`#6B7280`, parent=`#E07B39`, selected=`#FFFFFF`), draws bezier/direct/stepped segments, and for selected wires adds a 6px-wide glow (alpha 0.2).

## Initialization Sequence

61. **Canvas viewport init** — `canvasView.init()` (`graph/canvas/viewport.js:init`) sets up `#canvas-nodes` container reference and pan/zoom state.

62. **Canvas input init** — `canvasInput.init()` (`graph/canvas/input/index.js:init`) binds mousedown/mousemove/mouseup/click/wheel/keydown/keyup event listeners on `#canvas-wrap` and `document` via `inputHandlers` (`graph/canvas/input/handlers/index.js`).

63. **Wire renderer init** — `wireRenderer.init()` (`graph/wire/wireRenderer/render.js`) acquires `#node-graph` canvas and 2D context, calls `_resize()` and `render(null)`.

64. **Wire tool init** — `wireTool.init()` (`graph/wire/wire.js:209`) binds mousedown/mousemove/mouseup on `#canvas-wrap` and `document` for wire drag-to-connect.

65. **Global selection change handler** — `graphState.onSelectionChange()` (`graph/graphState/selection.js:onSelectionChange`) registered in `index.js` chains: `renderer.render()`, `wireRenderer.render(null)`, `inspector.refresh()`, `statusBar.refresh()`, `topBar.refreshSelection(sel)`, `nodeToolbar.refresh()`, and `autoShy.handleSelectionChange(sel)` (`graph/autoShy.js`) — which, when `settings.get('autoShy')` is true, dispatches a `setLayerShy` batch + `setCompHideShyLayers` via `evalBridge.dispatchBatch()` to shy other affected layers in the same hosting comp. (Most concrete refresh sites in `index.js` and elsewhere now route through the unified `refreshUI()` helper and the RAF-batched `_uiScheduler` rather than calling the five renderers directly; the logical chain is unchanged.)

## Undo / Redo

66. **Undo / Redo button** — `ui/topBar/init.js` wires `#topbar-undo` / `#topbar-redo` to `undoManager.undo()` / `redo()` (`graph/undoManager/index.js`). `undo()` swaps stacks, calls `_restoreState(cmd.before)` (fast — `graphState._replaceState(nodes, wires, selection)` then `refreshUI()` + `topBar.refreshSelection()`), then `_reconcileAE(cmd.after, cmd.before)` (slow — diffs the two snapshots and dispatches AE commands for added/removed/ghosted nodes, property changes, and parent wire changes via `window.__procedia_internal.lifecycle.buildLifecycleCommand`; all AE calls are wrapped in `beginUndoGroup` / `endUndoGroup` so they collapse into a single AE undo step). `_updateUI()` updates the buttons' disabled state and tooltip with the action description. `_isReconciling` suppresses nested `capture()` calls during the undo.

67. **Capture / commit a mutation** — any user-visible graph mutation must wrap its work in `undoManager.capture()` → …mutate `graphState`… → `undoManager.commit(description)` (or `commitDebounced(description, delayMs)` for rapid edits like slider dragging). `capture()` snapshots `nodeMap`/`wireMap`/selection into `_beforeSnapshot` (no stack push yet — adding snapshots for no-op mutations is prevented by a deep-equals guard). `commit(description)` pushes the snapshot onto `undoStack` with the description, clears `redoStack`, and trims `undoStack` to `MAX_DEPTH=50`. `presetManager.dropPreset()` is the reference example, wrapping its work from line `presetManager.js:248` (`capture()`) to `presetManager.js:294` (`commit('Drop Preset ' + name)`).

## Import Project

68. **Import Project (start → confirmation)** — clicking the `#topbar-import` button (`ui/topBar/init.js:23` adds the button, click handler `ui/topBar/init.js` → `importProject.start()`) (`graph/import/index.js:53`) pushes two notifications to `notificationBar`: a warning + a "Proceed with Import Project?" card with two CTAs. **Save a Copy First** calls `_doImport(true)` which dispatches `evalBridge.dispatch({action:'saveAsDialog'})` (`actions_comp.jsx:saveAsDialog`) → `app.project.saveWithDialog()`. **Proceed (no copy)** calls `_doImport(false)`. **Cancel** dismisses the notifications and aborts.

69. **Import Project (scan → map → stamp → build)** — `_doImport` (`graph/import/index.js:111-184`):
   (1) `importScanner.scanAll()` (`graph/import/scanner.js:58`) sequentially dispatches `importScanComps`, `importScanFootage`, and per-comp `importScanCompLayers` (`actionImport/*.jsx`). Skip rules: comp names prefixed `'DO NOT DELETE'` and items inside the Procedia folder.
   (2) `importMapper.map(rawData)` (`graph/import/mapper.js:59`) assigns new `PROC-` node UUIDs and `WIRE-` terminal-wire UUIDs via `uuidGenerator.node()`/`uuidGenerator.wire()`, builds an importJSON graph object (comps → CompNode, footage → FootageNode, each layer → its mapped node type via `_LAYER_TYPE_MAP`), and a `stampMap` keyed by comp name listing `{index, uuid}` pairs where **`uuid` is the wire UUID** — consistent with SKILL 8's path-driven layer model.
   (3) `evalBridge.dispatch({action:'stampImportUUIDs', params:{stampMap}})` (`actionImport/stampUUIDs.jsx:14`) writes `comp.comment`/`footage.comment`/`layer.comment` in AE. Layer `.comment` receives the terminal wire UUID.
   (4) `importGraphBuilder.build(mapped.importJSON, mapped.compUUIDs)` (`graph/import/graphBuilder/build.js:26`): `graphState.clearGraph()` + `undoManager.reset()` (line 32-33); per CompNode → per FootageNode → per layer node → wire layer-→comp terminal wire with the stamped `wireId` → per-effect effector node (resolves dynamicSchema from `schemaCache.hasSchema`/`getSchema`) → effector chain re-wired in correct order → parent wires for `layer.parentIndex` → extra BlendingNode inserted for any layer whose `blendingMode !== 'NORMAL'`. **Matte relationships are NOT reconstructed** (matte import is intentionally skipped, see `build.js:285-293`).
   (5) `evalBridge.dispatch({action:'ensureReservedComp'})`.
   (6) `window.__procedia_internal.refreshUI({ full: true })`, then 200 ms later `autoLayout.run()`, then 300 ms later `renderer.render()` + `wireRenderer.render(null)` + `minimap.fitAll()`.

## Canvas Comments

70. **Comment create** — `dblClick` handler (`graph/canvas/input/handlers/titleEdit/dblclick.js`) on `#canvas-wrap` where the click target is NOT inside any `.node` element: if `commentManager.findByElement(e.target)` returns null (i.e., this is empty canvas, not a click on an existing comment), call `commentManager.create(canvasPos.x, canvasPos.y)` (`graph/comment/commentDOM.js`). A comment DOM is built with a fresh `CMT-{timestamp}-{rand4}` UUID from `uuidGenerator.comment()` (`graph/comment/commentDOM.js:168`), appended to `#canvas-nodes`, and immediately enters text-edit mode.

71. **Comment drag** — `commentManager.init()` (`graph/comment/commentManager.js:22-27`) binds `mousemove` / `mouseup` on the document and `_onHeaderMouseDown` on comment headers (`graph/comment/commentEvents.js`). Header `mousedown` enters drag state, capturing the start canvas position via `viewport.screenToCanvas()` and the comment's anchor; `mousemove` translates viewport-pixel deltas to canvas-space by dividing by `viewport.getTransform().zoom` (`commentEvents.js:56`), updates the comment's `cx`/`cy` on `commentState`, and re-renders via `commentDOM._updateElementPosition`. `mouseup` ends drag and schedules a debounced persistence write.

72. **Comment color / collapse / delete** — comment header button row drives `_toggleColorPicker` → floating swatch popover (`commentColorPicker.js`); the chevron collapses/expands the body (`_toggleCollapse`); the Delete button calls `commentManager.remove(id)` → `_remove` removes the DOM + state entry. `commentManager.load(comments)` is called from `index.js` when restoring the graph from persistence (comments are persisted as part of the panel-side payload, **not** in AE — comments have no AE presence).

## Preset Feature

73. **Save Preset (modal)** — when one or more nodes are selected, the floating node-toolbar shows a **Save Preset** button (`graph/canvas/renderer/nodeToolbar.js` `_ensureSavePresetBtn` — `data-action="save-preset"`). Click → `presetModal.open(selectedNodeIds)` (`ui/presetModal/index.js:18`). The modal (`ui/presetModal/dom.js:14-30`) has a name input, a Delete-All button, Cancel, and Save (disabled until non-empty). Save click → `presetManager.savePreset(name, selectedNodeIds)` (`graph/presets/presetManager.js:309`). `savePreset` deep-clones each selected node's relevant fields (`id, type, nodeKind, dedicated, props, x, y, dynamicSchema, secondaryPorts, locked, disabled, collapsed, hasParkedLayer`), captures only wires connecting the included nodes (internal wires), normalizes positions so the top-left is `(0,0)`, and stores the result in `localStorage['procedia_presets']`. It then registers a new dynamic data-category node type `'preset/<sanitized_name>'` via `_buildNodeDef` (`nodeKind: 'data'`), after first calling `nodeRegistry.unregister(typeId)` to clean up same-name overwrites. `nodeList.rebuildList()` rebuilds the palette to surface the preset under the **Presets** category. Success → notification + modal close.

74. **Drop Preset** — `nodeList dragdrop` of a preset node calls `presetManager.dropPreset(name, canvasX, canvasY)` (`presetManager.js:244`). The flow: `undoManager.capture()` (line 248) → deep-clone each captured node with a fresh `uuidGenerator.node()` ID → set `state:'ghost'`, `hostingComps:[]`, `hasParkedLayer:false`, `dirty:false` → `graphState.addNode` each → add wires with fresh `uuidGenerator.wire()` IDs → `_activatePresetNodes` (line 182-228) splits the nodes into two buckets: **immediate-alive** (data/blending/matte/merge/multimerge → set `state:'alive'` directly, dispatch `onAlive` for blending/matte if wires are valid) and **`onDrop`-dispatch** (affected/effector/comp nodes → dispatch `def.onDrop(nodeData)` and on success set `state:'alive'`) → `_fireTerminalLayerWires` (line 230-242) walks the preset's wires and calls `prop.firePathCreation(wid)` for terminal layer wires — completing each path's alive propagation. Finally `undoManager.commit('Drop Preset ' + name)` (line 294).

## Comp List & Graph Search

75. **Comp List dropdown (drop filter on comp select)** — `compList.init()` (`ui/compList.js`, called from `index.js`) builds a bottom-left dropdown. On open it dispatches `evalBridge.dispatch({action:'listComps'})` (`actions_compList.jsx:14`) and renders comp entries (excluding the Reserved Comp). Selecting a comp triggers `evalBridge.dispatch({action:'focusCompByName', params:{name}})` (`actions_compList.jsx:43`), `graphState.setActiveComp(compId)`, then computes an upstream node-set via `_calcUpstreamNodes` BFS layer-wire walk and calls `graphState.setFilteredNodes(nodeIds)` — every node outside that set is visually hidden in the renderer. "All project" entry clears the filter via `graphState.clearFilter()`. While a comp filter is active, dropping a new node onto the canvas auto-wires it into the active comp.

76. **Graph Search** — `graphSearch.init()` (`ui/graphSearch.js`, called from `index.js`) wires the top-left search icon. Click expands the search field; `input` events match `props.label` substring → matched node IDs are pushed into `window.__graphSearchMatches` which the canvas renderer highlights with a golden border. The match counter ("N found") updates live. Enter or Focus button centers the first match by `viewport.setPan(...)` and `graphState.setSelection(...)`. Escape or close-reverts to the icon.

## Effector Switch

77. **Switch effectors (toolbar action)** — `engine.switchEffectors(id1, id2)` (`graph/engine/nodes/switchNodes.js`) is exposed via `engine` and invoked from the node toolbar's Switch button (visible when two sibling effector nodes share the same affected upstream). The flow: `findAffectedUpstream` walks `main_input` wires back to the nearest non-effector/non-blending node; `findSiblingEffectors` BFS-walks outgoing layer wires to find siblings; `switchEffectors(id1, id2)` swaps the two nodes' `x`/`y`, rewires their input/output layer wires via `graphState.updateWire`, then dispatches `evalBridge.dispatch({action:'reorderEffectChain', params:{...}})` (`applyActionEffect/reorderEffectChain.jsx:9`) to re-order the AE effects so the panel chain matches the AE state.

## Walkthrough

78. **Walkthrough init / show** — `ui/walkthrough/index.js` exposes `walkthrough.init()` and `walkthrough.show()`:
   - `init()` — early-return if `localStorage.getItem('procedia_walkthrough_done')` is already set. Otherwise builds DOM via `__wt_dom.buildDOM()`, sets state to step 0, calls `__wt_render.render()`, and `__wt_events.bind()`. The 8 steps (`ui/walkthrough/steps.js:10-58`) are: Welcome → Node Palette (`#left-bar`) → Canvas (`#canvas-wrap`) → Comp List (`#complist-dropdown`) → Connecting Nodes → Inspector (`#right-bar`) → Report a Bug (`#topbar-report`) → You're Ready!. Each step's `target` is highlighted with a spotlight; the card position is controlled by `cardPos`.
   - `show()` — clears the `procedia_walkthrough_done` localStorage key and re-inits, allowing the tour to be replayed (referenced from Settings → General → Replay Tutorial once a UI wire is added to `settingsModal`).
   - Wiring: `walkthrough.init()` is called last in the `index.js` startup chain (line 222).
