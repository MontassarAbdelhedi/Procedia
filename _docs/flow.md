# Procedia — All Scenarios & Flow of Command

> **Convention for node actions:** Each node type defines lifecycle hooks (`onDrop`, `onAlive`, `onGhost`, `onDelete`, `onPropertyChange`) that **return command objects** (action + params). The engine dispatches these via `evalBridge.dispatch()` (`bridge/evalBridge.js:99`) → `csInterface.evalScript()` → `dispatcher.jsx:85 dispatch(jsonStr)` routes by action string to the registered `_handle*` function (`dispatcher.jsx:40-78`). Below are all 12 node definitions and their exact hook→handler lines.

## Node Definitions — Lifecycle Hooks & Corresponding AE Handlers

| Node type | File | Hook | Returns action | Panel definition line | Dispatcher handler line |
|---|---|---|---|---|---|
| `core/comp` | `Comp.js` | `onDrop` | `createComp` | `Comp.js:37-49` | `actions_comp.jsx:30 _handleCreateComp` |
| `core/comp` | `Comp.js` | `onAlive` | `createComp` | `Comp.js:67-79` | `actions_comp.jsx:30 _handleCreateComp` |
| `core/comp` | `Comp.js` | `onDelete` | `deleteComp` | `Comp.js:52-59` | `actions_comp.jsx:60 _handleDeleteComp` |
| `core/comp` | `Comp.js` | `onPropertyChange` | `setCompProperty` | `Comp.js:88-98` | `actions_comp.jsx:83 _handleSetCompProperty` |
| `core/footage` | `Footage.js` | `onDrop` | `importFootage` | `Footage.js:40-52` | `actions_footage.jsx:_handleImportFootage` |
| `core/footage` | `Footage.js` | `onAlive` | `addCompAsLayer` | `Footage.js:60-73` | `actions_layer.jsx:_handleAddCompAsLayer` |
| `core/footage` | `Footage.js` | `onDelete` | `removeFootageLayer` | `Footage.js:80-87` | `actions_footage.jsx:_handleRemoveFootage` |
| `layers/text` | `Text.js` | `onDrop` | `null` (no-op) | `Text.js:38-40` | — |
| `layers/text` | `Text.js` | `onAlive` | `createTextLayer` | `Text.js:48-63` | `actions_layer.jsx:18 _handleCreateTextLayer` |
| `layers/text` | `Text.js` | `onGhost` | `parkLayer` | `Text.js:71-79` | `actions_park.jsx:16 _handleParkLayer` |
| `layers/text` | `Text.js` | `onDelete` | `deleteParkedLayer` | `Text.js:86-93` | `actions_park.jsx:114 _handleDeleteParkedLayer` |
| `layers/text` | `Text.js` | `onPropertyChange` | `setLayerProperty` | `Text.js:103-113` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `layers/null` | `Null.js` | `onDrop` | `null` (no-op) | `Null.js:36-38` | — |
| `layers/null` | `Null.js` | `onAlive` | `createNullLayer` | `Null.js:46-59` | `actions_layer.jsx:63 _handleCreateNullLayer` |
| `layers/null` | `Null.js` | `onGhost` | `parkLayer` | `Null.js:67-75` | `actions_park.jsx:16 _handleParkLayer` |
| `layers/null` | `Null.js` | `onDelete` | `deleteParkedLayer` | `Null.js:82-89` | `actions_park.jsx:114 _handleDeleteParkedLayer` |
| `layers/null` | `Null.js` | `onPropertyChange` | `setLayerProperty` | `Null.js:99-109` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `layers/shape` | `Shape.js` | `onDrop` | `null` (no-op) | `Shape.js:37` | — |
| `layers/shape` | `Shape.js` | `onAlive` | `createShapeLayer` | `Shape.js:45-58` | `actions_layer.jsx:109 _handleCreateShapeLayer` |
| `layers/shape` | `Shape.js` | `onGhost` | `parkLayer` | `Shape.js:66-74` | `actions_park.jsx:16 _handleParkLayer` |
| `layers/shape` | `Shape.js` | `onDelete` | `deleteParkedLayer` | `Shape.js:81-88` | `actions_park.jsx:114 _handleDeleteParkedLayer` |
| `layers/shape` | `Shape.js` | `onPropertyChange` | `setLayerProperty` | `Shape.js:98-108` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `layers/adjustment` | `Adjustment.js` | `onDrop` | `null` (no-op) | `Adjustment.js:36` | — |
| `layers/adjustment` | `Adjustment.js` | `onAlive` | `createAdjustmentLayer` | `Adjustment.js:44-57` | `actions_layer.jsx:89 _handleCreateAdjustmentLayer` |
| `layers/adjustment` | `Adjustment.js` | `onGhost` | `parkLayer` | `Adjustment.js:65-73` | `actions_park.jsx:16 _handleParkLayer` |
| `layers/adjustment` | `Adjustment.js` | `onDelete` | `deleteParkedLayer` | `Adjustment.js:80-87` | `actions_park.jsx:114 _handleDeleteParkedLayer` |
| `layers/adjustment` | `Adjustment.js` | `onPropertyChange` | `setLayerProperty` | `Adjustment.js:97-107` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `effects/fill` | `Blur & Sharpen/FillEffect.js` | `onDrop` | `null` (no-op) | `FillEffect.js:29` | — |
| `effects/fill` | `Blur & Sharpen/FillEffect.js` | `onAlive` | `applyDynamicEffect` | `FillEffect.js:38-49` | `actions_effect.jsx:16 _handleApplyDynamicEffect` |
| `effects/fill` | `Blur & Sharpen/FillEffect.js` | `onGhost` | `removeEffect` | `FillEffect.js:58-68` | `actions_effect.jsx:47 _handleRemoveEffect` |
| `effects/fill` | `Blur & Sharpen/FillEffect.js` | `onDelete` | `null` (no-op) | `FillEffect.js:71` | — |
| `effects/fill` | `Blur & Sharpen/FillEffect.js` | `onPropertyChange` | `setEffectProperty` | `FillEffect.js:82-94` | `actions_effect.jsx:76 _handleSetEffectProperty` |
| `effects/gaussian-blur` | `Blur & Sharpen/GaussianBlur.js` | `onDrop` | `null` (no-op) | `GaussianBlur.js:29` | — |
| `effects/gaussian-blur` | `Blur & Sharpen/GaussianBlur.js` | `onAlive` | `applyDynamicEffect` | `GaussianBlur.js:38-49` | `actions_effect.jsx:16 _handleApplyDynamicEffect` |
| `effects/gaussian-blur` | `Blur & Sharpen/GaussianBlur.js` | `onGhost` | `removeEffect` | `GaussianBlur.js:58-68` | `actions_effect.jsx:47 _handleRemoveEffect` |
| `effects/gaussian-blur` | `Blur & Sharpen/GaussianBlur.js` | `onDelete` | `null` (no-op) | `GaussianBlur.js:71` | — |
| `effects/gaussian-blur` | `Blur & Sharpen/GaussianBlur.js` | `onPropertyChange` | `setEffectProperty` | `GaussianBlur.js:82-94` | `actions_effect.jsx:76 _handleSetEffectProperty` |
| `effects/drop-shadow` | `Blur & Sharpen/DropShadow.js` | `onDrop` | `null` (no-op) | `DropShadow.js:29` | — |
| `effects/drop-shadow` | `Blur & Sharpen/DropShadow.js` | `onAlive` | `applyDynamicEffect` | `DropShadow.js:38-49` | `actions_effect.jsx:16 _handleApplyDynamicEffect` |
| `effects/drop-shadow` | `Blur & Sharpen/DropShadow.js` | `onGhost` | `removeEffect` | `DropShadow.js:58-68` | `actions_effect.jsx:47 _handleRemoveEffect` |
| `effects/drop-shadow` | `Blur & Sharpen/DropShadow.js` | `onDelete` | `null` (no-op) | `DropShadow.js:71` | — |
| `effects/drop-shadow` | `Blur & Sharpen/DropShadow.js` | `onPropertyChange` | `setEffectProperty` | `DropShadow.js:82-94` | `actions_effect.jsx:76 _handleSetEffectProperty` |
| `data/color` | `Color.js` | all hooks | `null` (no-op) | `Color.js:31-39` | — |
| `data/number` | `Number.js` | all hooks | `null` (no-op) | `Number.js:31-39` | — |
| `utility/blending` | `Blending.js` | all hooks | `null` (no-op) | `Blending.js:32-40` | — |
| `utility/matte-luma` | `MatteLuma.js` | `onDrop` | `null` (no-op) | `MatteLuma.js:32` | — |
| `utility/matte-luma` | `MatteLuma.js` | `onAlive` | `setLumaMatte` | `MatteLuma.js:41-51` | `actions_matte.jsx:16 _handleSetLumaMatte` |
| `utility/matte-luma` | `MatteLuma.js` | `onGhost` | `clearMatte` | `MatteLuma.js:60-69` | `actions_matte.jsx:61 _handleClearMatte` |
| `utility/matte-luma` | `MatteLuma.js` | `onDelete` | `null` (no-op) | `MatteLuma.js:72` | — |
| `utility/matte-luma` | `MatteLuma.js` | `onPropertyChange` | `setLayerProperty` | `MatteLuma.js:83-93` | `actions_property.jsx:17 _handleSetLayerProperty` |
| `utility/matte-alpha` | `MatteAlpha.js` | `onDrop` | `null` (no-op) | `MatteAlpha.js:32` | — |
| `utility/matte-alpha` | `MatteAlpha.js` | `onAlive` | `setAlphaMatte` | `MatteAlpha.js:41-51` | `actions_matte.jsx:39 _handleSetAlphaMatte` |
| `utility/matte-alpha` | `MatteAlpha.js` | `onGhost` | `clearMatte` | `MatteAlpha.js:60-69` | `actions_matte.jsx:61 _handleClearMatte` |
| `utility/matte-alpha` | `MatteAlpha.js` | `onDelete` | `null` (no-op) | `MatteAlpha.js:72` | — |
| `utility/matte-alpha` | `MatteAlpha.js` | `onPropertyChange` | `setLayerProperty` | `MatteAlpha.js:83-93` | `actions_property.jsx:17 _handleSetLayerProperty` |

