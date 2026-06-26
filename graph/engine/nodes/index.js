/**
 * graph/engine/nodes/index.js
 *
 * Aggregates node lifecycle operations from the split files into a single
 * __e_nodes IIFE for consumption by engine/index.js.
 *
 * Dependencies: nodes/dropNode.js, nodes/deleteNode.js, nodes/duplicateNode.js,
 *               nodes/lockNode.js, nodes/recreateNode.js
 * Load before: engine/state.js, engine/index.js
 *
 * Exports: dropNode, deleteNode, deleteSelectedNodes, duplicateSelectedNodes,
 *          toggleLockSelectedNodes, recreateNode, cloneNode
 */
// graph/engine/nodes/index.js
// DEPENDS ON: graph/engine/nodes/dropNode.js, graph/engine/nodes/deleteNode.js,
//             graph/engine/nodes/duplicateNode.js, graph/engine/nodes/lockNode.js,
//             graph/engine/nodes/recreateNode.js, graph/engine/nodes/cloneNode.js
// MUST LOAD BEFORE: engine/state.js, engine/index.js
// REPLACES: graph/engine/nodes.js

var __e_nodes = (function() {
  return {
    dropNode:                __e_ndrop.dropNode,
    deleteNode:              __e_ndel.deleteNode,
    deleteSelectedNodes:     __e_ndel.deleteSelectedNodes,
    duplicateSelectedNodes:  __e_ndup.duplicateSelectedNodes,
    toggleLockSelectedNodes: __e_nlock.toggleLockSelectedNodes,
    recreateNode:            __e_nrec.recreateNode,
    cloneNode:               __e_nclone.cloneNode
  };
})();
