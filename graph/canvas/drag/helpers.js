/**
 * @fileoverview Math helpers and internal state for canvas drag/hit-test.
 * Also declares the canvasDrag container.
 * @dependencies graph/canvas/renderer/index.js
 */

// graph/canvas/drag/helpers.js
// DEPENDS ON: graph/canvas/renderer/index.js
// MUST LOAD BEFORE: graph/canvas/drag/hitTest.js, graph/canvas/drag/insert.js,
//                   graph/canvas/drag/preview.js
// FIRST IN LOAD ORDER among drag/ sub-files

var canvasDrag = {};

(function() {

  var HIT_THRESHOLD = 8;
  var _previewState = null;

  function _bezierPoint(t, p0, p1, p2, p3) {
    var mt = 1 - t;
    return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
  }

  function _distToSegmentSq(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var lenSq = dx*dx + dy*dy;
    if (lenSq === 0) {
      var ddx = px - ax, ddy = py - ay;
      return ddx*ddx + ddy*ddy;
    }
    var t = ((px - ax)*dx + (py - ay)*dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    var cx = ax + t*dx, cy = ay + t*dy;
    var ex = px - cx, ey = py - cy;
    return ex*ex + ey*ey;
  }

  function _sampleBezier(ax, ay, bx, by, cx, cy, dx, dy, px, py) {
    var minDist = Infinity;
    var prevX = _bezierPoint(0, ax, bx, cx, dx);
    var prevY = _bezierPoint(0, ay, by, cy, dy);
    for (var i = 1; i <= 12; i++) {
      var t = i / 12;
      var curX = _bezierPoint(t, ax, bx, cx, dx);
      var curY = _bezierPoint(t, ay, by, cy, dy);
      var d = _distToSegmentSq(px, py, prevX, prevY, curX, curY);
      if (d < minDist) minDist = d;
      prevX = curX;
      prevY = curY;
    }
    return minDist;
  }

  function _portPosInWrap(nodeId, portId) {
    var el = renderer.getNodeElement(nodeId);
    if (!el) return null;
    var dot = el.querySelector('[data-port-id="' + portId + '"]');
    if (!dot) return null;
    var dotRect = dot.getBoundingClientRect();
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return null;
    var wr = wrap.getBoundingClientRect();
    return {
      x: dotRect.left + dotRect.width / 2 - wr.left,
      y: dotRect.top + dotRect.height / 2 - wr.top
    };
  }

  canvasDrag.__HIT_THRESHOLD = HIT_THRESHOLD;
  canvasDrag.__previewState = _previewState;
  canvasDrag._portPosInWrap = _portPosInWrap;
  canvasDrag._sampleBezier = _sampleBezier;
  canvasDrag._distToSegmentSq = _distToSegmentSq;

})();
