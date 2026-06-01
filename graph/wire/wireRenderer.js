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
   * Draws a single wire from its source to target port.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} wire - Wire data object
   */
  function _drawWire(ctx, wire) {
    var from = _portPosInWrap(wire.fromNode, wire.fromPort);
    var to   = _portPosInWrap(wire.toNode, wire.toPort);
    if (!from || !to) return;

    var isSelected = typeof _selectedWireId !== 'undefined' && _selectedWireId === wire.id;
    var color = isSelected ? '#FFFFFF' : (WIRE_COLORS[wire.type] || WIRE_COLORS.layer);
    var style = _getStyle();
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.beginPath();
    _drawSegment(ctx, from.x, from.y, to.x, to.y, style);
    ctx.stroke();

    if (isSelected) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      _drawSegment(ctx, from.x, from.y, to.x, to.y, style);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
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
   * Main render function. Clears the canvas, draws all wires, and optionally
   * draws a drag preview line.
   *
   * @param {Object|null} preview - Preview data with from/to positions, or null
   */
  function render(preview) {
    if (!_ctx) return;
    _resize();

    var w = _canvas.width;
    var h = _canvas.height;
    _ctx.clearRect(0, 0, w, h);

    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      _drawWire(_ctx, wires[wireId]);
    }

    if (preview && preview.from && preview.to) {
      _drawPreview(_ctx, preview.from, preview.to);
    }
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

  return {
    init:   init,
    render: render
  };

})();
