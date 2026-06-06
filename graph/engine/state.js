/**
 * graph/engine/state.js
 *
 * Global state operations for the graph engine: resetting the entire graph
 * (clearing all nodes/wires) and setting individual node properties with
 * automatic propagation for data nodes.
 *
 * Dependencies: graphState, nodeRegistry, evalBridge, dirtyFlusher,
 *               engine/helpers.js
 * Load before: engine/index.js
 *
 * Exports: resetAll, setNodeProperty
 */
// graph/engine/state.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             bridge/evalBridge.js, flush/dirtyFlusher.js,
//             graph/engine/helpers.js
// MUST LOAD BEFORE: engine/index.js

var __e_state = (function() {
  var hlp = __e_hlp;

  /**
   * Resets the entire graph: dispatches onDelete for all nodes, clears the
   * graph state, and resets all UI components.
   */
  function resetAll() {
    var allNodes = graphState.getAllNodes();
    var ids = Object.keys(allNodes);

    for (var i = ids.length - 1; i >= 0; i--) {
      var nd = allNodes[ids[i]];
      var def = nodeRegistry.getDefinition(nd.type);
      if (def && def.onDelete) evalBridge.dispatch(def.onDelete(nd));
    }

    graphState.clearGraph();

    if (typeof viewport !== 'undefined' && viewport.reset) viewport.reset();
    if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
    if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    if (typeof topBar !== 'undefined' && topBar.refreshSelection) topBar.refreshSelection([]);

    console.log('[Procedia] reset complete — ' + ids.length + ' nodes removed');
  }

  /**
   * Sets a property on a node and propagates it to connected data wire targets
   * if the node is a data node and the key is not 'label'.
   *
   * @param {string} nodeId - Node ID to update
   * @param {string} key - Property key
   * @param {*} value - Property value
   */
  function setNodeProperty(nodeId, key, value) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) {
      console.warn('[engine] setNodeProperty: node not found:', nodeId);
      return;
    }
    graphState.updateProp(nodeId, key, value);
    if (nodeData.nodeKind === 'data' && key !== 'label') {
      hlp.propagateDataValue(nodeId, key, value);
    }

    var allNodes = graphState.getAllNodes();
    for (var id in allNodes) {
      if (allNodes[id]._cloneMasterId === nodeId && allNodes[id].nodeKind === 'data' && key !== 'label') {
        hlp.propagateDataValue(id, key, value);
      }
    }

    if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.schedule) dirtyFlusher.schedule();
  }

  return {
    resetAll:         resetAll,
    setNodeProperty:  setNodeProperty
  };

})();
