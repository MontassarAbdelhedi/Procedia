# Procedia v4 — Project Overview
*CEP Panel · Adobe After Effects 2025+ · Windows*
*May 2026*

---

## What Is Procedia?

Procedia is a **node-based procedural motion design plugin for Adobe After Effects**, built as a CEP (Common Extensibility Platform) panel. It gives motion designers a visual node graph inside AE — a canvas where they connect nodes representing AE layers, effects, and values, and the plugin translates that graph into real AE objects in real time.

**The core experience:**
- Drag a `Text` node onto the canvas. Wire it to a `Comp` node. A text layer appears inside the AE comp instantly — no clicking Apply, no dialog boxes.
- Drop a `Fill` effect node and wire it to the text node's output. A Fill effect appears on the text layer in AE.
- Drop a `Color` node, wire it to the Fill's color param. Now the Fill's color is driven by the Color node's value — change the color in the panel, the AE effect updates in real time.
- Disconnect the text node from the comp. The text layer moves to a hidden Reserved Comp — keyframes intact. Reconnect it. The layer comes back. The graph is always recoverable.

**The plugin is non-destructive by design.** AE layers are never deleted when a node goes offline — they are parked in the Reserved Comp and returned when the connection is restored. Keyframes survive across every park/unpark cycle.

---

## Approach

### The V3 Problem

The previous version (v3) of Procedia suffered from one critical failure: **adding a new node required touching six files**. The node definition, the state routing, the AE call routing, the lifecycle handler, the ExtendScript bridge, and the HTML load order — all had to be updated in sync. This made the codebase fragile, slow to extend, and prone to regressions when any of those files drifted out of sync.

### The V4 Solution — One File Per Node

V4 is built around a single architectural principle:

> **A node is a self-contained contract. The graph engine is a dumb executor. Adding a new node means writing one file — nothing else.**

Each node definition file declares everything about that node: its type, category, ports, params, and all five lifecycle hooks. The hooks return plain command objects — not ExtendScript, not function calls, just data. A centralized dispatcher in `dispatcher.jsx` is the only file that ever writes AE API calls.

The engine calls hooks by name and passes results to the dispatcher. It contains zero node-type conditionals. If you need to add a `SolidNode`, you write `Solid.js`, register it, and add one action handler to `dispatcher.jsx`. Nothing else changes.

### The Dispatcher Pattern

```
Node definition hook → returns { action: 'createTextLayer', params: { ... } }
                    ↓
          engine.js passes to evalBridge
                    ↓
       dispatcher.jsx routes to actionCreateTextLayer(params)
                    ↓
             app.project.items.addText(...)   ← only AE call in the system
```

This means every AE operation in Procedia is visible in one file. The full inventory of what the plugin can do in AE is the list of action handlers in `dispatcher.jsx`.

### Extendable Ports and the Picker

V4 introduces a new port mechanic: **extendable input ports**. Nodes like CompNode and effect nodes declare one extendable input port. When all slots are occupied, a new empty slot spawns automatically. When a data wire (Color, Number) is dropped onto a newborn empty slot, a picker dropdown appears — it lists the node's params whose type matches the wire's data type. The user selects a param and the wire binds to it. That param is now driven by the upstream data node instead of the inspector.

This is how `Color → Fill.color` and `Number → GaussianBlur.blurriness` work — the picker is what connects them.

### Ghost State and Park/Unpark

Every node has one of three states: `alive`, `ghost`, or `error`.

- **Alive** — the node has a comp path downstream and its AE object is active
- **Ghost** — the node is in the graph but has no comp path; its AE layer is parked in the Reserved Comp
- **Error** — the node was alive but the poller detected its AE object is missing (user deleted it directly in AE)

When a wire is deleted, the **cascade algorithm** runs. It traverses the graph to find all nodes that have lost their comp path, orders them (effectors first, affected nodes last), strips all effects before parking layers, and sends a single batch command to AE — one bridge crossing for the entire cascade regardless of depth.

### Technology Stack

| Layer | Technology |
|---|---|
| Panel UI | HTML + CSS + Vanilla JS (no bundler, no framework) |
| AE Scripting | ExtendScript ES3 (strict — no ES5+ features) |
| Panel ↔ AE bridge | `csInterface.evalScript()` — string in, JSON string out |
| Platform | CEP 11, Windows, After Effects 2025+ |
| Load system | Plain `<script>` tags in `index.html`, dependency-ordered |

---

## Architecture

