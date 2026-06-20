/**
 * @fileoverview onMouseUp handler — finalizes pan, rubber-band selection, and node drag.
 * @dependencies input/state.js, input/utils.js, input/rubberband.js,
 *               graph/graphState.js, graph/canvas/renderer/index.js
 */

// graph/canvas/input/handlers/mouse/mouseup.js
// DEPENDS ON: input/state.js, input/utils.js, input/rubberband.js,
//             graph/graphState.js, graph/canvas/renderer/index.js
// MUST LOAD AFTER: input/handlers/mouse/mousedown.js
// MUST LOAD BEFORE: input/handlers/index.js

(function() {

  _handlersMouse.onMouseUp = function onMouseUp(e) {
    if (_inpPan.active) {
      _inpPan.active = false;
      return;
    }

    if (_inpRubber.active) {
      var dx = Math.abs(_inpRubber.currentX - _inpRubber.startX);
      var dy = Math.abs(_inpRubber.currentY - _inpRubber.startY);
      if (dx >= INP_MIN_RUBBER || dy >= INP_MIN_RUBBER) {
        var ids = inputRubberband.getNodesInRect(
          _inpRubber.startX, _inpRubber.startY,
          _inpRubber.currentX, _inpRubber.currentY
        );
        if (_inpRubber.ctrlKey) {
          var sel = graphState.getSelection().slice();
          for (var i = 0; i < ids.length; i++) {
            var idx = sel.indexOf(ids[i]);
            if (idx !== -1) { sel.splice(idx, 1); }
            else            { sel.push(ids[i]); }
          }
          graphState.replaceSelection(sel);
        } else if (_inpRubber.shiftKey) {
          var sel2 = graphState.getSelection().slice();
          for (var j = 0; j < ids.length; j++) {
            if (sel2.indexOf(ids[j]) === -1) sel2.push(ids[j]);
          }
          graphState.replaceSelection(sel2);
        } else {
          graphState.replaceSelection(ids);
        }
        renderer.render();
      }
      inputRubberband.destroyRubberEl();
      return;
    }

    if (_inpDrag.active) {
      _inpDrag.active = false;
      _inpDrag.nodeId = null;
      _inpDrag.moved = false;
      _inpDrag.selectionStartPositions = null;
      if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
      if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
      if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
    }
  };

})();
