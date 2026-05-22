# TASK-11 — Palette Drag, Inspector, Keyboard Shortcuts, and index.js
*Procedia v4 — Eleventh task. Builds on completed TASK-01 through TASK-10.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 10, 11, 12, 13 in full
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 4, 8, 10, and 13 in full

Confirm both files are present at repo root before starting.

---

## Context

This task completes the panel-side UI. After TASK-10, nodes render on the canvas, wires can be drawn, and the graph state is fully functional. What's missing is:

1. **`ui/drag.js`** — dragging nodes from the palette onto the canvas
2. **`ui/inspector.js`** — the right-panel inspector showing selected node params as editable fields
3. **`ui/keyboard.js`** — Delete/Backspace to delete selected node, Escape to deselect
4. **`ui/nodeList.js`** — palette search filtering (the category collapse is already in TASK-01)
5. **`index.js`** — the panel entry point that initializes everything in the correct order

After this task, the full panel is interactive end-to-end in the browser. AE integration is TASK-12.

---

## What This Task Does NOT Do

- No AE calls
- No dispatcher implementation
- No persistence reads or writes
- No polling implementation
- No minimap

Files written: `ui/drag.js`, `ui/inspector.js`, `ui/keyboard.js`, `ui/nodeList.js`, `index.js`.

---

## PHASE 1 — `ui/nodeList.js` — palette search

### What it does

Filters the palette item list as the user types in the search input. Category headers with no matching items collapse automatically. Clearing the search restores all items.

### Algorithm

```
onSearchInput(query):

1. Normalize query: query.trim().toLowerCase()

2. For each .palette-item in the palette:
   a. itemLabel = item's text content, lowercased
   b. If query is empty OR itemLabel includes query: show item (remove 'hidden' class)
   c. Else: hide item (add 'hidden' class)

3. For each .palette-category:
   a. visibleItems = count of .palette-item children without 'hidden' class
   b. If visibleItems === 0: hide the category (add 'hidden' class to the whole category)
   c. Else: show the category (remove 'hidden' class)
```

### Public API

```javascript
var nodeList = (function() {

  function init() {
    var searchInput = document.querySelector('.palette-search input');
    if (!searchInput) return;
    searchInput.addEventListener('input', function(e) {
      _onSearch(e.target.value);
    });
  }

  function _onSearch(query) {
    // see algorithm above
  }

  return { init: init };

})();
```

### CSS to add to `panel.css`

```css
.palette-item.hidden    { display: none; }
.palette-category.hidden { display: none; }
```

---

### Phase 1 verification — manual browser check

- [ ] Typing `text` in the search box shows only the Text item, hides all others
- [ ] Typing `bl` shows `Gaussian Blur` (and any other match)
- [ ] Categories with no matching items collapse entirely
- [ ] Clearing the search restores everything
- [ ] Search is case-insensitive

**STOP. Describe what you see. Wait for confirmation.**

---

## PHASE 2 — `ui/drag.js` — palette to canvas drag

### What it does

Handles the HTML5 drag-and-drop from palette items to the canvas. When a palette item is dragged and dropped onto `#canvas-wrap`, calls `engine.dropNode` at the correct canvas coordinate.

### Algorithm

**On palette item dragstart:**
```
1. e.dataTransfer.setData('text/plain', nodeType)
   where nodeType = item's data-node-type attribute (see HTML update below)
2. e.dataTransfer.effectAllowed = 'copy'
```

**On `#canvas-wrap` dragover:**
```
1. e.preventDefault()
2. e.dataTransfer.dropEffect = 'copy'
```

**On `#canvas-wrap` drop:**
```
1. e.preventDefault()
2. nodeType = e.dataTransfer.getData('text/plain')
3. If nodeType is empty or not in nodeRegistry: return
4. canvasPos = viewport.screenToCanvas(e.clientX, e.clientY)
5. engine.dropNode(nodeType, canvasPos.x, canvasPos.y)
6. renderer.render()
7. wireRenderer.render()
```

