// graph/canvas/viewport.js
// DEPENDS ON: (none — reads DOM only)
// MUST LOAD BEFORE: graph/canvas/renderer.js, graph/canvas/input/labelEditor.js

var canvasViewport = (function() {

  var el = null;
  var ctx = null;

  var width  = 0;
  var height = 0;

  var offsetX = 0;   // screen X of world origin — initialised to canvas centre on first resize
  var offsetY = 0;
  var scale   = 1.0;
  var MIN_SCALE = 0.2;
  var MAX_SCALE = 4.0;

  var centred = false;   // true after first resize centres the origin

  // ─── Coordinate conversion ────────────────────────────────────────────────

  function screenToWorld(sx, sy) {
    return {
      x: (sx - offsetX) / scale,
      y: (sy - offsetY) / scale
    };
  }

  function worldToScreen(wx, wy) {
    return {
      x: wx * scale + offsetX,
      y: wy * scale + offsetY
    };
  }

  // ─── Canvas context transform ─────────────────────────────────────────────

  function applyViewport(context) {
    context.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  }

  // ─── Zoom ─────────────────────────────────────────────────────────────────

  function zoomAt(screenX, screenY, direction) {
    var factor   = direction > 0 ? 0.9 : 1.1;
    var newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    if (newScale === scale) return false;
    var ratio = newScale / scale;
    offsetX   = screenX - ratio * (screenX - offsetX);
    offsetY   = screenY - ratio * (screenY - offsetY);
    scale     = newScale;
    return true;
  }

  // ─── Resize ───────────────────────────────────────────────────────────────

  function setupResize(onResize) {
    var column   = document.getElementById('canvas-column');
    var observer = new ResizeObserver(function(entries) {
      var rect = entries[0].contentRect;
      var newW = rect.width;
      var newH = rect.height;

      if (!centred) {
        // First resize: put world origin at canvas centre so worldToScreen(0,0) = centre
        offsetX = newW / 2;
        offsetY = newH / 2;
        centred = true;
      } else {
        // Keep world origin visually stationary when panel is resized
        offsetX += (newW - width) / 2;
        offsetY += (newH - height) / 2;
      }

      width      = newW;
      height     = newH;
      el.width   = width;
      el.height  = height;
      onResize();
    });
    observer.observe(column);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init(onResize) {
    el  = document.getElementById('main-canvas');
    ctx = el.getContext('2d');
    setupResize(onResize);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    init:          init,
    getEl:         function() { return el; },
    getCtx:        function() { return ctx; },
    getTransform:  function() { return { offsetX: offsetX, offsetY: offsetY, scale: scale }; },
    getDimensions: function() { return { width: width, height: height }; },
    setTransformOffset: function(x, y) { offsetX = x; offsetY = y; },
    screenToWorld: screenToWorld,
    worldToScreen: worldToScreen,
    applyViewport: applyViewport,
    zoomAt:        zoomAt
  };

}());
