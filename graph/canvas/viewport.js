// viewport.js — owns world transform state, coordinate math, canvas sizing
// deps: (none — reads DOM only)

var canvasViewport = (function() {

  var el = null;
  var ctx = null;

  var width = 0;
  var height = 0;

  var offsetX = 0;
  var offsetY = 0;
  var scale = 1.0;
  var MIN_SCALE = 0.2;
  var MAX_SCALE = 4.0;

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

  function zoomAt(screenX, screenY, direction) {
    var factor = direction > 0 ? 0.9 : 1.1;
    var newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    if (newScale === scale) return false;

    var ratio = newScale / scale;
    offsetX = screenX - ratio * (screenX - offsetX);
    offsetY = screenY - ratio * (screenY - offsetY);
    scale = newScale;
    return true;
  }

  function setupResize(onResize) {
    var column = document.getElementById('canvas-column');
    var observer = new ResizeObserver(function(entries) {
      var rect = entries[0].contentRect;
      width = rect.width;
      height = rect.height;
      el.width = width;
      el.height = height;
      onResize();
    });
    observer.observe(column);
  }

  function init(onResize) {
    el = document.getElementById('main-canvas');
    ctx = el.getContext('2d');
    setupResize(onResize);
  }

  return {
    init: init,
    getEl:  function() { return el; },
    getCtx: function() { return ctx; },
    getTransform: function() {
      return { offsetX: offsetX, offsetY: offsetY, scale: scale };
    },
    getDimensions: function() {
      return { width: width, height: height };
    },
    setTransformOffset: function(x, y) {
      offsetX = x;
      offsetY = y;
    },
    screenToWorld: screenToWorld,
    worldToScreen: worldToScreen,
    zoomAt: zoomAt
  };

}());
