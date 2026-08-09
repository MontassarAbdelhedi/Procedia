/**
 * Shared utility functions for property polling.
 * Provides value comparison and layer UUID resolution used by both
 * affect poll and effects poll.
 * Depends on: graph/graphState.js
 * Exports: propertyPollHelpers.valuesEqual, propertyPollHelpers.findLayerUUID
 */
// polling/pollHelpers.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: polling/pollAffected.js, polling/pollEffectors.js, polling/propertyPoller.js

var propertyPollHelpers = (function() {

  /**
   * Compares two values with tolerance for floating point arrays.
   * @param {*} a
   * @param {*} b
   * @returns {boolean}
   */
  function valuesEqual(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (Math.abs(a[i] - b[i]) > 0.0001) return false;
      }
      return true;
    }
    return a === b;
  }

  /**
   * Resolves the terminal layer UUID for an affected node by walking
   * downstream wires to find _pathLayerUUID. The layer's .comment in AE
   * was set to this terminal wire UUID during cascade/restamping.
   * @param {string} nodeId
   * @returns {string|null}
   */
  function findLayerUUID(nodeId) {
    var wires = graphState.getAllWires();
    var visited = {};
    function walk(currentId) {
      if (visited[currentId]) return null;
      visited[currentId] = true;
      for (var wireId in wires) {
        if (!wires.hasOwnProperty(wireId)) continue;
        var wire = wires[wireId];
        if (wire.fromNode === currentId && wire.type === 'layer') {
          var toNodeData = graphState.getNode(wire.toNode);
          if (toNodeData && toNodeData.type === 'core/comp') {
            return wire.id;
          }
          var found = walk(wire.toNode);
          if (found != null) return found;
        }
      }
      return null;
    }
    return walk(nodeId);
  }

  return {
    valuesEqual: valuesEqual,
    findLayerUUID: findLayerUUID
  };

})();
