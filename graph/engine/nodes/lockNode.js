/**
 * graph/engine/nodes/lockNode.js
 *
 * Toggles the locked state of all selected nodes.
 *
 * Dependencies: graphState, engine/helpers.js
 * Load before: nodes/index.js
 *
 * Exports: toggleLockSelectedNodes
 */
// graph/engine/nodes/lockNode.js
// DEPENDS ON: graph/graphState.js, graph/engine/helpers.js
// MUST LOAD BEFORE: nodes/index.js

window.__procedia_internal.nlock = (function() {
  var registry = window.__procedia_internal.registry;
  var hlp = registry.get('hlp');

  /**
   * Toggles the locked state of all selected nodes. If all are locked, unlocks
   * them; otherwise locks all.
   */
  function toggleLockSelectedNodes() {
    var sel = graphState.getSelection().slice();
    if (sel.length === 0) return;
    if (typeof undoManager !== 'undefined') undoManager.capture();
    var allLocked = true;
    for (var i = 0; i < sel.length; i++) {
      var n = graphState.getNode(sel[i]);
      if (!n || !n.locked) { allLocked = false; break; }
    }
    var newLocked = !allLocked;
    for (var j = 0; j < sel.length; j++) {
      graphState.updateNode(sel[j], { locked: newLocked });
    }
    if (typeof undoManager !== 'undefined') undoManager.commit(newLocked ? 'Lock nodes' : 'Unlock nodes');
    hlp.refreshNodeUI();
  }

  return {
    toggleLockSelectedNodes: toggleLockSelectedNodes
  };

})();
window.__procedia_internal.registry.register('nlock', window.__procedia_internal.nlock);