## Startup & Shutdown

1. **Panel startup** — `index.js:init()` calls `evalBridge.init()` (`bridge/evalBridge.js:55`) which loads the entire JSX preamble (json.jsx → utils.jsx → all action handlers → `dispatcher.jsx:dispatcher`) into AE via `csInterface.evalScript()`, then on ready (`evalBridge.onReady()`, `bridge/evalBridge.js:37`) calls `schemaCache.init()` (`graph/schemaCache/index.js`), chains `evalBridge.dispatch({action:'ensureReservedComp'})` (`jsx/dispatcher/actions_comp.jsx:ensureReservedComp`), then `evalBridge.dispatch({action:'readGraph'})` (`jsx/persistence.jsx:readGraph`), then `graphState.loadGraph()` (`graph/graphState/graphOps.js:loadGraph`), then `renderer.render()` (`graph/canvas/renderer/index.js:render`), then `poller.start()` (`polling/poller.js:106`), then `statusBar.refresh()`.

2. **Panel shutdown (save)** — `index.js:98` `window.beforeunload` calls `evalBridge.dispatch({action:'writeGraph'})` (`jsx/persistence.jsx:writeGraph`) which saves graph data to `__PROCEDIA_NODES__` and `__PROCEDIA_WIRES__` text layers in the Reserved Comp, then calls `poller.stop()` (`polling/poller.js:113`).

