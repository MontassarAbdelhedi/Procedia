/**
 * Graph state restoration and UI refresh for undoManager.
 * @module undoManager/restore
 * @dependencies undoManager/state
 * @internal
 */
// graph/undoManager/restore.js
// DEPENDS ON: graph/undoManager/state.js
// MUST LOAD AFTER: graph/undoManager/state.js
// MUST LOAD BEFORE: graph/undoManager/index.js

(function(um) {

  function _restoreState(state) {
    graphState._replaceState(state.nodes, state.wires, state.selection);
    _refreshUI();
  }

  function _refreshUI() {
    window.__procedia_internal.refreshUI();
    if (typeof topBar !== 'undefined' && topBar.refreshSelection) {
      topBar.refreshSelection(graphState.getSelection());
    }
  }

  um._restoreState = _restoreState;
  um._refreshUI = _refreshUI;

})(window.__procedia_internal.um);
