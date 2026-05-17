# FEATURE — Reroute Node
*Procedia v2 · UI Enhancement · CEP · Vanilla JS · No ExtendScript*
*Last updated: May 2026*

---

## What This Feature Does

Every confirmed wire has a small circular handle rendered at its bezier midpoint. Hovering it reveals the handle and shows a "reroute" label. Dragging the handle creates a real `RerouteNode` on the canvas — a passthrough node with one input port and one output port. The RerouteNode lets users bend wire paths around other nodes without changing graph behaviour. It is always in `ghost` state — it has no AE presence, no lifecycle beyond the graph.

Deleting a RerouteNode collapses its two wires back into a single direct wire between the original source and target.

---

## Behaviour Contract

- Every confirmed wire renders a small circle handle at its bezier midpoint (t=0.5)
- Handle is invisible at rest (radius 0 or opacity 0). Appears on hover (cursor within 8px of midpoint)
- "reroute" label appears below the handle only on hover — never at rest
- Dragging the handle initiates a `reroute drag` — distinct from a normal wire drag
- On release (anywhere on canvas, including empty space): a RerouteNode is created at the drop position, the original wire is deleted, and two new wires are created: source → RerouteNode and RerouteNode → target
- RerouteNode state is always `ghost`. It has no `onAlive`, no `onGhost`, no AE operations
- RerouteNode has no inspector panel. Selecting it shows only the node highlight — no properties rendered
- Deleting a RerouteNode: deletes both adjacent wires and creates one direct wire between original source and target
- If either adjacent wire is deleted independently: RerouteNode auto-deletes, the remaining wire is also deleted (a RerouteNode cannot survive with only one wire)
- Polling ignores RerouteNode — it has no UUID to poll in AE
- Ghost cascade ignores RerouteNode — it is never `alive`, so it is never a subject of `onGhost`

---

## Algorithm

### Part A — Render Midpoint Handle

```
In wireRenderer.drawWire(), after drawing the bezier path:

1. Compute midpoint at t=0.5:
   midX = bezier(t=0.5, from.x, cp1.x, cp2.x, to.x)
   midY = bezier(t=0.5, from.y, cp1.y, cp2.y, to.y)
   (use the standard cubic bezier formula)

2. Check if this wire's id matches rerouteHoverWireId (set by input.js):
   → If yes (hover): draw filled circle radius 5, color = wire color brightened
                     draw label "reroute" below: font 10px, color #aaa
   → If no:          draw stroked circle radius 4, color = wire color at 40% opacity
                     (subtle — always present, never intrusive)

3. Store midpoint on wire object each frame: wire._midX = midX, wire._midY = midY
   (used by input.js for hit detection — avoids recomputing in the event handler)
```

### Part B — Hit Detection

```
In canvas/input.js — mousemove handler:

1. For each wire in graphState.getAllWires():
   dx = mouseCanvasX - wire._midX
   dy = mouseCanvasY - wire._midY
   dist = Math.sqrt(dx*dx + dy*dy)
   if dist < 8:
     rerouteHoverWireId = wire.id
     cursor = 'crosshair'
     break

2. If no wire midpoint within 8px:
   rerouteHoverWireId = null
   reset cursor to default (unless other hover state applies)
```

### Part C — Reroute Drag Initiation

```
In canvas/input.js — mousedown handler:

1. If rerouteHoverWireId is set:
   → Do NOT start a normal wire drag
   → Do NOT start a pan
   → Call wire.beginRerouteDrag({
       wireId:       rerouteHoverWireId,
       startX:       mouseCanvasX,
       startY:       mouseCanvasY
     })
   → Set dragMode = 'reroute'

In wire.js — beginRerouteDrag(config):
   var original = graphState.getWire(config.wireId)
   rerouteDragState = {
     active:       true,
     originalWireId:  config.wireId,
     sourceNodeId: original.fromNode,
     sourcePort:   original.fromPort,
     targetNodeId: original.toNode,
     targetPort:   original.toPort,
     cursorX:      config.startX,
     cursorY:      config.startY
   }
```

### Part D — Reroute Drag Render

```
While rerouteDragState.active:

In wireRenderer — each frame:
  → Draw original wire DIMMED (opacity ~30%) — it still exists, preview of what's being split
  → Draw a NEW preview wire from sourceNode output → cursor position
  → Draw a NEW preview wire from cursor position → targetNode input
  → Both preview wires use the static-dash (no animation) style from Feature 2
  → A ghost RerouteNode silhouette (small circle, dashed outline) drawn at cursor
```

### Part E — Reroute Drag Release