3. **Panel reload** — `ui/topBar.js:74` reload btn click calls `window.location.reload()`.

## Node Creation (Drop & Duplicate)

4. **Drag node from node list to empty canvas** — `ui/nodeList/dragdrop.js:21` `__nl_dragdrop.wireCanvasDrop()` on mouseup hits canvas-wrap → calls `viewport.screenToCanvas()` (`graph/canvas/viewport.js`) → `engine.dropNode()` (`graph/engine/nodes/dropNode.js:31`) which calls `uuidGenerator.node()` (`data/uuidGenerator.js`), `hlp.buildInitialProps()` (`graph/engine/helpers.js:buildInitialProps`), `graphState.addNode()` (`graph/graphState/nodes.js:addNode`), `hlp.refreshNodeUI()`, and for data/blending/matte nodes sets `state:'alive'` immediately, for effector nodes resolves dynamic schema via `hlp.resolveDynamicSchema()` (`graph/engine/helpers.js:resolveDynamicSchema`) + `schemaCache.fetchSchema()` (`graph/schemaCache/index.js:fetchSchema`) + `engine._applyDynamicSchema()` (`graph/engine/helpers.js:applyDynamicSchema`), for affected nodes calls `def.onDrop(nodeData)` then `evalBridge.dispatch(command)` which on success sets `state:'alive'` → then `graphState.setSelection()` (`graph/graphState/selection.js:setSelection`) → `renderer.render()` → `wireRenderer.render(null)` → `inspector.refresh()` → `statusBar.refresh()`.

5. **Drag node onto existing wire (mid-path insertion)** — `ui/nodeList/dragdrop.js:87` `canvasDrag.findWireAt()` (`graph/canvas/drag.js:147`) hits a wire → `canvasDrag.insertNodeOnWire()` (`graph/canvas/drag.js:173`) creates node data with `_transplantLayerUUID` copied from the existing wire, calls `graphState.addNode()`, `schemaCache.fetchSchema()` for effector nodes, `graphState.removeWire(wireId)`, then `engine.connectWire(wire.fromNode→node.main_input)` and `engine.connectWire(node.output→wire.toNode)` → `graphState.setSelection()` → `renderer.render()` → `wireRenderer.render()` → `inspector.refresh()` → `statusBar.refresh()`.

