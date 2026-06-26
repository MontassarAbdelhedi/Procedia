/**
 * @fileoverview onMouseMove handler — handles pan, rubber-band update, and node drag.
 * @dependencies input/state.js, input/utils.js, input/rubberband.js,
 *               graph/graphState.js, graph/canvas/viewport.js,
 *               graph/canvas/renderer/index.js
 */

// graph/canvas/input/handlers/mouse/mousemove.js
// DEPENDS ON: input/state.js, input/utils.js, input/rubberband.js,
//             graph/graphState.js, graph/canvas/viewport.js,
//             graph/canvas/renderer/index.js
// MUST LOAD AFTER: input/handlers/mouse/mousedown.js
// MUST LOAD BEFORE: input/handlers/index.js

(function() {

  /**
   * Snaps a canvas coordinate to the grid if snap-to-grid is enabled.
   * @param {number} v
   * @returns {number}
   */
  function _maybeSnap(v) {
    if (typeof settings !== 'undefined' && settings.get('snapToGrid')) {
      return viewport.snapToGrid(v);
    }
    return v;
  }

  _handlersMouse.onMouseMove = function onMouseMove(e) {
    if (_inpPan.active) {
      var dx = e.clientX - _inpPan.startScreen.x;
      var dy = e.clientY - _inpPan.startScreen.y;
      viewport.setPan(_inpPan.startPan.x + dx, _inpPan.startPan.y + dy);
      return;
    }

    if (_inpRubber.active) {
      var wp = inputUtils.clientToWrap(e.clientX, e.clientY);
      _inpRubber.currentX = wp.x;
      _inpRubber.currentY = wp.y;
      inputRubberband.updateRubberEl();
      return;
    }

    if (!_inpDrag.active) {
      var hitWire = (typeof canvasDrag !== 'undefined' && canvasDrag.findWireAt)
        ? canvasDrag.findWireAt(e.clientX, e.clientY)
        : null;
      var newWireId = hitWire ? hitWire.id : null;
      if (newWireId !== _hoveredWireId) {
        _hoveredWireId = newWireId;
        if (typeof wireRenderer !== 'undefined' && wireRenderer._updateInsertBtn) {
          wireRenderer._updateInsertBtn();
        }
      }
      return;
    }

    var currentCanvas = viewport.screenToCanvas(e.clientX, e.clientY);
    var dx = currentCanvas.x - _inpDrag.dragStartCanvas.x;
    var dy = currentCanvas.y - _inpDrag.dragStartCanvas.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      _inpDrag.moved = true;
    }
    var newX = _maybeSnap(_inpDrag.nodeStartPos.x + dx);
    var newY = _maybeSnap(_inpDrag.nodeStartPos.y + dy);

    graphState.updateNode(_inpDrag.nodeId, { x: newX, y: newY });

    var selection = graphState.getSelection();
    if (selection.length > 1) {
      for (var i = 0; i < selection.length; i++) {
        if (selection[i] === _inpDrag.nodeId) continue;
        var startPos = _inpDrag.selectionStartPositions[selection[i]];
        if (!startPos) continue;
        var newSelX = _maybeSnap(startPos.x + dx);
        var newSelY = _maybeSnap(startPos.y + dy);
        graphState.updateNode(selection[i], { x: newSelX, y: newSelY });
        var selEl = renderer.getNodeElement(selection[i]);
        if (selEl) {
          selEl.style.left = newSelX + 'px';
          selEl.style.top  = newSelY + 'px';
        }
      }
    }

    var el = renderer.getNodeElement(_inpDrag.nodeId);
    if (el) {
      el.style.left = newX + 'px';
      el.style.top  = newY + 'px';
    }
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
  };

})();