### Core Principle — Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────┐
│  Panel JavaScript (Chromium)                                    │
│                                                                 │
│  nodeMap / wireMap ← graphState.js (sole mutator)              │
│                                                                 │
│  engine.js ──calls hooks──> node definitions                   │
│     └──passes command objects──> evalBridge.js                 │
│                                         │                       │
│  renderer.js + wireRenderer.js          │  csInterface.evalScript()
│  minimap.js                             │                       │
│  inspector.js + layerOrderList.js       │                       │
│  poller.js ──────────────────────────────────────────────────> │
└─────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  ExtendScript (After Effects)                                   │
│                                                                 │
│  dispatcher.jsx  ← THE ONLY AE API CALLER                     │
│    ├── json.jsx (polyfill)                                     │
│    ├── utils.jsx (findCompByUUID, findLayerByUUID, etc.)       │
│    ├── persistence.jsx (readGraph, writeGraph)                 │
│    └── polling.jsx (pollAliveNodes)                            │
└─────────────────────────────────────────────────────────────────┘
```

### Node Taxonomy

| `nodeKind` | AE Presence | Cascade behavior | Examples |
|---|---|---|---|
| `affected` | Owns a standalone AE layer. Parked in Reserved Comp when ghost. | Ghosted last — after all effectors stripped | TextNode, NullNode, ShapeNode, AdjustmentNode, CompNode |
| `effector` | Modifies the upstream node's layer. No standalone layer. | Ghosted first — effects stripped before layer parks | FillEffect, GaussianBlur, DropShadow, Expression |
| `data` | No AE presence. Outputs a typed value. Always alive. | Never cascades | ColorNode, NumberNode |

### Wire Types

| Type | Color | Carries | Triggers cascade |
|---|---|---|---|
| `layer` | Blue | AE layer reference — the core topology wire | Yes |
| `data` | Yellow | Typed value (color, number) — drives locked params | No |
| `parent` | Green dashed | AE `layer.parent` relationship | No |

### Node States

```
onDrop     → ghost       (all nodes except standalone CompNode and data nodes)
ghost      → alive       when a downstream comp path is established via layer wires
alive      → ghost       when the last downstream comp path is broken (cascade)
alive      → error       when the poller detects the AE object is missing
error      → alive       user clicks [Re-create in AE]
error      → removed     user clicks [Remove from Graph]
```

### Reserved Comp

A hidden comp named `"DO NOT DELETE — Procedia Reserved"` stores parked layers. The graph engine never sees it when traversing project items. Parked layers retain all keyframes natively. Procedia never auto-repairs a deleted Reserved Comp.

### Persistence

The graph is serialized to two text layers inside the Reserved Comp on three events: AE save, AE quit, panel unload. On panel open, the graph is read back, `nodeMap` and `wireMap` are rebuilt, and all alive nodes are polled to verify their AE objects still exist. Strings exceeding 25,000 characters are chunked across multiple text layers (`__PROCEDIA_NODES_1__`, `__PROCEDIA_NODES_2__`, etc.).

---

## Directory Structure

```
procedia-v4/
│
├── index.html                        ← Script load order. The single source of load truth.
├── index.js                          ← Panel entry point.
├── panel.css                         ← All styles. CSS custom properties for every color.
│
├── CSXS/
│   └── manifest.xml                  ← CEP manifest. Extension ID: com.uppercut.procedia
├── .debug                            ← CEP debug mode. Allows unsigned extension loading.
├── lib/
│   └── CSInterface.js                ← Adobe CEP bridge library.
│
├── graph/
│   ├── graphState.js                 ← nodeMap, wireMap, tempGraph. THE ONLY MUTATOR.
│   │                                   addNode, removeNode, updateNode, updateWire
│   │                                   addWire, removeWire, updateProp, rebuildTempGraph
│   │                                   loadGraph, clearGraph, getTempGraph
│   │                                   setSelection, getSelection, onSelectionChange
│   │
│   ├── nodeRegistry.js               ← register(def), getDefinition(type), getAll()
│   │                                   getByCategory(cat), listTypes()
│   │
│   ├── engine.js                     ← Dumb executor. Zero node-type conditionals.
│   │                                   dropNode, connectWire, disconnectWire
│   │                                   deleteNode, setNodeProperty
│   │
│   ├── cascadeAlgorithm.js           ← cascadeGhost(wireId), hasCompDownstream(nodeId)
│   │                                   Effectors ghosted first. Affected nodes parked last.
│   │                                   Single dispatchBatch per cascade — one bridge crossing.
│   │
│   ├── cycleChecker.js               ← hasCycle(fromNodeId, toNodeId) — pure graph traversal
│   ├── portManager.js                ← Extendable slot lifecycle: afterConnect, afterDisconnect
│   │                                   getOpenSlot, resolveSlotName, isExtendable
│   │
│   ├── wireValidator.js              ← validate(from, fromPort, to, toPort, type)
│   │                                   getPickerParams(nodeId, wireDataType)
│   │                                   9 validation rules including same-comp parent constraint
│   │
│   ├── nodes/
│   │   └── categories/
│   │       ├── core/
│   │       │   └── Comp.js           ← affected, dedicated:true — always alive on drop
│   │       ├── layers/
│   │       │   ├── Text.js           ← affected, dedicated:false
│   │       │   ├── Null.js           ← affected, dedicated:true (FootageItem solid)
│   │       │   ├── Shape.js          ← affected, dedicated:false
│   │       │   └── Adjustment.js     ← affected, dedicated:false
│   │       ├── effects/
│   │       │   ├── FillEffect.js     ← effector — ADBE Fill
│   │       │   ├── GaussianBlur.js   ← effector — ADBE Gaussian Blur 2
│   │       │   └── DropShadow.js     ← effector — ADBE Drop Shadow
│   │       ├── data/
│   │       │   ├── Color.js          ← data — outputs [r,g,b,a], always alive
│   │       │   └── Number.js         ← data — outputs float, always alive
│   │       └── utility/
│   │           └── Expression.js     ← effector — applies JS expression to layer property
│   │
│   ├── canvas/
│   │   ├── viewport.js               ← Pan, zoom, screenToCanvas, canvasToScreen
│   │   ├── renderer.js               ← DOM reconciliation: nodeMap → node card elements
│   │   ├── input.js                  ← Mouse: node drag, canvas pan (space+drag, middle mouse)
│   │   │                               Scroll: zoom to cursor. Routes port clicks to wire.js.
│   │   └── minimap.js                ← Canvas 2D thumbnail. Click-to-pan navigation.
│   │
│   └── wire/
│       ├── wire.js                   ← Wire drag, drop, reroute, picker UI, wire select/delete
│       └── wireRenderer.js           ← SVG bezier paths in #wire-layer. Color by wire type.
│
├── ui/
│   ├── nodeList.js                   ← Palette search filter. Category collapse.
│   ├── drag.js                       ← HTML5 dragstart/drop from palette to canvas.
│   ├── inspector.js                  ← Param fields for selected node. Wired params locked.
│   ├── layerOrderList.js             ← Drag-to-reorder layer stacking. Shown for CompNode.
│   ├── keyboard.js                   ← Delete/Backspace (node delete), Escape (deselect).
│   ├── settings.js                   ← Persistent settings store. localStorage key 'procedia_settings'.
│   │                                   get(key), set(key, value), getAll(). No dependencies.
│   └── settingsModal.js              ← Gear-button modal (⚙ top-right of canvas). open/close,
│                                       minimap toggle, wire style select. Depends on settings.js.
│
├── flush/
│   └── dirtyFlusher.js               ← 300ms debounce. Flushes dirty nodes to AE.
│                                       Resolves data wire values via _resolveParamValue.
│
├── polling/
│   └── poller.js                     ← Adaptive tick: 1s active / 5s idle.
│                                       Skips when evalBridge.isWriting() is true.
│                                       Sets nodes to error state when AE object missing.
│
├── notifications/
│   └── notificationBar.js            ← showError(nodeId, label), showMessage(text)
│                                       dismiss(nodeId), dismissAll()
│                                       Re-create in AE / Remove from Graph actions.
│
├── bridge/
│   └── evalBridge.js                 ← THE ONLY csInterface.evalScript() CALLER.
│                                       dispatch(commandObj) → Promise<{ok,data,error}>
│                                       dispatchBatch(commandArr) → Promise<{ok,data,error}>
│                                       writeGraph(graphData), readGraph()
│                                       isWriting() — polled by poller.js
│
├── data/
│   └── uuidGenerator.js              ← node() → 'PROC-{ts}-{rand4}'
│                                       wire() → 'WIRE-{ts}-{rand4}'
│
└── jsx/
    ├── json.jsx                      ← JSON polyfill. MUST load before all other jsx.
    ├── utils.jsx                     ← findCompByUUID, findLayerByUUID, findReservedComp
    │                                   findOrCreateReservedComp, moveLayerToComp
    │                                   setPropertyByKey, _findPropertyByMatchName
    │                                   _removeExpressionFromLayer
    ├── persistence.jsx               ← readGraph(), writeGraph(graphJSON)
    │                                   Chunked at 25,000 chars per text layer.
    ├── polling.jsx                   ← pollAliveNodes(uuidListJSON)
    │                                   Returns found/missing status + props for each UUID.
    └── dispatcher/
        └── dispatcher.jsx            ← THE ONLY AE API CALLER.
                                        dispatch(commandJSON) → routes to action handler
                                        dispatchBatch(commandArrayJSON) → processes in order
                                        ─────────────────────────────────────────────────
                                        Registered actions:
                                        createComp, createTextLayer, createNullLayer
                                        createShapeLayer, createAdjustmentLayer
                                        addCompAsLayer
                                        parkLayer, unparkLayer
                                        deleteParkedLayer, deleteComp
                                        applyEffect, removeEffect, setEffectProperty
                                        applyExpression, removeExpression
                                        setLayerProperty, setCompProperty
                                        setLayerParent, clearLayerParent
                                        setLayerOrder, renameNode, focusComp
                                        pollAliveNodes
