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

window.__procedia_internal.eNodes = (function() {
  var registry = window.__procedia_internal.registry;
  return {
    dropNode:                registry.get('ndrop').dropNode,
    deleteNode:              registry.get('ndel').deleteNode,
    deleteSelectedNodes:     registry.get('ndel').deleteSelectedNodes,
    duplicateSelectedNodes:  registry.get('ndup').duplicateSelectedNodes,
    toggleLockSelectedNodes: registry.get('nlock').toggleLockSelectedNodes,
    recreateNode:            registry.get('nrec').recreateNode,
    cloneNode:               registry.get('nclone').cloneNode,
    switchEffectors:         registry.get('nswitch').switchEffectors,
    findAffectedUpstream:    registry.get('nswitch').findAffectedUpstream,
    findSiblingEffectors:    registry.get('nswitch').findSiblingEffectors
  };
})();
window.__procedia_internal.registry.register('eNodes', window.__procedia_internal.eNodes);
