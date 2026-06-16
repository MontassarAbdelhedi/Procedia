/**
 * @fileoverview cancelTitleEdit — reverts the inline title edit.
 * @dependencies input/state.js, graph/canvas/renderer/index.js
 */

// graph/canvas/input/handlers/titleEdit/cancel.js
// DEPENDS ON: input/state.js, graph/canvas/renderer/index.js
// MUST LOAD AFTER: input/handlers/titleEdit/helpers.js, input/handlers/titleEdit/exit.js
// MUST LOAD BEFORE: input/handlers/index.js

(function() {

  _handlersTitleEdit.cancelTitleEdit = function cancelTitleEdit() {
    if (!_editingNodeId) return;
    _handlersTitleEdit._exitTitleEdit();
    renderer.render();
  };

})();