```

---

## Build Order — 24 Briefs

Each brief is a complete task instruction for Claude Code. Briefs are sequential — each depends on all previous briefs being complete and verified. Every brief ends with a hard stop and verification checklist before the next brief begins.

---

### TASK-01 — CEP Scaffold, Directory Setup, Panel UI Shell

**Delivers:** Full repo structure. Every file created as a stub. Working static panel layout in the browser.

**Phases:**
- Phase 0: CEP scaffold — `CSXS/manifest.xml`, `.debug`, `lib/CSInterface.js`
- Phase 1: Directory scaffold — all folders and stub files with dependency headers
- Phase 2: Panel UI shell — `panel.css` + `index.html` with static layout, six placeholder node cards, wires as SVG, wire picker, notification bar, inspector, status bar

**Verification:**
- [ ] `.debug` exists at repo root with `com.uppercut.procedia`
- [ ] `CSXS/manifest.xml` exists with correct extension ID and AE host entry
- [ ] `lib/CSInterface.js` exists (real or stub — report which)
- [ ] `find . -not -path './.git/*' -type f | sort` matches the exact tree in the brief
- [ ] Every stub file has exactly three comment lines
- [ ] `panel.css` and `index.html` exist empty before Phase 2
- [ ] Panel opens in browser without console errors
- [ ] Three-column layout renders: palette | canvas | inspector
- [ ] Topbar and statusbar span full width
- [ ] Canvas shows dot grid
- [ ] All six placeholder node cards visible at correct positions
- [ ] All port dots visible — blue (layer), yellow (data), green squares (parent), dashed (empty)
- [ ] Four SVG wires visible and correctly colored
- [ ] Wire picker dropdown visible near Fill node
- [ ] Notification bar visible with two buttons
- [ ] Inspector shows Comp node fields
- [ ] Palette categories collapse and expand
- [ ] DM Mono and Syne fonts loading (Network tab: 200 OK)
- [ ] No hardcoded hex colors in `panel.css` — all reference CSS variables
- [ ] All `<script>` tags in correct order

---

### TASK-02 — graphState.js + nodeRegistry.js

**Delivers:** In-memory graph state store and node definition registry. Pure JS, no AE dependency.

**Verification — nodeRegistry:**
- [ ] `listTypes()` returns empty array before any registrations
- [ ] `getAll()` returns empty object before any registrations
- [ ] `getDefinition('unknown')` returns null
- [ ] `getByCategory('X')` returns empty array before registrations
- [ ] `register(def)` stores definition keyed by `def.type`
- [ ] Duplicate `type` registration throws
- [ ] Registration without `def.type` throws
- [ ] All tests pass — zero failures

**Verification — graphState:**
- [ ] `getAllNodes()` empty on init
- [ ] `getAllWires()` empty on init
- [ ] `getSelection()` null on init
- [ ] `addNode` adds to nodeMap
- [ ] Duplicate node ID throws
- [ ] `getAllNodes()` count correct after adds
- [ ] `addWire` adds to wireMap
- [ ] Duplicate wire ID throws
- [ ] `updateNode` changes fields, preserves others
- [ ] `updateProp` sets prop value and dirty flag
- [ ] `clearDirty` resets dirty flag
- [ ] `setSelection` updates getSelection
- [ ] `onSelectionChange` callback fires with correct UUID
- [ ] `setSelection(null)` clears selection
- [ ] `removeWire` removes from wireMap
- [ ] `removeNode` removes node AND all wires referencing it
- [ ] `removeNode` leaves unrelated nodes intact
- [ ] `clearGraph` empties nodes, wires, selection
- [ ] `loadGraph` restores nodes and wires
- [ ] `loadGraph` sets `dirty: false` and `portSlots: {}` on loaded nodes
- [ ] All unknown UUID operations are no-ops (no throw)
- [ ] All tests pass — zero failures

---

### TASK-03 — uuidGenerator.js + evalBridge.js

**Delivers:** UUID generation and the only AE bridge function.

**Verification — uuidGenerator:**
- [ ] `node()` returns string starting with `PROC-`
- [ ] `wire()` returns string starting with `WIRE-`
- [ ] Both have 3 segments separated by `-`
- [ ] Timestamp segment is 13 digits
- [ ] Rand segment is exactly 4 lowercase alphanumeric chars
- [ ] 100 consecutive calls produce no collisions
- [ ] All tests pass — zero failures

**Verification — evalBridge:**
- [ ] `evalBridge` object exists
- [ ] `dispatch` is a function
- [ ] `dispatchBatch` is a function
- [ ] `isWriting` is a function
- [ ] `dispatch()` rejects outside AE (no csInterface)
- [ ] Rejection message mentions `csInterface`
- [ ] `dispatchBatch()` rejects outside AE
- [ ] Both return thenables with `.then` and `.catch`
- [ ] All tests pass — zero failures

---

### TASK-04 — Comp.js Node Definition

**Delivers:** CompNode — the first real node definition. Template for all future nodes.

**Verification:**
- [ ] `nodeRegistry.getDefinition('core/comp')` returns non-null
- [ ] `type === 'core/comp'`, `label === 'Comp'`, `category === 'Core'`
- [ ] `nodeKind === 'affected'`, `dedicated === true`
- [ ] Exactly 4 ports: `layer_in`, `output`, `child_of`, `parent_of`
- [ ] `layer_in`: category input, type layer, extendable true, required false
- [ ] `output`: category output, type layer
- [ ] `child_of`: category parent, role child
- [ ] `parent_of`: category parent, role parent
- [ ] Exactly 6 params: `label`, `width`, `height`, `fps`, `duration`, `bgColor`
- [ ] `width` default 1920, `height` default 1080, `fps` default 24, `duration` default 10
- [ ] `bgColor` default is array of length 3 (RGB, not RGBA)
- [ ] All params have defaults
- [ ] All 5 lifecycle hooks are functions
- [ ] `onDrop` returns `createComp` command with all required params
- [ ] `onAlive` returns `addCompAsLayer` command with nodeUUID and hostingCompUUID
- [ ] `onGhost` returns `parkLayer` command
- [ ] `onDelete` returns `deleteComp` command
- [ ] `onPropertyChange` returns `setCompProperty` command
- [ ] All tests pass — zero failures

---

### TASK-05 — Text.js + Null.js

**Delivers:** Two standard affected layer nodes. Locks in the pattern for all future layer nodes.

**Verification — TextNode:**
- [ ] `type === 'layers/text'`, `label === 'Text'`, `category === 'Layers'`
- [ ] `nodeKind === 'affected'`, `dedicated === false`
- [ ] Exactly 3 ports: `output`, `child_of`, `parent_of` — no input ports
- [ ] Exactly 7 params: `label`, `content`, `fontSize`, `color`, `position`, `rotation`, `opacity`
- [ ] `color` default has 4 channels (RGBA)
- [ ] `content` default is `'New Text'`, `fontSize` default 72, `opacity` default 100
- [ ] All params have defaults
- [ ] `onDrop` returns null
- [ ] `onAlive` action is `createTextLayer`, sends `content` and `fontSize`
- [ ] `onGhost` action is `parkLayer`
- [ ] `onDelete` action is `deleteParkedLayer`
- [ ] `onPropertyChange` action is `setLayerProperty`

**Verification — NullNode:**
- [ ] `type === 'layers/null'`, `dedicated === true`
- [ ] Exactly 3 ports — no input ports
- [ ] Exactly 5 params: `label`, `position`, `rotation`, `opacity`, `scale`
- [ ] No `content`, `fontSize`, or `color` params
- [ ] `scale` default is `[100, 100]`
- [ ] `onAlive` action is `createNullLayer`, sends `scale`
- [ ] `onGhost` action is `parkLayer`, `onDelete` is `deleteParkedLayer`
- [ ] `nodeRegistry` still has `core/comp` (not overwritten)
- [ ] All tests pass — zero failures

---

### TASK-06 — engine.js

**Delivers:** The dumb executor. `dropNode`, `connectWire`, `deleteNode`. Zero node-type conditionals (except the three permitted exceptions).

**Verification:**
- [ ] `engine.dropNode('layers/text', 100, 200)` returns nodeData with PROC- UUID
- [ ] Returned nodeData has `state: 'ghost'`, correct x/y, initialized props from defaults
- [ ] `getNode(id)` returns the node after drop
- [ ] `dropNode('core/comp', ...)` returns nodeData (comp goes alive async — mocked evalBridge)
- [ ] `dropNode('does/not/exist', ...)` returns null, logs error
- [ ] `connectWire` returns true on valid layer wire
- [ ] Wire added to wireMap with correct fromNode, toNode, type
- [ ] Wire has WIRE- UUID
- [ ] Text node goes alive after wire to comp (hostingComps updated)
- [ ] Duplicate wire rejected — returns false
- [ ] Self-wire (A→A) rejected — returns false
- [ ] `deleteNode` removes from nodeMap
- [ ] `deleteNode` clears selection if deleted node was selected
- [ ] Unknown nodeId is no-op — no throw
- [ ] `disconnectWire` stub exists (function)
- [ ] `setNodeProperty` stub exists (function)
- [ ] All tests pass — zero failures

---

### TASK-07 — cascadeAlgorithm.js + cycleChecker.js + engine.disconnectWire

**Delivers:** Ghost cascade and cycle detection. `engine.disconnectWire` stub replaced.

**Verification — cycleChecker:**
- [ ] `hasCycle('N-D', 'N-A')` — false (new node, no cycle)
- [ ] `hasCycle('N-C', 'N-A')` — true (C is downstream of A)
- [ ] `hasCycle('N-B', 'N-A')` — true (B is downstream of A)
- [ ] `hasCycle('N-A', 'N-A')` — true (self)
- [ ] `hasCycle('N-C', 'N-B')` — false (C has no outgoing layer wires)
- [ ] Parent wires ignored in cycle check
- [ ] Data wires ignored in cycle check
- [ ] All tests pass — zero failures

**Verification — cascadeAlgorithm:**
- [ ] `hasCompDownstream('N-TEXT')` finds comp downstream
- [ ] `hasCompDownstream('N-COMP')` returns empty array (comp has no downstream comp)
- [ ] Cascade on wire deletion: text node goes ghost, wire removed from wireMap
- [ ] Cascade sets `hostingComps` to empty on ghosted node
- [ ] Comp node remains alive after cascade
- [ ] `dispatchBatch` called with `parkLayer` command
- [ ] Multi-node cascade: both Text and Null ghost, batch has 2 commands
- [ ] Data wire deletion: no cascade (node stays alive, dispatchBatch not called)
- [ ] Parent wire deletion: no cascade
- [ ] All tests pass — zero failures

**Verification — engine.disconnectWire:**
- [ ] Parent wire disconnect: `clearLayerParent` dispatched, wire removed, child stays alive
- [ ] Data wire disconnect: wire removed, no dispatch
- [ ] Unknown wire ID: no-op, no throw
- [ ] All tests pass — zero failures

---

### TASK-08 — portManager.js + wireValidator.js + dirtyFlusher.js + engine.setNodeProperty

**Delivers:** Port slot management, wire validation, property debouncing.

**Verification — portManager:**
- [ ] `layer_in` on CompNode is extendable
- [ ] `output` on CompNode is not extendable
- [ ] `resolveSlotName('layer_in', 0)` → `'layer_in_0'`
- [ ] `resolveSlotName('layer_in', 2)` → `'layer_in_2'`
- [ ] `getOpenSlot` with count 1 returns `'layer_in_0'`
- [ ] `afterConnect` increments slot count
- [ ] `getOpenSlot` after connect returns next slot
- [ ] `afterConnect` again: count increments again
- [ ] `afterDisconnect` recalculates count from wireMap
- [ ] Minimum slot count is 1 after all wires removed
- [ ] Non-extendable port: `afterConnect` is no-op
- [ ] All tests pass — zero failures

**Verification — wireValidator:**
- [ ] Valid layer wire: `{ valid: true }`
- [ ] Self-wire: `{ valid: false, reason: 'Cannot wire a node to itself' }`
- [ ] Unknown node: `{ valid: false, reason: 'Node not found' }`
- [ ] Type mismatch: `{ valid: false }`
- [ ] Duplicate wire: `{ valid: false, reason: 'Wire already exists' }`
- [ ] Cycle: `{ valid: false, reason: 'Connection would create a cycle' }`
- [ ] Parent wire — same comp: `{ valid: true }`
- [ ] Parent wire — different comp: `{ valid: false, reason: '...same comp...' }`
- [ ] `getPickerParams('layers/text', 'number')` returns array of number-type params
- [ ] `getPickerParams('layers/text', 'vector3')` returns empty array
- [ ] All tests pass — zero failures

**Verification — dirtyFlusher:**
- [ ] Node dirty after `updateProp`
- [ ] `flush()` calls `dispatchBatch`
- [ ] All commands in batch are `setLayerProperty`
- [ ] Dirty flag cleared after flush
- [ ] Ghost node not flushed to AE
- [ ] `cancel()` prevents scheduled flush (tested with 400ms timeout)
- [ ] All tests pass — zero failures

**Verification — engine.setNodeProperty:**
- [ ] `setNodeProperty` updates prop value in nodeMap
- [ ] `setNodeProperty` sets dirty flag
- [ ] Unknown node ID: no-op, no throw
- [ ] All tests pass — zero failures

---

### TASK-09 — viewport.js + renderer.js + input.js (partial)

**Delivers:** Live node card rendering driven by nodeMap. Pan and zoom.

**Verification — viewport (console):**
- [ ] Initial pan `{0,0}`, zoom `1.0`
- [ ] `screenToCanvas` identity: x=100→100, y=200→200
- [ ] `canvasToScreen` identity: x=100→100, y=200→200
- [ ] `screenToCanvas` with pan: correct offset applied
- [ ] `canvasToScreen` with pan: correct offset applied
- [ ] `setZoom(10, 0, 0)` clamped to 4.0
- [ ] `setZoom(-1, 0, 0)` clamped to 0.1
- [ ] Zoom-to-origin: pan.x and pan.y correct after `setZoom(2, 400, 300)`
- [ ] Canvas point under mouse stays at screen origin after zoom
- [ ] All tests pass — zero failures

**Verification — renderer (visual):**
- [ ] Three node cards visible after devBootstrap drop (Text, Comp, Null)
- [ ] Correct header accent colors for each category
- [ ] Param key-value pairs visible in card body
- [ ] Text node shows ghost state (dimmed, dashed border)
- [ ] Comp node shows alive state (green glow)
- [ ] Null node shows ghost state
- [ ] Input port dots on Comp left edge
- [ ] Output port dots on right edge of Text and Null
- [ ] Parent port dots (green squares) on top/bottom edges
- [ ] No console errors

**Verification — input (visual):**
- [ ] Clicking node card selects it (blue glow)
- [ ] Dragging node card moves it smoothly
- [ ] Node position persists in graphState after drag
- [ ] Clicking canvas background deselects
- [ ] Clicking port dot does not start node drag
- [ ] Pan with middle mouse button
- [ ] Pan with Space + left drag
- [ ] Scroll wheel zooms toward cursor
- [ ] Zoom clamped at 400% and 10%
- [ ] Node drag works correctly after pan/zoom

---

### TASK-10 — Wire Drawing + Port Interaction

**Delivers:** Wire drag, drop, reroute, picker UI, wire selection, wire deletion.

**Verification — wireRenderer (visual):**
- [ ] Blue bezier wire visible between connected nodes
- [ ] Wire curves with correct horizontal S-curve shape
- [ ] No console errors

**Verification — full wire interaction (visual):**
- [ ] Mousedown on output port starts dashed drag wire
- [ ] Valid drop target ports scale up during drag
- [ ] Invalid ports do not scale
- [ ] Drop on valid port: solid wire appears
- [ ] Drop on empty canvas: drag wire disappears, no wire created
- [ ] Layer wire is blue, S-curved
- [ ] Data wire drop on newborn slot: picker appears
- [ ] Picker lists matching type params
- [ ] Clicking picker item commits wire with boundParam
- [ ] Clicking outside picker dismisses without committing
- [ ] Mousedown on occupied input port starts reroute
- [ ] Clicking wire path highlights it (thicker stroke)
- [ ] Clicking same wire again deselects
- [ ] Clicking canvas background deselects wire
- [ ] Delete key with wire selected removes wire
- [ ] Cascade runs after wire deletion
- [ ] Dragging from `child_of` port starts vertical drag wire
- [ ] Dropping on `parent_of` of same-comp node creates green dashed wire
- [ ] Dropping on different-comp node is rejected
- [ ] `input.js` updated: port mousedown routes to wireInteraction
- [ ] `panel.css` updated: drop-target styles added

---

### TASK-11 — Palette Drag, Inspector, Keyboard, index.js

**Delivers:** Complete interactive panel, browser-only. Full initialization sequence.

**Verification:**
- [ ] Typing in search box filters palette items correctly
- [ ] Categories with no matches collapse
- [ ] Clearing search restores all items
- [ ] Search is case-insensitive
- [ ] Dragging Text from palette → canvas creates ghost text node at drop position
- [ ] Dragging Comp → canvas creates alive comp node
- [ ] Dragging Shape (unregistered) logs error, creates nothing
- [ ] Drop works at different zoom levels
- [ ] Selecting node shows params in inspector
- [ ] Node type badge updates in inspector header
- [ ] Changing string field updates prop after 300ms
- [ ] Changing number field: NaN inputs are ignored
- [ ] Color params show swatch + hex
- [ ] Vector2 params show two number inputs
- [ ] Wired params show `wired` class and are readonly
- [ ] Clicking canvas background: inspector clears to empty state
- [ ] Selecting different node switches inspector
- [ ] Delete key removes selected node
- [ ] Wires connected to deleted node also removed
- [ ] Delete key in focused text input does NOT delete node
- [ ] Escape deselects without deleting
- [ ] Wire Delete handled by wire.js, not keyboard.js
- [ ] Console shows all registered node types on load
- [ ] Console shows `[Procedia] Panel initialized.`
- [ ] No console errors on load
- [ ] Static placeholder nodes removed from index.html
- [ ] devBootstrap script removed from index.html
- [ ] Selection callback consolidated in index.js (not duplicated in inspector.js)

---

### TASK-12 — dispatcher.jsx + utils.jsx + json.jsx

**Delivers:** The AE bridge. First real AE integration. All fundamental AE actions implemented.

**Verification — json.jsx (ESTK):**
- [ ] `PASS: true` from round-trip test (stringify → parse)
- [ ] Nested objects and arrays round-trip correctly

**Verification — utils.jsx (ESTK):**
- [ ] `findOrCreateReservedComp()` creates comp in correct folder
- [ ] `findCompByUUID` finds test comp by UUID
- [ ] `findCompByUUID` does NOT return Reserved Comp
- [ ] `findLayerByUUID` finds layer by UUID
- [ ] `moveLayerToComp` moves layer, preserves UUID on `.comment`
- [ ] Layer removed from source after move
- [ ] All `PASS` lines output `true`

**Verification — dispatcher.jsx (AE integration):**
- [ ] Drop Comp node: AE CompItem appears in project panel under Procedia folder
- [ ] Drop Text node, wire to Comp: text layer appears inside comp
- [ ] Drop Null node, wire to Comp: null layer appears inside comp
- [ ] Change text content in inspector: AE text layer updates after 300ms
- [ ] Disconnect Text wire: text layer moves to Reserved Comp
- [ ] Reconnect Text wire: text layer returns from Reserved Comp
- [ ] Delete Text node: layer removed from Reserved Comp permanently
- [ ] Delete Comp node: AE CompItem removed from project panel
- [ ] `dispatchBatch` works: connect two layers, disconnect comp wire — both park in one bridge crossing

---

### TASK-13 — persistence.jsx + polling.jsx + poller.js + evalBridge isWriting

**Delivers:** Graph save/load across sessions. Adaptive polling. Error state detection.

**Verification — evalBridge isWriting (console):**
- [ ] `evalBridge.isWriting` is a function
- [ ] `evalBridge.isWriting()` returns false initially
- [ ] `isWriting` false outside AE (no csInterface)
- [ ] All tests pass — zero failures

**Verification — persistence.jsx (ESTK):**
- [ ] `PASS write: true`
- [ ] `PASS read: true` — node and wire round-trip
- [ ] `PASS bigWrite: true` — 200-node graph
- [ ] `PASS bigRead: true` — all 200 nodes read back
- [ ] Reserved Comp contains persistence layers (invisible, `layer.enabled === false`)
- [ ] Large graph chunked across multiple layers

**Verification — polling.jsx (ESTK):**
- [ ] `PASS comp found: true`
- [ ] `PASS comp props: true` (width === 1920)
- [ ] `PASS layer found: true`
- [ ] `PASS ghost missing: true`
- [ ] `PASS data skipped: true` (data nodes excluded from poll)

**Verification — poller.js (console):**
- [ ] `poller.start`, `poller.stop`, `poller.notifyActivity` all functions
- [ ] Start/stop no-op outside AE — no throw
- [ ] All tests pass — zero failures

**Verification — AE integration:**
- [ ] Panel open: `[Procedia] No saved graph found. Starting fresh.`
- [ ] Build graph, Cmd+S: `[Procedia] Graph saved.`
- [ ] Close and reopen panel: `[Procedia] Graph loaded. N nodes, N wires.`
- [ ] Graph fully restored — nodes, wires, states correct
- [ ] Delete layer directly in AE: within 1–5s, node shows error state
- [ ] Error notification appears in notification bar
- [ ] `isWriting` correctly pauses poll ticks during cascade

---

### TASK-14 — notifications/notificationBar.js

**Delivers:** Error notification UI with Re-create and Remove from Graph actions.

**Verification (console):**
- [ ] `notificationBar` object exists with `showError`, `showMessage`, `dismiss`, `dismissAll`
- [ ] `showMessage` creates a notification element
- [ ] `showError` creates notification with `data-node-id` attribute
- [ ] Notification has Re-create and Remove buttons
- [ ] Calling `showError` again for same node: no duplicate card (deduplication)
- [ ] `dismiss(nodeId)` removes the card
- [ ] `dismiss` unknown ID: no-op, no throw
- [ ] `dismissAll` removes all tracked notifications
- [ ] All tests pass — zero failures

**Verification (visual):**
- [ ] Error notification has red border, slide-down animation
- [ ] Info notification has blue border
- [ ] Buttons have hover states
- [ ] Dismiss button on info notification removes it

**Verification (AE integration):**
- [ ] Error state triggers within one poll tick of deleting layer in AE
- [ ] Node card shows red pulsing border
- [ ] Re-create in AE: layer reappears, node returns to alive, notification dismissed
- [ ] Remove from Graph: node and wires removed, inspector clears, notification dismissed
- [ ] No console errors during either recovery

---

### TASK-15 — Shape.js + Adjustment.js

**Delivers:** Two remaining standard affected layer nodes.

**Verification:**
- [ ] `layers/shape` and `layers/adjustment` both registered
- [ ] Both `nodeKind: 'affected'`, `dedicated: false`, 3 ports, no input ports
- [ ] ShapeNode: 5 params — `label`, `position`, `rotation`, `opacity`, `scale`
- [ ] ShapeNode: no `color`, no `content`, no `fontSize`
- [ ] AdjustmentNode: 5 params — same as ShapeNode, no `color`
- [ ] Both `onDrop` return null
- [ ] ShapeNode `onAlive` action: `createShapeLayer`
- [ ] AdjustmentNode `onAlive` action: `createAdjustmentLayer`
- [ ] Both `onGhost`: `parkLayer`, both `onDelete`: `deleteParkedLayer`
- [ ] Both `onPropertyChange`: `setLayerProperty`
- [ ] All tests pass — zero failures

**AE integration:**
- [ ] Shape layer created in AE comp — empty but present
- [ ] Adjustment layer created with `layer.adjustmentLayer === true`
- [ ] Both layer comments match node UUIDs
- [ ] Both park on disconnect, return on reconnect
- [ ] Label and opacity inspector changes sync to AE

---

### TASK-16 — FillEffect.js + GaussianBlur.js + DropShadow.js

**Delivers:** First effector nodes. The effector pattern, cascade order, and `applyEffect` dispatcher actions.

**Verification (console):**
- [ ] All three effectors registered with correct types
- [ ] All have `nodeKind: 'effector'`, `dedicated: false`
- [ ] All have exactly 2 ports: `layer_in` (required, extendable) and `output`
- [ ] No parent ports anywhere on any effector
- [ ] All `onDrop` return null
- [ ] FillEffect `onAlive` action: `applyEffect`, matchName: `'ADBE Fill'`
- [ ] GaussianBlur `onAlive` action: `applyEffect`, matchName: `'ADBE Gaussian Blur 2'`
- [ ] DropShadow `onAlive` action: `applyEffect`, matchName: `'ADBE Drop Shadow'`
- [ ] All `onGhost` actions: `removeEffect`
- [ ] `onDelete` ghost state returns null; alive state returns `removeEffect`
- [ ] `onPropertyChange` action: `setEffectProperty` with correct matchName
- [ ] All tests pass — zero failures

**AE integration:**
- [ ] Fill effect appears on text layer in AE on wire
- [ ] Gaussian Blur stacked after Fill in effects list
- [ ] Color and blurriness property changes sync to AE
- [ ] Cascade order: blur ghosts first, fill second, text parks last
- [ ] All effects removed before layer parks
- [ ] Effects re-apply on reconnect
- [ ] Deleting single effector removes only its effect

---

### TASK-17 — Color.js + Number.js

**Delivers:** Data nodes. Value-driven param binding via extendable port picker.

**Verification (console):**
- [ ] `data/color` and `data/number` registered
- [ ] Both `nodeKind: 'data'`, `dedicated: false`
- [ ] Both have exactly 1 port: `output` (type `'data'`)
- [ ] No input ports, no parent ports
- [ ] ColorNode: 2 params — `label`, `color` (RGBA, 4 channels, default white)
- [ ] NumberNode: 2 params — `label`, `value` (default 0, wide range)
- [ ] All 5 hooks return null for both nodes
- [ ] `dropNode('data/color', ...)` → state `alive` immediately
- [ ] `dropNode('data/number', ...)` → state `alive` immediately
- [ ] All tests pass — zero failures

**AE integration:**
- [ ] Color node appears alive immediately on canvas drop
- [ ] Number node appears alive immediately on canvas drop
- [ ] Wire Color → Fill newborn slot: picker appears, lists `color` param
- [ ] Changing Color node color drives Fill effect color in AE after 300ms
- [ ] Wire Number → Fill opacity slot: picker lists `opacity`
- [ ] Changing Number value drives Fill opacity in AE
- [ ] Disconnecting data wire unlocks param in inspector
- [ ] Deleting data node: no cascade, no AE errors

---

### TASK-18 — ui/layerOrderList.js

**Delivers:** Drag-to-reorder layer stacking. Shown in inspector for CompNode.

**Verification (console):**
- [ ] `layerOrderList.render('N-COMP')` returns a DOM element
- [ ] Element has `layer-order-section` class
- [ ] Shows 3 rows for 3 wired layers
- [ ] First row is correct (port 0 = `layer_in_0`)
- [ ] Second and third rows in correct order
- [ ] Empty comp shows empty-state element
- [ ] `graphState.updateWire` is a function
- [ ] `updateWire` updates `toPort` field
- [ ] `updateWire` preserves wire in wireMap
- [ ] All tests pass — zero failures

**Visual verification:**
- [ ] Layer order section appears below comp params when CompNode selected
- [ ] Correct labels and category dots per row
- [ ] Drag handle visible
- [ ] Hover state on rows
- [ ] Drop indicator appears on target row during drag
- [ ] Rows reorder visually after drop
- [ ] Non-Comp node: no layer order section

**AE integration:**
- [ ] Drag in panel → AE layer order updates immediately
- [ ] Reorder is bidirectional
- [ ] Newly wired layer appears in list
- [ ] Ghosted layer disappears from list

---

### TASK-19 — graph/canvas/minimap.js

**Delivers:** Thumbnail navigation overlay.

**Verification (console):**
- [ ] `minimap.render` and `minimap.init` are functions
- [ ] `render()` does not throw on empty graph
- [ ] `#minimap-canvas` element exists with width 160, height 100
- [ ] `render()` does not throw with nodes in graph
- [ ] All tests pass — zero failures

