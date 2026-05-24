# BRIEF-SETTINGS-WIRE
*Procedia v4 — Wire Style Setting Integration*
*Depends on: BRIEF-SETTINGS-MODAL passing all verification checks*

---

## What This Brief Covers

Make `wireRenderer.js` read `settings.get('wireStyle')` on every draw call and route to the correct geometry for each style. The three confirmed wires in `drawAll()` and the drag preview are both affected. No new files. One file edited: `graph/Wire/wireRenderer.js`.

**Wire styles to implement:**

| Value | Name | Geometry |
|---|---|---|
| `'bezier'` | Bezier | Current S-curve — unchanged |
| `'direct'` | Direct | Single straight `lineTo()` — diagonal, like DaVinci Resolve |
| `'stepped'` | Stepped | Three segments: vertical → horizontal → vertical, 90° only |

---

## Geometry — Precise Rules Per Style

### `'bezier'` — no change

Existing `drawBezier()` call. Control point logic (`calcCpOffset`, `calcHorizCpOffset`) is untouched. This is the current behavior, preserved exactly.

### `'direct'` — straight diagonal line

One `moveTo` → one `lineTo`. No control points. No curves.

```
from ●─────────────────────────● to
       (pure diagonal if needed)
```

Path construction:
```javascript
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
```

Dash animation: same `lineDashOffset` mechanic as bezier — wires still animate. Only the path shape changes.

### `'stepped'` — Manhattan routing, 90° angles

Three segments. Always: **down from source → horizontal across midpoint → up to target.**

```
  ● (from — output port, bottom of node)
  │  ↓ segment A: vertical, half the vertical distance
  │
  └──────────────┐  ↔ segment B: horizontal, full width
                 │
                 │  ↓ segment C: vertical, remaining half
                 ● (to — input port, top of node)
```

Midpoint Y: `var midY = y1 + (y2 - y1) / 2`

Path construction:
```javascript
ctx.moveTo(x1, y1);
ctx.lineTo(x1, midY);   // segment A — straight down
ctx.lineTo(x2, midY);   // segment B — straight across
ctx.lineTo(x2, y2);     // segment C — straight to target
```

**Edge case — nodes at same Y (horizontal alignment):** midY equals y1 equals y2. The path degenerates to two segments (A collapses to zero length, B is the full horizontal span, C collapses). This is visually correct — a single horizontal line — and requires no special handling.

**Edge case — from is below to (wire going upward):** midY is above y1. Segment A goes up, segment B crosses, segment C continues up. The formula `y1 + (y2 - y1) / 2` handles this correctly with no sign logic needed.

**Parent wires (horizontal orientation):** Parent wires use `calcHorizCpOffset` for bezier. For `direct` and `stepped`, parent wires use the **same geometry as layer wires** — no special casing. Parent wires are horizontal bezier curves today only because bezier control points are horizontal. A `direct` parent wire is just a diagonal line. A `stepped` parent wire is a standard vertical-then-horizontal-then-vertical Manhattan path.

---

## Implementation Plan

### Step 1 — Add `drawDirect` function

Private function, parallel to `drawBezier`. Same signature shape.

```javascript
function drawDirect(ctx, x1, y1, x2, y2, color, lineWidth, dashOffset) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle    = color;
  ctx.lineWidth      = lineWidth;
  ctx.setLineDash([WIRE_DASH_LENGTH, WIRE_GAP_LENGTH]);
  ctx.lineDashOffset = dashOffset;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
```

### Step 2 — Add `drawStepped` function

```javascript
function drawStepped(ctx, x1, y1, x2, y2, color, lineWidth, dashOffset) {
  var midY = y1 + (y2 - y1) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1, midY);
  ctx.lineTo(x2, midY);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle    = color;
  ctx.lineWidth      = lineWidth;
  ctx.setLineDash([WIRE_DASH_LENGTH, WIRE_GAP_LENGTH]);
  ctx.lineDashOffset = dashOffset;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
```

### Step 3 — Add `dispatchWireDraw` router

One private function that reads the setting and calls the correct draw function. Called everywhere a wire segment is drawn — replaces every direct `drawBezier` call in the confirmed-wire loop.

```javascript
function dispatchWireDraw(ctx, x1, y1, x2, y2, color, lineWidth, dashOffset) {
  var style = settings.get('wireStyle') || 'bezier';
  if (style === 'direct') {
    drawDirect(ctx, x1, y1, x2, y2, color, lineWidth, dashOffset);
  } else if (style === 'stepped') {
    drawStepped(ctx, x1, y1, x2, y2, color, lineWidth, dashOffset);
  } else {
    // 'bezier' — default. cpOffset is computed by caller before this call.
    // For bezier we still need cpOffset — see note below.
    drawBezier(ctx, x1, y1, x2, y2, _lastCpOffset, color, lineWidth, dashOffset, _lastIsHorizontal);
  }
}
```

**Note on bezier + router:** `drawBezier` needs `cpOffset` and `horizontal` — values that `dispatchWireDraw` doesn't carry. Rather than threading these through the router for a value only bezier needs, keep the existing `drawBezier` calls intact for the bezier path and only use `dispatchWireDraw` for `direct` and `stepped`. The cleanest approach:

**Replace each `drawBezier(...)` call site in `drawAll()` with an inline branch:**

