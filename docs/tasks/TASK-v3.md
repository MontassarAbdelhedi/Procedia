# TASK-v3.md â€” Procedia v3 Implementation Tasks
*Derived from: docs/claude/PROCEDIA-V3-ARCHITECTURE.md*
*Rule: One task at a time. Verify in AE before starting the next. See CLAUDE.md SKILL 10.*

---

## Phase 0 â€” Scaffold

### T0.1 â€” File & Folder Structure
**Files touched:** All directories + `index.html` shell
Create every directory and empty placeholder file listed in Architecture Â§13.
Update `index.html` with the full `<script>` load order (empty bodies â€” just the tags).
**Verify:**
- [x] All directories exist on disk
- [x] `index.html` loads in CEP panel without console errors

---

### T0.2 â€” `data/uuidGenerator.js`
**Files touched:** `data/uuidGenerator.js`, `index.html`
Implement `generateNodeId()` â†’ `PROC-{timestamp}-{rand4}` and `generateWireId()` â†’ `WIRE-{timestamp}-{rand4}`.
No dependencies.
**Verify:**
- [x] `generateNodeId()` called in console returns correct format string
- [x] Two calls return different values

---

### T0.3 â€” `bridge/evalBridge.js`
**Files touched:** `bridge/evalBridge.js`, `index.html`
Implement `evalBridge(scriptString)` â†’ Promise. Calls `csInterface.evalScript`, JSON-parses result, rejects on parse error.
This is the **only** file that calls `csInterface.evalScript()`.
**Verify:**
- [x] `evalBridge('JSON.stringify({ok:true,data:"hello",error:null})')` resolves with `{ok:true, data:"hello"}`
- [x] Malformed return string rejects the promise and logs parse error

---

### T0.4 â€” `jsx/json.jsx` Polyfill
**Files touched:** `jsx/json.jsx`
Copy/adapt a JSON stringify+parse polyfill safe for ES3. No native JSON in AE 2025.
This must be the **first** script in every evalBridge preamble.
**Verify:**
- [x] `JSON.stringify({ok:true})` inside AE Script Editor returns `'{"ok":true}'`
- [x] `JSON.parse('{"ok":true}')` returns object with `ok === true`

---

### T0.5 â€” `graph/graphState.js` Skeleton
**Files touched:** `graph/graphState.js`, `index.html`
Declare `nodeMap`, `wireMap`, `tempGraph` as module-level `var`s.
Implement `rebuildTempGraph()` â€” copies nodeMap + wireMap into tempGraph object.
Implement `graphState.addNode(node)`, `graphState.removeNode(uuid)`, `graphState.addWire(wire)`, `graphState.removeWire(wireId)` â€” all mutate only from inside this file.
Expose a `graphState` global object.
**Verify:**
- [x] `graphState.addNode({id:'PROC-test', type:'TextNode',...})` â€” node appears in `nodeMap`
- [x] `graphState.rebuildTempGraph()` â€” tempGraph reflects nodeMap contents

---

## Phase 1 â€” Canvas Foundation

### T1.1 â€” `graph/canvas/viewport.js`
**Files touched:** `graph/canvas/viewport.js`, `index.html`
Implement viewport state: `panX`, `panY`, `zoom`.
Implement `worldToScreen(x, y)` and `screenToWorld(x, y)`.
Implement `applyViewport(ctx)` â€” applies transform to canvas context.
**Verify:**
- [x] `worldToScreen(0, 0)` returns canvas center when pan is 0
- [x] `screenToWorld(worldToScreen(100, 200))` returns `{x:100, y:200}`

---

### T1.2 â€” `graph/canvas/renderer.js` â€” Grid & Draw Loop
**Files touched:** `graph/canvas/renderer.js`, `index.html`
Implement `startRenderLoop(canvas)` using `requestAnimationFrame`.
Implement `drawGrid(ctx)` â€” draws dot or line grid in world space, respects viewport.
Clear canvas each frame, apply viewport, draw grid.
**Verify:**
- [x] Panel shows a grid that stays fixed as you pan (grid moves with viewport)
- [x] No console errors on load

---

### T1.3 â€” `graph/canvas/input.js` â€” Pan & Zoom
**Files touched:** `graph/canvas/input.js`, `index.html`
Wire `mousedown` + `mousemove` + `mouseup` for middle-button pan (or space+drag).
Wire `wheel` for zoom (zoom toward cursor position).
Update `viewport.js` state, trigger re-render.
**Verify:**
- [x] Middle-click drag pans the grid
- [x] Scroll wheel zooms in/out centered on cursor
- [x] Viewport coords are correct after pan + zoom combination

---

