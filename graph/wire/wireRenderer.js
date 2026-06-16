/**
 * graph/wire/wireRenderer.js
 *
 * Canvas-based wire renderer. Draws all graph wires on an overlay canvas using
 * bezier, direct, or stepped line styles. Also renders a wire preview during
 * drag operations.
 *
 * Dependencies: graphState, canvas/renderer, canvas/viewport, ui/settings
 * Load before: wire/wire.js
 *
 * Exports: init, render
 */
// graph/wire/wireRenderer.js
// DEPENDS ON: graph/graphState.js, graph/canvas/renderer/index.js, graph/canvas/viewport.js, ui/settings.js
// MUST LOAD BEFORE: graph/wire/wire.js

var wireRenderer = (function() {

  var _canvas = null;
  var _ctx = null;

  var WIRE_COLORS = {
    layer:  '#06D6A0',
    data:   '#6B7280',
    parent: '#E07B39'
  };

  var _animOffset = 0;
  var _animFrameId = null;

  /**
   * Resizes the canvas element to match the canvas-wrap dimensions.
   */
  function _resize() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap || !_canvas) return;
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    if (_canvas.width !== w || _canvas.height !== h) {
      _canvas.width = w;
      _canvas.height = h;
    }
  }

  /**
   * Calculates the canvas-wrap-relative position of a node port element.
   *
   * @param {string} nodeId - Node ID
   * @param {string} portId - Port ID
   * @returns {Object|null} Position object with x, y, or null
   */
  function _portPosInWrap(nodeId, portId) {
    var el = renderer.getNodeElement(nodeId);
    if (!el) return null;

    var dot = el.querySelector('[data-port-id="' + portId + '"]');

    if (dot) {
      var nodeData = graphState.getNode(nodeId);
      if (nodeData && nodeData.collapsed) {
        var corePorts = ['main_input', 'output', 'child_of', 'parent_of'];
        if (corePorts.indexOf(portId) === -1) {
          var mainDot = el.querySelector('[data-port-id="main_input"]');
          if (mainDot) dot = mainDot;
        }
      }
    }

    if (!dot) return null;

    var dotRect = dot.getBoundingClientRect();
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return null;
    var wr = wrap.getBoundingClientRect();

    return {
      x: dotRect.left + dotRect.width / 2 - wr.left,
      y: dotRect.top + dotRect.height / 2 - wr.top
    };
  }

  /**
   * Gets the current wire style from settings, defaulting to 'bezier'.
   *
   * @returns {string} Wire style name ('bezier', 'direct', or 'stepped')
   */
  function _getStyle() {
    if (typeof settings !== 'undefined' && settings.get) {
      return settings.get('wireStyle');
    }
    return 'bezier';
  }

  /**
   * Gets the animated dash toggle from settings.
   *
   * @returns {boolean} Whether animated dash is enabled
   */
  function _getAnimDash() {
    if (typeof settings !== 'undefined' && settings.get) {
      return settings.get('animatedDash') === true;
    }
    return false;
  }

  /**
   * Draws a bezier curve segment between two points.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   */
  function _drawBezier(ctx, x1, y1, x2, y2) {
    var dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2);
  }

  /**
   * Draws a straight line segment between two points.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   */
  function _drawDirect(ctx, x1, y1, x2, y2) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }

  /**
   * Draws a stepped (right-angle) path between two points.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   */
  function _drawStepped(ctx, x1, y1, x2, y2) {
    var mx = (x1 + x2) / 2;
    ctx.moveTo(x1, y1);
    ctx.lineTo(mx, y1);
    ctx.lineTo(mx, y2);
    ctx.lineTo(x2, y2);
  }

  /**
   * Draws a wire segment using the specified style.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {string} style - Style name ('bezier', 'direct', or 'stepped')
   */
  function _drawSegment(ctx, x1, y1, x2, y2, style) {
    if (style === 'direct')  { _drawDirect(ctx, x1, y1, x2, y2); return; }
    if (style === 'stepped') { _drawStepped(ctx, x1, y1, x2, y2); return; }
    _drawBezier(ctx, x1, y1, x2, y2);
  }

  /**
   * Checks whether a node is disabled.
   * @param {string} nodeId
   * @returns {boolean}
   */
  function _isNodeDisabled(nodeId) {
    var node = graphState.getNode(nodeId);
    return node ? !!node.disabled : false;
  }

  /**
   * Draws a single wire from its source to target port.
   * Wires connected to a disabled node are rendered gray without dash animation.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} wire - Wire data object
   */
  function _drawWire(ctx, wire) {
    var from = _portPosInWrap(wire.fromNode, wire.fromPort);
    var to   = _portPosInWrap(wire.toNode, wire.toPort);
    if (!from || !to) return;

    var isDisabledWire = _isNodeDisabled(wire.fromNode) || _isNodeDisabled(wire.toNode);
    var isSelected = typeof _selectedWireId !== 'undefined' && _selectedWireId === wire.id;

    var color;
    if (isDisabledWire) {
      color = '#555550';
    } else if (isSelected) {
      color = '#FFFFFF';
    } else {
      color = WIRE_COLORS[wire.type] || WIRE_COLORS.layer;
    }

    var style = _getStyle();
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 3 : 2;

    var useDash = !isDisabledWire && _getAnimDash();
    if (useDash) {
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = wire.type === 'parent' ? _animOffset : -_animOffset;
    }

    ctx.beginPath();
    _drawSegment(ctx, from.x, from.y, to.x, to.y, style);
    ctx.stroke();

    if (isSelected) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.globalAlpha = isDisabledWire ? 0.1 : 0.2;
      if (useDash) {
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = wire.type === 'parent' ? _animOffset : -_animOffset;
      }
      ctx.beginPath();
      _drawSegment(ctx, from.x, from.y, to.x, to.y, style);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    if (useDash) {
      ctx.setLineDash([]);
    }
  }

  /**
   * Gets the center position of a node card relative to the canvas wrap.
   *
   * @param {string} nodeId - Node ID
   * @returns {Object|null} Position object with x, y, or null
   */
  function _nodeCenterInWrap(nodeId) {
    var el = renderer.getNodeElement(nodeId);
    if (!el) return null;

    var rect = el.getBoundingClientRect();
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return null;
    var wr = wrap.getBoundingClientRect();

    return {
      x: rect.left + rect.width / 2 - wr.left,
      y: rect.top + rect.height / 2 - wr.top
    };
  }

  /**
   * Draws gray clone wires from master nodes to their clones.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  function _drawCloneWires(ctx) {
    var nodes = graphState.getAllNodes();
    for (var nodeId in nodes) {
      if (!nodes.hasOwnProperty(nodeId)) continue;
      var node = nodes[nodeId];
      if (node._cloneMasterId) {
        var from = _nodeCenterInWrap(node._cloneMasterId);
        var to   = _nodeCenterInWrap(nodeId);
        if (!from || !to) continue;

        ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        _drawBezier(ctx, from.x, from.y, to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  /**
   * Draws a dashed preview line during a wire drag operation.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} from - Start position {x, y}
   * @param {Object} to - End position {x, y}
   */
  function _drawPreview(ctx, from, to) {
    ctx.strokeStyle = 'rgba(6, 214, 160, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    var style = _getStyle();
    _drawSegment(ctx, from.x, from.y, to.x, to.y, style);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Stops the animation loop and resets state.
   */
  function _stopAnim() {
    if (_animFrameId) {
      cancelAnimationFrame(_animFrameId);
      _animFrameId = null;
      _animOffset = 0;
    }
  }

  /**
   * Draws neon blue bypass wires for disabled effector nodes.
   * Skips from previous node's output to next node's input port.
   */
  function _drawBypassWires() {
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

      var fromPos = _portPosInWrap(inputWire.fromNode, inputWire.fromPort);
      var toPos   = _portPosInWrap(outputWire.toNode, outputWire.toPort);
      if (!fromPos || !toPos) continue;

      var style = _getStyle();

      _ctx.save();
      _ctx.strokeStyle = '#4A90D9';
      _ctx.lineWidth = 2.5;
      _ctx.globalAlpha = 0.75;
      _ctx.setLineDash([8, 6]);
      _ctx.lineDashOffset = -_animOffset;

      _ctx.beginPath();
      _drawSegment(_ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, style);
      _ctx.stroke();

      _ctx.setLineDash([]);
      _ctx.globalAlpha = 0.15;
      _ctx.lineWidth = 8;
      _ctx.beginPath();
      _drawSegment(_ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, style);
      _ctx.stroke();

      _ctx.restore();
    }
  }

  /**
   * Clears the canvas and draws all wires (and optional preview line).
   *
   * @param {Object|null} preview - Preview data with from/to positions, or null
   */
  function _drawAll(preview) {
    var w = _canvas.width;
    var h = _canvas.height;
    _ctx.clearRect(0, 0, w, h);

    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      _drawWire(_ctx, wires[wireId]);
    }

    _drawCloneWires(_ctx);
    _drawBypassWires();

    if (preview && preview.from && preview.to) {
      _drawPreview(_ctx, preview.from, preview.to);
    }
  }

  /**
   * Main render function. Clears the canvas, draws all wires, and optionally
   * draws a drag preview line. For animated dash style, starts a continuous
   * requestAnimationFrame loop to animate the dash offset.
   *
   * @param {Object|null} preview - Preview data with from/to positions, or null
   */
  function render(preview) {
    if (!_ctx) return;
    _resize();

    var style = _getStyle();

    // If a drag preview is active, draw immediately and stop any animation loop
    if (preview) {
      if (_animFrameId) {
        cancelAnimationFrame(_animFrameId);
        _animFrameId = null;
        _animOffset = 0;
      }
      _drawAll(preview);
      return;
    }

    // Manage animation loop for animated dash
    if (_getAnimDash()) {
      if (!_animFrameId) {
        _drawAll(null);
        function _tick() {
          if (!_getAnimDash()) {
            _stopAnim();
            return;
          }
          _animOffset += 0.3;
          if (_animOffset > 200) _animOffset = 0;
          _drawAll(null);
          _animFrameId = requestAnimationFrame(_tick);
        }
        _animFrameId = requestAnimationFrame(_tick);
      }
      return;
    }

    // Stop animation loop if running and toggle is off
    _stopAnim();

    _drawAll(preview);
  }

  /**
   * Initializes the wire renderer by acquiring the canvas element and its 2D
   * context, then performing an initial render.
   */
  function init() {
    _canvas = document.getElementById('node-graph');
    if (!_canvas) {
      console.warn('[wireRenderer] #node-graph not found');
      return;
    }
    _ctx = _canvas.getContext('2d');
    _resize();
    render(null);
  }

  /**
   * Renders the current graph wires plus a split-wire preview showing two
   * dashed segments (from→insert and insert→to) at reduced opacity.
   * @param {object|null} previewState - { fromPos, toPos, insertPos } or null.
   */
  function renderSplitPreview(previewState) {
    if (!_ctx) return;
    _resize();

    if (_animFrameId) {
      cancelAnimationFrame(_animFrameId);
      _animFrameId = null;
      _animOffset = 0;
    }

    _drawAll(null);

    if (!previewState) return;

    var style = _getStyle();

    _ctx.save();
    _ctx.globalAlpha = 0.55;
    _ctx.strokeStyle = '#06D6A0';
    _ctx.lineWidth = 2.5;
    _ctx.setLineDash([6, 4]);

    var fp = previewState.fromPos;
    var tp = previewState.toPos;
    var ip = previewState.insertPos;

    _ctx.beginPath();
    _drawSegment(_ctx, fp.x, fp.y, ip.x, ip.y, style);
    _ctx.stroke();

    _ctx.beginPath();
    _drawSegment(_ctx, ip.x, ip.y, tp.x, tp.y, style);
    _ctx.stroke();

    _ctx.setLineDash([]);

    _ctx.globalAlpha = 0.25;
    _ctx.strokeStyle = '#06D6A0';
    _ctx.lineWidth = 8;
    _ctx.beginPath();
    _drawSegment(_ctx, fp.x, fp.y, ip.x, ip.y, style);
    _ctx.stroke();
    _ctx.beginPath();
    _drawSegment(_ctx, ip.x, ip.y, tp.x, tp.y, style);
    _ctx.stroke();

    _ctx.restore();
  }

  return {
    init:               init,
    render:             render,
    renderSplitPreview: renderSplitPreview
  };

})();