```
In wire.js — onMouseUp while rerouteDragState.active:

1. Record drop position: dropX, dropY (canvas coordinates)

2. Check minimum move distance — if cursor moved less than 10px from start:
   → Cancel: rerouteDragState = null, dragMode = null
   → Original wire is unchanged
   → Return

3. Otherwise — commit reroute:

   a. Generate UUID for the new RerouteNode
      var rerouteId = uuidGenerator.generate()

   b. graphState.addNode({
        id:         rerouteId,
        type:       'utility/reroute',
        label:      '',
        state:      'ghost',
        position:   { x: dropX, y: dropY },
        properties: {}
      })
      Note: no onDrop AE call — RerouteNode is always ghost, no dataLayer write needed

   c. graphState.deleteWire(rerouteDragState.originalWireId)
      → This removes the original wire from wireMap and dataWire

   d. graphState.addWire({
        fromNode: rerouteDragState.sourceNodeId,
        fromPort: 'output',
        toNode:   rerouteId,
        toPort:   'input'
      })

   e. graphState.addWire({
        fromNode: rerouteId,
        fromPort: 'output',
        toNode:   rerouteDragState.targetNodeId,
        toPort:   rerouteDragState.targetPort
      })

   f. rerouteDragState = null
      dragMode = null

4. Do NOT trigger ghost cascade. Do NOT call any AE operations.
   RerouteNode is ghost by definition. No lifecycle events are fired.
```

### Part F — RerouteNode Deletion

```
In graphState.deleteNode(nodeId):

1. Check if node is a RerouteNode (node.type === 'utility/reroute')

2. If yes:
   a. Find both adjacent wires:
      wireIn  = find wire where toNode   === nodeId
      wireOut = find wire where fromNode === nodeId

   b. Extract endpoints from the two wires:
      originalSource = wireIn.fromNode,  wireIn.fromPort
      originalTarget = wireOut.toNode,   wireOut.toPort

   c. Delete wireIn  from wireMap and dataWire
   d. Delete wireOut from wireMap and dataWire

   e. Create one direct wire:
      graphState.addWire({
        fromNode: originalSource.nodeId,
        fromPort: originalSource.port,
        toNode:   originalTarget.nodeId,
        toPort:   originalTarget.port
      })

   f. Remove the RerouteNode from nodeMap
      (no dataLayer write — RerouteNode was never written there)

   g. Do NOT trigger ghost cascade. The upstream and downstream nodes
      are unaffected — their connections are preserved via the new direct wire.
```

### Part G — Adjacent Wire Deletion Auto-Cleanup

```
In graphState.deleteWire(wireId):

After removing the wire from wireMap and dataWire:

1. Check if either endpoint (fromNode or toNode) is a RerouteNode
2. If yes: call graphState.deleteNode(rerouteNodeId)
   → This triggers Part F, which collapses cleanly
   → But in this case, one of the two adjacent wires is already deleted
   → Part F must handle the case where wireIn or wireOut is null:
      if wireIn is null:  just delete wireOut, remove RerouteNode, no replacement wire
      if wireOut is null: just delete wireIn,  remove RerouteNode, no replacement wire
      if both exist:      normal collapse (create direct wire)
```

---

## Cubic Bezier Midpoint Formula

Add this utility to `wireRenderer.js`:

```javascript
function cubicBezierPoint(t, p0, p1, p2, p3) {
  var mt = 1 - t;
  return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
}

// Usage in drawWire:
var midX = cubicBezierPoint(0.5, from.x, cp1.x, cp2.x, to.x);
var midY = cubicBezierPoint(0.5, from.y, cp1.y, cp2.y, to.y);
```

---

## RerouteNode Definition File

### `graph/nodes/categories/utility/Reroute.js` — new file

```javascript
var RerouteNode = {
  type:     'utility/reroute',
  label:    'Reroute',
  category: 'utility',
  version:  '1.0.0',

  inputs: [
    { port: 'input', type: 'any', label: '' }
  ],

  outputs: [
    { port: 'output', type: 'any', label: '' }
  ],

  params: [],

  // RerouteNode has no AE operation.
  // apply() is required by the node contract but does nothing.
  apply: function(nodeData) {
    // RerouteNode is always ghost. This function should never be called.
    return 'JSON.stringify({ ok: true, data: null, error: null });';
  }
};

nodeRegistry.register(RerouteNode);
```

Port type `'any'` means the type check is bypassed for RerouteNode ports. The port compatibility of the two wires on either side is already validated when those wires were first created — the RerouteNode itself does not re-validate.

### `index.html`

```html
<!-- Under utility/ category — after nodeRegistry.js, before index.js -->
<script src="graph/nodes/categories/utility/Reroute.js"></script>
```

---

## RerouteNode Canvas Appearance

The RerouteNode renders differently from standard nodes. Do not use `drawNode()` from `node.js`. Instead, add a branch in `renderer.js`:

```javascript
// In renderer.js draw loop, when iterating nodeMap:
if (node.type === 'utility/reroute') {
  drawRerouteNode(ctx, node, viewport);
} else {
  drawNode(ctx, node, viewport);
}
```

**`drawRerouteNode(ctx, node, viewport)`** in `wireRenderer.js` or a dedicated section of `node.js`:

```
→ Convert node.position to screen coords via viewport
→ Draw a circle, radius 8px
→ Fill: #2a2a2a  (dark, minimal)
→ Stroke: #666   (same as default wire color)
→ If selected: stroke '#fff', lineWidth 2
→ One input port dot on the left edge (x - 8, y)
→ One output port dot on the right edge (x + 8, y)
→ Port dots: radius 3, same style as other port dots
→ No label rendered at rest
→ On hover (separate hover detection for nodes): show "reroute" label above the circle, font 10px color #888
```

