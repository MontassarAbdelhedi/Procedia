/**
 * Shared internal state and capture/commit helpers for undoManager.
 * @module undoManager/state
 * @dependencies none
 * @internal
 */
// graph/undoManager/state.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/undoManager/aeReconcile.js, graph/undoManager/restore.js,
//                   graph/undoManager/index.js

window.__procedia_internal.um = {
  undoStack: [],
  redoStack: [],
  MAX_DEPTH: 50,
  _beforeSnapshot: null,
  _isReconciling: false,
  _commitTimer: null,
  _captureDepth: 0
};

(function(um) {

  function _deepClone(obj) {
    return window.__procedia_internal.deepClone(obj);
  }

  function _deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function _getState() {
    var sel = graphState.getSelection();
    return {
      nodes: _deepClone(graphState.getAllNodes()),
      wires: _deepClone(graphState.getAllWires()),
      selection: (sel ? sel.slice() : [])
    };
  }

  function capture() {
    if (um._isReconciling) return;
    if (um._captureDepth === 0) {
      um._beforeSnapshot = _getState();
    }
    um._captureDepth++;
  }

  function commit(description) {
    if (um._isReconciling) return;
    if (um._captureDepth > 0) um._captureDepth--;
    if (um._captureDepth > 0) return;
    if (um._commitTimer) { clearTimeout(um._commitTimer); um._commitTimer = null; }
    _pushUndo(description);
  }

  function commitDebounced(description, delay) {
    delay = delay || 200;
    if (um._isReconciling) return;
    if (um._captureDepth > 0) um._captureDepth--;
    if (um._captureDepth > 0) return;
    var now = Date.now();
    if (!um._lastCommitTime) um._lastCommitTime = 0;
    if (now - um._lastCommitTime >= delay) {
      um._lastCommitTime = now;
      _pushUndo(description);
    }
    if (um._commitTimer) clearTimeout(um._commitTimer);
    um._commitTimer = setTimeout(function() {
      um._commitTimer = null;
    }, delay);
  }

  function _pushUndo(description) {
    var after = _getState();
    if (!um._beforeSnapshot) return;
    if (_deepEqual(um._beforeSnapshot, after)) {
      um._beforeSnapshot = after;
      return;
    }
    um.undoStack.push({
      description: description,
      before: um._beforeSnapshot,
      after: after
    });
    if (um.undoStack.length > um.MAX_DEPTH) um.undoStack.shift();
    um.redoStack = [];
    um._beforeSnapshot = null;
    um._updateUI();
  }

  um.capture = capture;
  um.commit = commit;
  um.commitDebounced = commitDebounced;
  um._pushUndo = _pushUndo;

})(window.__procedia_internal.um);
