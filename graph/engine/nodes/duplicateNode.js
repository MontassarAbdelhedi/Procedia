/**
 * graph/engine/nodes/duplicateNode.js
 *
 * Duplicates all selected nodes with a 30px offset on each axis.
 *
 * Dependencies: graphState, uuidGenerator, engine/helpers.js
 * Load before: nodes/index.js
 *
 * Exports: duplicateSelectedNodes
 */
// graph/engine/nodes/duplicateNode.js
// DEPENDS ON: graph/graphState.js, data/uuidGenerator.js,
//             graph/engine/helpers.js
// MUST LOAD BEFORE: nodes/index.js

var __e_ndup = (function() {
  var hlp = __e_hlp;

  /**
   * Duplicates all selected nodes, offsetting copies by 30px in each axis.
   * New nodes replace the current selection.
   */
  function duplicateSelectedNodes() {
    var sel = graphState.getSelection().slice();
    if (sel.length === 0) return;
    if (typeof undoManager !== 'undefined') undoManager.capture();
    var newIds = [];
    for (var i = 0; i < sel.length; i++) {
      var src = graphState.getNode(sel[i]);
      if (!src) continue;
      var copy = hlp.deepCopyNode(src);
      copy.id = uuidGenerator.node();
      copy.x = src.x + 30;
      copy.y = src.y + 30;
      copy.dirty = false;
      copy.hostingComps = [];
      if (src.nodeKind !== 'data' && src.nodeKind !== 'merge' && src.nodeKind !== 'multimerge') {
        copy.state = 'ghost';
      }
      graphState.addNode(copy);
      newIds.push(copy.id);
    }
    graphState.replaceSelection(newIds);
    if (typeof undoManager !== 'undefined') undoManager.commit('Duplicate ' + newIds.length + ' node' + (newIds.length > 1 ? 's' : ''));
    hlp.refreshNodeUI();
  }

  return {
    duplicateSelectedNodes: duplicateSelectedNodes
  };

})();
