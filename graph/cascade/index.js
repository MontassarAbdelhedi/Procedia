/**
 * graph/cascade/index.js
 *
 * Public API for the cascade algorithm. Exposes functions for detecting composition
 * downstream paths, collecting upstream nodes, and ghosting cascade operations
 * when layer wires are deleted. Replaces graph/cascadeAlgorithm.js.
 *
 * Dependencies: graphState, nodeRegistry, cascade/utils.js,
 *               cascade/cascadeGhost/collect.js, cascade/cascadeGhost/commands.js,
 *               cascade/cascadeGhost/update.js, cascade/cascadeGhost/cleanup.js,
 *               cascade/cascadeGhost/ghost.js
 * Load before: graph/engine/index.js
 *
 * Exports: cascadeGhost, hasCompDownstream, collectPathUpstream, isCompNode
 */
// graph/cascade/index.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             graph/cascade/utils.js,
//             graph/cascade/cascadeGhost/collect.js, graph/cascade/cascadeGhost/commands.js,
//             graph/cascade/cascadeGhost/update.js, graph/cascade/cascadeGhost/cleanup.js,
//             graph/cascade/cascadeGhost/ghost.js
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
