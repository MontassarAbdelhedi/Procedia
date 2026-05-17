# FEATURE-DRAG-SELECT.md — Procedia
## Marquee Selection + Multi-Select on the Graph Canvas

*CEP · After Effects 2025+ · Windows · Panel JS only — no ExtendScript, no AE calls*
*Last updated: May 2026*

---

## Prerequisites — Read Before Starting

1. `CLAUDE.md` — SKILL 1 (ES3), SKILL 2 (bridge), SKILL 10 (task execution protocol)
2. `PROCEDIA-V2-ARCHITECTURE.md` — Section 10 (file structure), Section 9 (critical rules)
3. This file — full spec and execution protocol

---

## Scope

This feature is **panel JS + canvas rendering only**. No `.jsx` files are touched. No `evalScript` calls are added. No AE operations are triggered by selection itself.

The only AE-adjacent effect: when `Delete`/`Backspace` is pressed with multiple nodes selected, the existing `onDelete` lifecycle runs once per selected node — through the existing `ae/nodeOps.js` path, unchanged.

---

## Interaction Model (Final — Do Not Deviate)

| Action | Result |
|---|---|
| Drag on empty canvas | Draws marquee rectangle; releases commits intersecting nodes to selection (additive) |
| Click on empty canvas (no drag) | Clears selection entirely |
| Click on a node (no modifier) | Replaces selection with just that node |
| Shift+click on an unselected node | Adds that node to selection |
| Shift+click on an already-selected node | Removes that node from selection |
| Drag any selected node | Moves all selected nodes as a group |
| Drag an unselected node | Replaces selection with that node, then drags it alone |
| Delete / Backspace | Runs `onDelete` for every node in `selectedNodeIds` |
| Wire drag from a selected node's output port | Wire drag takes priority — not a group move |

**Marquee is always additive.** There is no "replace selection with marquee" mode.
**No Shift+marquee.** Marquee always adds to whatever is currently selected.

---

## Files Touched

| File | Change |
|---|---|
| `graph/graphState.js` | `selectedNodeId` → `selectedNodeIds` (Set) + selection mutation API |
| `graph/canvas/input.js` | Marquee state, mousedown/move/up split, group move logic, shift+click logic |
| `graph/canvas/renderer.js` | Marquee rectangle draw pass, pending-selection highlight ring |
| `graph/canvas/viewport.js` | Expose `screenToWorld(x, y)` if not already present |
| `ui/keyboard.js` | Delete loop over Set instead of single ID |

**No other files are modified.** Do not touch any `.jsx` file. Do not touch `ae/nodeOps.js`, `ae/graphHooks.js`, `bridge/evalBridge.js`, or any node definition file.

---

## State Shape Changes

### `graph/graphState.js`

Replace:
```javascript
// OLD
var selectedNodeId = null;
```

With:
```javascript
// NEW
var selectedNodeIds = new Set();
```

Add these four mutation functions — these are the **only** way any other file may modify selection:

```javascript
function setSelection(ids) {
  // ids: array of UUID strings
  selectedNodeIds = new Set(ids);
  // trigger inspector update
}

function addToSelection(id) {
  selectedNodeIds.add(id);
  // trigger inspector update
}

function removeFromSelection(id) {
  selectedNodeIds.delete(id);
  // trigger inspector update
}

function clearSelection() {
  selectedNodeIds = new Set();
  // trigger inspector update
}
```

**Inspector update rule:** The inspector always renders the **last node added** to `selectedNodeIds`. When the Set is empty, the inspector clears. Expose a `getLastSelected()` helper that returns the most recently added UUID or `null`.

**Important:** Every existing reference to `selectedNodeId` across all files must be updated to use `selectedNodeIds`. Search for `selectedNodeId` globally before considering this task done.

---

## Algorithm — Human Language

### A. Marquee State Object (`input.js`)

Declare at the top of `input.js`:

```javascript
var marquee = {
  active: false,
  startScreenX: 0,
  startScreenY: 0,
  currentScreenX: 0,
  currentScreenY: 0
};

var pendingSelectionIds = new Set(); // nodes highlighted but not yet committed
```

---

### B. mousedown Logic (`input.js`)

On every `mousedown` on the canvas, check in this priority order:

1. **Is the cursor over a wire output port?**
   → Wire drag mode. Existing logic. No change.