6. **Duplicate selected nodes** — `ui/topBar.js:48` dupe btn click → `engine.duplicateSelectedNodes()` (`graph/engine/nodes/duplicateNode.js:23`) iterates `graphState.getSelection()`, deep-copies each node (excluding id/dirty/`_transplantLayerUUID`) with `uuidGenerator.node()`, +30 offset on x/y, empty `hostingComps`, `state:'ghost'` for non-data nodes, calls `graphState.addNode()` for each, then `graphState.replaceSelection(newIds)`.

## Wire Creation & Connection

7. **Drag wire from source port to target port** — `graph/wire/wire.js:111` `wireTool._onMouseDown()` on `.port-dot` → `_findPortDef()` to identify source port → starts drag state, calls `wireRenderer.render({from,to})` (`graph/wire/wireRenderer.js:259`) to show preview → `wireTool._onMouseMove()` (`wire.js:148`) updates preview → `wireTool._onMouseUp()` (`wire.js:162`) on target `.port-dot` → `_findPortDef()` to identify target port → `engine.connectWire(fromNode, fromPort, toNodeId, toPort)` → `wireRenderer.render(null)`.

8. **Drag wire to empty canvas (node picker creation)** — `wireTool._onMouseUp()` (`graph/wire/wire.js:162`) on empty canvas-wrap → `nodePicker.show(clientX, clientY, fromNode, fromPort, wireType)` (`ui/nodePicker/index.js:45`) calls `__np_compat.compatibleNodes(wireType)` (`ui/nodePicker/compatibility.js`) which filters `nodeRegistry.getAll()` by matching input port type, renders popup via `__np_render`, and returns a Promise → on user selection `close(type)` (`ui/nodePicker/index.js:122`) calls `nodeRegistry.getDefinition(type)`, `viewport.screenToCanvas()`, `engine.dropNode(def, canvasX, canvasY)`, then `engine.connectWire(fromNodeId, fromPortId, node.id, 'main_input')`, then `graphState.setSelection(node.id)`, `renderer.render()`, `wireRenderer.render(null)`, `inspector.refresh()`, `statusBar.refresh()`.

9. **Engine connect wire (core logic)** — `graph/engine/wires.js:38` `connectWire(fromNodeId, fromPort, toNodeId, toPort, boundParam)` looks up node data/definitions, determines `wireType` from source port, calls `wireValidator.canConnect()` (`graph/wireValidator/canConnect.js`) which checks port existence/type compatibility/capacity/`cycleChecker.hasCycle()` (`graph/cycleChecker.js:22`), then calls `uuidGenerator.wire()`, `graphState.addWire(wireData)`, `hlp.refreshNodeUI()`, then branches by wire type: for `parent` wires calls `evalBridge.dispatch({action:'setLayerParent'})` (`jsx/dispatcher/actions_property.jsx:setLayerParent`); for `data` wires calls `graphState.updateProp()` (`graph/graphState/props.js:updateProp`) and `dirtyFlusher.schedule()`; for layer-to-comp wires calls `prop.firePathCreation(wireData.id)` (`graph/engine/propagate.js:204`); for matte targets calls `prop.checkMatteActivation(toNodeId)` (`graph/engine/propagate.js:151`); for nodes with existing `hostingComps` calls `prop.propagateAlive(fromNodeId, hostingComp, pathLayerUUID)` (`graph/engine/propagate.js:31`).

10. **Cycle detection** — `graph/wireValidator/canConnect.js` calls `cycleChecker.hasCycle(fromNodeId, toNodeId)` (`graph/cycleChecker.js:22`) which DFS-walks from toNodeId through all layer wires and returns true if fromNodeId is reachable, preventing circular layer dependencies.

## Wire Deletion & Cascade Ghost

11. **Disconnect wire** — `graph/engine/wires.js:148` `disconnectWire(wireId)` looks up wire data, then branches: for `parent` wires calls `evalBridge.dispatch({action:'clearLayerParent'})` (`jsx/dispatcher/actions_property.jsx:clearLayerParent`) then `graphState.removeWire()` and `hlp.refreshNodeUI()`; for `data` wires directly `graphState.removeWire()`; for `layer` wires calls `cascadeAlgorithm.cascadeGhost(wireId)` (`graph/cascade/cascadeGhost.js:28`) then `hlp.refreshNodeUI()`.

