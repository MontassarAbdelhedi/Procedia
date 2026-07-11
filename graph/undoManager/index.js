/**
 * Public API for the undo/redo system. Assembles sub-modules and exposes
 * capture, commit, commitDebounced, undo, redo, canUndo, canRedo, and reset.
 * @module undoManager
 * @dependencies undoManager/state, undoManager/aeReconcile, undoManager/restore
 */
// graph/undoManager/index.js
// DEPENDS ON: graph/undoManager/state.js, graph/undoManager/aeReconcile.js,
//             graph/undoManager/restore.js
// MUST LOAD AFTER: graph/undoManager/state.js, graph/undoManager/aeReconcile.js,
//                  graph/undoManager/restore.js
// MUST LOAD BEFORE: any engine file that triggers mutations
// EXPORTS: undoManager (window global)

(function(um) {

  function undo() {
    if (um.undoStack.length === 0) return;
    um._isReconciling = true;
    var cmd = um.undoStack.pop();
    um.redoStack.push({
      description: cmd.description,
      before: cmd.after,
      after: cmd.before
    });
    um._restoreState(cmd.before);
    um._reconcileAE(cmd.after, cmd.before);
    um._isReconciling = false;
    um._updateUI();
  }

  function redo() {
    if (um.redoStack.length === 0) return;
    um._isReconciling = true;
    var cmd = um.redoStack.pop();
    um.undoStack.push({
      description: cmd.description,
      before: cmd.after,
      after: cmd.before
    });
    um._restoreState(cmd.after);
    um._reconcileAE(cmd.before, cmd.after);
    um._isReconciling = false;
    um._updateUI();
  }

  function canUndo() { return um.undoStack.length > 0; }
  function canRedo() { return um.redoStack.length > 0; }
  function getUndoDesc() { return um.undoStack.length > 0 ? um.undoStack[um.undoStack.length - 1].description : ''; }
  function getRedoDesc() { return um.redoStack.length > 0 ? um.redoStack[um.redoStack.length - 1].description : ''; }

  function _updateUI() {
    var undoBtn = document.getElementById('topbar-undo');
    var redoBtn = document.getElementById('topbar-redo');
    if (undoBtn) { undoBtn.disabled = !canUndo(); undoBtn.title = canUndo() ? 'Undo ' + getUndoDesc() : 'Undo'; }
    if (redoBtn) { redoBtn.disabled = !canRedo(); redoBtn.title = canRedo() ? 'Redo ' + getRedoDesc() : 'Redo'; }
  }
  um._updateUI = _updateUI;

  function reset() {
    um.undoStack = [];
    um.redoStack = [];
    um._beforeSnapshot = null;
    um._isReconciling = false;
    um._captureDepth = 0;
    if (um._commitTimer) { clearTimeout(um._commitTimer); um._commitTimer = null; }
    _updateUI();
  }

  var undoManager = {
    capture:          um.capture,
    commit:           um.commit,
    commitDebounced:  um.commitDebounced,
    undo:             undo,
    redo:             redo,
    canUndo:          canUndo,
    canRedo:          canRedo,
    getUndoDesc:      getUndoDesc,
    getRedoDesc:      getRedoDesc,
    reset:            reset
  };

  window.undoManager = undoManager;
  delete window.__procedia_internal.um;

})(window.__procedia_internal.um);
