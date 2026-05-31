/**
 * graph/engine/index.js
 *
 * Public API for the graph engine. Provides node lifecycle operations (drop,
 * delete, duplicate, recreate, lock), wire connection/disconnection, state
 * management (reset, property updates), and internal path/propagation triggers.
 *
 * Dependencies: graphState, nodeRegistry, schemaCache, cascade/index.js,
 *               wireValidator, evalBridge, uuidGenerator, dirtyFlusher,
 *               engine/helpers.js, engine/propagate.js, engine/wires.js,
 *               engine/nodes.js, engine/state.js
 * Load before: index.js
 *
 * Exports: dropNode, connectWire, deleteNode, deleteSelectedNodes,
 *          duplicateSelectedNodes, recreateNode, resetAll,
 *          toggleLockSelectedNodes, disconnectWire, setNodeProperty,
 *          _firePathCreation, _applyDynamicSchema
 */
// graph/engine/index.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/schemaCache.js,
//             graph/cascade/index.js, graph/wireValidator.js,
//             bridge/evalBridge.js, data/uuidGenerator.js, flush/dirtyFlusher.js,
//             graph/engine/helpers.js, graph/engine/propagate.js,
//             graph/engine/wires.js, graph/engine/nodes.js, graph/engine/state.js
// MUST LOAD BEFORE: index.js
// REPLACES: graph/engine.js

var engine = (function() {
  return {
    dropNode:              __e_nodes.dropNode,
    connectWire:           __e_wires.connectWire,
    deleteNode:            __e_nodes.deleteNode,
    deleteSelectedNodes:   __e_nodes.deleteSelectedNodes,
    duplicateSelectedNodes: __e_nodes.duplicateSelectedNodes,
    recreateNode:          __e_nodes.recreateNode,
    resetAll:              __e_state.resetAll,
    toggleLockSelectedNodes: __e_nodes.toggleLockSelectedNodes,
    disconnectWire:        __e_wires.disconnectWire,
    setNodeProperty:       __e_state.setNodeProperty,
    _firePathCreation:     __e_prop.firePathCreation,
    _applyDynamicSchema:   __e_hlp.applyDynamicSchema
  };
})();