### T1.4 â€” `graph/canvas/index.js` â€” Canvas Assembly
**Files touched:** `graph/canvas/index.js`, `index.html`
Assemble canvas: find the `<canvas>` element, size it to panel, start render loop, init input.
Handle panel resize (ResizeObserver or window resize â†’ resize canvas).
**Verify:**
- [x] Canvas fills panel on load
- [x] Canvas resizes correctly when panel is resized in AE

---

## Phase 2 â€” Node Registry & Rendering

### T2.1 â€” `graph/nodes/nodeRegistry.js`
**Files touched:** `graph/nodes/nodeRegistry.js`, `index.html`
Implement `nodeRegistry` global with:
- `register(typeKey, definition)` â€” stores definition object
- `lookup(typeKey)` â€” returns definition or null
- `getCategories()` â€” returns array of category names
- `getByCategory(category)` â€” returns array of definitions in that category
**Verify:**
- [x] Register a dummy node, `lookup()` returns it
- [x] `getCategories()` lists registered categories

---

### T2.2 â€” `graph/nodes/node.js` â€” Draw & Hit-Test
**Files touched:** `graph/nodes/node.js`, `index.html`
Implement `drawNode(ctx, node, isSelected)` â€” draws node box, title, input/output ports, state badge (ghost/alive/error).
Implement `hitTestNode(node, worldX, worldY)` â€” returns true if point is inside node bounds.
Implement `hitTestPort(node, worldX, worldY)` â€” returns `{ portId, portType }` or null.
**Verify:**
- [x] A manually-added node entry in nodeMap renders visibly on canvas
- [x] Clicking the node area returns true from `hitTestNode`

---

### T2.3 â€” `graph/nodes/categories/core/Comp.js` â€” CompNode Definition
**Files touched:** `graph/nodes/categories/core/Comp.js`, `index.html`
Register `CompNode` with:
- `nodeKind: 'affected'`
- `category: 'core'`
- `inputs: [{ port: 'layer_in', type: 'layer', multiplicity: 'unlimited' }]`
- `defaultProps: { name: 'New Comp', width: 1920, height: 1080, duration: 5, frameRate: 24 }`
**Verify:**
- [x] `nodeRegistry.lookup('CompNode')` returns definition with correct fields

---

### T2.4 â€” `graph/nodes/categories/layers/Text.js` â€” TextNode Definition
**Files touched:** `graph/nodes/categories/layers/Text.js`, `index.html`
Register `TextNode` with:
- `nodeKind: 'affected'`
- `category: 'layers'`
- `inputs: [{ port: 'data_content', type: 'data', accepts: 'string' }, { port: 'data_fontSize', type: 'data', accepts: 'number' }, { port: 'data_color', type: 'data', accepts: 'color' }]`
- `defaultProps: { content: 'Text', fontSize: 72, color: [1,1,1,1] }`
**Verify:**
- [x] `nodeRegistry.lookup('TextNode')` returns definition with all input ports listed

---

## Phase 3 â€” Wire System

### T3.1 â€” `graph/Wire/wireRenderer.js` â€” Bezier Drawing
**Files touched:** `graph/Wire/wireRenderer.js`, `index.html`
Implement `drawWire(ctx, fromX, fromY, toX, toY, wireType, isPreview)`.
Use cubic bezier. `layer` wires: white/grey. `data` wires: yellow/orange. Preview (in-drag): dashed.
Implement `drawAllWires(ctx)` â€” iterates wireMap, draws each committed wire.
**Verify:**
- [x] Manually add a wire entry to wireMap and confirm it draws on canvas between two points

---

### T3.2 â€” `graph/Wire/wire.js` â€” Drag, Commit, Cycle Check
**Files touched:** `graph/Wire/wire.js`, `index.html`
Implement wire drag: `startWireDrag(fromNode, fromPort)`, `updateWireDrag(screenX, screenY)`, `commitWire(toNode, toPort)`, `cancelWireDrag()`.
Implement `checkCycle(fromNodeUUID, toNodeUUID)` â€” BFS/DFS downstream from toNode; if fromNode is found â†’ return true (cycle).
On commit: validate port type compatibility. If mismatch â†’ cancel silently. If cycle â†’ cancel silently.
On valid commit: call `graphState.addWire(wire)`.
**Verify:**
- [x] Dragging from output port shows preview bezier following cursor
- [x] Dropping on incompatible port type cancels (no wire created)
- [x] Connecting Aâ†’Bâ†’A is rejected (cycle)
- [x] Valid connection creates entry in wireMap

---

