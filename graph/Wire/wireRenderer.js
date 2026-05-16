// graph/Wire/wireRenderer.js
// DEPENDS ON: graph/graphState.js, graph/nodes/node.js, graph/Wire/nodeState.js, graph/Wire/wire.js
// MUST LOAD BEFORE: graph/canvas/renderer.js

var wireRenderer = (function() {

  var WIRE_COLOR = { layer: '#5b8dd9', data: '#d4a04a' };

  // cpOffset proportional to vertical distance so nearby nodes don't get a
  // large S-curve. Clamped between 12px and 80px (screen pixels).
  function calcCpOffset(y1, y2, scale) {
    var dy = Math.abs(y2 - y1);
    return Math.max(12 * scale, Math.min(80 * scale, dy * 0.45));
  }

  // ─── Bezier draw ──────────────────────────────────────────────
  // cpOffset is in screen pixels (already scaled by transform.scale)

  function drawBezier(ctx, x1, y1, x2, y2, cpOffset, color, lineWidth, dashed) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, y1 + cpOffset, x2, y2 - cpOffset, x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineWidth;
    if (dashed) ctx.setLineDash([6, 4]);
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

      var fromPos = node.outputPortPos(fromNode, transform);
      var inPorts = node.inputPortPositions(toNode, transform);
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

      var fromPos = node.outputPortPos(fromNode, transform);
      var inPorts = node.inputPortPositions(toNode, transform);
      var toPos   = null;
      for (var i = 0; i < inPorts.length; i++) {
        if (inPorts[i].port === w.toPort) { toPos = inPorts[i]; break; }
      }
      if (!toPos) continue;

      var cpOffset   = calcCpOffset(fromPos.y, toPos.y, transform.scale);
      var portType   = nodeState.getPortType(w.toNode, w.toPort);
      var color      = WIRE_COLOR[portType] || '#888888';
      var dashed     = (portType !== 'layer');
      var lw         = dashed ? 1.5 : 2;
      var isSelected = (wid === selectedWireId);

      if (isSelected) {
        ctx.save();
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.shadowBlur  = 6;
        drawBezier(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, cpOffset, '#ffffff', lw + 1, dashed);
        ctx.restore();
      } else {
        drawBezier(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, cpOffset, color, lw, dashed);
      }
    }

    // In-progress drag preview
    var d = wire.getDragState();
    if (d.active && d.fromNodeId) {
      var fromNode = allNodes[d.fromNodeId];
      if (fromNode) {
        var fromPos  = node.outputPortPos(fromNode, transform);
        var cpOffset = calcCpOffset(fromPos.y, d.cursorY, transform.scale);
        drawBezier(ctx, fromPos.x, fromPos.y, d.cursorX, d.cursorY, cpOffset, '#888888', 1.5, false);
      }
    }
  }

  // ─── Public: draw a single wire between two screen-space points ──

  function drawWire(ctx, fromX, fromY, toX, toY, wireType, isPreview) {
    var color    = WIRE_COLOR[wireType] || '#888888';
    var lw       = (wireType === 'layer') ? 2 : 1.5;
    var cpOffset = calcCpOffset(fromY, toY, 1);
    drawBezier(ctx, fromX, fromY, toX, toY, cpOffset, color, lw, isPreview || false);
  }

  // ─── Public API ───────────────────────────────────────────────

  return {
    drawWire:       drawWire,
    drawAll:        drawAll,
    hitTestNearest: hitTestNearest
  };

}());