12. **Cascade ghost on layer wire delete** — `cascadeGhost(deletedWireId)` (`graph/cascade/cascadeGhost.js:28`) looks up wire, rejects non-layer types, identifies source node, checks `util._hasCompDownstreamExcluding()` (`graph/cascade/utils.js:_hasCompDownstreamExcluding`), collects upstream nodes via `util.collectPathUpstream()` (`graph/cascade/utils.js:collectPathUpstream`), separates into effectors-first then affected-last order, computes `losingComps` per node by comparing `hostingComps` against remaining comps, builds `onGhost` batch commands (effectors get `upstreamNodeUUID`, affected get `layerUUID` from `_pathLayerUUID`), calls `evalBridge.dispatchBatch(commands)` (`bridge/evalBridge.js:135`), updates each node's `hostingComps`/`state`/`hasParkedLayer`, clears `_pathLayerUUID` on the deleted wire, calls `graphState.removeWire()`, then `graphState.rebuildTempGraph()` (`graph/graphState/tempGraph.js:rebuildTempGraph`).

## Node Lifecycle (Delete)

13. **Delete selected nodes** — `graph/engine/nodes/deleteNode.js:140` `deleteSelectedNodes()` iterates selection → `deleteNode(nodeId)` (`graph/engine/nodes/deleteNode.js:29`) which branches by `nodeKind`: for `data` nodes calls `def.onDelete()` then `evalBridge.dispatch()`; for `blending`/`matte` nodes builds `onGhost` batch per hosting comp (effector upstream UUID resolution or matte top_layer UUID), calls `evalBridge.dispatchBatch()` then `def.onDelete()` then `evalBridge.dispatch()`; for `affected`/`effector` nodes builds `onGhost` batch per alive hosting comp, calls `evalBridge.dispatchBatch()`, then for comp nodes iterates all layer terminal wires calling `cascadeAlgorithm.cascadeGhost()` for each, for non-comp nodes cascades all incoming layer wires, then calls `def.onDelete()` → `evalBridge.dispatch()` → `graphState.removeNode(nodeId)` → `hlp.refreshNodeUI()` → `graphState.removeFromSelection(nodeId)`.

14. **Delete selected wire (keyboard)** — `graph/canvas/input/handlers/keyboard.js:42` `onKeyDown()` Delete/Backspace when `_selectedWireId` is set → `engine.disconnectWire(wireId)` then `wireRenderer.render(null)`.

## Propagation & Lifecycle

15. **Propagate alive upstream** — `graph/engine/propagate.js:31` `propagateAlive(nodeId, hostingCompUUID, pathLayerUUID)` checks `hostingComps` for duplicates, for transplant nodes (`_transplantLayerUUID`) dispatches `{action:'restampLayer'}` (`jsx/dispatcher/actions_layer.jsx:restampLayer`), updates node with `state:'alive'` and clears transplant, then recurses upstream; for affected nodes with `hasParkedLayer` dispatches `{action:'unparkLayer'}` (`jsx/dispatcher/actions_park.jsx:unparkLayer`), without parked layer calls `def.onAlive(nodeData, hostingCompUUID)` and injects `layerUUID`; for effector nodes calls `def.onAlive(nodeData, hostingCompUUID, pathLayerUUID)`; for blending nodes calls `def.onAlive(nodeData, hostingCompUUID, pathLayerUUID)`; then appends `hostingCompUUID` to `hostingComps`, sets `state:'alive'`, clears `hasParkedLayer`, recursively walks upstream layer wires skipping data/matte nodes, then dispatches each `onAlive` command via `evalBridge.dispatch()` and sets `state:'error'` on failure.

16. **Fire path creation (terminal wire to comp)** — `graph/engine/propagate.js:204` `firePathCreation(terminalWireId)` sets `_pathLayerUUID: terminalWireId` on the wire data via `graphState.updateWire()`, resolves `hostingCompUUID` from the comp node, calls `propagateAlive(wireData.fromNode, hostingCompUUID, terminalWireId)`, then calls `dirtyFlusher.flush()`.

17. **Matte activation check** — `graph/engine/propagate.js:151` `checkMatteActivation(matteNodeId)` scans wires for `top_layer` and `matte_layer` inputs, finds path layer UUIDs via `hlp.findPathLayerUUID()` (`graph/engine/helpers.js:findPathLayerUUID`), verifies both upstream nodes share the same `hostingComps[0]`, finds the output layer wire targetting that comp, then calls `def.onAlive(matteNodeData, sharedCompUUID, topLayerUUID, matteLayerUUID)` and dispatches via `evalBridge.dispatch()`.

## Canvas Interaction