### HTML update required in `index.html`

Each `.palette-item` element needs a `data-node-type` attribute. Update the palette items in `index.html`:

```html
<!-- Before: -->
<div class="palette-item" draggable="true"><span class="palette-item-label">Text</span></div>

<!-- After: -->
<div class="palette-item" draggable="true" data-node-type="layers/text">
  <span class="palette-item-label">Text</span>
</div>
```

Apply the correct `data-node-type` to every palette item:

| Item | `data-node-type` |
|---|---|
| Comp | `core/comp` |
| Text | `layers/text` |
| Null | `layers/null` |
| Shape | `layers/shape` |
| Adjustment | `layers/adjustment` |
| Fill | `effects/fill` |
| Gaussian Blur | `effects/gaussian-blur` |
| Drop Shadow | `effects/drop-shadow` |
| Color | `data/color` |
| Number | `data/number` |
| Expression | `utility/expression` |

Note: Most of these node types are not yet registered (only `core/comp`, `layers/text`, `layers/null` exist so far). `engine.dropNode` already handles unknown types gracefully — it logs an error and returns `null`. The `data-node-type` attributes are set now so they are correct when the nodes are implemented.

### Public API

```javascript
var drag = (function() {

  function init() {
    // Add dragstart listeners to all .palette-item elements
    // Add dragover and drop listeners to #canvas-wrap
  }

  return { init: init };

})();
```

---

### Phase 2 verification — manual browser check

- [ ] Dragging a `Text` item from the palette and dropping on the canvas creates a text node card
- [ ] The node appears at the drop position (not at canvas 0,0)
- [ ] Dragging a `Comp` item creates a comp node card that is immediately alive
- [ ] Dragging a `Shape` item (not yet registered) logs an error and creates nothing
- [ ] After drop, dropping again creates a second independent node
- [ ] Drop works correctly at different zoom levels (node appears where cursor is)

**STOP. Describe what you see. Wait for confirmation.**

---

## PHASE 3 — `ui/inspector.js`

### What it does

Renders the selected node's params as editable fields in the inspector panel. When a field is changed, calls `engine.setNodeProperty`. Clears when nothing is selected.

### When to re-render the inspector

The inspector re-renders on `graphState.onSelectionChange`. It does not poll — it only updates when selection changes or when `updateInspector()` is called explicitly (e.g. after a property change to reflect wired state).

### Inspector structure (already in DOM from TASK-01)

```
#inspector
  .inspector-header
    .inspector-title         ← always "INSPECTOR"
    .inspector-cat-badge     ← node category + type, hidden when nothing selected
  .inspector-body
    .inspector-empty         ← shown when nothing selected
    [sections]               ← shown when a node is selected
```

### Render algorithm

```
renderInspector(nodeId):

If nodeId is null:
  — Show .inspector-empty
  — Hide .inspector-cat-badge
  — Clear .inspector-body of any sections
  Return

Get nodeData and def. If either is missing: same as null case.

1. Update .inspector-cat-badge:
   — Set category dot color to var(--cat-{token})
   — Set label to '{category} / {label}'
   — Show the badge

2. Clear .inspector-body of any existing sections.

3. Build sections from def.params:
   — Group params into one section by default.
   — 'label' param always goes in its own 'IDENTITY' section at the top.
   — All remaining params go in a section named after the node category.

4. For each param — build a .inspector-field div:
   — .inspector-field-label: param.label (left, fixed width)
   — .inspector-field-value: input element appropriate for param type

5. Input element by param type:

   'string':
     <input type="text" value="{current value}" />

   'number':
     <input type="number" value="{current value}"
            min="{param.min || ''}" max="{param.max || ''}" />

   'color':
     <div class="inspector-color-wrap">
       <div class="inspector-color-swatch" style="background: {cssColor}"></div>
       <input type="text" value="{hexValue}" />
     </div>

   'vector2':
     Two number inputs side by side: X and Y

6. For each input:
   — If the param is wired (check wireMap: any wire with toNode===nodeId AND
     boundParam===param.key): add class 'wired' and set readonly=true
   — Else: add 'input' event listener → call engine.setNodeProperty(nodeId, key, parsedValue)

7. Wire inputs to engine.setNodeProperty:
   — 'string': value = e.target.value
   — 'number': value = parseFloat(e.target.value) — guard NaN, use current value if NaN
   — 'color': on swatch click → no color picker yet, on hex input change → parse hex to [r,g,b,a]
   — 'vector2': value = [parseFloat(xInput.value), parseFloat(yInput.value)]
```