---

## Files to Create

| File | Purpose |
|---|---|
| `graph/nodes/categories/utility/Reroute.js` | Node definition — register with nodeRegistry |

## Files to Modify

| File | Changes |
|---|---|
| `graph/Wire/wireRenderer.js` | `drawWire()` — compute + store midpoint, draw handle; `cubicBezierPoint()` utility; `drawRerouteNode()` |
| `graph/Wire/wire.js` | `beginRerouteDrag()`, reroute drag state, `onMouseUp` reroute commit path |
| `graph/canvas/input.js` | Midpoint hit detection on `mousemove`, `mousedown` → `beginRerouteDrag` |
| `graph/canvas/renderer.js` | Branch for `drawRerouteNode` vs `drawNode` |
| `graph/graphState.js` | `deleteNode()` RerouteNode collapse logic; `deleteWire()` auto-cleanup check |
| `graph/Wire/nodeState.js` | Polling and ghost cascade must skip RerouteNode (type check: `'utility/reroute'`) |
| `index.html` | Script tag for `Reroute.js` |

---

## Ghost Cascade and Polling — Exclusion Rules

### `graph/Wire/nodeState.js`

Add a guard at the top of `evaluateNodeState()` and `cascadeGhost()`:

```javascript
function evaluateNodeState(nodeId) {
  var node = graphState.getNode(nodeId);
  if (node.type === 'utility/reroute') return; // RerouteNode is always ghost, skip
  // ... existing logic ...
}
```

### `polling/poller.js`

When building the `uuidList` to send to `pollAliveNodes()`:

```javascript
var uuidList = [];
var nodes = graphState.getAllNodes();
for (var i = 0; i < nodes.length; i++) {
  if (nodes[i].state === 'alive' && nodes[i].type !== 'utility/reroute') {
    uuidList.push(nodes[i].id);
  }
}
```

---

## Verification Checklist

**Midpoint handle:**
- [ ] A subtle circle appears at the midpoint of every confirmed wire
- [ ] Hovering within 8px of the midpoint makes it fully visible and shows "reroute" label
- [ ] Cursor changes to crosshair on midpoint hover
- [ ] The handle does not appear on the preview/dragging wire

**Reroute drag:**
- [ ] Mousedown on a midpoint initiates reroute drag (not pan, not node move)
- [ ] During drag, original wire is dimmed, two preview wires follow cursor
- [ ] A ghost circle follows the cursor during reroute drag

**Reroute commit:**
- [ ] Releasing the drag creates a RerouteNode at drop position
- [ ] Original wire is deleted from wireMap
- [ ] Two new wires are created: source → RerouteNode, RerouteNode → target
- [ ] Moving less than 10px cancels the drag — original wire is unchanged
- [ ] RerouteNode appears on canvas as a small circle with two port dots
- [ ] RerouteNode has no inspector panel when selected

**Reroute deletion:**
- [ ] Deleting a RerouteNode via Delete/Backspace collapses both wires into one direct wire
- [ ] The source and target nodes remain correctly connected after collapse
- [ ] No orphan wire entries in wireMap after deletion

**Adjacent wire deletion:**
- [ ] Deleting a wire connected to a RerouteNode auto-deletes the RerouteNode
- [ ] The remaining wire is also cleaned up correctly

**Cascade and polling exclusion:**
- [ ] Polling never includes RerouteNode UUIDs in the alive-node list
- [ ] Ghost cascade does not attempt to `onGhost` a RerouteNode
- [ ] RerouteNode does not appear in the node picker (it is utility-internal, not user-addable)

---

## Rules

- RerouteNode must **never** trigger `onAlive`, `onGhost`, or any AE ExtendScript call
- RerouteNode is **never** written to `dataLayer` (no ghost list entry, no comp tree entry)
- RerouteNode **is** written to `dataWire` — its two wires are normal wire entries
- On crash recovery from `dataWire`: RerouteNode UUIDs will appear as wire endpoints — `graphState` must reconstruct the RerouteNode entry in `nodeMap` from those wire references
- RerouteNode must **not** appear in the node picker (the wire-release picker from Feature 1). Exclude `'utility/reroute'` from `nodeRegistry.getAllDefinitions()` results shown in the picker, or add an `internal: true` flag to the definition and filter on it
- No `const`, `let`, arrow functions, or template literals

---

## Crash Recovery Note

On panel reopen, if `dataWire` contains wire entries pointing to a UUID that does not exist in `nodeMap`, check the wire's other endpoint. If both wires share the same "middle" UUID and that UUID appears as both a `toNode` and a `fromNode`, reconstruct it as a RerouteNode:

```javascript
// In crash recovery / readDataWire rehydration:
// For each UUID that appears as toNode in one wire AND fromNode in another:
//   → If that UUID is not in nodeMap → create it as a RerouteNode at position { x: 0, y: 0 }
//   → Position will be imprecise (canvas positions are not persisted)
//   → That is acceptable — the graph topology is restored, position is approximate
```

---

*FEATURE-REROUTE-NODE.md — Procedia v2 — May 2026*
