/**
 * @fileoverview Graph traversal utilities for the cascade algorithm.
 * Composition node detection, downstream comp traversal, and upstream node collection.
 * @dependencies graph/graphState.js, graph/nodeRegistry.js
 * @exports __c_util_graph { isCompNode, _hasCompDownstreamExcluding, hasCompDownstream, collectPathUpstream }
 */

// graph/cascade/utils/graph.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: cascade/utils.js

var __c_util_graph = (function() {

  function isCompNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return false;
    return nodeData.nodeKind === 'affected'
        && nodeData.dedicated === true
        && nodeData.type === 'core/comp';
  }

  function _hasCompDownstreamExcluding(nodeId, excludeWireId, visited) {
    if (visited[nodeId]) return [];
    visited[nodeId] = true;

    var result = [];
    var wires = graphState.getAllWires();

    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      var wire = wires[wireId];

      if (excludeWireId !== null && wireId === excludeWireId) continue;
      if (wire.type !== 'layer') continue;
      if (wire.fromNode !== nodeId) continue;

      if (isCompNode(wire.toNode)) {
        result.push(wire.toNode);
      } else {
        var downstream = _hasCompDownstreamExcluding(wire.toNode, excludeWireId, visited);
        for (var di = 0; di < downstream.length; di++) {
          result.push(downstream[di]);
        }
      }
    }

    return result;
  }

  function hasCompDownstream(nodeId) {
    return _hasCompDownstreamExcluding(nodeId, null, {});
  }

  function collectPathUpstream(nodeId) {
    var result = [];
    var visited = {};

    function traverse(id) {
      if (visited[id]) return;
      visited[id] = true;

      var wires = graphState.getAllWires();
      for (var wireId in wires) {
        if (!wires.hasOwnProperty(wireId)) continue;
        var wire = wires[wireId];

        if (wire.type !== 'layer') continue;
        if (wire.toNode !== id) continue;

        var upstreamId = wire.fromNode;
        if (isCompNode(upstreamId)) continue;

        var nodeData = graphState.getNode(upstreamId);
        if (nodeData) {
          result.push(nodeData);
          traverse(upstreamId);
        }
      }
    }

    traverse(nodeId);
    return result;
  }

  return {
    isCompNode:                  isCompNode,
    _hasCompDownstreamExcluding: _hasCompDownstreamExcluding,
    hasCompDownstream:           hasCompDownstream,
    collectPathUpstream:         collectPathUpstream
  };
})();
