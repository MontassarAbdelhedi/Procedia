/**
 * @fileoverview Keyboard event handlers for the graph canvas.
 * Handles keydown (Delete/Backspace for node/wire deletion, Space for pan mode,
 * Enter/Escape for title editing) and keyup (Space release).
 * @dependencies input/state.js, input/utils.js, input/handlers/titleEdit/helpers.js,
 *               input/handlers/titleEdit/exit.js, input/handlers/titleEdit/commit.js,
 *               input/handlers/titleEdit/cancel.js, input/handlers/titleEdit/dblclick.js,
 *               graph/graphState.js, graph/engine/index.js
 * @exports _handlersKeyboard { onKeyDown, onKeyUp }
 */

// graph/canvas/input/handlers/keyboard.js
// DEPENDS ON: input/state.js, input/utils.js, input/handlers/titleEdit/helpers.js,
//             input/handlers/titleEdit/exit.js, input/handlers/titleEdit/commit.js,
//             input/handlers/titleEdit/cancel.js, input/handlers/titleEdit/dblclick.js,
//             graph/graphState.js, graph/engine/index.js,
//             graph/canvas/viewport.js, graph/canvas/renderer/index.js
// MUST LOAD BEFORE: input/handlers/index.js

var _handlersKeyboard = (function() {

  function onKeyDown(e) {
    if (_editingNodeId) {
      if (e.key === 'Enter') {
        e.preventDefault();
        _handlersTitleEdit.commitTitleEdit();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        _handlersTitleEdit.cancelTitleEdit();
        return;
      }
      return;
    }

    if (e.code === 'Space' && !inputUtils.isEditableTarget(e.target)) {
      _inpSpaceHeld = true;
      e.preventDefault();
      return;
    }

    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (inputUtils.isEditableTarget(e.target)) return;

    if (_selectedWireId) {
      e.preventDefault();
      var wireId = _selectedWireId;
      _selectedWireId = null;
      engine.disconnectWire(wireId);
      if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
      return;
    }

    var sel = graphState.getSelection();
    if (sel.length === 0) return;

    e.preventDefault();
    engine.deleteSelectedNodes();
  }

  function onKeyUp(e) {
    if (e.code === 'Space') _inpSpaceHeld = false;
  }

  return {
    onKeyDown: onKeyDown,
    onKeyUp:   onKeyUp
  };

})();
