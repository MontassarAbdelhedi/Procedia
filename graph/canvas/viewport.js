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

  /**
   * Grid levels for the infinite-zoom dot grid.
   * Each level has a base spacing (px in canvas space), dot radius, and RGB color.
   * Opacity is computed per-level based on the on-screen dot spacing
   * (base * zoom) so that dots remain at a comfortable visual density.
   */
  var GRID_LEVELS = [
    { base: 24,  radius: 1,   color: '34,34,32' },
    { base: 72,  radius: 1.5, color: '48,48,44' },
    { base: 216, radius: 2,   color: '62,62,55' },
  ];

  var _gridLayers = [];

  /** Grid snap size in canvas-space pixels (same as the finest grid level). */
  var SNAP_SIZE = GRID_LEVELS[0].base;

  /**
   * Snaps a canvas-space coordinate to the nearest grid unit.
   * @param {number} value
   * @returns {number}
   */
  function snapToGrid(value) {
    return Math.round(value / SNAP_SIZE) * SNAP_SIZE;
  }

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
   * Returns a grid-layer opacity based on the on-screen dot spacing.
   * Dots look best when spacing is roughly 14–40px on screen.
   * Below 4px they're too dense (fade out); above 120px they're too sparse.
   * @param {number} base - Base spacing of this grid level in canvas px.
   * @param {number} zoom - Current zoom level.
   * @returns {number} Opacity between 0 and 1.
   */
  function _gridOpacity(base, zoom) {
    var spacing = base * zoom;
    if (spacing < 4) return 0;
    if (spacing < 14) return (spacing - 4) / 10;
    if (spacing < 40) return 1;
    if (spacing < 120) return (120 - spacing) / 80;
    return 0;
  }

  /**
   * Creates the grid-layer DOM elements inside #canvas-grid.
   */
  function _initGrids() {
    var container = document.getElementById('canvas-grid');
    if (!container) return;
    if (_gridLayers.length > 0) return;
    for (var i = 0; i < GRID_LEVELS.length; i++) {
      var level = GRID_LEVELS[i];
      var el = document.createElement('div');
      el.className = 'grid-layer';
      el.style.backgroundImage =
        'radial-gradient(circle, rgba(' + level.color + ',1) ' + level.radius + 'px, transparent ' + level.radius + 'px)';
      container.appendChild(el);
      _gridLayers.push({ el: el, base: level.base });
    }
  }

  /**
   * Applies the current pan/zoom to the canvas-nodes element (via CSS transform)
   * and updates all grid layers with per-level opacity, size, and position.
   * Also triggers minimap and wire re-render.
   */
  function applyTransform() {
    var el = document.getElementById('canvas-nodes');
    if (el) {
      el.style.transform =
        'translate(' + _pan.x + 'px, ' + _pan.y + 'px) scale(' + _zoom + ')';
    }
    for (var i = 0; i < _gridLayers.length; i++) {
      var layer = _gridLayers[i];
      var size = layer.base * _zoom;
      var ox = ((_pan.x % size) + size) % size;
      var oy = ((_pan.y % size) + size) % size;
      layer.el.style.opacity = _gridOpacity(layer.base, _zoom);
      layer.el.style.backgroundSize = size + 'px ' + size + 'px';
      layer.el.style.backgroundPosition = ox + 'px ' + oy + 'px';
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
  function _getWrapOffset() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return { x: 0, y: 0 };
    var r = wrap.getBoundingClientRect();
    return { x: r.left, y: r.top };
  }

  function screenToCanvas(screenX, screenY) {
    var o = _getWrapOffset();
    return { x: (screenX - o.x - _pan.x) / _zoom, y: (screenY - o.y - _pan.y) / _zoom };
  }

  /**
   * Converts canvas-world coordinates to screen (client) coordinates.
   * @param {number} canvasX
   * @param {number} canvasY
   * @returns {{ x: number, y: number }}
   */
  function canvasToScreen(canvasX, canvasY) {
    var o = _getWrapOffset();
    return { x: canvasX * _zoom + _pan.x + o.x, y: canvasY * _zoom + _pan.y + o.y };
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
    var o = _getWrapOffset();
    _pan.x = originX - o.x - canvasOrigin.x * _zoom;
    _pan.y = originY - o.y - canvasOrigin.y * _zoom;
    applyTransform();
  }

  /**
   * Initialises the viewport by creating grid layers and applying the initial transform.
   */
  function init() {
    _initGrids();
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
    init:           init,
    SNAP_SIZE:      SNAP_SIZE,
    snapToGrid:     snapToGrid
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