18. **Click node to select** — `graph/canvas/input/handlers/mouse.js:20` `onMouseDown()` on `.node` → `nodeEl.getAttribute('data-node-id')` → for ctrl/meta: `graphState.toggleSelection()`; for shift: `graphState.addToSelection()` or `removeFromSelection()`; plain: `graphState.setSelection()` if not already selected → `renderer.render()` → triggers `graphState.onSelectionChange()` callback chain → `wireRenderer.render(null)` → `inspector.refresh()` → `statusBar.refresh()` → `topBar.refreshSelection(sel)` → `nodeToolbar.refresh()`.

19. **Click empty canvas (rubberband multi-select)** — `onMouseDown()` on empty (`graph/canvas/input/handlers/mouse.js:98`) → `canvasDrag.findWireAt()` misses → `graphState.clearSelection()` if no modifier → `_inpRubber.active` → `inputRubberband.createRubberEl()` → `onMouseMove()` (`mouse.js:128`) calls `inputRubberband.updateRubberEl()` → `onMouseUp()` (`mouse.js:183`) calls `inputRubberband.getNodesInRect()` → `graphState.replaceSelection()` with ctrl/shift modifier logic → `renderer.render()` → `inputRubberband.destroyRubberEl()`.

20. **Click wire to select** — `onMouseDown()` (`mouse.js:98`) → `canvasDrag.findWireAt(clientX, clientY)` (`graph/canvas/drag.js:147`) returns wire via `hitTestWire()` (`graph/canvas/drag.js:112`) using bezier/direct/stepped distance sampling → `_selectedWireId = wire.id` → `graphState.clearSelection()` → `renderer.render()` → `wireRenderer.render(null)`.

21. **Drag node on canvas** — `onMouseDown()` on node (`mouse.js:58`) → `_inpDrag.active`, captures `dragStartCanvas` via `viewport.screenToCanvas()`, stores `nodeStartPos` and `selectionStartPositions` for all selected nodes → `onMouseMove()` (`mouse.js:144`) computes delta from drag start, calls `graphState.updateNode(draggedNodeId, {x,y})`, then for each other selected node calls `graphState.updateNode(selId, {x,y})` and `renderer.getNodeElement(selId).style` updates for immediate DOM feedback → `wireRenderer.render(null)` → `minimap.render()`.

22. **Pan canvas** — `onKeyDown()` (`keyboard.js:33`) Space sets `_inpSpaceHeld` → `onMouseDown()` (`mouse.js:44`) with button 1 or button 0+Space → `_inpPan.active` → `onMouseMove()` (`mouse.js:129`) calls `viewport.setPan(startPan.x + dx, startPan.y + dy)` (`graph/canvas/viewport.js:setPan`) → `onMouseUp()` clears pan.

23. **Zoom canvas** — `graph/canvas/input/handlers/wheel.js` `onWheel()` calls `viewport.setZoom()` (`graph/canvas/viewport.js:setZoom`) with mouse position as zoom origin.

24. **Double-click comp node (focus in AE)** — `graph/canvas/input/handlers/mouse.js:228` `onClick()` on a `core/comp` node sets a 280ms timer → `evalBridge.dispatch({action:'focusComp', params:{nodeUUID:nodeId}})` (`jsx/dispatcher/actions_comp.jsx:focusComp`).

25. **Double-click node title (inline edit)** — `graph/canvas/input/handlers/titleEdit.js:onDblClick` makes title `contenteditable` → Enter key in `onKeyDown()` (`keyboard.js:22`) calls `commitTitleEdit()` which dispatches `evalBridge.dispatch({action:'renameNode'})` (`jsx/dispatcher/actions_layer.jsx:renameNode`); Escape calls `cancelTitleEdit()`.

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

33. **Polling tick (aliveness check)** — `polling/poller.js:59` `_tick()` (called every 1s active or 5s idle) skips if `_isWriting`, calls `pollerHelpers.getAliveWireUUIDs()` (`polling/missingNodes.js:getAliveWireUUIDs`) to collect all non-null `_pathLayerUUID` from live layer wires, dispatches `evalBridge.dispatch({action:'pollAliveNodes', params:{uuidListJSON}})` (`jsx/dispatcher/actions_park.jsx:pollAliveNodes`), on response resolves missing UUIDs to node IDs via `pollerHelpers.findNodesByWireUUID()` (`polling/missingNodes.js:findNodesByWireUUID`), calls `_onNodesMissing(nodeIds)` (`poller.js:45`) which for each node calls `_handleMissingNode(uuid)` (`poller.js:22`) — skips effector nodes without `main_input` wires (cascaded), otherwise sets `graphState.updateNode(uuid, {state:'error'})` and calls `pollerNotifier.pushMissingNotification(uuid)` (`polling/notifications.js:15`), then calls `renderer.render()`, `wireRenderer.render(null)`, `inspector.refresh()`, `statusBar.refresh()`.

