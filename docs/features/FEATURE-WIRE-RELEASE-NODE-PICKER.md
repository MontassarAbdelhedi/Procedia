# FEATURE — Wire-Release Node Picker
*Procedia v2 · UI Enhancement · CEP · Vanilla JS · No ExtendScript*
*Last updated: May 2026*

---

## What This Feature Does

When a user drags a wire from an output port and releases it onto **empty canvas** (no port, no node under the cursor), instead of cancelling the wire, a floating search menu appears at the drop position. The user types to filter registered nodes, selects one, and the new node is placed on canvas with its first input port automatically wired to the source output port. The wire goes straight through — source port → new node's first input.

---

## Behaviour Contract

- Wire dragged from output port → released on empty canvas → picker opens at drop position
- Picker has an auto-focused text input and a filtered list of all node types from `nodeRegistry`
- List is grouped by category. Search is case-insensitive substring match on node label
- **Type filtering is enforced:** if the dragged wire originated from a `layer`-type output, only nodes with at least one `layer`-type input port are shown. Same for `data`-type wires.
- Arrow keys navigate the list. Enter or click selects.
- On selection: new node is created at drop position, wire is committed from source → new node's first declared input port
- Escape or click-outside: picker closes, wire is cancelled (same as a miss today)
- If canvas is panned or zoomed while picker is open: close picker, cancel wire
- If no nodes match the search: show a "No results" message — never hide the picker silently

---

## Algorithm

```
1. User drags wire from output port
   → wire.js sets dragState = { active: true, sourceNodeId, sourcePortId, portType }

2. User releases mouse — input.js checks hit target
   → Hit = port or node: normal wire commit (no change)
   → Miss = empty canvas: fire event "wireReleasedOnCanvas"
     payload: { sourceNodeId, sourcePortId, portType, dropX, dropY }
     dropX/dropY are in SCREEN coordinates (not canvas space)

3. nodePicker.js receives the event
   → Positions the picker DOM element at (dropX, dropY)
   → Populates the list from nodeRegistry.getAllDefinitions()
   → Filters by portType compatibility (see Type Filter Rules below)
   → Focuses the text input

4. User types → filterNodes(query) runs on every keystroke
   → Substring match on def.label (case-insensitive)
   → Re-render the list in place

5. User selects a node definition
   → nodePicker.close()
   → Convert dropX, dropY from screen → canvas space via viewport.screenToCanvas()
   → graphState.addNode({ type: def.type, position: { x, y }, properties: defaults })
   → graphState.addWire({
       fromNode: sourceNodeId,
       fromPort: 'output',
       toNode:   newNode.id,
       toPort:   def.inputs[0].port
     })
   → Trigger onDrop lifecycle for the new node (same as a drag-from-list drop)
   → Trigger wire commit logic (same path as a normal wire confirmation)

6. Escape or click-outside
   → nodePicker.close()
   → wire.js cancelDrag() — same as today's miss behaviour
```

---

## Type Filter Rules

Every node definition declares its input ports with a `type` field (`'layer'` or `'data'`).

```javascript
// In nodePicker.js — filterByPortType
function filterByPortType(definitions, portType) {
  var filtered = [];
  for (var i = 0; i < definitions.length; i++) {
    var def = definitions[i];
    var inputs = def.inputs || [];
    for (var j = 0; j < inputs.length; j++) {
      if (inputs[j].type === portType) {
        filtered.push(def);
        break;
      }
    }
  }
  return filtered;
}
```

Always apply this filter before the text search filter. Text search runs on the already-typed-filtered list.

---

## Files to Create

### `ui/nodePicker.js` — new file

Owns the picker DOM overlay entirely. No AE calls. No graphState mutations (only reads nodeRegistry, calls graphState.addNode and graphState.addWire on confirm).

```
Exports / public API:
  nodePicker.init()          — called once on panel bootstrap, creates DOM element
  nodePicker.open(config)    — config: { sourceNodeId, sourcePortId, portType, dropX, dropY }
  nodePicker.close()         — hides picker, clears state
  nodePicker.isOpen()        — returns bool
```

Internal structure of the picker DOM:

```html
<div id="node-picker" class="node-picker hidden">
  <input type="text" id="node-picker-search" placeholder="Search nodes..." autocomplete="off" />
  <div id="node-picker-list"></div>
</div>
```

The picker is absolutely positioned on the canvas container element. Use `style.left` and `style.top` set in pixels. Add a `hidden` class that sets `display: none`.

---

## Files to Modify

### `graph/Wire/wire.js`

Current behaviour on empty-canvas release: cancel drag, clear dragState.

