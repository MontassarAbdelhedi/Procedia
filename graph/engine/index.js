/**
 * graph/engine/index.js
 *
 * Public API for the graph engine. Provides node lifecycle operations (drop,
 * delete, duplicate, recreate, lock), wire connection/disconnection, state
 * management (reset, property updates), and internal path/propagation triggers.
 *
 * Dependencies: graphState, nodeRegistry, schemaCache/index.js,
 *               schemaCache/state.js, schemaCache/persistence.js,
 *               schemaCache/diff.js, cascade/index.js,
 *               wireValidator, evalBridge, uuidGenerator, dirtyFlusher,
 *               engine/helpers.js, engine/propagate.js, engine/wires.js,
 *               engine/nodes/index.js, engine/state.js
 * Load before: index.js
 *
 * Exports: dropNode, connectWire, deleteNode, deleteSelectedNodes,
 *          duplicateSelectedNodes, cloneNode, recreateNode, resetAll,
 *          toggleLockSelectedNodes, disconnectWire, setNodeProperty,
 *          _firePathCreation, _applyDynamicSchema
 */
// graph/engine/index.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             graph/schemaCache/state.js, graph/schemaCache/persistence.js,
//             graph/schemaCache/diff.js, graph/schemaCache/index.js,
//             graph/cascade/index.js, graph/wireValidator/index.js,
//             bridge/evalBridge.js, data/uuidGenerator.js, flush/dirtyFlusher.js,
//             graph/engine/helpers.js, graph/engine/propagate.js,
//             graph/engine/wires.js, graph/engine/nodes/index.js, graph/engine/state.js
// MUST LOAD BEFORE: index.js
// REPLACES: graph/engine.js

var engine = (function() {
  var registry = window.__procedia_internal.registry;
  return {
    dropNode:              registry.get('eNodes').dropNode,
    connectWire:           registry.get('wires').connectWire,
    deleteNode:            registry.get('eNodes').deleteNode,
    deleteSelectedNodes:   registry.get('eNodes').deleteSelectedNodes,
    duplicateSelectedNodes: registry.get('eNodes').duplicateSelectedNodes,
    cloneNode:             registry.get('eNodes').cloneNode,
    recreateNode:          registry.get('eNodes').recreateNode,
    resetAll:              registry.get('eState').resetAll,
    toggleLockSelectedNodes: registry.get('eNodes').toggleLockSelectedNodes,
    toggleNodeDisabled:     registry.get('eState').toggleNodeDisabled,
    disconnectWire:        registry.get('wires').disconnectWire,
    setNodeProperty:       registry.get('eState').setNodeProperty,
    switchEffectors:       registry.get('eNodes').switchEffectors,
    findAffectedUpstream:  registry.get('eNodes').findAffectedUpstream,
    findSiblingEffectors:  registry.get('eNodes').findSiblingEffectors
  };
})();
