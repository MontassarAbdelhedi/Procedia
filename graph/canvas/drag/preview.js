/**
 * @fileoverview Wire-preview state for drag-over-wire visual feedback.
 * @dependencies graph/graphState.js, graph/canvas/drag/helpers.js
 */

// graph/canvas/drag/preview.js
// DEPENDS ON: graph/graphState.js, graph/canvas/drag/helpers.js
// MUST LOAD AFTER: graph/canvas/drag/helpers.js
// MUST LOAD BEFORE: index.js

(function() {

  var _previewState = null;

  canvasDrag.setWirePreview = function setWirePreview(wireId, clientX, clientY) {
    var wire = graphState.getWire(wireId);
    if (!wire) { canvasDrag.clearWirePreview(); return; }
    var from = canvasDrag._portPosInWrap(wire.fromNode, wire.fromPort);
    var to   = canvasDrag._portPosInWrap(wire.toNode, wire.toPort);
    if (!from || !to) { canvasDrag.clearWirePreview(); return; }
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) { canvasDrag.clearWirePreview(); return; }
    var wr = wrap.getBoundingClientRect();
    _previewState = {
      wireId:     wireId,
      fromPos:    from,
      toPos:      to,
      insertPos:  { x: clientX - wr.left, y: clientY - wr.top }
    };
  };

  canvasDrag.getWirePreview = function getWirePreview() {
    return _previewState;
  };

  canvasDrag.clearWirePreview = function clearWirePreview() {
    _previewState = null;
  };

})();