34. **Poll external comp deletions** — `polling/externalDeletions.js:74` `checkExternalDeletions()` collects UUIDs of all alive `core/comp` nodes, dispatches `{action:'pollExternalDeletions', params:{compNodeUUIDs}}` (`jsx/dispatcher/actions_schema.jsx:pollExternalDeletions`), passes missing comp UUIDs to `onMissing()` callback.

35. **Poll external effect deletions** — `polling/externalDeletions.js:12` `checkEffectDeletions()` collects all alive effector nodes with `matchName`, `hostingComps[0]`, and a `_pathLayerUUID` from outgoing layer wire, dispatches `{action:'pollAliveEffects', params:{entries}}` (`jsx/dispatcher/actions_effect.jsx:pollAliveEffects`), passes missing effector node UUIDs to `onMissing()`.

36. **Missing node notification with dedup** — `polling/notifications.js:15` `pushMissingNotification(uuid)` checks `_notifiedMissing[uuid]` cache, creates `notificationBar.push()` (`notifications/notificationBar.js:43`) with severity `'error'`, message `"<label> is deleted outside Procedia"`, CTA button "Recreate" (calls `engine.recreateNode(uuid)`) and secondary "Remove node" (calls `engine.deleteNode(uuid)` + `renderer.render()` + `wireRenderer.render(null)`).

37. **Polling adaptive schedule** — `polling/poller.js:92` `_schedule()` computes elapsed since `_lastActivity`: if < 3s sets ACTIVE_INTERVAL (1000ms), else IDLE_INTERVAL (5000ms); `markActivity()` (`poller.js:102`) updates `_lastActivity` timestamp; `withWriteLock(fn)` (`poller.js:121`) sets the write lock before executing `fn()` and releases it after the returned promise resolves, preventing the poller from ticking during AE writes.

## Auto Layout

38. **Auto layout execution** — `ui/topBar.js:58` autoLayout btn click → `autoLayout.run(options)` (`graph/autoLayout/index.js:31`) reads `settings.get('layoutDirection'/'layoutHSpacing'/'layoutVSpacing')`, calls `C._buildGraph()` (`graph/autoLayout/graphBuilder.js:_buildGraph`) which builds adjacency list from layer wires, calls `C._findComponents()` to find connected components, for each component calls `C._assignLayers()` (`graph/autoLayout/layerAssignment.js:_assignLayers`) using longest-path from sources to comps, `C._buildOrdering()`, `C._reduceCrossings()` (`graph/autoLayout/crossingReduction.js:_reduceCrossings`) with barycenter heuristic, `C._assignCoordinates()` (`graph/autoLayout/positioning.js:_assignCoordinates`) using Sugiyama coordinates, then `C._positionDataNodes()` (`graph/autoLayout/positioning.js:_positionDataNodes`) for data nodes, `C._positionRemaining()` for unpositioned nodes, `C._normalizePositions()` to shift origin, then `graphState.updateNode()` for each position (skipping locked nodes), then `renderer.render()`, `wireRenderer.render(null)`, `minimap.fitAll()`.

## Inspector & Status Bar

39. **Inspector refresh** — `ui/inspector/index.js:69` `refresh()` reads `graphState.getSelection()` → if empty: `showEmpty()`; if multi-select: shows count; if single: calls `__ins_vm.buildViewModel(nodeData, def)` (`ui/inspector/viewModel.js:buildViewModel`) which extracts params from nodeData.props and definition (handling static vs dynamic schemas), then calls `showNode(view)` which renders via `__ins_render.renderNodeContent(view)` (`ui/inspector/render.js:renderNodeContent`) into `#inspector-content`.

40. **Status bar refresh** — `statusBar.refresh()` reads `graphState.getSelection()`, `graphState.getAllNodes()`, `graphState.getAllWires()` and counts alive/ghost/total nodes + wires + zoom level, updates DOM elements in the bottom bar.

## Settings

41. **Settings modal open** — settings btn click → `settingsModal.open()` (`ui/settingsModal.js:202`) → `_syncControls()` (`settingsModal.js:161`) reads `settings.getAll()` from localStorage (`ui/settings.js`), populates minimap checkbox, wire style select, animated dash checkbox, layout direction select, spacing range sliders → shows overlay.

42. **Settings toggle change** — minimap/wireStyle/animatedDash control `change` → `settings.set(key, value)` (`ui/settings.js:set`) writes to localStorage → `_applySettings()` (`settingsModal.js:188`) toggles minimap canvas display and calls `wireRenderer.render(null)`.

43. **Settings layout direction/spacing change** — layout direction select / spacing range `change`/`input` → `settings.set()` writes to localStorage.

