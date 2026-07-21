/**
 * @fileoverview Keyboard event handlers for the graph canvas.
 * Handles keydown (Delete/Backspace for node/wire/comment deletion, Space for pan mode,
 * Enter/Escape for title editing) and keyup (Space release).
 * @dependencies input/state.js, input/utils.js, input/handlers/titleEdit/helpers.js,
 *               input/handlers/titleEdit/exit.js, input/handlers/titleEdit/commit.js,
 *               input/handlers/titleEdit/cancel.js, input/handlers/titleEdit/dblclick.js,
 *               graph/graphState.js, graph/engine/index.js, graph/comment/commentManager.js
 * @exports _handlersKeyboard { onKeyDown, onKeyUp }
 */

// graph/canvas/input/handlers/keyboard.js
// DEPENDS ON: input/state.js, input/utils.js, input/handlers/titleEdit/helpers.js,
//             input/handlers/titleEdit/exit.js, input/handlers/titleEdit/commit.js,
//             input/handlers/titleEdit/cancel.js, input/handlers/titleEdit/dblclick.js,
//             graph/graphState.js, graph/engine/index.js, graph/comment/commentManager.js,
//             graph/canvas/viewport.js, graph/canvas/renderer/index.js
// MUST LOAD BEFORE: input/handlers/index.js

var _handlersKeyboard = (function() {

  window.addEventListener('blur', function() { _inpSpaceHeld = false; });

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

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        if (typeof undoManager !== 'undefined') undoManager.redo();
      } else {
        if (typeof undoManager !== 'undefined') undoManager.undo();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
      if (inputUtils.isEditableTarget(e.target)) return;
      e.preventDefault();
      var importBtn = document.getElementById('topbar-import');
      if (importBtn && !importBtn.disabled) importBtn.click();
      return;
    }

    if (e.code === 'Space' && !inputUtils.isEditableTarget(e.target)) {
      _inpSpaceHeld = true;
      e.preventDefault();
      return;
    }

    if (e.key !== 'Delete' && e.key !== 'Backspace' && e.keyCode !== 46 && e.keyCode !== 8) return;
    if (inputUtils.isEditableTarget(e.target)) return;

    if (_selectedWireId) {
      e.preventDefault();
      var wireId = _selectedWireId;
      _selectedWireId = null;
      _hoveredWireId = null;
      engine.disconnectWire(wireId);
      if (typeof wireRenderer !== 'undefined') {
        wireRenderer._hideInsertBtn();
        if (wireRenderer.render) wireRenderer.render(null);
      }
      return;
    }

    if (typeof commentManager !== 'undefined') {
      var commentId = commentManager.getSelected();
      if (commentId) {
        e.preventDefault();
        commentManager.deselect();
        commentManager.remove(commentId);
        return;
      }
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
