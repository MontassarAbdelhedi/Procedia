# TASK-21 — End-to-End QA Protocol
*Procedia v4 — Final task. Run after all TASK-01 through TASK-20 are complete.*
*This is not a code task. It is a structured test protocol run in a live AE session.*

---

## Prerequisite Reading — Do This First

Read in full before running any test:

1. `CLAUDE.md` — all 14 skills and all absolute rules
2. `PROCEDIA-V4-ARCHITECTURE.md` — all sections

This protocol assumes the plugin is installed as a CEP extension, After Effects 2025+ is open, and the Procedia panel is visible via `Window → Extensions → Procedia`.

---

## Before Starting

**Environment setup:**
- Fresh AE project — no pre-existing comps or layers
- Panel freshly loaded — no saved graph from a previous session
- Browser DevTools open (right-click panel → Inspect) — console visible
- Console must show zero errors on panel open

**Record all failures.** Do not fix bugs mid-protocol. Record the exact step number, the expected behavior, and the actual behavior. Fix all failures after the full protocol is complete, then re-run only the failed sections.

---

## SECTION A — Panel Initialization

### A1. Fresh start
- [ ] Panel opens without console errors
- [ ] Console shows `[Procedia] registered nodes:` with all 11 node types:
  `core/comp, layers/text, layers/null, layers/shape, layers/adjustment, effects/fill, effects/gaussian-blur, effects/drop-shadow, data/color, data/number, utility/expression`
- [ ] Console shows `[Procedia] No saved graph found. Starting fresh.`
- [ ] Console shows `[Procedia] Init complete. Poller started.`
- [ ] Canvas is empty — no placeholder nodes
- [ ] Palette shows all 5 categories collapsed/expanded correctly
- [ ] Inspector shows empty state
- [ ] Minimap is visible in bottom-right corner — empty (background only)
- [ ] Status bar shows: nodes 0, wires 0, alive 0, ghost 0

### A2. Palette search
- [ ] Typing `text` shows only `Text` item — all other items hidden
- [ ] Typing `blur` shows only `Gaussian Blur`
- [ ] Typing `comp` shows only `Comp`
- [ ] Clearing search restores all categories and items
- [ ] Search is case-insensitive: `FILL` matches `Fill`

---

## SECTION B — Node Creation

### B1. Drop all node types
Drop one of each node type from the palette. Confirm each appears on canvas.

| Node | Expected state on drop | AE object created |
|---|---|---|
| Comp | `alive` immediately | CompItem in project panel |
| Text | `ghost` | None |
| Null | `ghost` | None |
| Shape | `ghost` | None |
| Adjustment | `ghost` | None |
| Fill | `ghost` | None |
| Gaussian Blur | `ghost` | None |
| Drop Shadow | `ghost` | None |
| Color | `alive` immediately | None |
| Number | `alive` immediately | None |
| Expression | `ghost` | None |

- [ ] All 11 nodes appear on canvas at the drop position
- [ ] State dots match the table above (green = alive, dimmed dashed = ghost)
- [ ] CompItem appears in AE project panel under the Procedia folder
- [ ] Data nodes (Color, Number) appear alive without any wiring
- [ ] Minimap shows all 11 nodes as colored rectangles
- [ ] Status bar updates: nodes 11

### B2. Node card visual accuracy
Select each node. For each:
- [ ] Header accent color matches its category (purple=Core, blue=Layers, orange=Effects, yellow=Data, teal=Utility)
- [ ] Inspector shows correct params for the selected node
- [ ] Clicking canvas background deselects — inspector clears to empty state
- [ ] Clicking a different node switches inspector to that node

### B3. Node repositioning
- [ ] Drag a node card — it follows the mouse smoothly
- [ ] Release — node stays at the new position
- [ ] `graphState.getNode(id).x` matches the new position (verify in browser console)
- [ ] Dragging a node does not start a wire (mousedown on card body, not port)

---

