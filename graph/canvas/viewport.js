// graph/canvas/viewport.js
// DEPENDS ON: (none — reads DOM only)
// MUST LOAD BEFORE: graph/canvas/renderer.js, graph/canvas/input.js

var viewport = (function() {

  var _pan  = { x: 0, y: 0 };
  var _zoom = 1.0;
  var MIN_ZOOM = 0.1;
  var MAX_ZOOM = 4.0;

  function _clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function applyTransform() {
    var el = document.getElementById('canvas-viewport');
    if (!el) return;
    el.style.transform = 'translate(' + _pan.x + 'px, ' + _pan.y + 'px) scale(' + _zoom + ')';
  }

  function getTransform() { return { pan: { x: _pan.x, y: _pan.y }, zoom: _zoom }; }
  function setPan(x, y)   { _pan.x = x; _pan.y = y; applyTransform(); }
  function reset()        { _pan = { x: 0, y: 0 }; _zoom = 1.0; applyTransform(); }

  function screenToCanvas(screenX, screenY) {
    return { x: (screenX - _pan.x) / _zoom, y: (screenY - _pan.y) / _zoom };
  }

  function canvasToScreen(canvasX, canvasY) {
    return { x: canvasX * _zoom + _pan.x, y: canvasY * _zoom + _pan.y };
  }

  function setZoom(newZoom, originX, originY) {
    var canvasOrigin = screenToCanvas(originX, originY);
    _zoom  = _clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    _pan.x = originX - canvasOrigin.x * _zoom;
    _pan.y = originY - canvasOrigin.y * _zoom;
    applyTransform();
  }

  return {
    getTransform:   getTransform,
    setPan:         setPan,
    setZoom:        setZoom,
    screenToCanvas: screenToCanvas,
    canvasToScreen: canvasToScreen,
    applyTransform: applyTransform,
    reset:          reset
  };

})();