**Visual verification:**
- [ ] Minimap visible in bottom-right corner of canvas
- [ ] Node rectangles visible: green (alive), gray (ghost), red (error)
- [ ] Selected node has blue outline in minimap
- [ ] White viewport rectangle visible
- [ ] Panning canvas: viewport rectangle moves in minimap
- [ ] Zooming canvas: viewport rectangle grows/shrinks
- [ ] Clicking minimap: main viewport centers on clicked point
- [ ] Dragging minimap: viewport pans continuously
- [ ] Adding/deleting nodes: minimap updates immediately
- [ ] Ghost nodes dimmed in minimap
- [ ] Error nodes red in minimap

---

### TASK-20 — Expression.js

**Delivers:** Expression effector node. Applies AE JS expressions to layer properties.

**Verification (console):**
- [ ] `utility/expression` registered, `nodeKind: 'effector'`
- [ ] Exactly 2 ports: `layer_in` (required, extendable) and `output`
- [ ] No parent ports
- [ ] 3 params: `label`, `targetProperty`, `expression`
- [ ] `expression` default is `'value'`
- [ ] `targetProperty` default is `'ADBE Opacity'`
- [ ] All 5 hooks are functions
- [ ] `onDrop` returns null
- [ ] `onAlive` action: `applyExpression` with targetProperty and expression
- [ ] `onGhost` action: `removeExpression`
- [ ] `onDelete` ghost → null, alive → `removeExpression`
- [ ] `onPropertyChange` with `'label'` key → null
- [ ] `onPropertyChange` with `'expression'` key → `applyExpression`
- [ ] Utility category has Expression node
- [ ] All tests pass — zero failures

