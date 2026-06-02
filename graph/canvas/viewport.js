/**
 * @fileoverview Viewport manager for the graph canvas.
 * Handles pan, zoom, and coordinate transforms between screen and canvas space.
 * Maintains a grid background and notifies minimap / wire renderer after changes.
 * Also exposes a backward-compatible `canvasView` shim.
 * @dependencies (none)
 * @exports viewport { getTransform, setPan, setZoom, setTransform, screenToCanvas,
 *                     canvasToScreen, applyTransform, reset, init }
 */

// graph/canvas/viewport.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/canvas/renderer/index.js, graph/canvas/input.js, graph/canvas/minimap/index.js, canvas/node.js

var viewport = (function() {

  var _pan  = { x: 0, y: 0 };
  var _zoom = 1.0;
  var MIN_ZOOM = 0.1;
  var MAX_ZOOM = 4.0;
  var GRID_BASE = 24;

  /**
   * Clamps a value between min and max.
   * @param {number} val
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function _clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Applies the current pan/zoom to the canvas-nodes element (via CSS transform)
   * and updates the grid background. Also triggers minimap and wire re-render.
   */
  function applyTransform() {
    var el = document.getElementById('canvas-nodes');
    if (el) {
      el.style.transform =
        'translate(' + _pan.x + 'px, ' + _pan.y + 'px) scale(' + _zoom + ')';
    }
    var grid = document.getElementById('canvas-grid');
    if (grid) {
      var size = GRID_BASE * _zoom;
      var ox = ((_pan.x % size) + size) % size;
      var oy = ((_pan.y % size) + size) % size;
      grid.style.backgroundSize = size + 'px ' + size + 'px';
      grid.style.backgroundPosition = ox + 'px ' + oy + 'px';
    }
    if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
  }

  /**
   * Returns the current viewport transform.
   * @returns {{ pan: {x:number, y:number}, zoom: number }}
   */
  function getTransform() {
    return { pan: { x: _pan.x, y: _pan.y }, zoom: _zoom };
  }

  /**
   * Sets the pan offset and applies the transform.
   * @param {number} x
   * @param {number} y
   */
  function setPan(x, y) {
    _pan.x = x;
    _pan.y = y;
    applyTransform();
  }

  /**
   * Resets zoom to 1.0 and pan to (0, 0).
   */
  function reset() {
    _pan = { x: 0, y: 0 };
    _zoom = 1.0;
    applyTransform();
  }

  /**
   * Sets zoom and pan simultaneously, clamping zoom to allowed range.
   * @param {number} zoom - New zoom level.
   * @param {number} panX - New pan x.
   * @param {number} panY - New pan y.
   */
  function setTransform(zoom, panX, panY) {
    _zoom = _clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    _pan.x = panX;
    _pan.y = panY;
    applyTransform();
  }

  /**
   * Converts screen (client) coordinates to canvas-world coordinates.
   * @param {number} screenX
   * @param {number} screenY
   * @returns {{ x: number, y: number }}
   */
  function screenToCanvas(screenX, screenY) {
    var wrap = document.getElementById('canvas-wrap');
    var ox = 0;
    var oy = 0;
    if (wrap) {
      var r = wrap.getBoundingClientRect();
      ox = r.left;
      oy = r.top;
    }
    return { x: (screenX - ox - _pan.x) / _zoom, y: (screenY - oy - _pan.y) / _zoom };
  }

  /**
   * Converts canvas-world coordinates to screen (client) coordinates.
   * @param {number} canvasX
   * @param {number} canvasY
   * @returns {{ x: number, y: number }}
   */
  function canvasToScreen(canvasX, canvasY) {
    var wrap = document.getElementById('canvas-wrap');
    var ox = 0;
    var oy = 0;
    if (wrap) {
      var r = wrap.getBoundingClientRect();
      ox = r.left;
      oy = r.top;
    }
    return { x: canvasX * _zoom + _pan.x + ox, y: canvasY * _zoom + _pan.y + oy };
  }

  /**
   * Sets a new zoom level while keeping the point under (originX, originY) fixed.
   * @param {number} newZoom - Desired zoom level (clamped to [MIN_ZOOM, MAX_ZOOM]).
   * @param {number} originX - Screen x of the zoom origin.
   * @param {number} originY - Screen y of the zoom origin.
   */
  function setZoom(newZoom, originX, originY) {
    var canvasOrigin = screenToCanvas(originX, originY);
    _zoom = _clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    var wrap = document.getElementById('canvas-wrap');
    var ox = 0;
    var oy = 0;
    if (wrap) {
      var r = wrap.getBoundingClientRect();
      ox = r.left;
      oy = r.top;
    }
    _pan.x = originX - ox - canvasOrigin.x * _zoom;
    _pan.y = originY - oy - canvasOrigin.y * _zoom;
    applyTransform();
  }

  /**
   * Initialises the viewport by applying the initial transform.
   */
  function init() {
    applyTransform();
  }

  return {
    getTransform:   getTransform,
    setPan:         setPan,
    setZoom:        setZoom,
    setTransform:   setTransform,
    screenToCanvas: screenToCanvas,
    canvasToScreen: canvasToScreen,
    applyTransform: applyTransform,
    reset:          reset,
    init:           init
  };

})();

// Backward-compat shim — minimap.js, canvas/node.js, and index.js use canvasView.*
var canvasView = {
  init:          function()       { viewport.init(); },
  getTransform:  function()       { var t = viewport.getTransform(); return { x: t.pan.x, y: t.pan.y, scale: t.zoom }; },
  setPan:        function(x, y)   { viewport.setPan(x, y); },
  screenToWorld: function(sx, sy) { return viewport.screenToCanvas(sx, sy); },
  worldToScreen: function(wx, wy) { return viewport.canvasToScreen(wx, wy); }
};