### Color conversion helpers (private)

```javascript
function _rgbaToHex(rgba) {
  // rgba is [r, g, b, a] range 0-1
  // return '#rrggbb' hex string
  function toHex(v) {
    var h = Math.round(v * 255).toString(16);
    return h.length === 1 ? '0' + h : h;
  }
  return '#' + toHex(rgba[0]) + toHex(rgba[1]) + toHex(rgba[2]);
}

function _hexToRgba(hex) {
  // hex is '#rrggbb' or 'rrggbb'
  // return [r, g, b, 1] range 0-1
  hex = hex.replace('#', '');
  return [
    parseInt(hex.substr(0, 2), 16) / 255,
    parseInt(hex.substr(2, 2), 16) / 255,
    parseInt(hex.substr(4, 2), 16) / 255,
    1
  ];
}
```

### Public API

```javascript
var inspector = (function() {

  function renderInspector(nodeId) { ... }

  function updateInspector() {
    renderInspector(graphState.getSelection());
  }

  function init() {
    graphState.onSelectionChange(function(uuid) {
      renderInspector(uuid);
    });
  }

  return { init: init, updateInspector: updateInspector };

})();
```

---

### Phase 3 verification — manual browser check

- [ ] Clicking a node card shows its params in the inspector
- [ ] Node category and type badge updates in the inspector header
- [ ] Changing a string field updates the node's prop in `nodeMap` after 300ms debounce
- [ ] Changing a number field updates the prop correctly — NaN inputs are ignored
- [ ] Color params show a swatch + hex string
- [ ] Vector2 params show two number inputs
- [ ] Wired params show with `wired` class (yellow text, readonly)
- [ ] Clicking canvas background clears the inspector (shows empty state)
- [ ] Clicking a different node switches the inspector to the new node

**STOP. Describe what you see. Wait for confirmation.**

---

## PHASE 4 — `ui/keyboard.js`

### What it does

Handles keyboard shortcuts for the panel. Operates on the document level.

### Shortcuts

| Key | Condition | Action |
|---|---|---|
| `Delete` or `Backspace` | A node is selected AND no input is focused | Delete the selected node |
| `Escape` | Anything selected | Deselect everything |
| `Space` | Held | Enables canvas pan (handled in `input.js` — just track state here) |

**Important:** Wire deletion on `Delete` is handled in `wire.js`. The keyboard handler here only deletes nodes. Check `_selectedWireId` from `wireInteraction` — if a wire is selected, let `wire.js` handle it and do nothing here.

### Input focus guard

Never delete a node if an `<input>` or `<textarea>` has focus — the user is typing. Check:

```javascript
var active = document.activeElement;
var isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
```

### Delete node algorithm

```
onDelete:
1. If wireInteraction.getSelectedWire() is not null — do nothing (wire.js handles it)
2. If no node is selected (graphState.getSelection() === null) — do nothing
3. If an input is focused — do nothing
4. selectedId = graphState.getSelection()
5. engine.deleteNode(selectedId)
6. renderer.render()
7. wireRenderer.render()
8. inspector.updateInspector()  ← clears the inspector
```

### Escape algorithm

```
onEscape:
1. graphState.setSelection(null)
2. renderer.render()  ← removes selected class
3. inspector.updateInspector()  ← shows empty state
```

