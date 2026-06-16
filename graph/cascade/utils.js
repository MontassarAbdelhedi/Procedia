/**
 * graph/cascade/utils.js
 *
 * Utility functions used by the cascade algorithm: composition node detection,
 * downstream composition traversal, upstream node collection, and path layer
 * UUID resolution.
 *
 * Dependencies: graphState, nodeRegistry
 * Load before: cascade/cascadeGhost/ (5 files), cascade/index.js
 *
 * Exports: isCompNode, _hasCompDownstreamExcluding, hasCompDownstream,
 *          collectPathUpstream, _resolvePathLayerUUID
 */
// graph/cascade/utils.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/cascade/cascadeGhost/collect.js, graph/cascade/cascadeGhost/commands.js,
//                   graph/cascade/cascadeGhost/update.js, graph/cascade/cascadeGhost/cleanup.js,
//                   graph/cascade/cascadeGhost/ghost.js,
//                   graph/cascade/index.js

var __c_util = (function() {

  /**
   * Checks if a node is a dedicated composition (comp) node.
   *
   * @param {string} nodeId - Node ID to check
   * @returns {boolean} True if the node is of kind 'affected', dedicated, and type 'core/comp'
   */
  function isCompNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return false;
    return nodeData.nodeKind === 'affected'
        && nodeData.dedicated === true
        && nodeData.type === 'core/comp';
  }

  /**
   * Recursively traverses layer wires downstream from a node to find all
   * composition nodes, excluding a specific wire ID from the traversal.
   *
   * @param {string} nodeId - Starting node ID
   * @param {string|null} excludeWireId - Wire ID to exclude from traversal
   * @param {Object} visited - Visited set to prevent cycles
   * @returns {string[]} Array of composition node IDs found downstream
   */
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

  /**
   * Checks whether a node has any composition nodes downstream via layer wires.
   *
   * @param {string} nodeId - Node ID to check
   * @returns {string[]} Array of composition node IDs found downstream
   */
  function hasCompDownstream(nodeId) {
    return _hasCompDownstreamExcluding(nodeId, null, {});
  }

  /**
   * Collects all upstream node data along layer wires, traversing backwards
   * from the given node while avoiding composition nodes.
   *
   * @param {string} nodeId - Starting node ID
   * @returns {Object[]} Array of upstream node data objects
   */
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

  /**
   * Walks downstream layer wires from a starting node to find the first
   * non-null _pathLayerUUID (terminal wire UUID).
   *
   * @param {string} startNodeId - Node ID to start searching from
   * @returns {string|null} The terminal wire UUID, or null if not found
   */
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
        if (wire._pathLayerUUID !== null) return wire._pathLayerUUID;
        var found = traverse(wire.toNode);
        if (found !== null) return found;
      }
      return null;
    }
    return traverse(startNodeId);
  }

  return {
    isCompNode:                  isCompNode,
    _hasCompDownstreamExcluding: _hasCompDownstreamExcluding,
    hasCompDownstream:           hasCompDownstream,
    collectPathUpstream:         collectPathUpstream,
    _resolvePathLayerUUID:       _resolvePathLayerUUID
  };
})();
