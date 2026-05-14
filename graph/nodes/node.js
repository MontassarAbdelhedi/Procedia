var node = (function() {

  var NODE_WIDTH  = 160;
  var NODE_HEIGHT = 60;
  var CORNER_R    = 6;

  // ─── Rounded rect path helper ─────────────────────────────────

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ─── State dot color ──────────────────────────────────────────

  function dotColor(state) {
    if (state === 'alive') return '#7ec98f';
    if (state === 'error') return '#d46e6e';
    return '#555555';
  }

  // ─── Port color by type ───────────────────────────────────────

  var PORT_COLOR = { layer: '#5b8dd9', data: '#d4a04a' };

  // ─── Input port screen positions for a node ───────────────────
  // Returns array of { x, y, port, type } in screen space

  function inputPortPositions(nodeData, transform) {
    var def = nodeRegistry.getByType(nodeData.type);
    if (!def || !def.inputs || def.inputs.length === 0) return [];

    var sx = nodeData.position.x * transform.scale + transform.offsetX;
    var sy = nodeData.position.y * transform.scale + transform.offsetY;
    var sw = NODE_WIDTH * transform.scale;
    var count = def.inputs.length;
    var positions = [];

    for (var i = 0; i < count; i++) {
      positions.push({
        x:    sx + (sw / (count + 1)) * (i + 1),
        y:    sy - 4 * transform.scale,
        port: def.inputs[i].name,
        type: def.inputs[i].type
      });
    }
    return positions;
  }

  // ─── Draw a single node ───────────────────────────────────────

  function drawNode(ctx, nodeData, transform, opts) {
    opts             = opts || {};
    var def          = nodeRegistry.getByType(nodeData.type);
    var strokeColor  = nodeRegistry.getCategoryColor(def ? def.category : null);
    var state        = nodeData.state || 'ghost';
    var label        = nodeData.label || (def ? def.label : nodeData.type);
    var selected     = nodeData.selected || false;
    var showPorts    = opts.showInputPorts || false;   // true when wire drag is active
    var hoveredPort  = opts.hoveredPort   || null;     // port name currently highlighted

    // Convert world position to screen position
    var sx = nodeData.position.x * transform.scale + transform.offsetX;
    var sy = nodeData.position.y * transform.scale + transform.offsetY;
    var sw = NODE_WIDTH  * transform.scale;
    var sh = NODE_HEIGHT * transform.scale;

    ctx.save();

    // ── Selection glow ring ──────────────────────────────────────
    if (selected) {
      ctx.shadowColor = 'rgba(255,255,255,0.3)';
      ctx.shadowBlur  = 8 * transform.scale;
      roundRect(ctx, sx - 2, sy - 2, sw + 4, sh + 4, CORNER_R + 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }

    // ── Error glow ───────────────────────────────────────────────
    if (state === 'error') {
      ctx.shadowColor = '#d46e6e';
      ctx.shadowBlur  = 8 * transform.scale;
    }

    // ── Node body ────────────────────────────────────────────────
    roundRect(ctx, sx, sy, sw, sh, CORNER_R);
    ctx.fillStyle = '#252525';
    ctx.fill();

    // Border — ghost uses flat dark grey; alive/error use category color
    ctx.strokeStyle = (state === 'ghost') ? '#3a3a3a' : hexToRgba(strokeColor, 1.0);
    ctx.lineWidth   = 2;

    if (state === 'error') {
      ctx.setLineDash([4 * transform.scale, 3 * transform.scale]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';

    // ── Header row: state dot + label ────────────────────────────
    var dotR   = 4  * transform.scale;
    var dotX   = sx + 12 * transform.scale;
    var dotY   = sy + 18 * transform.scale;

    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = dotColor(state);
    ctx.fill();

    var fontSize = Math.max(8, Math.round(11 * transform.scale));
    ctx.font      = fontSize + 'px monospace';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(label, sx + 22 * transform.scale, sy + 22 * transform.scale);

    // ── Divider ──────────────────────────────────────────────────
    var divY = sy + 30 * transform.scale;
    ctx.beginPath();
    ctx.moveTo(sx + 8 * transform.scale, divY);
    ctx.lineTo(sx + sw - 8 * transform.scale, divY);
    ctx.strokeStyle = '#333333';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // ── Property preview (first defaultProperty) ─────────────────
    var previewText = '';
    if (nodeData.properties) {
      var keys = Object.keys(nodeData.properties);
      if (keys.length > 0) {
        var val = nodeData.properties[keys[0]];
        var valStr = (typeof val === 'object') ? JSON.stringify(val) : String(val);
        if (valStr.length > 16) valStr = valStr.substr(0, 14) + '…';
        previewText = keys[0] + ': ' + valStr;
      }
    }
    if (previewText) {
      var previewFontSize = Math.max(7, Math.round(10 * transform.scale));
      ctx.font      = previewFontSize + 'px monospace';
      ctx.fillStyle = '#666666';
      ctx.fillText(previewText, sx + 10 * transform.scale, sy + 48 * transform.scale);
    }

    // ── Output port (bottom-center) — always visible ─────────────
    var portR = 4 * transform.scale;
    var portX = sx + sw / 2;
    var portY = sy + sh + portR;

    ctx.beginPath();
    ctx.arc(portX, portY, portR, 0, Math.PI * 2);
    ctx.fillStyle   = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // ── Input ports — always visible, highlight on hover during wire drag ──
    var inPorts = inputPortPositions(nodeData, transform);
    for (var p = 0; p < inPorts.length; p++) {
      var ip      = inPorts[p];
      var isHover = showPorts && (hoveredPort === ip.port);
      var ipColor = PORT_COLOR[ip.type] || '#888888';
      var ipR     = isHover ? 5 * transform.scale : 4 * transform.scale;

      ctx.beginPath();
      ctx.arc(ip.x, ip.y, ipR, 0, Math.PI * 2);
      ctx.fillStyle   = isHover ? ipColor : '#1a1a1a';
      ctx.fill();
      ctx.strokeStyle = ipColor;
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // Port label on hover
      if (isHover) {
        var labelFontSize = Math.max(7, Math.round(9 * transform.scale));
        ctx.font      = labelFontSize + 'px monospace';
        ctx.fillStyle = ipColor;
        ctx.fillText(ip.port, ip.x + 6 * transform.scale, ip.y - 4 * transform.scale);
      }
    }

    ctx.restore();
  }

  // ─── Utility: hex color → rgba string ────────────────────────

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ─── Hit test: is screen point inside a node? ─────────────────

  function hitTest(nodeData, transform, screenX, screenY) {
    var sx = nodeData.position.x * transform.scale + transform.offsetX;
    var sy = nodeData.position.y * transform.scale + transform.offsetY;
    var sw = NODE_WIDTH  * transform.scale;
    var sh = NODE_HEIGHT * transform.scale;
    return screenX >= sx && screenX <= sx + sw &&
           screenY >= sy && screenY <= sy + sh;
  }

  // ─── Output port screen position ──────────────────────────────

  function outputPortPos(nodeData, transform) {
    var sx = nodeData.position.x * transform.scale + transform.offsetX;
    var sy = nodeData.position.y * transform.scale + transform.offsetY;
    var sw = NODE_WIDTH  * transform.scale;
    var sh = NODE_HEIGHT * transform.scale;
    return {
      x: sx + sw / 2,
      y: sy + sh + 4 * transform.scale
    };
  }

  // ─── Output port hit test ─────────────────────────────────────
  // Returns the port position { x, y } if screenX/Y is within hit radius, or null.

  function hitTestOutputPort(nodeData, transform, screenX, screenY) {
    var pos  = outputPortPos(nodeData, transform);
    var hitR = 8 * transform.scale;
    var dx   = screenX - pos.x;
    var dy   = screenY - pos.y;
    return (dx * dx + dy * dy <= hitR * hitR) ? pos : null;
  }

  // ─── Input port hit test ──────────────────────────────────────
  // Returns the port definition { port, type } if screenX/Y is within
  // hit radius of any input port, or null.

  function hitTestInputPort(nodeData, transform, screenX, screenY) {
    var ports = inputPortPositions(nodeData, transform);
    var hitR  = 20 * transform.scale;
    for (var i = 0; i < ports.length; i++) {
      var dx = screenX - ports[i].x;
      var dy = screenY - ports[i].y;
      if (dx * dx + dy * dy <= hitR * hitR) {
        return ports[i];
      }
    }
    return null;
  }

  return {
    drawNode:            drawNode,
    hitTest:             hitTest,
    hitTestOutputPort:   hitTestOutputPort,
    hitTestInputPort:    hitTestInputPort,
    outputPortPos:       outputPortPos,
    inputPortPositions:  inputPortPositions,
    NODE_WIDTH:          NODE_WIDTH,
    NODE_HEIGHT:         NODE_HEIGHT
  };

}());
