/**
 * graph/cascade/cascadeGhost.js
 *
 * Implements the cascade ghosting algorithm. When a layer wire is deleted, this
 * module determines which upstream nodes lose their composition connection and
 * transitions them to 'ghost' state, dispatching appropriate AE commands.
 *
 * Dependencies: graphState, nodeRegistry, evalBridge, cascade/utils.js
 * Load before: cascade/index.js
 *
 * Exports: cascadeGhost
 */
// graph/cascade/cascadeGhost.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js,
//             graph/cascade/utils.js
// MUST LOAD BEFORE: graph/cascade/index.js

var __c_ghost = (function() {
  var util = __c_util;

  /**
   * Cascade ghosting entry point. Called when a layer wire is deleted.
   * Determines which upstream nodes lose their composition connection,
   * transitions them to 'ghost' state, and dispatches AE ghost commands.
   *
   * @param {string} deletedWireId - ID of the deleted layer wire
   */
  function cascadeGhost(deletedWireId) {
    // Step 1 — look up the deleted wire
    var wireData = graphState.getWire(deletedWireId);
    if (!wireData) {
      console.warn('[cascadeAlgorithm] cascadeGhost: wire not found: ' + deletedWireId);
      return;
    }

    // Step 2 — only layer wires cascade
    if (wireData.type !== 'layer') return;

    // Step 3 — identify source node
    var sourceNodeId = wireData.fromNode;
    var sourceNodeData = graphState.getNode(sourceNodeId);
    if (!sourceNodeData) return;

    // Step 5 — check if source still has an active comp path after this deletion
    var remainingForSource = util._hasCompDownstreamExcluding(sourceNodeId, deletedWireId, {});
    if (remainingForSource.length > 0) return;

    // Step 6 — collect cascade set: source + upstream affected nodes
    var visitedSet = {};
    var effectors = [];
    var affected = [];

    var upstreamNodes = util.collectPathUpstream(sourceNodeId);
    var workingSet = [sourceNodeData];
    for (var ui = 0; ui < upstreamNodes.length; ui++) {
      workingSet.push(upstreamNodes[ui]);
    }

    for (var wi = 0; wi < workingSet.length; wi++) {
      var nodeData = workingSet[wi];
      if (visitedSet[nodeData.id]) continue;
      visitedSet[nodeData.id] = true;

      if (util.isCompNode(nodeData.id)) continue;
      if (nodeData.state !== 'alive') continue;
      if (nodeData.nodeKind === 'data' ||
          nodeData.nodeKind === 'blending' ||
          nodeData.nodeKind === 'matte') continue;

      if (nodeData.nodeKind === 'effector') {
        effectors.push(nodeData);
      } else {
        affected.push(nodeData);

        // Check input wires for effector nodes attached to this affected node
        var allWires = graphState.getAllWires();
        for (var ewId in allWires) {
          if (!allWires.hasOwnProperty(ewId)) continue;
          var ew = allWires[ewId];
          if (ew.toNode !== nodeData.id) continue;
          var fromData = graphState.getNode(ew.fromNode);
          if (!fromData) continue;
          if (fromData.nodeKind !== 'effector') continue;
          if (visitedSet[fromData.id]) continue;
          if (fromData.state !== 'alive') continue;
          visitedSet[fromData.id] = true;
          effectors.push(fromData);
        }
      }
    }

    // Step 7 — ordered: effectors first, affected last
    var cascadeSet = [];
    for (var ei = 0; ei < effectors.length; ei++) cascadeSet.push(effectors[ei]);
    for (var ai = 0; ai < affected.length; ai++) cascadeSet.push(affected[ai]);

    if (cascadeSet.length === 0) {
      graphState.removeWire(deletedWireId);
      graphState.rebuildTempGraph();
      return;
    }

    // Steps 8 & 9 — compute losingComps per node, build batch commands
    var batchCommands = [];
    var remainingCompsPerNode = {};

    for (var ci = 0; ci < cascadeSet.length; ci++) {
      var cn = cascadeSet[ci];
      var remainingComps = util._hasCompDownstreamExcluding(cn.id, deletedWireId, {});
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

      for (var lci = 0; lci < losingComps.length; lci++) {
        var losingCompId = losingComps[lci];
        var cmd = null;

        if (cn.nodeKind === 'effector') {
          // Resolve upstreamNodeUUID (terminal wire UUID) from main_input wire
          var upstreamNodeUUID = null;
          var effWires = graphState.getAllWires();
          for (var mwId in effWires) {
            if (!effWires.hasOwnProperty(mwId)) continue;
            var mw = effWires[mwId];
            if (mw.toNode === cn.id && mw.toPort === 'main_input') {
              upstreamNodeUUID = util._resolvePathLayerUUID(mw.fromNode);
              break;
            }
          }
          cmd = def.onGhost(cn, losingCompId, upstreamNodeUUID);
        } else {
          cmd = def.onGhost(cn, losingCompId);
          // Inject layerUUID (terminal wire UUID) so dispatcher finds the AE layer
          // by its .comment (set to pathLayerUUID), not by nodeUUID
          if (cmd && cmd.params) {
            cmd.params.layerUUID = util._resolvePathLayerUUID(cn.id);
          }
        }

        if (cmd !== null) batchCommands.push(cmd);
      }
    }

    // Step 10 — update graphState for each node in cascade set
    for (var si = 0; si < cascadeSet.length; si++) {
      var sn = cascadeSet[si];
      var snRemaining = remainingCompsPerNode[sn.id];
      var newHostingComps = [];
      for (var snHci = 0; snHci < sn.hostingComps.length; snHci++) {
        var snCompUUID = sn.hostingComps[snHci];
        for (var snRci = 0; snRci < snRemaining.length; snRci++) {
          if (snRemaining[snRci] === snCompUUID) {
            newHostingComps.push(snCompUUID);
            break;
          }
        }
      }
      var newState = newHostingComps.length === 0 ? 'ghost' : 'alive';
      var newHasParkedLayer = newHostingComps.length === 0 ? true : sn.hasParkedLayer;
      graphState.updateNode(sn.id, {
        state:          newState,
        hostingComps:   newHostingComps,
        hasParkedLayer: newHasParkedLayer
      });
    }

    // Step 11 — clear _pathLayerUUID if this was the terminal wire, then remove it
    if (wireData._pathLayerUUID !== null) {
      graphState.updateWire(deletedWireId, { _pathLayerUUID: null });
    }
    graphState.removeWire(deletedWireId);

    // Step 12 — dispatch batch
    if (batchCommands.length > 0) {
      evalBridge.dispatchBatch(batchCommands).then(function(res) {
        if (!res.ok) {
          console.error('[cascadeAlgorithm] dispatchBatch failed: ' + res.error);
        }
      });
    }

    // Step 13 — rebuild temp graph
    graphState.rebuildTempGraph();
  }

  return {
    cascadeGhost: cascadeGhost
  };
})();
