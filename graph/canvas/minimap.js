// graph/canvas/minimap.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: index.js

var minimap = (function() {

  var MINIMAP_W   = 160;
  var MINIMAP_H   = 100;
  var NODE_WIDTH  = 180;
  var NODE_HEIGHT = 120;
  var PADDING     = 40;

  var _lastBounds    = null;
  var _lastNodeCount = 0;
  var _panning       = false;

  function _computeBounds(nodes) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var nodeCount = 0;
    var id, node;
    for (id in nodes) {
      node = nodes[id];
      nodeCount++;
      if (node.x < minX) minX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.x + NODE_WIDTH > maxX)  maxX = node.x + NODE_WIDTH;
      if (node.y + NODE_HEIGHT > maxY) maxY = node.y + NODE_HEIGHT;
    }
    if (nodeCount === 0) {
      return { nodeCount: 0, boundsX: 0, boundsY: 0, boundsW: MINIMAP_W, boundsH: MINIMAP_H, scale: 1, offsetX: 0, offsetY: 0 };
    }
    var boundsX = minX - PADDING;
    var boundsY = minY - PADDING;
    var boundsW = (maxX - minX) + PADDING * 2;
    var boundsH = (maxY - minY) + PADDING * 2;
    var scale   = Math.min(MINIMAP_W / boundsW, MINIMAP_H / boundsH) * 0.5;
    var offsetX = (MINIMAP_W - boundsW * scale) / 2;
    var offsetY = (MINIMAP_H - boundsH * scale) / 2;
    return { nodeCount: nodeCount, boundsX: boundsX, boundsY: boundsY, boundsW: boundsW, boundsH: boundsH, scale: scale, offsetX: offsetX, offsetY: offsetY };
  }

  function _canvasToMinimap(cx, cy, bounds) {
    return {
      x: (cx - bounds.boundsX) * bounds.scale + bounds.offsetX,
      y: (cy - bounds.boundsY) * bounds.scale + bounds.offsetY
    };
  }

  function render() {
    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);
    ctx.fillStyle = '#111116';
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

    var nodes = graphState.getAllNodes();
    var bounds = _computeBounds(nodes);
    _lastBounds    = bounds;
    _lastNodeCount = bounds.nodeCount;

    var id, node, mm, cx, cy, r;

    if (bounds.nodeCount > 0) {
      r = Math.max(NODE_WIDTH * bounds.scale * 0.3, 2);
      for (id in nodes) {
        node = nodes[id];
        mm = _canvasToMinimap(node.x + NODE_WIDTH * 0.5, node.y + NODE_HEIGHT * 0.5, bounds);
        cx = mm.x;
        cy = mm.y;

        ctx.globalAlpha = (node.state === 'ghost') ? 0.4 : 0.85;
        ctx.fillStyle   = '#7A7A92';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Draw viewport rectangle
    var t = viewport.getTransform();
    var pan  = t.pan;
    var zoom = t.zoom;

    var canvasWrap = document.getElementById('canvas-wrap');
    var wrapW = canvasWrap ? canvasWrap.clientWidth  : 800;
    var wrapH = canvasWrap ? canvasWrap.clientHeight : 600;

    var viewLeft   = -pan.x / zoom;
    var viewTop    = -pan.y / zoom;
    var viewRight  = viewLeft  + wrapW / zoom;
    var viewBottom = viewTop   + wrapH / zoom;

    var vx, vy, vw, vh;
    if (bounds.nodeCount > 0) {
      var tl = _canvasToMinimap(viewLeft,  viewTop,    bounds);
      var br = _canvasToMinimap(viewRight, viewBottom, bounds);
      vx = tl.x;
      vy = tl.y;
      vw = br.x - tl.x;
      vh = br.y - tl.y;
    } else {
      vx = 0; vy = 0; vw = MINIMAP_W; vh = MINIMAP_H;
    }

    ctx.fillStyle   = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(vx, vy, vw, vh);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(vx, vy, vw, vh);
  }

  function _panToMinimap(e) {
    if (!_lastBounds || _lastNodeCount === 0) return;

    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;

    var rect    = canvas.getBoundingClientRect();
    var mmX     = e.clientX - rect.left;
    var mmY     = e.clientY - rect.top;
    var bounds  = _lastBounds;
    var canvasX = (mmX - bounds.offsetX) / bounds.scale + bounds.boundsX;
    var canvasY = (mmY - bounds.offsetY) / bounds.scale + bounds.boundsY;

    var canvasWrap = document.getElementById('canvas-wrap');
    var t = viewport.getTransform();
    var newPanX = -(canvasX * t.zoom) + (canvasWrap ? canvasWrap.clientWidth  : 800) / 2;
    var newPanY = -(canvasY * t.zoom) + (canvasWrap ? canvasWrap.clientHeight : 600) / 2;
    viewport.setPan(newPanX, newPanY);

    render();
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
