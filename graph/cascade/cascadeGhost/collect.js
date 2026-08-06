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

  __c_ghost._collectCascadeSet = function _collectCascadeSet(sourceNodeId) {
    var visitedSet = {};
    var effectors = [];
    var affected = [];

    var sourceNodeData = graphState.getNode(sourceNodeId);
    if (!sourceNodeData) return { effectors: effectors, affected: affected, cascadeSet: [] };

    var upstreamNodes = __c_ghost_util.collectPathUpstream(sourceNodeId);
    var workingSet = [sourceNodeData];
    for (var upstreamIndex = 0; upstreamIndex < upstreamNodes.length; upstreamIndex++) {
      workingSet.push(upstreamNodes[upstreamIndex]);
    }

    for (var workingIndex = 0; workingIndex < workingSet.length; workingIndex++) {
      var nodeData = workingSet[workingIndex];
      if (visitedSet[nodeData.id]) continue;
      visitedSet[nodeData.id] = true;

      if (__c_ghost_util.isCompNode(nodeData.id)) continue;
      if (nodeData.state !== 'alive') continue;
      if (nodeData.nodeKind === 'data' ||
          nodeData.nodeKind === 'blending' ||
          nodeData.nodeKind === 'matte' ||
          nodeData.nodeKind === 'merge' ||
          nodeData.nodeKind === 'multimerge') continue;

      if (nodeData.nodeKind === 'effector') {
        effectors.push(nodeData);
      } else {
        affected.push(nodeData);

        var allWires = graphState.getAllWires();
        for (var effectorWireId in allWires) {
          if (!allWires.hasOwnProperty(effectorWireId)) continue;
          var effectorWire = allWires[effectorWireId];
          if (effectorWire.toNode !== nodeData.id) continue;
          var fromData = graphState.getNode(effectorWire.fromNode);
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
    for (var effectorIndex = 0; effectorIndex < effectors.length; effectorIndex++) cascadeSet.push(effectors[effectorIndex]);
    for (var affectedIndex = 0; affectedIndex < affected.length; affectedIndex++) cascadeSet.push(affected[affectedIndex]);

    return {
      effectors: effectors,
      affected: affected,
      cascadeSet: cascadeSet
    };
  };

})();
