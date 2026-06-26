/**
 * In-memory graph state: holds all nodes, wires, and selection state.
 * Provides CRUD operations for nodes and wires, a dirty-flag system,
 * multi-select tracking, and a stripped temp-graph snapshot used by
 * downstream modules (schemaCache, engine, cascade, etc.).
 * @module graphState
 * @dependencies graphState/state, graphState/tempGraph, graphState/nodes,
 *                graphState/wires, graphState/props, graphState/selection,
 *                graphState/graphOps
 * @exports addNode, removeNode, updateNode, getNode, getAllNodes,
 *          addWire, removeWire, updateWire, getWire, getAllWires,
 *          updateProp, clearDirty,
 *          setSelection, getSelection, addToSelection, removeFromSelection,
 *          toggleSelection, isSelected, clearSelection, replaceSelection,
 *          getSelectionCount, onSelectionChange,
 *          rebuildTempGraph, loadGraph, clearGraph, getCloneIds,
 *          setActiveComp, getActiveComp, setFilteredNodes, clearFilter,
 *          isNodeVisible, addToFilteredNodes, onGraphChange, offGraphChange
 */
// graph/graphState/index.js
// DEPENDS ON: graph/graphState/state.js, graph/graphState/tempGraph.js,
//             graph/graphState/nodes.js, graph/graphState/wires.js,
//             graph/graphState/props.js, graph/graphState/selection.js,
//             graph/graphState/graphOps.js
// MUST LOAD AFTER: all graph/graphState/*.js except this one
// MUST LOAD BEFORE: graph/schemaCache/state.js, graph/schemaCache/persistence.js, graph/schemaCache/diff.js, graph/schemaCache/index.js, graph/engine/index.js, graph/cascade/index.js,
//                   graph/portManager.js, graph/wireValidator/index.js, graph/cycleChecker.js

(function() {
  var gs = window.__gs;
  var graphState = {
    addNode:              gs.addNode,
    removeNode:           gs.removeNode,
    updateNode:           gs.updateNode,
    getNode:              gs.getNode,
    getAllNodes:          gs.getAllNodes,

    addWire:              gs.addWire,
    removeWire:           gs.removeWire,
    updateWire:           gs.updateWire,
    getWire:              gs.getWire,
    getAllWires:          gs.getAllWires,

    updateProp:           gs.updateProp,
    clearDirty:           gs.clearDirty,

    setSelection:         gs.setSelection,
    getSelection:         gs.getSelection,
    addToSelection:       gs.addToSelection,
    removeFromSelection:  gs.removeFromSelection,
    toggleSelection:      gs.toggleSelection,
    isSelected:           gs.isSelected,
    clearSelection:       gs.clearSelection,
    replaceSelection:     gs.replaceSelection,
    getSelectionCount:    gs.getSelectionCount,
    onSelectionChange:    gs.onSelectionChange,

    rebuildTempGraph:     gs.rebuildTempGraph,
    loadGraph:            gs.loadGraph,
    clearGraph:           gs.clearGraph,
    getCloneIds:          gs.getCloneIds,

    setActiveComp: function(id) { gs._activeCompId = id || null; },
    getActiveComp: function()   { return gs._activeCompId; },

    setFilteredNodes: function(nodeIds) {
      if (nodeIds === null || nodeIds === undefined) {
        gs._viewFilter = null;
        return;
      }
      var filter = {};
      for (var i = 0; i < nodeIds.length; i++) {
        filter[nodeIds[i]] = true;
      }
      gs._viewFilter = filter;
    },
    clearFilter: function() { gs._viewFilter = null; },
    isNodeVisible: function(nodeId) {
      if (!gs._viewFilter) return true;
      return !!gs._viewFilter[nodeId];
    },
    addToFilteredNodes: function(nodeId) {
      if (gs._viewFilter) {
        gs._viewFilter[nodeId] = true;
      }
    },
    onGraphChange:        gs._graphChangeListeners.push.bind(gs._graphChangeListeners),
    offGraphChange:       function(cb) {
      var idx = gs._graphChangeListeners.indexOf(cb);
      if (idx !== -1) gs._graphChangeListeners.splice(idx, 1);
    }
  };

  window.graphState = graphState;
  delete window.__gs;
})();
