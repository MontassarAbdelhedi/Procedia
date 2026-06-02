/**
 * @fileoverview Utility functions for the minimap: data access, coordinate math.
 * @dependencies graph/canvas/minimap/constants.js, graph/graphState.js
 */

(function(m) {
  var C = m.C;

  m.getNodes = function() {
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
  };

  m.computeFrame = function(t, wrapW, wrapH) {
    var zoom = t.scale;
    var viewW = wrapW / zoom;
    var viewH = wrapH / zoom;
    var viewLeft = -t.x / zoom;
    var viewTop  = -t.y / zoom;
    var viewCenterX = viewLeft + viewW * 0.5;
    var viewCenterY = viewTop  + viewH * 0.5;

    var maxViewW = C.MINIMAP_W * C.MAX_VIEW_FRAC;
    var maxViewH = C.MINIMAP_H * C.MAX_VIEW_FRAC;
    var mmScale  = Math.min(maxViewW / viewW, maxViewH / viewH);

    var worldW = C.MINIMAP_W / mmScale;
    var worldH = C.MINIMAP_H / mmScale;
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
  };

  m.canvasToMinimap = function(cx, cy, frame) {
    return {
      x: (cx - frame.boundsX) * frame.scale,
      y: (cy - frame.boundsY) * frame.scale
    };
  };
})(window.__minimap = window.__minimap || {});