2. **Is the cursor over a node?**

   a. Is the node already in `selectedNodeIds`?
      → Enter **group drag mode** (see Section D).
      → Do NOT change selection.

   b. Is Shift held?
      → Toggle: if node is in `selectedNodeIds` → `removeFromSelection(id)`. If not → `addToSelection(id)`.
      → Do NOT enter drag mode yet (wait for mousemove threshold).

   c. No modifier, node NOT in selection:
      → `setSelection([id])` — replace selection with just this node.
      → Enter **single node drag mode** (existing behavior).

3. **No hit (empty canvas):**
   → Record `marquee.startScreenX/Y` from the mouse event.
   → Set `marquee.active = false` for now — wait for mousemove to confirm drag intent.
   → Do NOT clear selection yet.

---

### C. mousemove Logic (`input.js`)

**If a node drag is active (single or group):** existing pan/move logic runs. No change.

**If mousedown was on empty canvas and mouse has moved > 4px from start:**
- Set `marquee.active = true`
- Update `marquee.currentScreenX/Y` every frame
- Convert marquee corners to world space via `viewport.screenToWorld()`
- Compute normalized world-space rect (handle all four drag directions):

```javascript
var worldStart = viewport.screenToWorld(marquee.startScreenX, marquee.startScreenY);
var worldCurrent = viewport.screenToWorld(marquee.currentScreenX, marquee.currentScreenY);

var rectLeft   = Math.min(worldStart.x, worldCurrent.x);
var rectRight  = Math.max(worldStart.x, worldCurrent.x);
var rectTop    = Math.min(worldStart.y, worldCurrent.y);
var rectBottom = Math.max(worldStart.y, worldCurrent.y);
```

- AABB intersect every node in `graphState.nodeMap`:

```javascript
// Node bounding box uses NODE_WIDTH and NODE_HEIGHT constants
// A node intersects the marquee if its box overlaps — not just center-point
var nodeRight  = node.position.x + NODE_WIDTH;
var nodeBottom = node.position.y + NODE_HEIGHT;

var intersects = !(nodeRight  < rectLeft  ||
                   node.position.x > rectRight ||
                   nodeBottom < rectTop   ||
                   node.position.y > rectBottom);
```

- Nodes that intersect → add to `pendingSelectionIds`
- Nodes that no longer intersect (marquee shrunk) → remove from `pendingSelectionIds`
- Call `renderer.requestRedraw()` — the renderer reads `pendingSelectionIds` each frame

---

### D. Group Drag Mode (`input.js`)

Triggered when `mousedown` lands on a node that is already in `selectedNodeIds`.

On drag start:
```javascript
// Record each selected node's offset from the cursor at drag start
var groupDragOffsets = {};
selectedNodeIds.forEach(function(id) {
  var node = graphState.getNode(id);
  groupDragOffsets[id] = {
    dx: node.position.x - cursorWorldX,
    dy: node.position.y - cursorWorldY
  };
});
```

On mousemove:
```javascript
// Apply offset to each node — update positions in graphState
selectedNodeIds.forEach(function(id) {
  var offset = groupDragOffsets[id];
  graphState.setNodePosition(id, {
    x: cursorWorldX + offset.dx,
    y: cursorWorldY + offset.dy
  });
});
renderer.requestRedraw();
```

On mouseup:
- Clear `groupDragOffsets`
- Exit group drag mode
- Canvas positions are never persisted (per architecture rule) — no write needed

---

### E. mouseup Logic (`input.js`)

**If marquee was active (`marquee.active === true`):**
- Commit: add all UUIDs in `pendingSelectionIds` into `selectedNodeIds` via `addToSelection(id)` for each
- Clear `pendingSelectionIds`
- Set `marquee.active = false`
- Trigger inspector update

**If mousedown was on empty canvas but drag delta was < 4px (treated as a click):**
- `clearSelection()`
- Set `marquee.active = false`

**If node was clicked (no drag):**
- Existing mouseup behavior. No extra action needed — selection was already set on mousedown.

---

### F. `viewport.screenToWorld(screenX, screenY)` (`viewport.js`)

If this function does not already exist, add it:

```javascript
function screenToWorld(screenX, screenY) {
  return {
    x: (screenX - pan.x) / zoom,
    y: (screenY - pan.y) / zoom
  };
}
```

This is the inverse of the existing world-to-screen transform. Expose it on the `viewport` object so `input.js` can call it.

---

## Rendering — `renderer.js`

### Multi-Selection Node Highlight

Nodes in `selectedNodeIds` already get a selection highlight ring (existing behavior for single select). Extend this to iterate the Set:

```javascript
// In the node draw loop:
var isSelected = selectedNodeIds.has(node.id);
var isPending  = pendingSelectionIds.has(node.id);

if (isSelected) {
  // existing selection ring — accent color, full opacity
}
if (isPending && !isSelected) {
  // pending ring — same accent color, 50% opacity, dashed stroke
  // shows what will be selected on release
}
```

### Marquee Rectangle Draw Pass

After all nodes and wires are drawn (top of draw stack):

```javascript
if (marquee.active) {
  // Convert marquee screen coords to canvas draw coords
  // The canvas context is already transformed (pan + zoom applied)
  // So draw in screen space — do NOT apply transform again

  var x      = Math.min(marquee.startScreenX, marquee.currentScreenX);
  var y      = Math.min(marquee.startScreenY, marquee.currentScreenY);
  var width  = Math.abs(marquee.currentScreenX - marquee.startScreenX);
  var height = Math.abs(marquee.currentScreenY - marquee.startScreenY);

  ctx.save();
  ctx.resetTransform(); // draw in screen space, not world space

  // Fill
  ctx.fillStyle = 'rgba(100, 160, 255, 0.08)';
  ctx.fillRect(x, y, width, height);

  // Border
  ctx.strokeStyle = 'rgba(100, 160, 255, 0.55)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x, y, width, height);

  ctx.restore();
}
```

**Important:** Call `ctx.resetTransform()` before drawing the marquee. The marquee is in screen space — the rest of the canvas draw loop is in world space. Restore after.

---

## Keyboard Delete — `keyboard.js`

Replace single-delete with Set iteration:

```javascript
// OLD
if (graphState.selectedNodeId) {
  deleteNode(graphState.selectedNodeId);
}

// NEW
if (graphState.selectedNodeIds.size > 0) {
  var idsToDelete = [];
  graphState.selectedNodeIds.forEach(function(id) {
    idsToDelete.push(id);
  });
  for (var i = 0; i < idsToDelete.length; i++) {
    deleteNode(idsToDelete[i]);
  }
  graphState.clearSelection();
}
```

**Why copy to array first:** deleting a node may modify `selectedNodeIds` internally. Iterating a Set while it mutates is undefined behavior. Always snapshot to array before the loop.

---

## Coordinate System — Critical Notes

```
Screen space:   pixel coords relative to the canvas DOM element (what the mouse reports)
World space:    the infinite logical coordinate system where nodes live
Transform:      worldToScreen → multiply by zoom, add pan offset
Inverse:        screenToWorld → subtract pan offset, divide by zoom
```

- Marquee start/end are recorded in **screen space**
- Hit-testing is done in **world space** (convert corners via `screenToWorld`)
- Marquee rectangle is drawn in **screen space** (use `ctx.resetTransform()`)
- Node positions in `graphState` are always **world space**
- `NODE_WIDTH` and `NODE_HEIGHT` are world-space constants — check `node.js` or `renderer.js` for their values

---

## Edge Cases — Handle All of These

| Case | Required Behavior |
|---|---|
| Marquee starts exactly on a node edge | mousedown hits the node — node drag, not marquee |
| Marquee released with zero intersections | Adds nothing; selection unchanged |
| Group drag: one selected node is a CompNode | CompNode moves on canvas only; no AE comp position changes (canvas positions are never persisted) |
| Shift+click a node that is the only selected node | Removes it → `selectedNodeIds` is empty → inspector clears |
| Delete with CompNode in selection | Run `onDelete` for CompNode (existing lifecycle) — CompNode deletion may cascade ghost to child nodes; this is expected and correct |
| Wire drag from a selected node | Wire drag takes priority — detected on mousedown via port hit test before group drag check |
| Pan (middle-mouse or space+drag) while marquee active | Cancel marquee immediately; reset `marquee.active = false` |

---

## Execution Protocol

Execute these phases in order. **Stop after every phase and wait for confirmation before proceeding.**

---

### PHASE 1 — Read and confirm understanding

Read the following files before writing any code:
- `graph/graphState.js` — find every reference to `selectedNodeId`
- `graph/canvas/input.js` — understand current mousedown/move/up flow
- `graph/canvas/renderer.js` — find the node draw loop and where to inject marquee draw
- `graph/canvas/viewport.js` — check if `screenToWorld` already exists
- `ui/keyboard.js` — find the current delete handler

Output:
1. List of every file that references `selectedNodeId` (full search result)
2. Confirm whether `screenToWorld` exists in `viewport.js`
3. Confirm the name of the constants used for node width/height in `renderer.js` or `node.js`
4. One-sentence description of current mousedown flow in `input.js`

**STOP. Wait for confirmation before writing any code.**

