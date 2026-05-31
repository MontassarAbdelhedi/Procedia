/**
 * graph/cascade/index.js
 *
 * Public API for the cascade algorithm. Exposes functions for detecting composition
 * downstream paths, collecting upstream nodes, and ghosting cascade operations
 * when layer wires are deleted. Replaces graph/cascadeAlgorithm.js.
 *
 * Dependencies: graphState, nodeRegistry, cascade/utils.js, cascade/cascadeGhost.js
 * Load before: graph/engine/index.js
 *
 * Exports: cascadeGhost, hasCompDownstream, collectPathUpstream, isCompNode
 */
// graph/cascade/index.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             graph/cascade/utils.js, graph/cascade/cascadeGhost.js
// MUST LOAD BEFORE: graph/engine/index.js
// REPLACES: graph/cascadeAlgorithm.js

var cascadeAlgorithm = (function() {
  return {
    cascadeGhost:        __c_ghost.cascadeGhost,
    hasCompDownstream:   __c_util.hasCompDownstream,
    collectPathUpstream: __c_util.collectPathUpstream,
    isCompNode:          __c_util.isCompNode
  };
})();
