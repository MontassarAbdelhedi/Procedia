/**
 * graph/wire/wireRenderer/draw.js
 *
 * Wire drawing primitives and composite draw functions. Handles bezier,
 * direct, and stepped segment styles, single-wire rendering, clone wires,
 * drag preview lines, and bypass wires for disabled effectors.
 *
 * Dependencies: wireRenderer container (wireRenderer/helpers.js)
 * Load after: wire/wireRenderer/helpers.js
 * Load before: wire/wireRenderer/render.js
 */
// graph/wire/wireRenderer/draw.js
// MUST LOAD AFTER: graph/wire/wireRenderer/helpers.js
// MUST LOAD BEFORE: graph/wire/wireRenderer/render.js

(function(c) {

  c._drawBezier = function(ctx, x1, y1, x2, y2) {
    var dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2);
  };

  c._drawDirect = function(ctx, x1, y1, x2, y2) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  };

  c._drawStepped = function(ctx, x1, y1, x2, y2) {
    var mx = (x1 + x2) / 2;
    ctx.moveTo(x1, y1);
    ctx.lineTo(mx, y1);
    ctx.lineTo(mx, y2);
    ctx.lineTo(x2, y2);
  };

  c._drawSegment = function(ctx, x1, y1, x2, y2, style) {
    if (style === 'direct')  { c._drawDirect(ctx, x1, y1, x2, y2); return; }
    if (style === 'stepped') { c._drawStepped(ctx, x1, y1, x2, y2); return; }
    c._drawBezier(ctx, x1, y1, x2, y2);
  };

  c._drawWire = function(ctx, wire) {
    var from = c._portPosInWrap(wire.fromNode, wire.fromPort);
    var to   = c._portPosInWrap(wire.toNode, wire.toPort);
    if (!from || !to) return;

    var isDisabledWire = c._isNodeDisabled(wire.fromNode) || c._isNodeDisabled(wire.toNode);
    var isSelected = typeof _selectedWireId !== 'undefined' && _selectedWireId === wire.id;

    var color;
    if (isDisabledWire) {
      color = '#555550';
    } else if (isSelected) {
      color = '#FFFFFF';
    } else {
      color = c._WIRE_COLORS[wire.type] || c._WIRE_COLORS.layer;
    }

    var style = c._getStyle();
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 3 : 2;

    var useDash = !isDisabledWire && c._getAnimDash();
    if (useDash) {
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = wire.type === 'parent' ? c._animOffset : -c._animOffset;
    }

    ctx.beginPath();
    c._drawSegment(ctx, from.x, from.y, to.x, to.y, style);
    ctx.stroke();

    if (isSelected) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.globalAlpha = isDisabledWire ? 0.1 : 0.2;
      if (useDash) {
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = wire.type === 'parent' ? c._animOffset : -c._animOffset;
      }
      ctx.beginPath();
      c._drawSegment(ctx, from.x, from.y, to.x, to.y, style);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    if (useDash) {
      ctx.setLineDash([]);
    }
  };

  c._drawCloneWires = function(ctx) {
    var nodes = graphState.getAllNodes();
    for (var nodeId in nodes) {
      if (!nodes.hasOwnProperty(nodeId)) continue;
      var node = nodes[nodeId];
      if (node._cloneMasterId) {
        var from = c._nodeCenterInWrap(node._cloneMasterId);
        var to   = c._nodeCenterInWrap(nodeId);
        if (!from || !to) continue;

        ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        c._drawBezier(ctx, from.x, from.y, to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  c._drawPreview = function(ctx, from, to) {
    ctx.strokeStyle = 'rgba(6, 214, 160, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    var style = c._getStyle();
    c._drawSegment(ctx, from.x, from.y, to.x, to.y, style);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  c._drawBypassWires = function() {
    var nodes = graphState.getAllNodes();
    var wires = graphState.getAllWires();

    for (var nodeId in nodes) {
      if (!nodes.hasOwnProperty(nodeId)) continue;
      var nodeData = nodes[nodeId];
      if (nodeData.nodeKind !== 'effector' || !nodeData.disabled) continue;

      var inputWire = null;
      var outputWire = null;

      for (var wid in wires) {
        if (!wires.hasOwnProperty(wid)) continue;
        var w = wires[wid];
        if (w.toNode === nodeId && w.type === 'layer') inputWire = w;
        if (w.fromNode === nodeId && w.type === 'layer') outputWire = w;
      }

      if (!inputWire || !outputWire) continue;

      var fromPos = c._portPosInWrap(inputWire.fromNode, inputWire.fromPort);
      var toPos   = c._portPosInWrap(outputWire.toNode, outputWire.toPort);
      if (!fromPos || !toPos) continue;

      var style = c._getStyle();

      c._ctx.save();
      c._ctx.strokeStyle = '#4A90D9';
      c._ctx.lineWidth = 2.5;
      c._ctx.globalAlpha = 0.75;
      c._ctx.setLineDash([8, 6]);
      c._ctx.lineDashOffset = -c._animOffset;

      c._ctx.beginPath();
      c._drawSegment(c._ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, style);
      c._ctx.stroke();

      c._ctx.setLineDash([]);
      c._ctx.globalAlpha = 0.15;
      c._ctx.lineWidth = 8;
      c._ctx.beginPath();
      c._drawSegment(c._ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, style);
      c._ctx.stroke();

      c._ctx.restore();
    }
  };

  c._drawAll = function(preview) {
    var w = c._canvas.width;
    var h = c._canvas.height;
    c._ctx.clearRect(0, 0, w, h);

    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      var wireObj = wires[wireId];
      if (!graphState.isNodeVisible(wireObj.fromNode) || !graphState.isNodeVisible(wireObj.toNode)) continue;
      c._drawWire(c._ctx, wireObj);
    }

    c._drawCloneWires(c._ctx);
    c._drawBypassWires();

    if (preview && preview.from && preview.to) {
      c._drawPreview(c._ctx, preview.from, preview.to);
    }
  };

})(window.wireRenderer);
