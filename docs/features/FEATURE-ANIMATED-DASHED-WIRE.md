# FEATURE — Animated Dashed Wire
*Procedia v2 · UI Enhancement · CEP · Canvas 2D API · No ExtendScript*
*Last updated: May 2026*

---

## What This Feature Does

All confirmed wires render as animated dashed bezier curves. The dash pattern flows continuously from the output port toward the input port, simulating data flow. The animation is driven by the existing `requestAnimationFrame` draw loop — no new loop is introduced.

---

## Behaviour Contract

- Every **confirmed** wire is drawn with a dashed stroke and an animated offset
- Dashes flow in one direction only: **output port → input port**, regardless of wire type (`layer` or `data`)
- The **preview wire** (wire being dragged, not yet committed) uses dashes but with **no animation** — static offset, visually distinct from confirmed wires
- **Selected wires** use the same dash animation but with a brighter stroke color and slightly thicker line weight
- **Wires connected to a node in `error` state** render with a red-tinted stroke — same dash animation, different color
- `dashOffset` wraps to prevent float drift over long sessions
- Animation must pause when `isWriting` flag is true in `poller.js` (heavy AE write in progress)

---

## Algorithm

```
SETUP (one time, on wire creation):
  → graphState.addWire() sets wire.dashOffset = 0 on every new wire object

EACH FRAME (in renderer.js draw loop):
  → For each wire in graphState.wireMap:
      wire.dashOffset -= DASH_SPEED
      wrap: wire.dashOffset = wire.dashOffset % DASH_CYCLE_LENGTH
      (DASH_CYCLE_LENGTH = dashLength + gapLength = 8 + 6 = 14)

DRAW EACH WIRE (in wireRenderer.drawWire()):
  → ctx.save()
  → Determine stroke color based on wire state:
      default:  '#888'
      selected: '#fff'
      error:    '#e05555'
  → Determine line width:
      default:  1.5px
      selected: 2.5px
  → ctx.strokeStyle = color
  → ctx.lineWidth   = width
  → ctx.setLineDash([8, 6])
  → ctx.lineDashOffset = wire.dashOffset   ← animated each frame
  → draw bezier path (existing path logic unchanged)
  → ctx.stroke()
  → ctx.setLineDash([])   ← reset dash for subsequent draws
  → ctx.restore()

PREVIEW WIRE (dragging, not committed):
  → Same setLineDash([8, 6]) but lineDashOffset = 0 (static)
  → Slightly dimmer color: '#666'
  → No dashOffset stored — preview wire has no wireMap entry
```

---

## Constants

Define at the top of `wireRenderer.js`:

```javascript
var WIRE_DASH_LENGTH  = 8;    // px — length of each dash
var WIRE_GAP_LENGTH   = 6;    // px — length of each gap
var WIRE_DASH_SPEED   = 0.4;  // offset units per frame (~24fps in CEP)
var WIRE_DASH_CYCLE   = WIRE_DASH_LENGTH + WIRE_GAP_LENGTH; // 14 — wrap modulo
```

`WIRE_DASH_SPEED` of 0.4 at ~60fps gives a comfortable flow rate. Adjust if the panel renders at a different cadence.

---

## Files to Modify

### `graph/Wire/wireRenderer.js`

This is the primary change file. Two functions are affected.

**`drawWire(ctx, wire, viewport)`** — confirmed wire draw:

```javascript
function drawWire(ctx, wire, viewport) {
  var from  = getPortScreenPosition(wire.fromNode, 'output', viewport);
  var to    = getPortScreenPosition(wire.toNode, wire.toPort, viewport);

  // ... existing bezier control point calculation (unchanged) ...

  var color     = getWireColor(wire);   // new helper — see below
  var lineWidth = wire.selected ? 2.5 : 1.5;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, to.x, to.y);
  ctx.strokeStyle    = color;
  ctx.lineWidth      = lineWidth;
  ctx.setLineDash([WIRE_DASH_LENGTH, WIRE_GAP_LENGTH]);
  ctx.lineDashOffset = wire.dashOffset || 0;
  ctx.stroke();
  ctx.setLineDash([]);  // always reset
  ctx.restore();
}
```

**`drawPreviewWire(ctx, fromPos, toPos)`** — dragging wire:

```javascript
function drawPreviewWire(ctx, fromPos, toPos) {
  // ... existing bezier control point calculation (unchanged) ...

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(fromPos.x, fromPos.y);
  ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, toPos.x, toPos.y);
  ctx.strokeStyle    = '#666';
  ctx.lineWidth      = 1.5;
  ctx.setLineDash([WIRE_DASH_LENGTH, WIRE_GAP_LENGTH]);
  ctx.lineDashOffset = 0;   // static — no animation
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
```

**New helper — `getWireColor(wire)`:**

```javascript
function getWireColor(wire) {
  if (wire.error)    return '#e05555';
  if (wire.selected) return '#ffffff';
  return '#888888';
}
```

`wire.error` is true when either the fromNode or toNode has state `'error'`. Compute this in `renderer.js` when updating wire state each frame, and store `wire.error = (fromNode.state === 'error' || toNode.state === 'error')`.

### `graph/canvas/renderer.js`

Add `dashOffset` update to the draw loop, **before** wires are drawn.

```javascript
function drawFrame() {
  // ... clear canvas, draw grid (unchanged) ...

  // Update wire dash offsets — runs every frame
  if (!poller.isWriting()) {
    var wires = graphState.getAllWires();
    for (var i = 0; i < wires.length; i++) {
      var w = wires[i];
      w.dashOffset = (w.dashOffset || 0) - WIRE_DASH_SPEED;
      // wrap to prevent float drift
      w.dashOffset = w.dashOffset % WIRE_DASH_CYCLE;
    }
  }

  // ... draw wires, draw nodes (unchanged order) ...
}
```

`WIRE_DASH_SPEED` and `WIRE_DASH_CYCLE` should be imported from `wireRenderer.js` or defined as shared constants in a constants file. Do not duplicate the values.

### `graph/graphState.js`

In `addWire()`, initialise `dashOffset` on the wire object:

```javascript
function addWire(config) {
  var wire = {
    id:       generateWireId(),
    fromNode: config.fromNode,
    fromPort: config.fromPort,
    toNode:   config.toNode,
    toPort:   config.toPort,
    selected: false,
    error:    false,
    dashOffset: 0      // ← new field
  };
  wireMap[wire.id] = wire;
  // ... rest of existing addWire logic ...
}
```

On crash recovery (`readDataWire()` rehydration): set `dashOffset: 0` for all reconstructed wires. It's a runtime-only field — never persisted to `dataWire` JSON.

---

## What Does NOT Change

- Bezier control point calculation — untouched
- Wire hit detection (click to select a wire) — untouched
- Port rendering — untouched
- Node rendering — untouched
- The draw loop's `requestAnimationFrame` structure — untouched

---

## Verification Checklist

- [ ] All confirmed wires display as dashed lines (not solid)
- [ ] Dashes animate continuously — flowing from output port toward input port
- [ ] Animation direction is consistent across all wire types (layer and data)
- [ ] The preview wire (mid-drag) shows static dashes — no movement
- [ ] Selected wires are brighter/thicker but retain the same animation
- [ ] Wires connected to an error-state node render with red-tinted dashes
- [ ] No float drift after leaving the panel open for 10+ minutes (wrap is working)
- [ ] Frame rate is not visibly degraded with 10+ wires on canvas
- [ ] Animation pauses when `poller.isWriting()` returns true
- [ ] On crash recovery, reconstructed wires animate correctly from dashOffset 0
- [ ] `ctx.setLineDash([])` is called after every wire draw (no bleed to port/node draws)

---

## Rules

- `WIRE_DASH_SPEED`, `WIRE_DASH_LENGTH`, `WIRE_GAP_LENGTH`, `WIRE_DASH_CYCLE` must be defined **once** — not duplicated across files
- `dashOffset` is a **runtime-only field** — never written to `dataWire` JSON, never sent to ExtendScript
- `ctx.setLineDash([])` must be called after every `ctx.stroke()` that uses a dash pattern — failure to reset causes all subsequent canvas draws (grid, nodes, ports) to inherit the dash setting
- Do not introduce a second `requestAnimationFrame` loop — piggyback on the existing one in `renderer.js`
- No `const`, `let`, or arrow functions — keep consistent with the codebase

---

*FEATURE-ANIMATED-DASHED-WIRE.md — Procedia v2 — May 2026*
