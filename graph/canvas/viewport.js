// graph/canvas/viewport.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/canvas/renderer.js, graph/canvas/input.js, graph/canvas/minimap.js, canvas/node.js

var viewport = (function() {

  var _pan  = { x: 0, y: 0 };
  var _zoom = 1.0;
  var MIN_ZOOM = 0.1;
  var MAX_ZOOM = 4.0;
  var GRID_BASE = 24;

  function _clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

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