**AE integration:**
- [ ] Expression node appears in Utility category
- [ ] Wire Expression → Text → Comp: default `value` expression applied to Opacity
- [ ] `// PROC:{uuid}` prefix visible in AE expression editor
- [ ] Change `expression` to `wiggle(2, 10)`: Opacity wiggles in AE
- [ ] Change `targetProperty` to `ADBE Rotate Z`: Opacity expression removed, Rotation wiggling
- [ ] Disconnect wire: expression removed
- [ ] Reconnect: expression re-applied
- [ ] Delete node: expression removed, no AE errors

---

### TASK-21 — End-to-End QA Protocol

**Delivers:** Complete verified plugin. 15 test sections covering every system.

**Sections:**
- A: Panel initialization and palette search
- B: Node creation — all 11 types
- C: Wire system — all 3 wire types, validation, reroute
- D: Ghost cascade — single node, multi-node, multi-comp, parent wire
- E: Inspector and property changes — all param types
- F: Deletion — ghost, alive, with effectors, keyboard, wire
- G: Layer order list — render, reorder, dynamic updates
- H: Persistence — save/reload, chunking, corrupt data recovery
- I: Polling and error state — detection, re-create, remove, pause during writes
- J: Minimap — accuracy, navigation, dynamic updates
- K: Canvas navigation — pan, zoom, limits
- L: Expression node — apply, update, target change, lifecycle
- M: Pre-comp — CompNode inside CompNode, ghost, cycle prevention
- N: Full workflow integration test
- O: Performance and stability