### Public API

```javascript
var keyboard = (function() {

  function _onKeyDown(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') { _handleDelete(e); }
    if (e.key === 'Escape')                           { _handleEscape(); }
  }

  function _handleDelete(e) { ... }
  function _handleEscape()  { ... }

  function init() {
    document.addEventListener('keydown', _onKeyDown);
  }

  return { init: init };

})();
```

---

### Phase 4 verification — manual browser check

- [ ] Selecting a node and pressing Delete removes it from the canvas
- [ ] Wires connected to the deleted node are also removed from the canvas
- [ ] If a text input in the inspector is focused, Delete does not delete the node
- [ ] Pressing Escape deselects the current node (selection glow disappears)
- [ ] With a wire selected, pressing Delete removes the wire (wire.js handles it — keyboard.js does nothing)
- [ ] Pressing Delete with nothing selected does nothing

**STOP. Describe what you see. Wait for confirmation.**

---

## PHASE 5 — `index.js` — panel entry point

### What it does

Initializes the entire panel in the correct order. This is the first and only place where all modules are wired together. It runs once on panel load.

### Initialization sequence

```
1. Init graphState (already initialized at declaration — nothing to call)

2. Init nodeRegistry (already initialized at declaration — nodes self-registered on script load)
   — Log registered node types to console for dev confirmation

3. Init evalBridge — no init function needed, it's ready on load

4. Init viewport.reset() — set pan to 0,0, zoom to 1.0

5. Init renderer — no init function, it's ready on load

6. Init wireRenderer — no init function, it's ready on load

7. Init canvasInput.init() — attaches mousedown/move/up to #canvas-wrap

8. Init wireInteraction.init() — attaches port and wire-layer event listeners

9. Init nodeList.init() — attaches search input listener

10. Init drag.init() — attaches dragstart/dragover/drop listeners

11. Init inspector.init() — registers selection change callback

12. Init keyboard.init() — attaches keydown listener

13. Wire selection change to renderer.render():
    graphState.onSelectionChange(function() {
      renderer.render();
      wireRenderer.render();
    });
    NOTE: inspector.init() also registers a selection change callback.
    graphState.onSelectionChange can only hold ONE callback (from TASK-02).
    Combine both into a single callback here and remove the one inside inspector.init().
    See "Selection callback consolidation" below.

14. Register dirty flusher — no init needed, dirtyFlusher is called by engine

15. Log '[Procedia] Panel initialized' to console

16. Call renderer.render() — initial render (nodeMap is empty on first load)
    Call wireRenderer.render()
```

### Selection callback consolidation

`graphState.onSelectionChange` stores only one callback. Both `inspector.js` and `index.js` need to respond to selection changes. Consolidate into one callback registered in `index.js`:

```javascript
graphState.onSelectionChange(function(uuid) {
  renderer.render();
  wireRenderer.render();
  inspector.renderInspector(uuid);
});
```

Update `inspector.init()` to NOT register a `onSelectionChange` callback — remove that line. `inspector.init()` only sets up any internal state it needs (none currently). The registration happens in `index.js` only.

### Complete `index.js`

```javascript
// index.js
// DEPENDS ON: everything
// MUST LOAD BEFORE: nothing
// Entry point. Initializes: evalBridge → reservedComp → readGraph → buildUI → startPoller

(function init() {

  // 1-2. graphState and nodeRegistry are self-initializing
  console.log('[Procedia] registered nodes:', nodeRegistry.listTypes());

  // 4. Viewport
  viewport.reset();

  // 7. Canvas input
  canvasInput.init();

  // 8. Wire interaction
  wireInteraction.init();

  // 9. Node list (palette search)
  nodeList.init();

  // 10. Drag from palette
  drag.init();

  // 11-12. UI modules
  // inspector.init() — do NOT register selection callback here (see step 13)
  keyboard.init();

  // 13. Consolidated selection change callback
  graphState.onSelectionChange(function(uuid) {
    renderer.render();
    wireRenderer.render();
    inspector.renderInspector(uuid);
  });

  // 15. Ready
  console.log('[Procedia] Panel initialized.');

  // 16. Initial render
  renderer.render();
  wireRenderer.render();

})();
```