---

### PHASE 2 — `graphState.js` — state shape change

Change `selectedNodeId` → `selectedNodeIds (Set)`. Add the four mutation functions. Add `getLastSelected()`.

**Verification checklist:**
- [ ] `selectedNodeId` no longer exists in `graphState.js`
- [ ] `selectedNodeIds` is a `Set`
- [ ] `setSelection`, `addToSelection`, `removeFromSelection`, `clearSelection` all defined
- [ ] `getLastSelected()` returns last UUID or `null`
- [ ] Panel loads without console errors

**STOP. Wait for confirmation.**

---

### PHASE 3 — `viewport.js` — `screenToWorld`

Add `screenToWorld(screenX, screenY)` if missing. Expose on the `viewport` object.

**Verification checklist:**
- [ ] Function exists and is accessible as `viewport.screenToWorld(x, y)`
- [ ] Returns correct world coords at known pan/zoom values (test in console)

**STOP. Wait for confirmation.**

---

### PHASE 4 — `input.js` — marquee + group drag + shift+click

Implement all three interaction paths. This is the largest change.

**Verification checklist:**
- [ ] Drag on empty canvas → `marquee.active` becomes `true` after 4px threshold
- [ ] `pendingSelectionIds` populates correctly during drag (log to console)
- [ ] mouseup commits pending to `selectedNodeIds`
- [ ] Click on empty canvas → `clearSelection()` called
- [ ] Click on node (no modifier) → `setSelection([id])` called
- [ ] Shift+click → toggles correctly
- [ ] Group drag moves all selected nodes together
- [ ] Unselected node drag → replaces selection, drags alone
- [ ] Wire drag from port → not intercepted by group drag

**STOP. Wait for confirmation.**

---

### PHASE 5 — `renderer.js` — marquee rectangle + pending highlight

Add marquee rectangle draw pass. Add pending-selection dashed ring on nodes.

**Verification checklist:**
- [ ] Marquee rectangle visible during drag (semi-transparent blue fill, dashed border)
- [ ] Pending highlight ring visible on intersecting nodes during drag
- [ ] Selected nodes show full highlight ring (existing + extended to Set)
- [ ] `ctx.resetTransform()` called before marquee draw, `ctx.restore()` after
- [ ] No visual artifacts when marquee is not active

**STOP. Wait for confirmation.**

---

### PHASE 6 — `keyboard.js` — delete loop

Update delete handler to iterate `selectedNodeIds` Set.

**Verification checklist:**
- [ ] Selecting 3 nodes and pressing Delete → all 3 deleted
- [ ] `clearSelection()` called after deletion loop
- [ ] Single selected node delete still works

**STOP. Wait for confirmation.**

---

### PHASE 7 — Full integration test (you drive this)

Output this message verbatim:

```
─────────────────────────────────────────
PHASE 7 — INTEGRATION TEST
Ready for manual testing.

Feature: Drag-Select + Multi-Select
Branch: [current branch name]

Please test the following scenarios:
  1. Drag on empty canvas → marquee rectangle appears
  2. Release → nodes inside marquee are selected
  3. Shift+click nodes to add/remove individually
  4. Drag any selected node → all selected nodes move together
  5. Click empty canvas → selection clears
  6. Select multiple nodes → press Delete → all deleted
  7. Wire drag from a selected node's output port → wire drag works, no group move

Reply with:
  ✅ PASS — feature complete
  ❌ FAIL: [describe issue] — to fix and retest
─────────────────────────────────────────
```

Do not proceed to Phase 8 until you receive ✅ PASS.

---

### PHASE 8 — Commit

```bash
git add -A
git commit -m "feat: add marquee drag-select and multi-select to graph canvas"
git push origin HEAD
```

**Verification checklist:**
- [ ] `git status` is clean after commit
- [ ] `git push` completed without errors

---

## Quick Phase Summary

```
PHASE 1  — read all 5 files, confirm state, STOP
PHASE 2  — graphState.js: selectedNodeIds Set + mutation API
PHASE 3  — viewport.js: screenToWorld()
PHASE 4  — input.js: marquee + group drag + shift+click
PHASE 5  — renderer.js: marquee rect + pending ring
PHASE 6  — keyboard.js: delete loop
PHASE 7  — STOP. hand to developer for integration test
PHASE 8  — commit feat:
```

Each phase is a hard stop. Never chain phases.

---

*FEATURE-DRAG-SELECT.md — Procedia v2 — May 2026*
*Panel JS only. No ExtendScript. No AE calls. No new files.*
