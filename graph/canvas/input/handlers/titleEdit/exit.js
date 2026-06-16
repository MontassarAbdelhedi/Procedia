/**
 * @fileoverview _exitTitleEdit — cleans up inline title-edit state and DOM.
 * @dependencies input/state.js, graph/canvas/renderer/index.js
 */

// graph/canvas/input/handlers/titleEdit/exit.js
// DEPENDS ON: input/state.js, graph/canvas/renderer/index.js
// MUST LOAD AFTER: input/handlers/titleEdit/helpers.js
// MUST LOAD BEFORE: input/handlers/index.js

(function() {

  function _exitTitleEdit() {
    if (!_editingNodeId) return;
    var nodeId = _editingNodeId;
    _editingNodeId = null;
    var nodeEl = renderer.getNodeElement(nodeId);
    if (nodeEl) {
      nodeEl.classList.remove('node--editing');
      var input = nodeEl.querySelector('.node-title-input');
      if (input) {
        input.removeEventListener('keydown', _handlersTitleEdit._onTitleInputKeydown);
        input.removeEventListener('blur', _handlersTitleEdit._onTitleInputBlur);
      }
    }
  }

  _handlersTitleEdit._exitTitleEdit = _exitTitleEdit;
  _handlersTitleEdit.exitTitleEdit = _exitTitleEdit;

})();
