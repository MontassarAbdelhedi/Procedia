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

window.__procedia_internal.ndup = (function() {
  var registry = window.__procedia_internal.registry;
  var hlp = registry.get('hlp');

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

      var def = nodeRegistry.getDefinition(src.type);
      if (def && typeof def.onDrop === 'function') {
        var dropCommand = def.onDrop(copy);
        if (dropCommand !== null) {
          (function(copyId, cmd) {
            evalBridge.dispatch(cmd).then(function(res) {
              if (res && res.ok) {
                graphState.updateNode(copyId, { state: 'alive' });
              } else {
                console.error('[engine] duplicate onDrop failed for ' + copyId + ': ' + (res && res.error || 'unknown error'));
                graphState.updateNode(copyId, { state: 'error' });
              }
              hlp.refreshNodeUI();
            });
          })(copy.id, dropCommand);
        }
      }
    }
    graphState.replaceSelection(newIds);
    if (typeof undoManager !== 'undefined') undoManager.commit('Duplicate ' + newIds.length + ' node' + (newIds.length > 1 ? 's' : ''));
    hlp.refreshNodeUI();
  }

  return {
    duplicateSelectedNodes: duplicateSelectedNodes
  };

})();
window.__procedia_internal.registry.register('ndup', window.__procedia_internal.ndup);
