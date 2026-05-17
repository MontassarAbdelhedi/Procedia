// graph/Wire/wireRenderer.js
// DEPENDS ON: graph/graphState/store.js, graph/nodes/nodeGeometry.js, graph/Wire/nodeState.js, graph/Wire/wire.js
// MUST LOAD BEFORE: graph/canvas/renderer.js

var wireRenderer = (function() {

  var WIRE_DASH_LENGTH = 8;
  var WIRE_GAP_LENGTH  = 6;
  var WIRE_DASH_SPEED  = 0.4;
  var WIRE_DASH_CYCLE  = WIRE_DASH_LENGTH + WIRE_GAP_LENGTH; // 14

  // cpOffset proportional to vertical distance so nearby nodes don't get a
  // large S-curve. Clamped between 12px and 80px (screen pixels).
  function calcCpOffset(y1, y2, scale) {
    var dy = Math.abs(y2 - y1);
    return Math.max(12 * scale, Math.min(80 * scale, dy * 0.45));
  }

  function getWireColor(wire) {
    if (wire.error)    return '#e05555';
    if (wire.selected) return '#ffffff';
    return '#888888';
  }

  // ─── Bezier draw ──────────────────────────────────────────────
  // dashOffset is the animated lineDashOffset value (0 = static, negative = flowing).

  function drawBezier(ctx, x1, y1, x2, y2, cpOffset, color, lineWidth, dashOffset) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, y1 + cpOffset, x2, y2 - cpOffset, x2, y2);
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

      var fromPos = nodeGeometry.outputPortPos(fromNode, transform);
      var inPorts = nodeGeometry.inputPortPositions(toNode, transform);
      var toPos   = null;
      for (var i = 0; i < inPorts.length; i++) {
        if (inPorts[i].port === w.toPort) { toPos = inPorts[i]; break; }
      }
      if (!toPos) continue;

      var cpOffset = calcCpOffset(fromPos.y, toPos.y, transform.scale);
      var x0 = fromPos.x, y0 = fromPos.y;
      var x1 = fromPos.x, y1 = fromPos.y + cpOffset;
      var x2 = toPos.x,   y2 = toPos.y - cpOffset;
      var x3 = toPos.x,   y3 = toPos.y;

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

      var fromPos = nodeGeometry.outputPortPos(fromNode, transform);
      var inPorts = nodeGeometry.inputPortPositions(toNode, transform);
      var toPos   = null;
      for (var i = 0; i < inPorts.length; i++) {
        if (inPorts[i].port === w.toPort) { toPos = inPorts[i]; break; }
      }
      if (!toPos) continue;

      w.error    = (fromNode.state === 'error' || toNode.state === 'error');
      w.selected = (wid === selectedWireId);

      var cpOffset  = calcCpOffset(fromPos.y, toPos.y, transform.scale);
      var color     = getWireColor(w);
      var lineWidth = w.selected ? 2.5 : 1.5;

      if (w.selected) {
        ctx.save();
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.shadowBlur  = 6;
        drawBezier(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, cpOffset, color, lineWidth, w.dashOffset || 0);
        ctx.restore();
      } else {
        drawBezier(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, cpOffset, color, lineWidth, w.dashOffset || 0);
      }
    }

    // In-progress drag preview — static dashes, no animation
    var d = wire.getDragState();
    if (d.active && d.fromNodeId) {
      var fromNode = allNodes[d.fromNodeId];
      if (fromNode) {
        var fromPos  = nodeGeometry.outputPortPos(fromNode, transform);
        var cpOffset = calcCpOffset(fromPos.y, d.cursorY, transform.scale);
        drawBezier(ctx, fromPos.x, fromPos.y, d.cursorX, d.cursorY, cpOffset, '#666666', 1.5, 0);
      }
    }
  }

  // ─── Public: draw a single wire between two screen-space points ──

  function drawWire(ctx, fromX, fromY, toX, toY, wireType, isPreview) {
    var color    = isPreview ? '#666666' : '#888888';
    var cpOffset = calcCpOffset(fromY, toY, 1);
    drawBezier(ctx, fromX, fromY, toX, toY, cpOffset, color, 1.5, 0);
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