### T3.3 â€” `graph/Wire/nodeState.js` â€” `hasCompDownstream` & `evaluateNodeState`
**Files touched:** `graph/Wire/nodeState.js`, `index.html`
Implement `hasCompDownstream(nodeUUID)` â€” traverses wireMap downstream from nodeUUID; returns true if any CompNode is reachable (stop at data wire boundaries and CompNode boundaries).
Implement `evaluateNodeState(nodeUUID)` â€” returns `'alive'` if hasCompDownstream, else `'ghost'`. Does not mutate nodeMap â€” caller decides.
**Verify:**
- [x] Manually build a nodeMap+wireMap chain `Textâ†’Comp`; `hasCompDownstream('Text-uuid')` returns true
- [x] Break the wire; `hasCompDownstream` returns false

---

### T3.4 â€” `graph/Wire/nodeState.js` â€” `cascadeGhost`
**Files touched:** `graph/Wire/nodeState.js`
Implement `cascadeGhost(deletedWire)`:
1. Collect all upstream nodes that now have no comp path (BFS upstream from deletedWire.toNode, stop at data wires and CompNode boundaries).
2. Sort: effectors first by depth (deepest/outermost first), affected nodes last.
3. For each effector: preserve props (already in nodeMap), call `ae/nodeOps.removeEffector(uuid, hostLayerUUID, hostingCompUUID)`, set state='ghost'.
4. For each affected node: call `ae/nodeOps.parkLayer(uuid, hostingCompUUID)`, set state='ghost'.
5. Call `graphState.rebuildTempGraph()`.
**Verify:**
- [x] Wire deleted in chain `Textâ†’Effectâ†’Comp`: effect removed first, then text parked (check AE layer order in timeline)
- [x] Multi-comp: deleting one path leaves node alive in remaining comp

---

## Phase 4 â€” Node List UI & Drag

### T4.1 â€” `ui/nodeList.js` â€” Node List DOM
**Files touched:** `ui/nodeList.js`, `index.html`
Build the left-panel node list from `nodeRegistry.getCategories()`.
Implement category collapse/expand toggle.
Implement search filter (text input â†’ hides non-matching node entries).
**Verify:**
- [x] All registered node types appear grouped by category
- [x] Typing in search hides non-matching entries in real time
- [x] Category header click collapses/expands the group

---

### T4.2 â€” `ui/drag.js` â€” Drag from List to Canvas
**Files touched:** `ui/drag.js`, `index.html`
Implement drag-from-list: `mousedown` on list item â†’ start drag ghost element â†’ `mousemove` â†’ `mouseup` on canvas.
On drop: convert screen coordinates to world coordinates via `viewport.screenToWorld`.
Call `graphState.onDrop(nodeType, worldX, worldY)`.
`graphState.onDrop` generates UUID, sets state='ghost' (or 'alive' if CompNode), stores in nodeMap, rebuilds tempGraph.
**Verify:**
- [x] Drag a TextNode onto canvas â†’ entry appears in nodeMap with state='ghost'
- [x] Drag a CompNode onto canvas â†’ entry appears with state='alive', `makeCompAlive` called
- [x] Node renders on canvas at correct world position

---

### T4.3 â€” `ui/keyboard.js` â€” Delete Key
**Files touched:** `ui/keyboard.js`, `index.html`
Listen for `Delete`/`Backspace` key. If a node is selected: call `graphState.onDelete(selectedUUID)`. If a wire is selected: call `graphState.removeWire(wireId)` and cascade.
**Verify:**
- [x] Select a ghost node, press Delete â†’ node removed from nodeMap and canvas
- [x] Select an alive node, press Delete â†’ onGhost runs first, then node removed

---

## Phase 5 â€” Node Lifecycle (Panel JS)

### T5.1 â€” `graphState.onDrop`
**Files touched:** `graph/graphState.js`
Implement `onDrop(nodeType, x, y)`:
1. Generate UUID via `uuidGenerator`
2. Look up definition from nodeRegistry (get nodeKind, defaultProps)
3. Create nodeMap entry: `{ id, type, nodeKind, state:'ghost', dirty:false, x, y, props: defaultProps, hostingComps:[] }`
4. If type is `CompNode`: set state='alive', call `ae/nodeOps.makeCompAlive(uuid, props)`, push uuid to hostingComps
5. `rebuildTempGraph()`
**Verify:**
- [x] Drop TextNode â†’ nodeMap entry with state='ghost', no AE call
- [x] Drop CompNode â†’ nodeMap entry with state='alive', AE creates comp

---

### T5.2 â€” `graphState.onAlive`
**Files touched:** `graph/graphState.js`
Implement `onAlive(nodeUUID)` â€” called by wire commit logic after a valid connection is made:
1. Determine all reachable CompNode UUIDs downstream
2. For each hosting comp: if node was previously parked â†’ `ae/nodeOps.unparkLayer`; if never alive â†’ `ae/nodeOps.makeLayerAlive`
3. Re-apply wired effectors upstream of this node in correct order
4. Set state='alive', update hostingComps, `rebuildTempGraph()`
**Verify:**
- [x] Wire TextNode to CompNode â†’ TextNode state becomes 'alive', layer appears in AE comp