New behaviour: before cancelling, check if release is on empty canvas. If yes, fire the event instead of cancelling. Do NOT clear dragState yet — keep it alive until picker confirms or closes.

```javascript
// In wire.js — onMouseUp handler
function onWireMouseUp(event) {
  if (!dragState.active) return;

  var hitTarget = getHitTarget(event.canvasX, event.canvasY); // existing function

  if (hitTarget && hitTarget.type === 'port' && isCompatiblePort(hitTarget)) {
    commitWire(hitTarget);
    return;
  }

  // Miss — check if on empty canvas
  if (!hitTarget) {
    // Fire event — do not cancel yet
    document.dispatchEvent(new CustomEvent('wireReleasedOnCanvas', {
      detail: {
        sourceNodeId: dragState.sourceNodeId,
        sourcePortId: dragState.sourcePortId,
        portType:     dragState.portType,
        dropX:        event.clientX,  // screen coords
        dropY:        event.clientY
      }
    }));
    // dragState stays active — picker will call cancelDrag() or commitWire() on resolution
    return;
  }

  // Hit incompatible target — cancel as normal
  cancelDrag();
}
```

Add `cancelDrag()` as an exported function so `nodePicker.js` can call it on Escape/close.

### `graph/canvas/input.js`

No structural change. The `wireReleasedOnCanvas` event is dispatched from `wire.js` using a native DOM `CustomEvent`. `nodePicker.js` listens for it on `document`. `input.js` does not need to relay it.

One addition: detect canvas pan/zoom while picker is open and call `nodePicker.close()` + `wire.cancelDrag()` if `nodePicker.isOpen()` returns true.

```javascript
// In input.js — pan/zoom handlers
function onPanStart() {
  if (nodePicker.isOpen()) {
    nodePicker.close();
    wire.cancelDrag();
  }
  // ... existing pan logic
}
```

### `index.html`

Add the picker container inside the canvas wrapper div and the script tag for `nodePicker.js`.

```html
<!-- Inside canvas wrapper, before closing tag -->
<div id="node-picker" class="node-picker hidden">
  <input type="text" id="node-picker-search" placeholder="Search nodes..." autocomplete="off" />
  <div id="node-picker-list"></div>
</div>

<!-- Script tag — after ui/drag.js, before index.js -->
<script src="ui/nodePicker.js"></script>
```

---

## CSS

Add to the panel stylesheet (or inline in `index.html`):

```css
.node-picker {
  position: absolute;
  z-index: 1000;
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 6px;
  width: 220px;
  padding: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
}

.node-picker.hidden {
  display: none;
}

#node-picker-search {
  width: 100%;
  box-sizing: border-box;
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #ddd;
  padding: 5px 8px;
  font-size: 12px;
  outline: none;
}

#node-picker-list {
  margin-top: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.picker-category-label {
  font-size: 10px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 4px 4px 2px;
}

.picker-node-item {
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #ccc;
  cursor: pointer;
}

.picker-node-item:hover,
.picker-node-item.active {
  background: #3a3a3a;
  color: #fff;
}

.picker-no-results {
  font-size: 12px;
  color: #555;
  padding: 6px 8px;
  text-align: center;
}
```

---

## Verification Checklist

- [ ] Dragging a wire and releasing on empty canvas opens the picker at cursor position
- [ ] The picker's text input is focused immediately on open
- [ ] Typing filters the list in real time
- [ ] Only nodes compatible with the wire's port type are shown
- [ ] Arrow keys navigate the list (active item highlighted)
- [ ] Enter confirms the selected item
- [ ] Clicking a list item confirms it
- [ ] On confirm: new node appears at drop position on canvas
- [ ] On confirm: wire is drawn and committed from source port to new node's first input
- [ ] Escape closes the picker and cancels the wire (same as today's miss)
- [ ] Clicking outside the picker closes it and cancels the wire
- [ ] Panning the canvas while picker is open closes it and cancels the wire
- [ ] "No results" message appears when search has no matches
- [ ] No console errors on open, confirm, or cancel

---

## Rules

- `ui/nodePicker.js` must not call `csInterface.evalScript()` directly or indirectly
- `ui/nodePicker.js` must not mutate `graphState.nodeMap` or `graphState.wireMap` directly — call `graphState.addNode()` and `graphState.addWire()` only
- No `const`, `let`, arrow functions, or template literals — this file runs in the CEP Chromium panel, not ExtendScript, but keep it consistent with the codebase style
- The picker DOM element is created once on `init()` — not destroyed and recreated on each open
- `dragState` in `wire.js` must not be cleared until the picker resolves (confirm or cancel)

---

*FEATURE-WIRE-RELEASE-NODE-PICKER.md — Procedia v2 — May 2026*
