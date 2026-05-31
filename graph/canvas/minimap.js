/**
 * @fileoverview Minimap overlay for the graph canvas.
 * Renders a scaled-down view of all nodes and the visible viewport rectangle.
 * Supports panning via click/drag and a "fit all" button.
 * @dependencies graph/graphState.js, graph/canvas/viewport.js, ui/settings.js
 * @exports minimap { render, init, fitAll }
 */

// graph/canvas/minimap.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js, ui/settings.js
// MUST LOAD BEFORE: index.js

var minimap = (function() {

  var MINIMAP_W   = 160;
  var MINIMAP_H   = 100;
  var NODE_WIDTH  = 180;
  var NODE_HEIGHT = 120;
  var DOT_RADIUS  = 3;
  var MAX_VIEW_FRAC = 0.5; // viewport rect ≤ 50% of minimap width/height

  var _lastFrame = null;
  var _panning   = false;

  /**
   * Retrieves all nodes from graphState as a flat array.
   * @returns {Array} Array of node data objects.
   */
  function _getNodes() {
    if (typeof graphState === 'undefined' || typeof graphState.getAllNodes !== 'function') {
      return [];
    }
    var raw = graphState.getAllNodes();
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    var arr = [];
    for (var k in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, k)) arr.push(raw[k]);
    }
    return arr;
  }

  /**
   * Computes the minimap coordinate frame based on viewport transform and wrap size.
   * Caps the viewport indicator rectangle at MAX_VIEW_FRAC of minimap dimensions.
   * @param {object} t - Viewport transform with .scale, .x, .y.
   * @param {number} wrapW - Canvas wrapper width.
   * @param {number} wrapH - Canvas wrapper height.
   * @returns {object} Frame object with bounds, scale, and viewport rect info.
   */
  function _computeFrame(t, wrapW, wrapH) {
    var zoom = t.scale;
    var viewW = wrapW / zoom;
    var viewH = wrapH / zoom;
    var viewLeft = -t.x / zoom;
    var viewTop  = -t.y / zoom;
    var viewCenterX = viewLeft + viewW * 0.5;
    var viewCenterY = viewTop  + viewH * 0.5;

    var maxViewW = MINIMAP_W * MAX_VIEW_FRAC;
    var maxViewH = MINIMAP_H * MAX_VIEW_FRAC;
    var mmScale  = Math.min(maxViewW / viewW, maxViewH / viewH);

    var worldW = MINIMAP_W / mmScale;
    var worldH = MINIMAP_H / mmScale;
    var boundsX = viewCenterX - worldW * 0.5;
    var boundsY = viewCenterY - worldH * 0.5;

    return {
      boundsX:   boundsX,
      boundsY:   boundsY,
      boundsW:   worldW,
      boundsH:   worldH,
      scale:     mmScale,
      viewLeft:  viewLeft,
      viewTop:   viewTop,
      viewW:     viewW,
      viewH:     viewH,
      viewMmX:   (viewLeft - boundsX) * mmScale,
      viewMmY:   (viewTop  - boundsY) * mmScale,
      viewMmW:   viewW * mmScale,
      viewMmH:   viewH * mmScale
    };
  }

  /**
   * Converts a canvas-space coordinate to minimap pixel space.
   * @param {number} cx - Canvas x.
   * @param {number} cy - Canvas y.
   * @param {object} frame - Frame from _computeFrame.
   * @returns {object} { x, y } in minimap pixel coordinates.
   */
  function _canvasToMinimap(cx, cy, frame) {
    return {
      x: (cx - frame.boundsX) * frame.scale,
      y: (cy - frame.boundsY) * frame.scale
    };
  }

  /**
   * Renders the minimap: draws node dots and the viewport indicator rectangle.
   * Reads graph state and viewport transform each call.
   */
  function render() {
    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    if (canvas.style.display === 'none') return;
    var ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);
    ctx.fillStyle = '#111116';
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

    var t = canvasView.getTransform();
    var canvasWrap = document.getElementById('canvas-wrap');
    var wrapW = canvasWrap ? canvasWrap.clientWidth  : 800;
    var wrapH = canvasWrap ? canvasWrap.clientHeight : 600;

    var frame = _computeFrame(t, wrapW, wrapH);
    _lastFrame = frame;

    var nodes = _getNodes();

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var cx = (node.x || 0) + NODE_WIDTH * 0.5;
      var cy = (node.y || 0) + NODE_HEIGHT * 0.5;
      var mp = _canvasToMinimap(cx, cy, frame);

      if (mp.x < -DOT_RADIUS || mp.y < -DOT_RADIUS ||
          mp.x > MINIMAP_W + DOT_RADIUS || mp.y > MINIMAP_H + DOT_RADIUS) {
        continue;
      }

      var color = '#06D6A0';
      if (node.state === 'ghost') color = '#3E3E52';
      if (node.state === 'error') color = '#FF4A6A';

      ctx.globalAlpha = (node.state === 'ghost') ? 0.4 : 0.85;
      ctx.fillStyle   = color;
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle   = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(frame.viewMmX, frame.viewMmY, frame.viewMmW, frame.viewMmH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(frame.viewMmX, frame.viewMmY, frame.viewMmW, frame.viewMmH);
  }

  /**
   * Pans the main viewport to center on the minimap click location.
   * @param {MouseEvent} e - Mouse event from the minimap canvas.
   */
  function _panToMinimap(e) {
    if (!_lastFrame) return;
    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var mmX  = e.clientX - rect.left;
    var mmY  = e.clientY - rect.top;

    var frame = _lastFrame;
    var canvasX = mmX / frame.scale + frame.boundsX;
    var canvasY = mmY / frame.scale + frame.boundsY;

    var canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasWrap) return;
    var t = canvasView.getTransform();
    var newX = -(canvasX * t.scale) + canvasWrap.clientWidth  / 2;
    var newY = -(canvasY * t.scale) + canvasWrap.clientHeight / 2;
    canvasView.setPan(newX, newY);
  }

  /**
   * Adjusts zoom and pan to fit all nodes within the viewport.
   */
  function _fitAll() {
    var nodes = _getNodes();
    if (nodes.length === 0) return;

    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }

    var PAD = 80;
    var bboxW = (maxX - minX) + NODE_WIDTH + PAD * 2;
    var bboxH = (maxY - minY) + NODE_HEIGHT + PAD * 2;

    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    var wrapW = wrap.clientWidth;
    var wrapH = wrap.clientHeight;

    var zoom = Math.min(wrapW / bboxW, wrapH / bboxH);
    zoom = Math.max(0.1, Math.min(4.0, zoom));

    var centerX = (minX + maxX + NODE_WIDTH) / 2;
    var centerY = (minY + maxY + NODE_HEIGHT) / 2;

    viewport.setTransform(zoom, wrapW / 2 - centerX * zoom, wrapH / 2 - centerY * zoom);
  }

  /**
   * Initialises the minimap: wraps the canvas in a container, adds a fit button,
   * and binds mouse events for panning.
   */
  function init() {
    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) { console.warn('[minimap] canvas element not found'); return; }

    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;

    var btn = document.createElement('button');
    btn.className = 'minimap-fit-btn';
    btn.title = 'Fit all nodes';
    btn.innerHTML = '<i class="ti ti-focus-2"></i>';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      _fitAll();
    });

    var container = document.createElement('div');
    container.className = 'minimap-container';
    canvas.parentNode.insertBefore(container, canvas);
    container.appendChild(canvas);
    container.appendChild(btn);

    canvas.addEventListener('mousedown', function(e) {
      _panning = true;
      _panToMinimap(e);
      e.stopPropagation();
    });
    canvas.addEventListener('mousemove', function(e) {
      if (!_panning) return;
      _panToMinimap(e);
    });
    document.addEventListener('mouseup', function() { _panning = false; });
  }

  return { render: render, init: init, fitAll: _fitAll };

})();