---

### T5.3 â€” `graphState.onGhost`
**Files touched:** `graph/graphState.js`
Implement `onGhost(nodeUUID)` â€” called by cascadeGhost after effectors are already removed:
1. Call `ae/nodeOps.parkLayer(uuid, hostingCompUUID)` (affected) or no AE call (effector â€” already handled by cascade)
2. Set state='ghost', clear hostingComps
3. `rebuildTempGraph()`
**Note:** `cascadeGhost` in `nodeState.js` orchestrates the sequence. `onGhost` here is the per-node state update step, not the cascade driver.
**Verify:**
- [ ] Cut wire from TextNode â†’ CompNode: TextNode state='ghost', layer moves to reserved comp in AE

---

### T5.4 â€” `graphState.onDelete`
**Files touched:** `graph/graphState.js`
Implement `onDelete(nodeUUID)`:
1. If state='alive': run full onGhost sequence (cascade + park)
2. If affected: call `ae/nodeOps.deleteParkedLayer(uuid)` after ghost
3. If CompNode: call `ae/nodeOps.deleteComp(uuid)` directly (no park step)
4. Remove from nodeMap, remove all wireMap entries referencing uuid
5. `rebuildTempGraph()`
**Verify:**
- [ ] Delete alive TextNode â†’ layer removed from hosting comp AND from reserved comp
- [ ] Delete CompNode â†’ AE comp deleted from project
- [ ] All wires referencing the deleted node disappear from canvas

---

## Phase 6 â€” ExtendScript: Init

### T6.1 â€” `jsx/init.jsx` â€” `initReservedComp`
**Files touched:** `jsx/init.jsx`
Implement `initReservedComp()`:
1. `findOrCreateProcediaFolder()` â€” creates `"DO NOT DELETE - Procedia"` if missing
2. `findOrCreateReservedComp()` â€” finds or creates `__PROCEDIA_RESERVED__` inside that folder
3. `findOrCreateTextLayer(comp, '__PROCEDIA_NODES__')` â€” creates locked text layer, writes empty JSON `{"version":"2.0","nodes":{}}`
4. Same for `__PROCEDIA_WIRES__` and `__PROCEDIA_GHOST_LAYERS__`
All layers locked. Comp locked.
**Verify (AE Script Editor):**
- [ ] `alert(initReservedComp())` â†’ `{"ok":true,"data":"initialized","error":null}`
- [ ] Project panel shows `DO NOT DELETE - Procedia` folder with reserved comp inside
- [ ] Reserved comp has three locked text layers with correct names

---

## Phase 7 â€” ExtendScript: Affected Node Ops

### T7.1 â€” `jsx/nodeLifeCycle/nodeLayerOps.jsx` â€” `makeLayerAlive`
**Files touched:** `jsx/nodeLifeCycle/nodeLayerOps.jsx`
Implement `makeLayerAlive(uuid, nodeType, hostingCompUUID, propsJson)`:
- Find hosting comp by UUID (via comp.comment)
- Switch on nodeType: `NullNode` â†’ `comp.layers.addNull()`, `TextNode` â†’ `comp.layers.addText()`, `ShapeNode` â†’ `comp.layers.addShape()`, `SolidNode` â†’ create solid FootageItem then `comp.layers.add(item)`, `AdjustmentNode` â†’ addNull + set adjustment flag
- Set `layer.comment = uuid`
- Apply props from propsJson to layer properties via match names
All ES3. Return `{ ok, data: {layerIndex}, error }`.
**Verify (AE Script Editor):**
- [ ] `alert(makeLayerAlive('PROC-test','TextNode','<comp-uuid>','{"content":"Hello","fontSize":72}'))` â†’ `ok:true`, text layer appears in comp
- [ ] Layer comment field equals the uuid

---

### T7.2 â€” `jsx/nodeLifeCycle/nodeLayerOps.jsx` â€” `parkLayer` & `unparkLayer`
**Files touched:** `jsx/nodeLifeCycle/nodeLayerOps.jsx`
Implement `parkLayer(uuid, hostingCompUUID)`:
1. Find layer in hosting comp by `layer.comment === uuid`
2. Cut and add to `__PROCEDIA_RESERVED__` comp (use `layer.copyToComp` or equivalent â€” ES3 safe)
3. Lock the parked layer
4. Append uuid to `__PROCEDIA_GHOST_LAYERS__` text layer content

Implement `unparkLayer(uuid, hostingCompUUID)`:
1. Find layer in reserved comp by comment
2. Unlock it, move to hosting comp
3. Remove uuid from `__PROCEDIA_GHOST_LAYERS__`
**Verify (AE Script Editor):**
- [ ] `parkLayer` â†’ layer disappears from hosting comp, appears in reserved comp, locked
- [ ] `unparkLayer` â†’ layer returns to hosting comp with keyframes intact