```javascript
var style = settings.get('wireStyle') || 'bezier';
if (style === 'direct') {
  drawDirect(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, color, lineWidth, w.dashOffset || 0);
} else if (style === 'stepped') {
  drawStepped(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, color, lineWidth, w.dashOffset || 0);
} else {
  var cpOffset = isParentWire
    ? calcHorizCpOffset(fromPos.x, toPos.x, transform.scale)
    : calcCpOffset(fromPos.y, toPos.y, transform.scale);
  drawBezier(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, cpOffset, color, lineWidth, w.dashOffset || 0, isParentWire);
}
```

This inline branch replaces the current two separate `if (isParentWire) { drawBezier... } else { drawBezier... }` blocks. The shadow/glow for selected wires (`ctx.save(); ctx.shadowColor...`) wraps the entire branch — not just the bezier path.

### Step 4 — Update the drag preview

The in-progress drag preview wire (bottom of `drawAll`, uses `drawBezier` with static `dashOffset = 0`) also switches style. Same inline branch, `dashOffset` always `0` (preview wires don't animate):

```javascript
var style = settings.get('wireStyle') || 'bezier';
if (style === 'direct') {
  drawDirect(ctx, dragFrom.x, dragFrom.y, d.cursorX, d.cursorY, previewColor, 1.5, 0);
} else if (style === 'stepped') {
  drawStepped(ctx, dragFrom.x, dragFrom.y, d.cursorX, d.cursorY, previewColor, 1.5, 0);
} else {
  if (isParentDrag) {
    var cpOffset = calcHorizCpOffset(dragFrom.x, d.cursorX, transform.scale);
    drawBezier(ctx, dragFrom.x, dragFrom.y, d.cursorX, d.cursorY, cpOffset, previewColor, 1.5, 0, true);
  } else {
    var cpOffset = calcCpOffset(dragFrom.y, d.cursorY, transform.scale);
    drawBezier(ctx, dragFrom.x, dragFrom.y, d.cursorX, d.cursorY, cpOffset, previewColor, 1.5, 0, false);
  }
}
```

### Step 5 — Update the public `drawWire` function

`drawWire(ctx, fromX, fromY, toX, toY, wireType, isPreview)` is the single-wire draw used by the auto-wire suggestion feature. Apply the same inline branch:

```javascript
function drawWire(ctx, fromX, fromY, toX, toY, wireType, isPreview) {
  var color     = isPreview ? '#666666' : '#888888';
  var style     = settings.get('wireStyle') || 'bezier';

  if (style === 'direct') {
    drawDirect(ctx, fromX, fromY, toX, toY, color, 1.5, 0);
  } else if (style === 'stepped') {
    drawStepped(ctx, fromX, fromY, toX, toY, color, 1.5, 0);
  } else {
    var horizontal = (wireType === 'parent');
    if (horizontal) {
      var cpOffset = calcHorizCpOffset(fromX, toX, 1);
      drawBezier(ctx, fromX, fromY, toX, toY, cpOffset, color, 1.5, 0, true);
    } else {
      var cpOffset = calcCpOffset(fromY, toY, 1);
      drawBezier(ctx, fromX, fromY, toX, toY, cpOffset, color, 1.5, 0, false);
    }
  }
}
```

---

## Wire Hit Testing — No Change

`hitTestNearest()` samples bezier curves. For `direct` and `stepped`, the bezier samples diverge from the actual line, meaning the click target won't precisely match the visible wire.

**Decision: do not update hit testing in this brief.**

Reason: hit testing is good enough for `direct` (a line is mostly inside the bezier sample cloud), and for `stepped` the discrepancy is minor at practical zoom levels. A precise hit test for stepped wires (sampling three line segments) is a separate, scoped improvement. It does not block this feature.

---

## Files Summary

| Action | File |
|---|---|
| **Edit** | `graph/Wire/wireRenderer.js` |

No other files are touched. `settings.js` already exists after BRIEF-SETTINGS-MODAL. `renderer.js` is untouched — it calls `wireRenderer.drawAll()` which now internally reads the setting. The render loop picks up style changes on the next frame automatically.

---

## Verification Checklist

- [ ] Panel loads without console errors
- [ ] Default state (Bezier): all wires render exactly as before — no visual regression
- [ ] Open Settings modal → change Style to **Direct** → wires on canvas immediately switch to straight diagonal lines without reopening or refreshing
- [ ] Open Settings modal → change Style to **Stepped** → wires immediately switch to 90° Manhattan routing (vertical → horizontal → vertical)
- [ ] Switch back to **Bezier** → wires return to S-curve exactly as before
- [ ] Drag a new wire while Style = Direct → preview wire is a straight diagonal
- [ ] Drag a new wire while Style = Stepped → preview wire is stepped
- [ ] Dash animation continues correctly in all three modes (wires still flow/animate)
- [ ] Selected wire glow/shadow renders correctly in all three modes
- [ ] Parent wires (green, parenting relationship) also switch style correctly
- [ ] Error wires (red) also switch style correctly
- [ ] Setting persists across panel reload — set to Stepped, reload, wires still render as Stepped
- [ ] `wireRenderer.js` dependency header updated to include `ui/settings.js`
- [ ] No changes to `renderer.js`, `minimap.js`, `wire.js`, or any node file

**STOP. Do not proceed to BRIEF-SETTINGS-MINIMAP until every checkbox above is confirmed.**
