/**
 * graph/cascade/cascadeGhost/collect.js
 *
 * Collects the cascade set (effectors + affected upstream nodes) when a
 * layer wire is deleted. Also declares the __c_ghost container.
 *
 * Dependencies: graphState, nodeRegistry, cascade/utils.js
 * Load before: cascade/cascadeGhost/commands.js, cascade/index.js
 */

// graph/cascade/cascadeGhost/collect.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cascade/utils.js
// MUST LOAD BEFORE: graph/cascade/cascadeGhost/commands.js, graph/cascade/index.js
// FIRST IN LOAD ORDER among cascadeGhost/ sub-files

var __c_ghost = {};
var __c_ghost_util = __c_util;

(function() {

  __c_ghost._collectCascadeSet = function _collectCascadeSet(sourceNodeId, deletedWireId) {
    var visitedSet = {};
    var effectors = [];
    var affected = [];

    var sourceNodeData = graphState.getNode(sourceNodeId);
    if (!sourceNodeData) return { effectors: effectors, affected: affected, cascadeSet: [] };

    var upstreamNodes = __c_ghost_util.collectPathUpstream(sourceNodeId);
    var workingSet = [sourceNodeData];
    for (var ui = 0; ui < upstreamNodes.length; ui++) {
      workingSet.push(upstreamNodes[ui]);
    }

    for (var wi = 0; wi < workingSet.length; wi++) {
      var nodeData = workingSet[wi];
      if (visitedSet[nodeData.id]) continue;
      visitedSet[nodeData.id] = true;

      if (__c_ghost_util.isCompNode(nodeData.id)) continue;
      if (nodeData.state !== 'alive') continue;
      if (nodeData.nodeKind === 'data' ||
          nodeData.nodeKind === 'blending' ||
          nodeData.nodeKind === 'matte') continue;

      if (nodeData.nodeKind === 'effector') {
        effectors.push(nodeData);
      } else {
        affected.push(nodeData);

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

    var cascadeSet = [];
    for (var ei = 0; ei < effectors.length; ei++) cascadeSet.push(effectors[ei]);
    for (var ai = 0; ai < affected.length; ai++) cascadeSet.push(affected[ai]);

    return {
      effectors: effectors,
      affected: affected,
      cascadeSet: cascadeSet
    };
  };

})();
