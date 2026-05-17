// graph/Wire/wireRenderer.js
// DEPENDS ON: graph/graphState/store.js, graph/nodes/nodeGeometry.js, graph/Wire/nodeState.js, graph/Wire/wire.js
// MUST LOAD BEFORE: graph/canvas/renderer.js

var wireRenderer = (function() {

  var WIRE_DASH_LENGTH = 8;
  var WIRE_GAP_LENGTH  = 6;
  var WIRE_DASH_SPEED  = 0.4;
  var WIRE_DASH_CYCLE  = WIRE_DASH_LENGTH + WIRE_GAP_LENGTH; // 14

  // Vertical cpOffset: proportional to vertical distance, clamped 12–80px screen.
  function calcCpOffset(y1, y2, scale) {
    var dy = Math.abs(y2 - y1);
    return Math.max(12 * scale, Math.min(80 * scale, dy * 0.45));
  }

  // Horizontal cpOffset for parent/child wires, clamped 20–100px screen.
  function calcHorizCpOffset(x1, x2, scale) {
    var dx = Math.abs(x2 - x1);
    return Math.max(20 * scale, Math.min(100 * scale, dx * 0.45));
  }

  function getWireColor(wire) {
    if (wire.error)             return '#e05555';
    if (wire.selected)          return '#ffffff';
    if (wire.type === 'parent') return '#c8922a';
    return '#888888';
  }

  // ─── Bezier draw ──────────────────────────────────────────────
  // horizontal=true  → S-curve left/right  (parent wires)
  // horizontal=false → S-curve up/down     (layer/data wires)

  function drawBezier(ctx, x1, y1, x2, y2, cpOffset, color, lineWidth, dashOffset, horizontal) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    if (horizontal) {
      ctx.bezierCurveTo(x1 + cpOffset, y1, x2 - cpOffset, y2, x2, y2);
    } else {
      ctx.bezierCurveTo(x1, y1 + cpOffset, x2, y2 - cpOffset, x2, y2);
    }
    ctx.strokeStyle    = color;
    ctx.lineWidth      = lineWidth;
    ctx.setLineDash([WIRE_DASH_LENGTH, WIRE_GAP_LENGTH]);
    ctx.lineDashOffset = dashOffset;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ─── Wire hit test ────────────────────────────────────────────
  // Samples bezier at 20 steps. Returns wireId if within 6px, else null.

  function hitTestNearest(screenX, screenY, transform) {
    var HIT_R_SQ = 6 * 6;
    var STEPS    = 20;
    var allWires = graphState.getAllWires();
    var allNodes = graphState.getAllNodes();

    for (var wid in allWires) {
      if (!allWires.hasOwnProperty(wid)) continue;
      var w        = allWires[wid];
      var fromNode = allNodes[w.fromNode];
      var toNode   = allNodes[w.toNode];
      if (!fromNode || !toNode) continue;

      var isParentWire = (w.type === 'parent' || w.fromPort === 'child_out');
      var fromPos = null;
      var toPos   = null;

      if (isParentWire) {
        fromPos = nodeGeometry.childOutPortPosition(fromNode, transform);
        toPos   = nodeGeometry.parentInPortPosition(toNode, transform);
      } else {
        var htOutPorts = nodeGeometry.outputPortPositions(fromNode, transform);
        for (var hfp = 0; hfp < htOutPorts.length; hfp++) {
          if (htOutPorts[hfp].port === (w.fromPort || 'output')) { fromPos = htOutPorts[hfp]; break; }
        }
        if (!fromPos && htOutPorts.length > 0) fromPos = htOutPorts[0];

        var inPorts = nodeGeometry.inputPortPositions(toNode, transform);
        for (var hi = 0; hi < inPorts.length; hi++) {
          if (inPorts[hi].port === w.toPort) { toPos = inPorts[hi]; break; }
        }
      }
      if (!fromPos || !toPos) continue;

      var x0, y0, x1, y1, x2, y2, x3, y3;
      x0 = fromPos.x; y0 = fromPos.y;
      x3 = toPos.x;   y3 = toPos.y;

      if (isParentWire) {
        var hcp = calcHorizCpOffset(x0, x3, transform.scale);
        x1 = x0 + hcp; y1 = y0;
        x2 = x3 - hcp; y2 = y3;
      } else {
        var vcp = calcCpOffset(y0, y3, transform.scale);
        x1 = x0; y1 = y0 + vcp;
        x2 = x3; y2 = y3 - vcp;
      }

      for (var s = 0; s <= STEPS; s++) {
        var t  = s / STEPS;
        var mt = 1 - t;
        var bx = mt*mt*mt*x0 + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3;
        var by = mt*mt*mt*y0 + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3;
        var dx = screenX - bx;
        var dy = screenY - by;
        if (dx*dx + dy*dy <= HIT_R_SQ) return wid;
      }
    }
    return null;
  }

  // ─── Draw all confirmed wires + in-progress drag preview ──────

  function drawAll(ctx, transform, selectedWireId) {
    var allWires = graphState.getAllWires();
    var allNodes = graphState.getAllNodes();

    // Confirmed wires
    for (var wid in allWires) {
      if (!allWires.hasOwnProperty(wid)) continue;
      var w        = allWires[wid];
      var fromNode = allNodes[w.fromNode];
      var toNode   = allNodes[w.toNode];
      if (!fromNode || !toNode) continue;

      var isParentWire = (w.type === 'parent' || w.fromPort === 'child_out');
      var fromPos = null;
      var toPos   = null;

      if (isParentWire) {
        fromPos = nodeGeometry.childOutPortPosition(fromNode, transform);
        toPos   = nodeGeometry.parentInPortPosition(toNode, transform);
      } else {
        var outPorts = nodeGeometry.outputPortPositions(fromNode, transform);
        for (var fp = 0; fp < outPorts.length; fp++) {
          if (outPorts[fp].port === (w.fromPort || 'output')) { fromPos = outPorts[fp]; break; }
        }
        if (!fromPos && outPorts.length > 0) fromPos = outPorts[0];

        var inPorts = nodeGeometry.inputPortPositions(toNode, transform);
        for (var i = 0; i < inPorts.length; i++) {
          if (inPorts[i].port === w.toPort) { toPos = inPorts[i]; break; }
        }
      }
      if (!fromPos || !toPos) continue;

      w.error    = (fromNode.state === 'error' || toNode.state === 'error');
      w.selected = (wid === selectedWireId);

      var color     = getWireColor(w);
      var lineWidth = w.selected ? 2.5 : 1.5;

      if (isParentWire) {
        var cpOffset = calcHorizCpOffset(fromPos.x, toPos.x, transform.scale);
        if (w.selected) {
          ctx.save();
          ctx.shadowColor = 'rgba(255,255,255,0.5)';
          ctx.shadowBlur  = 6;
          drawBezier(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, cpOffset, color, lineWidth, w.dashOffset || 0, true);
          ctx.restore();
        } else {
          drawBezier(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, cpOffset, color, lineWidth, w.dashOffset || 0, true);
        }
      } else {
        var cpOffset = calcCpOffset(fromPos.y, toPos.y, transform.scale);
        if (w.selected) {
          ctx.save();
          ctx.shadowColor = 'rgba(255,255,255,0.5)';
          ctx.shadowBlur  = 6;
          drawBezier(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, cpOffset, color, lineWidth, w.dashOffset || 0, false);
          ctx.restore();
        } else {
          drawBezier(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, cpOffset, color, lineWidth, w.dashOffset || 0, false);
        }
      }
    }

    // In-progress drag preview — static dashes, no animation
    var d = wire.getDragState();
    if (d.active && d.fromNodeId) {
      var dragNode = allNodes[d.fromNodeId];
      if (dragNode) {
        var isParentDrag = (d.fromPort === 'child_out' || d.portType === 'parent');
        var dragFrom     = null;
        if (isParentDrag) {
          dragFrom = nodeGeometry.childOutPortPosition(dragNode, transform);
        } else {
          var dragPorts = nodeGeometry.outputPortPositions(dragNode, transform);
          for (var dp = 0; dp < dragPorts.length; dp++) {
            if (dragPorts[dp].port === (d.fromPort || 'output')) { dragFrom = dragPorts[dp]; break; }
          }
          if (!dragFrom && dragPorts.length > 0) dragFrom = dragPorts[0];
        }
        if (dragFrom) {
          var previewColor = isParentDrag ? '#c8922a' : '#666666';
          if (isParentDrag) {
            var cpOffset = calcHorizCpOffset(dragFrom.x, d.cursorX, transform.scale);
            drawBezier(ctx, dragFrom.x, dragFrom.y, d.cursorX, d.cursorY, cpOffset, previewColor, 1.5, 0, true);
          } else {
            var cpOffset = calcCpOffset(dragFrom.y, d.cursorY, transform.scale);
            drawBezier(ctx, dragFrom.x, dragFrom.y, d.cursorX, d.cursorY, cpOffset, previewColor, 1.5, 0, false);
          }
        }
      }
    }
  }

  // ─── Public: draw a single wire between two screen-space points ──

  function drawWire(ctx, fromX, fromY, toX, toY, wireType, isPreview) {
    var color     = isPreview ? '#666666' : '#888888';
    var horizontal = (wireType === 'parent');
    if (horizontal) {
      var cpOffset = calcHorizCpOffset(fromX, toX, 1);
      drawBezier(ctx, fromX, fromY, toX, toY, cpOffset, color, 1.5, 0, true);
    } else {
      var cpOffset = calcCpOffset(fromY, toY, 1);
      drawBezier(ctx, fromX, fromY, toX, toY, cpOffset, color, 1.5, 0, false);
    }
  }

  // ─── Public API ───────────────────────────────────────────────

  return {
    drawWire:        drawWire,
    drawAll:         drawAll,
    hitTestNearest:  hitTestNearest,
    WIRE_DASH_SPEED: WIRE_DASH_SPEED,
    WIRE_DASH_CYCLE: WIRE_DASH_CYCLE
  };

}());