## SECTION C — Wire System

### C1. Layer wire — Text → Comp
- [ ] Mousedown on Text node's output port starts a drag wire (dashed blue preview)
- [ ] Valid drop target (Comp's `layer_in_0`) highlights (scales up) during drag
- [ ] Invalid targets do not highlight (e.g. another output port, same node)
- [ ] Drop on Comp's `layer_in_0`: wire appears (solid blue S-curve)
- [ ] Text node transitions to `alive` — state dot glows green
- [ ] AE: text layer appears inside the comp
- [ ] Text layer `.comment` equals the Text node UUID (verify in ESTK)
- [ ] Minimap: Text node turns green (alive)
- [ ] Status bar: wires 1, alive 2

### C2. Effector chain — Text → Fill → Comp
- [ ] Wire Fill node `layer_in` to Text node output (Text → Fill → Comp chain)
- [ ] Fill node transitions to `alive`
- [ ] AE: Fill effect appears on the text layer
- [ ] `effect.comment` equals Fill node UUID (verify in ESTK)
- [ ] Wire Gaussian Blur `layer_in` to Fill output
- [ ] Gaussian Blur goes alive
- [ ] AE: Gaussian Blur effect stacked after Fill in effects list
- [ ] Status bar: nodes 11, wires 3 (Text→Fill, Fill→Comp, GaussianBlur→Fill chain)

Wait — re-examining the chain:
Text output → Fill `layer_in` → Fill output → Gaussian Blur `layer_in` → Gaussian Blur output → Comp `layer_in`

- [ ] Confirm the full chain wires correctly end-to-end

### C3. Data wire — Color → Fill
- [ ] Drag from Color node output → Fill node's newborn extendable slot
- [ ] Picker dropdown appears — shows params matching `color` type
- [ ] `color` param listed in picker
- [ ] Select `color` — wire committed (yellow dashed data wire)
- [ ] Fill's `color` param in inspector shows locked (yellow `is-wired` indicator)
- [ ] Change Color node color to pure red `[1,0,0,1]` in inspector
- [ ] After 300ms: Fill effect color in AE updates to red
- [ ] Disconnect the data wire — Fill's color param unlocks in inspector
- [ ] Fill reverts to its own stored color in AE on next flush

### C4. Number wire — Number → Fill opacity
- [ ] Wire Number node output → Fill node's next newborn extendable slot
- [ ] Picker shows params matching `number` type: `opacity`, `blendingMode`
- [ ] Select `opacity`
- [ ] Number value `0` → Fill opacity in AE is 0 (invisible)
- [ ] Change Number value to `75` → Fill opacity in AE updates to 75

### C5. Parent wire — Text `child_of` → Null `parent_of`
First wire Null node to Comp (Null goes alive, AE null layer created).
- [ ] Drag from Text node's `child_of` port (top edge, green square)
- [ ] Valid target: Null node's `parent_of` port (bottom edge)
- [ ] Drop: green dashed parent wire appears
- [ ] AE: text layer parent set to null layer (`textLayer.parent === nullLayer`)
- [ ] Verify in AE: moving the null layer moves the text layer

### C6. Wire validation
- [ ] Cannot wire output → output (same port direction)
- [ ] Cannot wire a node to itself (self-wire rejected)
- [ ] Cannot create a cycle: if A→B→C exists, wiring C→A is rejected
- [ ] Cannot wire layer wire to a data port
- [ ] Cannot create duplicate wire (same from/to/port combination rejected)
- [ ] Parent wire rejected between nodes in different comps

### C7. Reroute
- [ ] Mousedown on an occupied input port starts a reroute
- [ ] Existing wire is tentatively removed, drag starts from original source
- [ ] Drop on a new valid target: new wire created, old wire gone
- [ ] Drop on empty canvas: cancels, original wire restored

---

## SECTION D — Ghost Cascade

### D1. Single-node cascade
- [ ] Wire Text → Comp (Text alive, text layer in AE)
- [ ] Disconnect the wire (remove from Text output port)
- [ ] Text node goes ghost immediately
- [ ] AE: text layer moves from comp to Reserved Comp
- [ ] Text layer `.comment` still equals Text UUID in Reserved Comp (keyframes preserved)
- [ ] Reconnect Text → Comp: text layer returns from Reserved Comp to comp

### D2. Multi-node cascade
With chain: Null → Text → Fill → GaussianBlur → Comp:
- [ ] All nodes alive
- [ ] Disconnect Gaussian Blur output → Comp wire
- [ ] Cascade order: GaussianBlur ghosts first (effect stripped), Fill ghosts second, Text ghosts third, Null ghosts last
- [ ] AE: all effects stripped from text layer before parking
- [ ] Text layer in Reserved Comp has no effects attached
- [ ] Null layer in Reserved Comp
- [ ] Comp node remains alive

### D3. Multi-comp alive
Drop a second Comp node. Wire Text → Comp1 AND Text → Comp2.
- [ ] Text node shows `alive` in both comps
- [ ] `nodeData.hostingComps` has two entries (verify in browser console)
- [ ] AE: text layer appears in BOTH comp timelines
- [ ] Disconnect Text → Comp1 wire only
- [ ] Text node remains alive (still connected to Comp2)
- [ ] AE: text layer removed from Comp1 timeline only, still in Comp2
- [ ] Disconnect Text → Comp2 wire
- [ ] Text node goes ghost — parks in Reserved Comp

### D4. Parent wire cascade behavior
- [ ] Disconnecting a parent wire does NOT trigger ghost cascade
- [ ] Only the AE `layer.parent` is cleared
- [ ] Both nodes remain in their alive state

---

## SECTION E — Inspector and Property Changes

### E1. String param update
- [ ] Select Text node. Change `label` in inspector.
- [ ] After 300ms: AE text layer name updates to match
- [ ] Change `content`. After 300ms: AE text layer content updates.

### E2. Number param update
- [ ] Change `fontSize` to 144. After 300ms: text layer font size in AE updates.
- [ ] Change `opacity` to 50. After 300ms: text layer opacity in AE is 50.

### E3. Vector2 param update
- [ ] Change `position` to `[500, 300]`. After 300ms: text layer position in AE updates.

### E4. Color param update
- [ ] Select Fill effect node. Change `color` to blue.
- [ ] After 300ms: Fill effect color in AE updates to blue.

### E5. Wired param is readonly
- [ ] Wire Color → Fill color param (via picker).
- [ ] In inspector: Fill's `color` field shows `is-wired` class (yellow, readonly).
- [ ] Attempting to type in the field has no effect (readonly).

### E6. Comp params
- [ ] Select Comp node. Change `width` to `2560`, `height` to `1440`.
- [ ] After 300ms: comp dimensions in AE update.
- [ ] Change `fps` to `30`. After 300ms: comp frame rate updates.
- [ ] Change `bgColor` to red `[1,0,0]`. After 300ms: comp background color updates.

### E7. Ghost node — no flush
- [ ] Select a ghost node. Change a param in inspector.
- [ ] Verify no `evalBridge.dispatch` call fires (check console — no `[evalBridge] dispatch:` log for this change).

---

## SECTION F — Deletion

### F1. Delete ghost node
- [ ] Select a ghost Text node. Press Delete.
- [ ] Node removed from canvas and `nodeMap`.
- [ ] No AE errors — parked layer in Reserved Comp is removed.
- [ ] Inspector clears to empty state.
- [ ] Minimap updates.

### F2. Delete alive node
- [ ] Wire Text → Comp. Text is alive.
- [ ] Select Text. Press Delete.
- [ ] Node goes ghost first (layer parks in Reserved Comp).
- [ ] Then layer deleted from Reserved Comp.
- [ ] Node removed from canvas, `nodeMap`, and `wireMap`.
- [ ] Wire removed from canvas.

### F3. Delete node with effectors
With chain: Text → Fill → Comp (Text and Fill alive):
- [ ] Delete Text node.
- [ ] Cascade: Fill ghosts first (effect stripped), Text parks, Text parked layer deleted.
- [ ] AE: Fill effect removed, text layer gone.
- [ ] Both nodes and both wires removed from canvas.

### F4. Delete via keyboard
- [ ] Select node → Delete key: node deleted.
- [ ] Select node → Backspace key: node deleted.
- [ ] Select node → click into inspector text field → Delete key: does NOT delete node (typing).
- [ ] Press Escape: node deselected (inspector clears), node not deleted.

### F5. Delete selected wire
- [ ] Click a wire path to select it (thicker stroke visible).
- [ ] Press Delete: wire removed, cascade runs if layer wire.
- [ ] Click wire again to deselect.

---

## SECTION G — Layer Order List

### G1. Layer order list renders
- [ ] Wire Text, Null, Shape to Comp (all alive).
- [ ] Select Comp node.
- [ ] Inspector shows comp params AND `LAYER ORDER` section below a divider.
- [ ] Three rows visible: one per alive layer wired to comp.
- [ ] Rows show correct node labels.
- [ ] Each row has a colored category dot.

### G2. Drag to reorder
- [ ] Drag the bottom row to the top.
- [ ] Rows reorder visually in inspector.
- [ ] AE: layer stacking order updates immediately.
- [ ] Drag back: AE reverts.

### G3. Dynamic list update
- [ ] Wire a fourth layer (Adjustment) to comp.
- [ ] Comp still selected: layer order list automatically shows 4 rows.
- [ ] Unwire one layer: list drops to 3 rows.
- [ ] Ghost nodes not shown in list.

---

## SECTION H — Persistence

### H1. Save and reload
- [ ] Build a graph: Comp → Text (alive), Fill effect on Text, Color → Fill color.
- [ ] Press Cmd/Ctrl+S in AE to save.
- [ ] Console shows `[Procedia] Graph saved.`
- [ ] Close the panel (Window → Extensions → Procedia).
- [ ] Reopen the panel.
- [ ] Console shows `[Procedia] Graph loaded. N nodes, N wires.`
- [ ] Graph is fully restored — all nodes, wires, and states correct.
- [ ] AE layers match the restored graph (text layer in comp, Fill effect on layer).

### H2. Large graph chunking
- [ ] Create 30+ nodes (repeat drop/wire cycle).
- [ ] Save (Cmd+S).
- [ ] Verify Reserved Comp contains chunked persistence layers if graph JSON exceeds 25,000 chars.
  (Check Reserved Comp in AE project panel for `__PROCEDIA_NODES_1__`, `__PROCEDIA_NODES_2__`, etc.)
- [ ] Reload panel: all 30+ nodes restored correctly.

### H3. Corrupt data recovery
- [ ] Open the Reserved Comp in AE. Find `__PROCEDIA_NODES__` text layer.
- [ ] Manually edit its text to invalid JSON (e.g. delete a brace).
- [ ] Save the AE project.
- [ ] Close and reopen the Procedia panel.
- [ ] Notification bar shows: `Could not read saved graph. Starting fresh.`
- [ ] Panel starts with empty graph — no crash, no console errors beyond the notification.

---

## SECTION I — Polling and Error State

### I1. Missing layer detection
- [ ] Wire Text → Comp. Text is alive.
- [ ] In AE, manually delete the text layer from the comp timeline.
- [ ] Within 1–5 seconds (one poll tick): Text node card shows error state (red pulsing border).
- [ ] Notification bar shows error card for the Text node.

### I2. Re-create in AE
- [ ] Click `Re-create in AE` on the notification card.
- [ ] Text layer reappears in AE comp with the same properties.
- [ ] Text node returns to `alive` state.
- [ ] Notification card dismissed.

### I3. Remove from Graph
- [ ] Trigger error state again (delete layer in AE).
- [ ] Click `Remove from Graph` on the notification card.
- [ ] Text node removed from canvas and `nodeMap`.
- [ ] Wire removed from canvas and `wireMap`.
- [ ] Inspector clears.
- [ ] Notification card dismissed.
- [ ] No AE errors.

### I4. Polling pauses during writes
- [ ] Perform a heavy cascade (disconnect a chain of 5+ nodes).
- [ ] No poll tick fires during the cascade (console shows no `[poller]` logs during `[evalBridge] dispatch:` logs).
- [ ] Poll resumes after cascade completes.

---

## SECTION J — Minimap

### J1. Visual accuracy
- [ ] All alive nodes appear as green rectangles in minimap.
- [ ] All ghost nodes appear as gray dimmed rectangles.
- [ ] Error nodes appear as red rectangles.
- [ ] Selected node has blue outline in minimap.
- [ ] White viewport rectangle shows current visible area.

### J2. Navigation
- [ ] Pan the canvas: viewport rectangle moves within minimap.
- [ ] Zoom the canvas: viewport rectangle grows/shrinks.
- [ ] Click minimap: main canvas pans to center on clicked point.
- [ ] Drag on minimap: canvas pans continuously.
- [ ] Minimap click does not deselect the current node.

### J3. Dynamic updates
- [ ] Drop a new node: minimap shows it immediately.
- [ ] Delete a node: minimap removes it immediately.
- [ ] Wire a node (alive state change): minimap color updates.

---

## SECTION K — Canvas Navigation

### K1. Pan
- [ ] Middle mouse button drag: canvas pans.
- [ ] Space + left mouse drag: canvas pans.
- [ ] Node positions in canvas space remain correct after panning.

### K2. Zoom
- [ ] Scroll wheel up: zooms in, centered on mouse cursor.
- [ ] Scroll wheel down: zooms out, centered on mouse cursor.
- [ ] Zooming beyond 400% is clamped.
- [ ] Zooming below 10% is clamped.
- [ ] Node drag still works correctly at non-100% zoom.
- [ ] Wire drawing still works correctly at non-100% zoom.
- [ ] Port hit detection still correct after zoom.

---

## SECTION L — Expression Node

### L1. Basic application
- [ ] Wire Expression → Text → Comp. Expression node goes alive.
- [ ] Default expression `value` applied to `ADBE Opacity` — no visible change.
- [ ] In AE expression editor: expression reads `// PROC:{uuid}\nvalue`.

### L2. Expression update
- [ ] Change `expression` to `wiggle(2, 10)` in inspector.
- [ ] After 300ms: Opacity wiggles in AE preview.

### L3. Target property change
- [ ] Change `targetProperty` to `ADBE Rotate Z`.
- [ ] After 300ms: Opacity expression removed, Rotation now has `wiggle(2, 10)`.
- [ ] Layer rotates in AE preview.

### L4. Lifecycle
- [ ] Disconnect Expression wire: expression removed from layer.
- [ ] Reconnect: expression re-applied.
- [ ] Delete Expression node: expression removed, no AE errors.

---

## SECTION M — Pre-Comp (CompNode inside CompNode)

### M1. CompNode as pre-comp layer
- [ ] Create two Comp nodes: Comp A and Comp B.
- [ ] Wire Comp A output → Comp B `layer_in`.
- [ ] Comp A appears as a pre-comp layer inside Comp B in AE.
- [ ] Comp A's `child_of` port is usable (can parent to layers inside Comp B).

### M2. Pre-comp ghost
- [ ] Disconnect Comp A → Comp B wire.
- [ ] Comp A's pre-comp layer moves to Reserved Comp.
- [ ] Comp A's `CompItem` still exists in project panel.
- [ ] Reconnect: Comp A returns to Comp B as a pre-comp layer.

### M3. No-loop enforcement
- [ ] Try to wire Comp B output → Comp A input (would create a cycle).
- [ ] Wire is rejected (cycle checker fires).
- [ ] No AE error.

---

## SECTION N — Full Workflow Integration Test

Build a complete, non-trivial scene graph and verify end-to-end integrity.

**Scene graph to build:**
```
ColorNode (red) ──────────────────────────────┐
                                              ▼
NullNode ──────────> TextNode ──> FillEffect ──> GaussianBlur ──> CompNode (Main)
   ↑ parent_of          ↑
   │                    child_of
   └──────────────── AdjustmentNode ──> CompNode (Main)
                                                          ↑
NumberNode (50) ──> (opacity param of GaussianBlur)       │
ExpressionNode ──> TextNode (wiggle rotation)             │
ShapeNode ──────────────────────────────────────────────> │
```

Steps:
1. Build the graph above step by step
2. Verify all nodes alive, all AE objects created correctly
3. Verify parent wire (Null → Text child_of) sets AE layer parent
4. Verify data wires (Color → Fill, Number → GaussianBlur opacity) drive AE properties
5. Verify expression on Text (rotation wiggle)
6. Save (Cmd+S) — graph saved
7. Close and reopen panel — full graph restored
8. Disconnect GaussianBlur → Comp wire
9. Cascade: Expression ghosts, GaussianBlur ghosts, Fill ghosts, Text parks, AdjustmentLayer parks — all in correct order
10. Comp and Null remain alive
11. Reconnect — full graph restores from Reserved Comp

**Checklist:**
- [ ] Steps 1–5: all nodes alive, all AE objects correct
- [ ] Step 6–7: full graph persists across panel close/reopen
- [ ] Steps 8–10: cascade in correct order, all effects stripped before parking
- [ ] Step 11: full restore — all layers return, all effects reapply

---

## SECTION O — Performance and Stability

### O1. Rapid interactions
- [ ] Drop 20 nodes in rapid succession — no console errors, no frozen panel
- [ ] Wire and unwire 10 times in quick succession — cascade handles each correctly
- [ ] Change inspector params rapidly (type fast) — debounce fires only once per burst

### O2. Memory
- [ ] After 30 minutes of use: panel has not slowed noticeably
- [ ] Browser DevTools memory snapshot shows no obvious leaks (heap size stable after repeated node add/delete cycles)

### O3. AE focus requirement
- [ ] Trigger a cascade while AE does not have window focus
- [ ] Click AE window to give it focus
- [ ] Pending `evalScript` callbacks fire and state updates resolve correctly

---

## Failure Recording Template

For each failed check, record:

```
Section: [letter+number, e.g. C3]
Step:    [exact text of the failing checklist item]
Expected: [what should have happened]
Actual:   [what actually happened]
Console:  [paste relevant console output]
```

---

## QA Pass Criteria

**All sections must pass.** There are no optional sections.

A section passes when every checklist item within it is checked.

If any item fails, record it using the template above and continue the full protocol. Do not stop at the first failure.

After completing the protocol, fix all recorded failures and re-run only the sections that had failures. Re-run in full if any fix touches `engine.js`, `cascadeAlgorithm.js`, `graphState.js`, or `dispatcher.jsx`.

---

## On Completion

When all sections pass with zero failures, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-21 COMPLETE — QA PROTOCOL PASSED

Sections A through O: all items passed.
Zero failures recorded.

Procedia v4 is complete.

  11 node types implemented and verified.
  3 wire types verified (layer, data, parent).
  Full persistence cycle verified.
  Error state and recovery verified.
  Expression engine verified.
  Pre-comp hosting verified.
  Minimap and canvas navigation verified.
  Layer order reorder verified.

─────────────────────────────────────────────────────────
```

If any failures remain after re-runs, list them explicitly before the completion block.

---

*TASK-21-QA-PROTOCOL.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md (all), PROCEDIA-V4-ARCHITECTURE.md (all)*
*This is the final task. No brief follows.*
