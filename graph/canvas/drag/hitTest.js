/**
 * @fileoverview Wire hit-testing for the graph canvas.
 * Provides hitTestWire (bezier/direct/stepped) and findWireAt.
 * @dependencies graph/graphState.js, graph/canvas/drag/helpers.js
 */

// graph/canvas/drag/hitTest.js
// DEPENDS ON: graph/graphState.js, graph/canvas/drag/helpers.js
// MUST LOAD AFTER: graph/canvas/drag/helpers.js
// MUST LOAD BEFORE: index.js

(function() {

  canvasDrag.hitTestWire = function hitTestWire(wrapX, wrapY, wire) {
    var from = canvasDrag._portPosInWrap(wire.fromNode, wire.fromPort);
    var to   = canvasDrag._portPosInWrap(wire.toNode, wire.toPort);
    if (!from || !to) return false;

    var x1 = from.x, y1 = from.y;
    var x2 = to.x, y2 = to.y;

    var style = (typeof settings !== 'undefined' && settings.get) ? settings.get('wireStyle') : 'bezier';

    if (style === 'direct') {
      return canvasDrag._distToSegmentSq(wrapX, wrapY, x1, y1, x2, y2) <= canvasDrag.__HIT_THRESHOLD * canvasDrag.__HIT_THRESHOLD;
    }

    if (style === 'stepped') {
      var mx = (x1 + x2) / 2;
      var d1 = canvasDrag._distToSegmentSq(wrapX, wrapY, x1, y1, mx, y1);
      var d2 = canvasDrag._distToSegmentSq(wrapX, wrapY, mx, y1, mx, y2);
      var d3 = canvasDrag._distToSegmentSq(wrapX, wrapY, mx, y2, x2, y2);
      var minD = Math.min(d1, d2, d3);
      return minD <= canvasDrag.__HIT_THRESHOLD * canvasDrag.__HIT_THRESHOLD;
    }

    var dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
    var distSq = canvasDrag._sampleBezier(x1, y1, x1 + dx, y1, x2 - dx, y2, x2, y2, wrapX, wrapY);
    return distSq <= canvasDrag.__HIT_THRESHOLD * canvasDrag.__HIT_THRESHOLD;
  };

  canvasDrag.findWireAt = function findWireAt(clientX, clientY) {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return null;
    var wr = wrap.getBoundingClientRect();
    var wrapX = clientX - wr.left;
    var wrapY = clientY - wr.top;

    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      if (canvasDrag.hitTestWire(wrapX, wrapY, wires[wireId])) {
        return wires[wireId];
      }
    }
    return null;
  };

})();
