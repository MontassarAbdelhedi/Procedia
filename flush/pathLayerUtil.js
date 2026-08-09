/**
 * Path-layer UUID resolution utilities for the dirty flusher.
 * Walks downstream layer wires to find terminal wire UUIDs and resolves
 * upstream node UUIDs for effector nodes.
 * Dependencies: graph/graphState.js
 * Exports: flushPathLayerUtil { findPathLayerUUID, resolveUpstreamNodeUUID }
 */
// flush/pathLayerUtil.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: flush/flushNode.js

var flushPathLayerUtil = (function() {

  /**
   * Finds the _pathLayerUUID by walking downstream wires from the given node.
   * @param {string} nodeId - The starting node UUID
   * @returns {string|null}
   */
  function findPathLayerUUID(nodeId) {
    return _findWithVisited(nodeId, {});
  }

  /**
   * Recursively walks downstream wires to find a _pathLayerUUID, tracking visited nodes
   * to prevent cycles.
   * @param {string} nodeId - Current node UUID
   * @param {Object} visited - Set of visited node IDs
   * @returns {string|null}
   */
  function _findWithVisited(nodeId, visited) {
    if (visited[nodeId]) return null;
    visited[nodeId] = true;
    var wireMap = graphState.getAllWires();
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.fromNode === nodeId && wire.type === 'layer') {
        if (wire._pathLayerUUID != null) {
          return wire._pathLayerUUID;
        }
        var found = _findWithVisited(wire.toNode, visited);
        if (found != null) return found;
      }
    }
    return null;
  }

  /**
   * Resolves the upstream path-layer UUID for an effector node by inspecting its
   * main_input wire. Falls back to walking downstream from the source node.
   * @param {string} nodeId - The effector node UUID
   * @returns {string|null}
   */
  function resolveUpstreamNodeUUID(nodeId) {
    var wireMap = graphState.getAllWires();
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.toNode === nodeId && wire.toPort === 'main_input') {
        if (wire._pathLayerUUID != null) {
          return wire._pathLayerUUID;
        }
        return findPathLayerUUID(wire.fromNode);
      }
    }
    return null;
  }

  return {
    findPathLayerUUID:       findPathLayerUUID,
    resolveUpstreamNodeUUID: resolveUpstreamNodeUUID
  };

})();