---

### Phase 5 verification — manual browser check

Open `index.html` in the browser. Open the console.

- [ ] Console shows `[Procedia] registered nodes:` with `core/comp`, `layers/text`, `layers/null`
- [ ] Console shows `[Procedia] Panel initialized.`
- [ ] No console errors on load
- [ ] Canvas is empty (no static placeholder nodes from TASK-01 — those were removed in TASK-09)
- [ ] Dragging Text from palette → canvas creates a ghost text node
- [ ] Dragging Comp from palette → canvas creates an alive comp node
- [ ] Connecting Text output → Comp layer_in_0: text node goes alive, wire appears
- [ ] Clicking text node: inspector shows its params
- [ ] Changing font size in inspector: value updates in nodeMap after 300ms
- [ ] Pressing Delete with text node selected: node removed, wire removed, inspector clears
- [ ] Pressing Escape: deselects node
- [ ] Search `comp` in palette: only Comp item visible

**STOP. Describe full interaction flow. Wait for confirmation.**

---

## Additional Rules for This Task

**`graphState.onSelectionChange` holds exactly one callback.** Registering it twice — once in `inspector.init()` and once in `index.js` — overwrites the first. The second registration wins. The brief resolves this by moving all selection-driven updates into a single callback in `index.js`. Do not register `onSelectionChange` anywhere else.

**Inspector input events use `'input'` not `'change'`.** The `'change'` event fires only on blur. `'input'` fires on every keystroke — the 300ms debounce in `dirtyFlusher` handles the throttling. If `'change'` is used, the node's label in AE would only update when the user clicks away, which feels broken.

**Number inputs must guard against NaN.** `parseFloat('')` returns `NaN`. `parseFloat('abc')` returns `NaN`. Always check `isNaN(parsed)` and fall back to the current prop value if parsing fails. Never write `NaN` to `nodeData.props`.

**`vector2` inputs fire one `engine.setNodeProperty` call per change** with the full `[x, y]` array as the value. Do not call it twice (once for x, once for y). Read both input values together in the listener and pass the array.

**Drag drop position uses `viewport.screenToCanvas`.** `e.clientX/clientY` is screen space. Without the coordinate transform, all dropped nodes appear at the top-left at high zoom levels.

**`index.js` is an IIFE.** Wrapping in `(function init() { ... })()` prevents any variable leaking to global scope. The only globals are the module objects exposed by each file's IIFE return.

**Remove the static placeholder node cards from `index.html`.** The six static node divs added in TASK-01's Phase 2 must be removed from `#canvas-viewport`. Live nodes are now rendered by `renderer.js`. Leaving the static ones creates visual confusion and interferes with `data-node-id` lookups.

**Remove the `devBootstrap` script block** if it was left in `index.html` from TASK-09.

**No ES6+** throughout all files.

---

## On Completion

When all five phase checklists pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-11 COMPLETE

ui/nodeList.js      ✅  palette search verified
ui/drag.js          ✅  palette-to-canvas drag verified
ui/inspector.js     ✅  param editing verified
ui/keyboard.js      ✅  delete and escape verified
index.js            ✅  full panel initialization verified

Static placeholder nodes removed from index.html.
devBootstrap script removed from index.html.
Selection callback consolidated in index.js.

Full panel interactive in browser. Ready for AE integration.

Next task: TASK-12 — jsx/dispatcher/dispatcher.jsx (AE bridge)
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-11-UI-ENTRYPOINT.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 10, 11, 12, 13 — PROCEDIA-V4-ARCHITECTURE.md Sections 4, 8, 10, 13*
