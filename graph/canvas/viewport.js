/**
 * @fileoverview Viewport manager for the graph canvas.
 * Handles pan, zoom, and coordinate transforms between screen and canvas space.
 * Delegates the dot-grid background to viewport/grid.js.
 * Also exposes a backward-compatible `canvasView` shim.
 * @dependencies viewport/grid.js
 * @exports viewport { getTransform, setPan, setZoom, setTransform, screenToCanvas,
 *                     canvasToScreen, applyTransform, reset, init }
 */

// graph/canvas/viewport.js
// DEPENDS ON: viewport/grid.js
// MUST LOAD BEFORE: renderer/index.js, input/handlers/, minimap/index.js

var viewport = (function() {

  var _pan  = { x: 0, y: 0 };
  var _zoom = 1.0;
  var MIN_ZOOM = 0.1;
  var MAX_ZOOM = 4.0;

  function _clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function applyTransform() {
    var el = document.getElementById('canvas-nodes');
    if (el) {
      el.style.transform =
        'translate(' + _pan.x + 'px, ' + _pan.y + 'px) scale(' + _zoom + ')';
    }
    __vp_grid.applyGridTransform(_pan.x, _pan.y, _zoom);
    if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
  }

  function getTransform() {
    return { pan: { x: _pan.x, y: _pan.y }, zoom: _zoom };
  }

  function setPan(x, y) {
    _pan.x = x;
    _pan.y = y;
    applyTransform();
  }

  function reset() {
    _pan = { x: 0, y: 0 };
    _zoom = 1.0;
    applyTransform();
  }

  function setTransform(zoom, panX, panY) {
    _zoom = _clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    _pan.x = panX;
    _pan.y = panY;
    applyTransform();
  }

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

  function canvasToScreen(canvasX, canvasY) {
    var o = _getWrapOffset();
    return { x: canvasX * _zoom + _pan.x + o.x, y: canvasY * _zoom + _pan.y + o.y };
  }

  function setZoom(newZoom, originX, originY) {
    var canvasOrigin = screenToCanvas(originX, originY);
    _zoom = _clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    var o = _getWrapOffset();
    _pan.x = originX - o.x - canvasOrigin.x * _zoom;
    _pan.y = originY - o.y - canvasOrigin.y * _zoom;
    applyTransform();
  }

  function init() {
    __vp_grid.initGrids();
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
    SNAP_SIZE:      __vp_grid.SNAP_SIZE,
    snapToGrid:     __vp_grid.snapToGrid
  };
})();

var canvasView = {
  init:          function()       { viewport.init(); },
  getTransform:  function()       { var t = viewport.getTransform(); return { x: t.pan.x, y: t.pan.y, scale: t.zoom }; },
  setPan:        function(x, y)   { viewport.setPan(x, y); },
  screenToWorld: function(sx, sy) { return viewport.screenToCanvas(sx, sy); },
  worldToScreen: function(wx, wy) { return viewport.canvasToScreen(wx, wy); }
};
