/**
 * @fileoverview Minimap renderer: draws node dots and viewport indicator.
 * @dependencies graph/canvas/minimap/constants.js, graph/canvas/minimap/state.js,
 *               graph/canvas/minimap/utils.js, graph/canvas/viewport.js
 */

(function(m) {
  var C = m.C;
  var S = m.S;

  m.render = function() {
    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    if (canvas.style.display === 'none') return;
    var ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, C.MINIMAP_W, C.MINIMAP_H);
    ctx.fillStyle = '#111116';
    ctx.fillRect(0, 0, C.MINIMAP_W, C.MINIMAP_H);

    var t = canvasView.getTransform();
    var canvasWrap = document.getElementById('canvas-wrap');
    var wrapW = canvasWrap ? canvasWrap.clientWidth  : 800;
    var wrapH = canvasWrap ? canvasWrap.clientHeight : 600;

    var frame = m.computeFrame(t, wrapW, wrapH);
    S.lastFrame = frame;

    var nodes = m.getNodes();

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!graphState.isNodeVisible(node.id)) continue;
      var cx = (node.x || 0) + C.NODE_WIDTH * 0.5;
      var cy = (node.y || 0) + C.NODE_HEIGHT * 0.5;
      var mp = m.canvasToMinimap(cx, cy, frame);

      if (mp.x < -C.DOT_RADIUS || mp.y < -C.DOT_RADIUS ||
          mp.x > C.MINIMAP_W + C.DOT_RADIUS || mp.y > C.MINIMAP_H + C.DOT_RADIUS) {
        continue;
      }

      var color = '#06D6A0';
      if (node.state === 'ghost') color = '#3E3E52';
      if (node.state === 'error') color = '#FF4A6A';

      ctx.globalAlpha = (node.state === 'ghost') ? 0.4 : 0.85;
      ctx.fillStyle   = color;
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, C.DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle   = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(frame.viewMmX, frame.viewMmY, frame.viewMmW, frame.viewMmH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(frame.viewMmX, frame.viewMmY, frame.viewMmW, frame.viewMmH);
  };
})(window.__minimap = window.__minimap || {});
