/**
 * @fileoverview Cascade algorithm utilities — aggregator for graph traversal
 * and path-layer resolution sub-modules.
 * @dependencies graph/graphState.js, graph/nodeRegistry.js,
 *               cascade/utils/graph.js, cascade/utils/pathLayer.js
 * @exports __c_util { isCompNode, _hasCompDownstreamExcluding, hasCompDownstream,
 *                     collectPathUpstream, _resolvePathLayerUUID }
 */

// graph/cascade/utils.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             cascade/utils/graph.js, cascade/utils/pathLayer.js
// MUST LOAD BEFORE: cascade/cascadeGhost/*, cascade/index.js

var __c_util = (function() {

  return {
    isCompNode:                  __c_util_graph.isCompNode,
    _hasCompDownstreamExcluding: __c_util_graph._hasCompDownstreamExcluding,
    hasCompDownstream:           __c_util_graph.hasCompDownstream,
    collectPathUpstream:         __c_util_graph.collectPathUpstream,
    _resolvePathLayerUUID:       __c_util_pathLayer._resolvePathLayerUUID
  };
})();