---

### T7.3 â€” `jsx/nodeLifeCycle/nodeLayerOps.jsx` â€” `deleteParkedLayer` & `removeLayerFromComp`
**Files touched:** `jsx/nodeLifeCycle/nodeLayerOps.jsx`
Implement `deleteParkedLayer(uuid)`:
1. Find layer in reserved comp by comment
2. Delete it
3. Remove uuid from `__PROCEDIA_GHOST_LAYERS__`

Implement `removeLayerFromComp(uuid, hostingCompUUID)`:
1. Find layer in the specified hosting comp by comment
2. Delete it from that comp only (node stays alive in other comps)
**Verify (AE Script Editor):**
- [ ] `deleteParkedLayer` â†’ layer gone from reserved comp, GHOST_LAYERS updated
- [ ] `removeLayerFromComp` â†’ layer removed from one comp; if same layer UUID exists in another comp, it is untouched

---

### T7.4 â€” `jsx/nodeLifeCycle/nodeLayerOps.jsx` â€” `deleteComp` & `renameNode`
**Files touched:** `jsx/nodeLifeCycle/nodeLayerOps.jsx`
Implement `deleteComp(uuid)`:
- Find CompItem by comp.comment === uuid, delete it from project

Implement `renameNode(uuid, newName)`:
- Find the AE object (comp or layer) by UUID in comment field
- Rename it (.name = newName)
**Verify (AE Script Editor):**
- [ ] `deleteComp` â†’ comp removed from project panel
- [ ] `renameNode` â†’ AE comp or layer name updates

---

## Phase 8 â€” ExtendScript: Effector Ops

### T8.1 â€” `jsx/nodeLifeCycle/nodeEffectorOps.jsx` â€” `applyEffector` (EffectNode)
**Files touched:** `jsx/nodeLifeCycle/nodeEffectorOps.jsx`
Implement `applyEffector(effectorUUID, hostLayerUUID, hostingCompUUID, propsJson)` for `EffectNode`:
- Find host layer in hosting comp by comment
- Find or add the effect by `props.aeMatchName` via `layer.property("ADBE Effect Parade").addProperty(matchName)`
- Set `effect.comment = effectorUUID` (to track which effector owns it)
- Apply each property value from propsJson to effect properties by match name
**Verify (AE Script Editor):**
- [ ] Apply Gaussian Blur â†’ blur effect appears on layer in AE
- [ ] `effect.comment` equals effectorUUID

---

### T8.2 â€” `jsx/nodeLifeCycle/nodeEffectorOps.jsx` â€” `removeEffector`
**Files touched:** `jsx/nodeLifeCycle/nodeEffectorOps.jsx`
Implement `removeEffector(effectorUUID, hostLayerUUID, hostingCompUUID)`:
- Find host layer in hosting comp by comment
- Iterate effects on layer, find the one where `effect.comment === effectorUUID`
- Remove it
**Verify (AE Script Editor):**
- [ ] Blur applied, then `removeEffector` â†’ blur effect gone from layer in AE
- [ ] Other effects on the same layer are not touched

---

### T8.3 â€” `jsx/nodeLifeCycle/nodeEffectorOps.jsx` â€” Additional Effector Types
**Files touched:** `jsx/nodeLifeCycle/nodeEffectorOps.jsx`
Extend `applyEffector` to handle:
- `MaskNode` â€” add mask to layer using `layer.mask.addProperty()`
- `ExpressionNode` â€” set expression string on a target property by match name
- `GraphPositionNode` â€” set `ADBE Position` on host layer transform
- `GraphRotationNode` â€” set `ADBE Rotate Z`
- `GraphScaleNode` â€” set `ADBE Scale`
- `IsParentNode` â€” set `childLayer.parent = parentLayer`
Extend `removeEffector` to handle the reverse for each type.
**Verify (AE Script Editor):**
- [ ] Each effector type: apply â†’ visible in AE timeline; remove â†’ gone

---

## Phase 9 â€” ExtendScript: Comp-to-Comp Ops

### T9.1 â€” `jsx/nodeLifeCycle/nodeCompOps.jsx`
**Files touched:** `jsx/nodeLifeCycle/nodeCompOps.jsx`
Implement `addCompAsLayer(fromCompUUID, toCompUUID)`:
- Find fromComp and toComp by comment
- Add fromComp as a precomp layer inside toComp: `toComp.layers.add(fromCompItem)`
- Set layer.comment = fromCompUUID

Implement `removeCompLayerFromComp(fromCompUUID, toCompUUID)`:
- Find toComp by comment
- Find the layer inside toComp where `layer.comment === fromCompUUID`
- Delete it
**Verify (AE Script Editor):**
- [ ] `addCompAsLayer` â†’ precomp layer appears in toComp timeline
- [ ] `removeCompLayerFromComp` â†’ precomp layer removed; source comp still exists in project

