// graph/canvas/minimap.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js
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

  // Scale minimap to main-canvas zoom; cap viewport indicator at MAX_VIEW_FRAC of minimap.
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

  function _canvasToMinimap(cx, cy, frame) {
    return {
      x: (cx - frame.boundsX) * frame.scale,
      y: (cy - frame.boundsY) * frame.scale
    };
  }

  function render() {
    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
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
    var selection = null;
    if (typeof graphState !== 'undefined' && typeof graphState.getSelection === 'function') {
      selection = graphState.getSelection();
    }

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

      if (selection && selection === node.id) {
        ctx.strokeStyle = '#5555AA';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, DOT_RADIUS + 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.fillStyle   = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(frame.viewMmX, frame.viewMmY, frame.viewMmW, frame.viewMmH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(frame.viewMmX, frame.viewMmY, frame.viewMmW, frame.viewMmH);
  }

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

  function init() {
    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) { console.warn('[minimap] canvas element not found'); return; }

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

  return { render: render, init: init };

})();
