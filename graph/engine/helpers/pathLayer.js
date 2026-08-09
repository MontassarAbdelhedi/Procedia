/**
 * graph/engine/helpers/pathLayer.js
 *
 * Finds the terminal layer UUID by walking downstream from a node along
 * layer wires until a CompNode is reached. Results are memoized in a cache
 * that is invalidated on every graph rebuild.
 *
 * Dependencies: graphState
 * Load before: graph/engine/helpers/index.js
 *
 * Exports: findPathLayerUUID, invalidatePathLayerCache
 */
// graph/engine/helpers/pathLayer.js
// DEPENDS ON: graph/graphState
// MUST LOAD BEFORE: graph/engine/helpers/index.js

window.__procedia_internal.hlp = window.__procedia_internal.hlp || {};

(function() {
  var _pathLayerCache = {};

  /**
   * Internal recursive traversal to find the terminal layer UUID.
   *
   * @param {string} nodeId - Current node ID
   * @param {Object} visited - Visited set to prevent cycles
   * @returns {string|null} The terminal wire UUID, or null
   */
  function _findPathLayerUUIDWithVisited(nodeId, visited) {
    if (visited[nodeId]) return null;
    visited[nodeId] = true;
    var wireMap = graphState.getAllWires();
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.fromNode === nodeId && wire.type === 'layer') {
        var toNodeData = graphState.getNode(wire.toNode);
        if (toNodeData && toNodeData.type === 'core/comp') return wire.id;
        var found = _findPathLayerUUIDWithVisited(wire.toNode, visited);
        if (found !== null) return found;
      }
    }
    return null;
  }

  /**
   * Finds the terminal layer UUID by walking downstream from a node.
   *
   * @param {string} nodeId - Starting node ID
   * @returns {string|null} The terminal wire UUID, or null
   */
  window.__procedia_internal.hlp.findPathLayerUUID = function(nodeId) {
    if (_pathLayerCache.hasOwnProperty(nodeId)) return _pathLayerCache[nodeId];
    var result = _findPathLayerUUIDWithVisited(nodeId, {});
    _pathLayerCache[nodeId] = result;
    return result;
  };

  window.__procedia_internal.hlp.invalidatePathLayerCache = function() {
    _pathLayerCache = {};
  };
})();