---

## Phase 10 â€” ExtendScript: Properties

### T10.1 â€” `jsx/properties.jsx` â€” `updateNodeProperty`
**Files touched:** `jsx/properties.jsx`
Implement `updateNodeProperty(uuid, hostingCompUUID, propertyMatchName, valueJson)`:
- Find layer in hosting comp by comment
- Navigate to property by match name string
- Set `.value = parsedValue`
All ES3. Handle nested match names (e.g. `"ADBE Transform Group/ADBE Position"`).
**Verify (AE Script Editor):**
- [ ] Set position on a null layer â†’ layer jumps to new position in AE
- [ ] Set opacity â†’ opacity updates in AE

---

### T10.2 â€” `jsx/properties.jsx` â€” `setLayerOrder`
**Files touched:** `jsx/properties.jsx`
Implement `setLayerOrder(hostingCompUUID, orderedUUIDsJson)`:
- Parse orderedUUIDs array (index 0 = AE top = layer 1)
- Walk array in reverse (bottom-to-top), call `layer.moveToBeginning()` for each
- See Architecture Â§14 rule 15: use moveToBeginning, never moveTo(index)
**Verify (AE Script Editor):**
- [ ] Two layers in comp, swap order via `setLayerOrder` â†’ AE timeline order changes correctly

---

### T10.3 â€” `jsx/properties.jsx` â€” `setLayerParent` & `clearLayerParent`
**Files touched:** `jsx/properties.jsx`
Implement `setLayerParent(childUUID, parentUUID, hostingCompUUID)`:
- Find both layers in hosting comp
- `childLayer.parent = parentLayer`

Implement `clearLayerParent(childUUID, hostingCompUUID)`:
- Find child layer
- `childLayer.parent = null`
**Verify (AE Script Editor):**
- [ ] `setLayerParent` â†’ child follows parent in AE
- [ ] `clearLayerParent` â†’ parent link removed, layer transforms become absolute

---

## Phase 11 â€” ExtendScript: Auxiliary

### T11.1 â€” `jsx/polling.jsx` â€” `pollAliveNodes`
**Files touched:** `jsx/polling.jsx`
Implement `pollAliveNodes(uuidListJson)`:
- Parse array of UUIDs
- For each UUID: search all comps and reserved comp for comp.comment or layer.comment match
- Return array: `[{ uuid, exists:bool, properties:{name, width, height, duration, frameRate} }]`
**Verify (AE Script Editor):**
- [ ] Poll a UUID that exists â†’ returns `exists:true` with current properties
- [ ] Poll a UUID that doesn't exist â†’ returns `exists:false`

---

### T11.2 â€” `jsx/aeFocus.jsx` â€” `focusCompInAE`
**Files touched:** `jsx/aeFocus.jsx`
Implement `focusCompInAE(uuid)`:
- Find CompItem by comment
- `app.activeViewer.setActiveTool(...)` or open comp: `comp.openInViewer()`
**Verify (AE Script Editor):**
- [ ] Double-click CompNode â†’ AE opens that comp in the timeline viewer

---

## Phase 12 â€” Panel JS: AE Layer

### T12.1 â€” `ae/nodeOps.js` â€” All `call*` Functions
**Files touched:** `ae/nodeOps.js`, `index.html`
Implement one wrapper function per ExtendScript command listed in Architecture Â§12.
Each function calls `evalBridge(scriptString)` and returns the promise.
This is the **only** file with evalBridge-calling functions.
No DOM. No graphState mutations.
**Verify:**
- [ ] `nodeOps.makeLayerAlive(uuid, 'TextNode', compUUID, props)` â†’ resolves with `ok:true`
- [ ] Each function: call it in console, confirm AE responds correctly

---

### T12.2 â€” `ae/graphHooks.js` â€” Event â†’ nodeOps Wiring
**Files touched:** `ae/graphHooks.js`, `index.html`
Listen to graphState event emitter (or polling-style callbacks).
Wire each lifecycle event to the correct `ae/nodeOps` call:
- `'node:alive'` â†’ `nodeOps.makeLayerAlive` or `nodeOps.unparkLayer`
- `'node:ghost'` â†’ `nodeOps.parkLayer` (affected) [effectors handled by cascadeGhost]
- `'node:delete'` â†’ `nodeOps.deleteParkedLayer` or `nodeOps.deleteComp`
- `'wire:compToComp:add'` â†’ `nodeOps.addCompAsLayer`
- `'wire:compToComp:remove'` â†’ `nodeOps.removeCompLayerFromComp`
No DOM. No direct evalBridge calls.
**Verify:**
- [ ] Wire TextNode to CompNode via UI â†’ TextNode layer appears in AE comp
- [ ] Delete wire via UI â†’ layer parks in reserved comp

