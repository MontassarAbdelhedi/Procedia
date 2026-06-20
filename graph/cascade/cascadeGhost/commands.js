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

    for (var ci = 0; ci < cascadeSet.length; ci++) {
      var cn = cascadeSet[ci];
      var remainingComps = __c_ghost_util._hasCompDownstreamExcluding(cn.id, deletedWireId, {});
      remainingCompsPerNode[cn.id] = remainingComps;

      var losingComps = [];
      for (var hci = 0; hci < cn.hostingComps.length; hci++) {
        var compUUID = cn.hostingComps[hci];
        var stillHas = false;
        for (var rci = 0; rci < remainingComps.length; rci++) {
          if (remainingComps[rci] === compUUID) { stillHas = true; break; }
        }
        if (!stillHas) losingComps.push(compUUID);
      }

      var def = nodeRegistry.getDefinition(cn.type);
      if (!def) continue;

      if (losingComps.length === 0) continue;

      if (losingComps.length < cn.hostingComps.length) {
        var partialUUID = wireData._pathLayerUUID !== null
          ? wireData._pathLayerUUID
          : __c_ghost_util._resolvePathLayerUUID(wireData.toNode);
        for (var li = 0; li < losingComps.length; li++) {
          var lostCompId = losingComps[li];
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

      for (var lci = 0; lci < losingComps.length; lci++) {
        var losingCompId = losingComps[lci];
        var cmd = null;

        if (cn.nodeKind === 'effector') {
          var upstreamNodeUUID = null;
          if (wireData._pathLayerUUID !== null) {
            upstreamNodeUUID = wireData._pathLayerUUID;
          } else {
            upstreamNodeUUID = __c_ghost_util._resolvePathLayerUUID(wireData.toNode);
          }
          cmd = def.onGhost(cn, losingCompId, upstreamNodeUUID);
        } else {
          cmd = def.onGhost(cn, losingCompId);
          if (cmd && cmd.params) {
            if (wireData._pathLayerUUID !== null) {
              cmd.params.layerUUID = wireData._pathLayerUUID;
            } else {
              cmd.params.layerUUID = __c_ghost_util._resolvePathLayerUUID(wireData.toNode);
            }
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
