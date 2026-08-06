/**
 * @fileoverview Path layer UUID resolution for the cascade algorithm.
 * Walks downstream layer wires to find the terminal wire UUID.
 * @dependencies graph/graphState.js, cascade/utils/graph.js
 * @exports __c_util_pathLayer { _resolvePathLayerUUID }
 */

// graph/cascade/utils/pathLayer.js
// DEPENDS ON: graph/graphState.js, cascade/utils/graph.js
// MUST LOAD BEFORE: cascade/utils.js

var __c_util_pathLayer = (function() {

  function _resolvePathLayerUUID(startNodeId) {
    var visited = {};
    function traverse(nodeId) {
      if (visited[nodeId]) return null;
      visited[nodeId] = true;
      var wires = graphState.getAllWires();
      for (var wireId in wires) {
        if (!wires.hasOwnProperty(wireId)) continue;
        var wire = wires[wireId];
        if (wire.fromNode !== nodeId || wire.type !== 'layer') continue;
        if (__c_util_graph.isCompNode(wire.toNode)) return wire.id;
        var found = traverse(wire.toNode);
        if (found !== null) return found;
      }
      return null;
    }
    return traverse(startNodeId);
  }

  return {
    _resolvePathLayerUUID: _resolvePathLayerUUID
  };
})();