44. **Settings modal close** — close btn or overlay backdrop click → `settingsModal.close()` (`settingsModal.js:212`) hides overlay → `_applySettings()`.

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

53. **Dynamic schema resolution on drop** — `dropNode()` (`graph/engine/nodes/dropNode.js:68`) for effector with `params === 'dynamic'` calls `hlp.resolveDynamicSchema(id, matchName)` → `schemaCache.fetchSchema(matchName)` (`graph/schemaCache/index.js:fetchSchema`) which checks in-memory cache, then disk cache (`persistence.js:readSchemaCache`), then introspects AE via `evalBridge.dispatch({action:'introspectEffect', params:{matchName}})` (`jsx/dispatcher/actions_effect.jsx:introspectEffect`), stores via `storeSchema()`, then calls `engine._applyDynamicSchema(nodeId, schema)` (`graph/engine/helpers.js:applyDynamicSchema`) which sets `dynamicSchema` and `secondaryPorts` on the node data.

54. **Schema cache init on startup** — `schemaCache.init()` (`graph/schemaCache/index.js:init`) calls `evalBridge.dispatch({action:'readSchemaCache'})` (`jsx/dispatcher/actions_schema.jsx:readSchemaCache`) to load disk cache, then `runVersionDiff()` (`graph/schemaCache/diff.js:runVersionDiff`) compares cached AE version with `getAEVersion()`, re-introspects schemas for mismatched versions.

## UI Infrastructure

55. **Node list search/filter** — `ui/nodeList/search.js` search input → `__nl_render.renderCategory()` filtered by query matching label/type.

56. **Node list category rendering** — `ui/nodeList/render.js` `renderCategory()` builds collapsible category sections with node items from `ui/nodeList/categories.js` definitions (Comps, Data, Effects, Layers, Utility).

57. **Sidebar collapse** — `ui/sidebarToggle.js` `init()` creates edge handle elements on left/right of canvas-wrap → hover/toggle adds/removes collapsed CSS classes on `#left-bar` / `#right-bar`.

58. **Bottom bar** — `ui/bottomBar.js` displays persistent notification text in `#bottom-bar`.

## Global State Reset

59. **Full graph reset** — `ui/topBar.js:66` reset btn with confirm → `engine.resetAll()` (`graph/engine/state.js:27`) iterates all nodes in reverse and calls `def.onDelete(nodeData)` then `evalBridge.dispatch()`, calls `graphState.clearGraph()` (`graph/graphState/graphOps.js:clearGraph`), then `viewport.reset()`, `renderer.render()`, `wireRenderer.render(null)`, `inspector.refresh()`, `statusBar.refresh()`, `topBar.refreshSelection([])`.

## Wire Rendering

60. **Wire canvas render** — `graph/wire/wireRenderer.js:259` `render(preview)` if preview is set (wire drag) draws immediately and stops animation; if `animatedDash` setting is true starts `requestAnimationFrame` loop incrementing `_animOffset` and re-drawing all wires with `setLineDash([6,4])` and `lineDashOffset = -_animOffset`; otherwise draws once with no dash; each wire is drawn via `_drawWire()` (`wireRenderer.js:162`) which reads port positions via `_portPosInWrap()`, picks color by wire type (layer=`#06D6A0`, data=`#6B7280`, parent=`#E07B39`, selected=`#FFFFFF`), draws bezier/direct/stepped segments, and for selected wires adds a 6px-wide glow (alpha 0.2).

## Initialization Sequence

61. **Canvas viewport init** — `canvasView.init()` (`graph/canvas/viewport.js:init`) sets up `#canvas-nodes` container reference and pan/zoom state.

62. **Canvas input init** — `canvasInput.init()` (`graph/canvas/input/index.js:init`) binds mousedown/mousemove/mouseup/click/wheel/keydown/keyup event listeners on `#canvas-wrap` and `document` via `inputHandlers` (`graph/canvas/input/handlers/index.js`).

63. **Wire renderer init** — `wireRenderer.init()` (`graph/wire/wireRenderer.js:305`) acquires `#node-graph` canvas and 2D context, calls `_resize()` and `render(null)`.

64. **Wire tool init** — `wireTool.init()` (`graph/wire/wire.js:209`) binds mousedown/mousemove/mouseup on `#canvas-wrap` and `document` for wire drag-to-connect.

65. **Global selection change handler** — `graphState.onSelectionChange()` (`graph/graphState/selection.js:onSelectionChange`) registered in `index.js:48` chains: `renderer.render()`, `wireRenderer.render(null)`, `inspector.refresh()`, `statusBar.refresh()`, `topBar.refreshSelection(sel)`, `nodeToolbar.refresh()`.