**Pass criteria:** All sections, all items. Zero failures.

**QA complete output:**
- [ ] All sections A–O pass
- [ ] Zero failures recorded

---

### BRIEF-22 — FIX: Dirty Flush After Path Creation

**Delivers:** Surgical single-function fix in `graph/engine.js`. Resolves a silent failure where data wires connected to an effector before the upstream layer wire existed would never flush to AE — leaving the effector permanently dirty until the next manual inspector change.

**Root cause:** `_firePathCreation` stamps `_pathLayerUUID` on the terminal wire but never triggers `dirtyFlusher.flush()`. The flush that ran when the data wire connected found `_pathLayerUUID === null` and skipped.

**Fix:** After stamping `_pathLayerUUID` in `_firePathCreation`, check if any node in the new path is dirty and call `dirtyFlusher.flush()` immediately.

**Files touched:** `graph/engine.js` only.

**Verification:**
- [ ] Drop: Comp, Fill, Color, Text
- [ ] Wire: Fill → Comp (terminal, no source yet — `_pathLayerUUID` stays null)
- [ ] Wire: Color → Fill.color (data wire — marks Fill dirty, flush finds no active path)
- [ ] Wire: Text → Fill (triggers `_activateDormantTerminalWiresDownstream` → `_firePathCreation`)
- [ ] After step 4: `_pathLayerUUID` stamped AND `dirtyFlusher.flush()` called
- [ ] `graphState.getNode(fillId).dirty` is `false` after wiring completes
- [ ] A `setEffectProperty` command with `key: 'color'` appears in dispatch log
- [ ] Wiring in the "correct" order (Text→Fill first, then Fill→Comp) still works — no regression

