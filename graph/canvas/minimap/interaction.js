/**
 * @fileoverview Minimap interaction: pan-to-click and fit-all-nodes.
 * @dependencies graph/canvas/minimap/constants.js, graph/canvas/minimap/state.js,
 *               graph/canvas/minimap/utils.js, graph/canvas/viewport.js
 */

(function(m) {
  var C = m.C;
  var S = m.S;

  m.panTo = function(e) {
    if (!S.lastFrame) return;
    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var mmX  = e.clientX - rect.left;
    var mmY  = e.clientY - rect.top;

    var frame = S.lastFrame;
    var canvasX = mmX / frame.scale + frame.boundsX;
    var canvasY = mmY / frame.scale + frame.boundsY;

    var canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasWrap) return;
    var t = viewport.getTransform();
    var newX = -(canvasX * t.zoom) + canvasWrap.clientWidth  / 2;
    var newY = -(canvasY * t.zoom) + canvasWrap.clientHeight / 2;
    viewport.setPan(newX, newY);
  };

  m.fitAll = function() {
    var nodes = m.getNodes();
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
    var bboxW = (maxX - minX) + C.NODE_WIDTH + PAD * 2;
    var bboxH = (maxY - minY) + C.NODE_HEIGHT + PAD * 2;

    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    var wrapW = wrap.clientWidth;
    var wrapH = wrap.clientHeight;

    var zoom = Math.min(wrapW / bboxW, wrapH / bboxH);
    zoom = Math.max(0.1, Math.min(4.0, zoom));

    var centerX = (minX + maxX + C.NODE_WIDTH) / 2;
    var centerY = (minY + maxY + C.NODE_HEIGHT) / 2;

    viewport.setTransform(zoom, wrapW / 2 - centerX * zoom, wrapH / 2 - centerY * zoom);
  };
})(window.__minimap = window.__minimap || {});
