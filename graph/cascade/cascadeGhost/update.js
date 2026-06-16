/**
 * graph/cascade/cascadeGhost/update.js
 *
 * Updates graphState for each node in the cascade set: recomputes
 * hostingComps, state, and hasParkedLayer based on remaining comps.
 *
 * Dependencies: graphState, cascade/utils.js
 * Load before: cascade/cascadeGhost/cleanup.js, cascade/index.js
 */

// graph/cascade/cascadeGhost/update.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD AFTER: graph/cascade/cascadeGhost/collect.js, graph/cascade/cascadeGhost/commands.js
// MUST LOAD BEFORE: graph/cascade/cascadeGhost/cleanup.js, graph/cascade/index.js

(function() {

  __c_ghost._updateNodes = function _updateNodes(cascadeSet, remainingCompsPerNode) {
    for (var si = 0; si < cascadeSet.length; si++) {
      var sn = cascadeSet[si];
      var snRemaining = remainingCompsPerNode[sn.id];
      var newHostingComps = [];
      for (var snHci = 0; snHci < sn.hostingComps.length; snHci++) {
        var snCompUUID = sn.hostingComps[snHci];
        for (var snRci = 0; snRci < snRemaining.length; snRci++) {
          if (snRemaining[snRci] === snCompUUID) {
            newHostingComps.push(snCompUUID);
            break;
          }
        }
      }
      var newState = newHostingComps.length === 0 ? 'ghost' : 'alive';
      var newHasParkedLayer = newHostingComps.length === 0 ? true : sn.hasParkedLayer;

      graphState.updateNode(sn.id, {
        state:          newState,
        hostingComps:   newHostingComps,
        hasParkedLayer: newHasParkedLayer
      });
    }
  };

})();