---

### BRIEF-23 — Settings Modal (UI Shell + Persistence)

**Delivers:** `ui/settings.js` (persistent key/value store) and `ui/settingsModal.js` (gear-button modal). Gear icon (⚙) appears top-right of the canvas. After this brief, `settings.get('wireStyle')` and `settings.get('minimap')` exist and return correct persisted values — but nothing reads them yet.

**New files:** `ui/settings.js`, `ui/settingsModal.js`
**Edited files:** `index.html` (gear button, two `<script>` tags), `panel.css` (gear + modal styles), `index.js` (`settingsModal.init()`)

**Settings data model:**
```javascript
// localStorage key: 'procedia_settings'
{ minimap: true, wireStyle: 'bezier' }
```

**Verification:**
- [ ] Panel loads without console errors
- [ ] Gear icon visible top-right of canvas area
- [ ] Clicking gear opens modal over dark overlay
- [ ] Modal shows Canvas section (Minimap toggle) and Wires section (Style select)
- [ ] Minimap toggle default: ON. Wire style default: Bezier
- [ ] Toggling Minimap calls `settings.set('minimap', ...)` — confirm via `settings.getAll()` in DevTools
- [ ] Changing wire style calls `settings.set('wireStyle', ...)` — confirm via DevTools
- [ ] Values persist across panel reload
- [ ] Overlay click, ✕ button, and Escape all close the modal
- [ ] `wireRenderer.js` and `minimap.js` untouched — no regressions

