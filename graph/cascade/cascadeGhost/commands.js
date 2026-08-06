/**
 * graph/cascade/cascadeGhost/commands.js
 *
 * Builds the batch of onGhost AE commands for each node in the cascade set.
 * Computes losingComps per node and calls the appropriate node definition hook.
 *
 * Dependencies: graphState, nodeRegistry, cascade/utils.js, cascade/cascadeGhost/collect.js
 * Load before: cascade/cascadeGhost/update.js, cascade/index.js
 */

// graph/cascade/cascadeGhost/commands.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cascade/utils.js
// MUST LOAD AFTER: graph/cascade/cascadeGhost/collect.js
// MUST LOAD BEFORE: graph/cascade/cascadeGhost/update.js, graph/cascade/index.js

(function() {

  __c_ghost._buildBatchCommands = function _buildBatchCommands(cascadeSet, deletedWireId, wireData) {
    var batchCommands = [];
    var remainingCompsPerNode = {};

    for (var cascadeIndex = 0; cascadeIndex < cascadeSet.length; cascadeIndex++) {
      var cascadeNode = cascadeSet[cascadeIndex];
      var remainingComps = __c_ghost_util._hasCompDownstreamExcluding(cascadeNode.id, deletedWireId, {});
      remainingCompsPerNode[cascadeNode.id] = remainingComps;

      var losingComps = [];
      for (var hostCompIndex = 0; hostCompIndex < cascadeNode.hostingComps.length; hostCompIndex++) {
        var compUUID = cascadeNode.hostingComps[hostCompIndex];
        var stillHas = false;
        for (var remainingCompIndex = 0; remainingCompIndex < remainingComps.length; remainingCompIndex++) {
          if (remainingComps[remainingCompIndex] === compUUID) { stillHas = true; break; }
        }
        if (!stillHas) losingComps.push(compUUID);
      }

      var def = nodeRegistry.getDefinition(cascadeNode.type);
      if (!def) continue;

      if (losingComps.length === 0) continue;

      if (losingComps.length < cascadeNode.hostingComps.length) {
        var partialUUID = wireData._pathLayerUUID;
        for (var losingIndex = 0; losingIndex < losingComps.length; losingIndex++) {
          var lostCompId = losingComps[losingIndex];
          batchCommands.push({
            action: 'deletePathLayer',
            params: {
              hostingCompUUID: lostCompId,
              layerUUID:       partialUUID
            }
          });
        }
        continue;
      }

      for (var losingCompIndex = 0; losingCompIndex < losingComps.length; losingCompIndex++) {
        var losingCompId = losingComps[losingCompIndex];
        var cmd = null;

        if (cascadeNode.nodeKind === 'effector') {
          var upstreamNodeUUID = wireData._pathLayerUUID;
          cmd = def.onGhost(cascadeNode, losingCompId, upstreamNodeUUID);
        } else {
          cmd = def.onGhost(cascadeNode, losingCompId);
          if (cmd && cmd.params) {
            cmd.params.layerUUID = wireData._pathLayerUUID;
          }
        }

        if (cmd !== null) batchCommands.push(cmd);
      }
    }

    return {
      batchCommands: batchCommands,
      remainingCompsPerNode: remainingCompsPerNode
    };
  };

})();