---

## Phase 13 â€” Dirty Flag & Debounce

### T13.1 â€” `flush/dirtyFlusher.js`
**Files touched:** `flush/dirtyFlusher.js`, `index.html`
Implement `markDirty(uuid)` â€” sets `nodeMap[uuid].dirty = true`, resets 300ms debounce timer.
Implement `flushDirtyNodes()` â€” collects all dirty nodes, calls `nodeOps.updateNodeProperty` for each prop, clears dirty flag.
Set `isWriting = true` before flush, `false` in callback.
Implement `flushNow()` â€” bypasses debounce, used by structural events.
**Verify:**
- [ ] Change a property in inspector â†’ after 300ms delay, AE layer updates
- [ ] Rapid changes â†’ only one AE call fires (debounce collapses them)
- [ ] Ghost node made dirty then ghosted â†’ no AE call fires on flush

---

## Phase 14 â€” Polling

### T14.1 â€” `polling/poller.js` â€” Adaptive Polling
**Files touched:** `polling/poller.js`, `index.html`
Implement adaptive polling:
- Track last mouse/keyboard activity timestamp
- If activity in last 5s: poll every 1s; else poll every 5s
- Before each tick: check `isWriting` flag (from dirtyFlusher); skip tick if true
- Call `nodeOps.pollAliveNodes(aliveUUIDs)` â†’ process response
- On property change detected: update `nodeMap[uuid].props`, update inspector if selected
- On `exists:false`: set `nodeMap[uuid].state = 'error'`, trigger error badge render, show notification
**Verify:**
- [ ] Manually delete a Procedia-managed layer in AE â†’ panel shows error badge on that node within 5 seconds
- [ ] Panel does not poll during evalScript write (no interleaved calls in console)

---

## Phase 15 â€” Persistence

### T15.1 â€” `jsx/persistence.jsx` â€” Write Commands
**Files touched:** `jsx/persistence.jsx`
Implement `writeNodeRegistry(jsonString)` â€” overwrites `__PROCEDIA_NODES__` text layer source text.
Implement `writeWireRegistry(jsonString)` â€” overwrites `__PROCEDIA_WIRES__` text layer.
Implement `writeCompMembership(compUUID, jsonString)` â€” finds or creates `__PROCEDIA_COMP_{uuid}__` text layer inside that comp, overwrites content.
**Verify (AE Script Editor):**
- [ ] `writeNodeRegistry('{"version":"2.0","nodes":{}}')` â†’ NODES layer content updated in reserved comp
- [ ] `writeCompMembership('<uuid>','{}')` â†’ membership layer appears inside that comp

---

### T15.2 â€” `jsx/persistence.jsx` â€” Read Commands
**Files touched:** `jsx/persistence.jsx`
Implement `readNodeRegistry()` â†’ returns text content of `__PROCEDIA_NODES__` layer. Returns empty schema if layer not found.
Implement `readWireRegistry()` â†’ same for `__PROCEDIA_WIRES__`.
Implement `readCompMembership(compUUID)` â†’ reads `__PROCEDIA_COMP_{uuid}__` from that comp.
**Verify (AE Script Editor):**
- [ ] Write then read â†’ returned JSON matches what was written
- [ ] Read on fresh project (no reserved comp) â†’ returns empty schema, ok:true, no error thrown

---

### T15.3 â€” `graphState.flushToPersistence` & Panel Open Restore
**Files touched:** `graph/graphState.js`, `index.js`
Implement `flushToPersistence()` in graphState:
1. Serialize tempGraph.nodes â†’ `nodeOps.writeNodeRegistry`
2. Serialize tempGraph.wires â†’ `nodeOps.writeWireRegistry`
3. For each alive CompNode: `nodeOps.writeCompMembership(uuid, membersJson)`

In `index.js`, wire three event listeners:
- `com.adobe.csxs.events.ApplicationBeforeUnload` â†’ `graphState.flushToPersistence()`
- `window.beforeunload` â†’ same
- `com.adobe.csxs.events.ApplicationQuit` â†’ same

Implement panel-open restore sequence in `index.js`:
1. `nodeOps.readNodeRegistry()` â†’ populate nodeMap
2. `nodeOps.readWireRegistry()` â†’ populate wireMap
3. `rebuildTempGraph()`
4. Poll all alive UUIDs â†’ flag missing as error
**Verify:**
- [ ] Drop nodes, wire them, close AE, reopen â†’ graph restores correctly
- [ ] Node positions restored (x, y persisted in NODES layer)
- [ ] Any AE-deleted layers show error badge on restore

---

## Phase 16 â€” Inspector

