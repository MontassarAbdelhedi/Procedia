/**
 * graph/cascade/cascadeGhost/ghost.js
 *
 * cascadeGhost() — main entry point for the cascade ghosting algorithm.
 * Called when a layer wire is deleted. Orchestrates the collection, command
 * building, state update, parent-wire cleanup, and dispatch sequence.
 *
 * Dependencies: graphState, nodeRegistry, evalBridge, cascade/utils.js,
 *               cascade/cascadeGhost/collect.js, cascade/cascadeGhost/commands.js,
 *               cascade/cascadeGhost/update.js, cascade/cascadeGhost/cleanup.js
 * Load before: cascade/index.js
 */

// graph/cascade/cascadeGhost/ghost.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js,
//             graph/cascade/utils.js
// MUST LOAD AFTER: graph/cascade/cascadeGhost/collect.js,
//                  graph/cascade/cascadeGhost/commands.js,
//                  graph/cascade/cascadeGhost/update.js,
//                  graph/cascade/cascadeGhost/cleanup.js
// MUST LOAD BEFORE: graph/cascade/index.js

(function() {

  __c_ghost.cascadeGhost = function cascadeGhost(deletedWireId) {
    var wireData = graphState.getWire(deletedWireId);
    if (!wireData) {
      console.warn('[cascadeAlgorithm] cascadeGhost: wire not found: ' + deletedWireId);
      return;
    }

    if (wireData.type !== 'layer') return;

    var sourceNodeId = wireData.fromNode;
    var sourceNodeData = graphState.getNode(sourceNodeId);
    if (!sourceNodeData) return;

    var result = __c_ghost._collectCascadeSet(sourceNodeId);

    if (result.cascadeSet.length === 0) {
      graphState.removeWire(deletedWireId);
      graphState.rebuildTempGraph();
      return;
    }

    var cmdResult = __c_ghost._buildBatchCommands(result.cascadeSet, deletedWireId, wireData);
    __c_ghost._updateNodes(result.cascadeSet, cmdResult.remainingCompsPerNode);
    __c_ghost._cleanupParentWires();

    if (wireData._pathLayerUUID !== null) {
      graphState.updateWire(deletedWireId, { _pathLayerUUID: null });
    }
    graphState.removeWire(deletedWireId);

    if (cmdResult.batchCommands.length > 0) {
      evalBridge.dispatchBatch(cmdResult.batchCommands).then(function(res) {
        if (!res.ok) {
          console.error('[cascadeAlgorithm] dispatchBatch failed: ' + res.error);
        }
      });
    }

    graphState.rebuildTempGraph();
  };

})();