---

### BRIEF-24 — Wire Style Setting Integration

**Delivers:** `wireRenderer.js` reads `settings.get('wireStyle')` on every draw call. Three wire geometries implemented: Bezier (current S-curve), Direct (straight diagonal), Stepped (Manhattan routing). Drag preview and `drawWire()` also switch style. No new files. One file edited.

**Wire styles:**

| Value | Geometry |
|---|---|
| `'bezier'` | Existing S-curve — unchanged |
| `'direct'` | Single `lineTo()` — diagonal |
| `'stepped'` | `moveTo → lineTo(x1,midY) → lineTo(x2,midY) → lineTo(x2,y2)` |

**Files touched:** `graph/Wire/wireRenderer.js` only.

**Verification:**
- [ ] Panel loads without console errors
- [ ] Default (Bezier): all wires render exactly as before
- [ ] Settings → Direct: wires immediately switch to straight diagonal lines
- [ ] Settings → Stepped: wires immediately switch to 90° Manhattan routing
- [ ] Switch back to Bezier: S-curve restored exactly
- [ ] Drag preview respects current style in all three modes
- [ ] Dash animation continues in all three modes
- [ ] Selected wire glow renders correctly in all three modes
- [ ] Parent and error wires also switch style
- [ ] Setting persists across reload — set Stepped, reload, wires still stepped
- [ ] No changes to `renderer.js`, `minimap.js`, `wire.js`, or any node file

---

*Procedia v4 — Overview — May 2026*
*24 briefs. 11 node types. 3 wire types. 1 file per node.*