### T16.1 â€” `inspector/inspector.js` â€” Property Panel
**Files touched:** `inspector/inspector.js`, `index.html`
Implement `renderInspector(nodeUUID)` â€” builds DOM for selected node's properties.
Each property: label + appropriate input (text, number, color picker, slider).
On input change: `graphState.setNodeProp(uuid, key, value)` â†’ marks dirty via `dirtyFlusher.markDirty`.
On node deselect: clear inspector.
**Verify:**
- [ ] Select TextNode â†’ inspector shows content, fontSize, color inputs
- [ ] Change fontSize â†’ after 300ms, AE layer font size updates

---

### T16.2 â€” `inspector/layerOrderList.js` â€” CompNode Layer Stack
**Files touched:** `inspector/layerOrderList.js`, `index.html`
When CompNode is selected, inspector shows the connected input nodes in a reorderable list.
Implement drag-to-reorder within the list.
On reorder: call `nodeOps.setLayerOrder(compUUID, orderedUUIDs)`.
**Verify:**
- [ ] CompNode with 3 connected layers â†’ inspector shows all 3 in a list
- [ ] Drag to swap order â†’ AE layer order changes within 300ms (or immediate structural flush)

---

## Phase 17 â€” Notifications

### T17.1 â€” `notifications/notificationBar.js`
**Files touched:** `notifications/notificationBar.js`, `index.html`
Implement a panel-level notification bar (top or bottom strip).
API: `showNotification(message, type)` where type is `'error'` | `'info'`.
Auto-dismiss after 5 seconds. Show immediately on call.
Used by: poller error detection (`"[NodeLabel] was deleted outside Procedia"`).
**Verify:**
- [ ] `showNotification('Test message', 'error')` â†’ red bar appears in panel
- [ ] Bar dismisses after 5 seconds without interaction

---

## Phase 18 â€” Canvas: Node Selection & Move

### T18.1 â€” `graph/canvas/input.js` â€” Node Select & Move
**Files touched:** `graph/canvas/input.js`
Extend input handler:
- Left click on node â†’ `graphState.setSelection(uuid)`, trigger inspector render
- Left click on empty canvas â†’ clear selection
- Left click + drag on node â†’ move node (update x, y in nodeMap in real time, no dirty flush â€” positions are structural)
- Multi-select: shift+click or drag rect
**Verify:**
- [ ] Click node â†’ selection ring drawn, inspector populated
- [ ] Drag node â†’ node moves on canvas, nodeMap.x/y updated
- [ ] Click empty area â†’ inspector clears

---

### T18.2 â€” `graph/canvas/minimap.js`
**Files touched:** `graph/canvas/minimap.js`, `index.html`
Implement a small overview minimap in a corner of the canvas.
Draws scaled-down positions of all nodes and wires.
Click/drag in minimap pans the main viewport.
**Verify:**
- [ ] Minimap shows all nodes as small dots
- [ ] Clicking minimap pans main canvas to that area

---

## Task Order Summary

```
Phase 0: T0.1 â†’ T0.2 â†’ T0.3 â†’ T0.4 â†’ T0.5
Phase 1: T1.1 â†’ T1.2 â†’ T1.3 â†’ T1.4
Phase 2: T2.1 â†’ T2.2 â†’ T2.3 â†’ T2.4
Phase 3: T3.1 â†’ T3.2 â†’ T3.3 â†’ T3.4
Phase 4: T4.1 â†’ T4.2 â†’ T4.3
Phase 5: T5.1 â†’ T5.2 â†’ T5.3 â†’ T5.4
Phase 6: T6.1
Phase 7: T7.1 â†’ T7.2 â†’ T7.3 â†’ T7.4
Phase 8: T8.1 â†’ T8.2 â†’ T8.3
Phase 9: T9.1
Phase 10: T10.1 â†’ T10.2 â†’ T10.3
Phase 11: T11.1 â†’ T11.2
Phase 12: T12.1 â†’ T12.2
Phase 13: T13.1
Phase 14: T14.1 â†’ T14.2 â†’ T14.3
Phase 15: T15.1 â†’ T15.2 â†’ T15.3
Phase 16: T16.1 â†’ T16.2
Phase 17: T17.1
Phase 18: T18.1 â†’ T18.2
```

**Cross-phase dependencies:**
- T0.3 (evalBridge) must precede all T7â€“T11 ExtendScript tasks
- T0.4 (json.jsx) must precede all `.jsx` tasks
- T6.1 (initReservedComp) must precede T7.2 (parkLayer) and T15.1 (write)
- T5.x (lifecycle) depends on T12.1 (nodeOps) being ready
- T13.1 (poller) depends on T11.1 (pollAliveNodes jsx)

---

*Total tasks: 40 | Estimated scope: implement one per session, verify in AE before proceeding*
