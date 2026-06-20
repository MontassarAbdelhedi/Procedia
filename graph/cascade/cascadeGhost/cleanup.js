/**
 * graph/cascade/cascadeGhost/cleanup.js
 *
 * Cleans up parent wires connected to ghosted or disaggregated nodes after
 * a cascade event. Dispatches clearLayerParent commands via evalBridge and
 * removes the parent wires.
 *
 * Dependencies: graphState, evalBridge, cascade/utils.js
 * Load before: cascade/cascadeGhost/ghost.js, cascade/index.js
 */

// graph/cascade/cascadeGhost/cleanup.js
// DEPENDS ON: graph/graphState.js, bridge/evalBridge.js, graph/cascade/utils.js
// MUST LOAD AFTER: graph/cascade/cascadeGhost/collect.js, graph/cascade/cascadeGhost/update.js
// MUST LOAD BEFORE: graph/cascade/cascadeGhost/ghost.js, graph/cascade/index.js

(function() {

  __c_ghost._cleanupParentWires = function _cleanupParentWires() {
    var parentCleanups = [];
    var allWiresAfter = graphState.getAllWires();
    for (var pId in allWiresAfter) {
      if (!allWiresAfter.hasOwnProperty(pId)) continue;
      var pWire = allWiresAfter[pId];
      if (pWire.type !== 'parent') continue;
      var pChild = graphState.getNode(pWire.fromNode);
      var pParent = graphState.getNode(pWire.toNode);
      var shouldRemove = false;
      if (!pChild || !pParent) {
        shouldRemove = true;
      } else if (pChild.state === 'ghost' || pParent.state === 'ghost') {
        shouldRemove = true;
      } else {
        var pShared = false;
        for (var pc = 0; pc < pChild.hostingComps.length; pc++) {
          for (var pp = 0; pp < pParent.hostingComps.length; pp++) {
            if (pChild.hostingComps[pc] === pParent.hostingComps[pp]) {
              pShared = true; break;
            }
          }
          if (pShared) break;
        }
        if (!pShared) shouldRemove = true;
      }
      if (shouldRemove) {
        var pChildUUID = __c_ghost_util._resolvePathLayerUUID(pWire.fromNode);
        var pHostComp = null;
        if (pChild && pChild.hostingComps.length > 0) {
          pHostComp = pChild.hostingComps[0];
        } else if (pParent && pParent.hostingComps.length > 0) {
          pHostComp = pParent.hostingComps[0];
        }
        if (pChildUUID && pHostComp) {
          parentCleanups.push({ wireId: pId, childUUID: pChildUUID, hostComp: pHostComp });
        }
      }
    }

    if (parentCleanups.length > 0) {
      var parentBatch = [];
      for (var pci = 0; pci < parentCleanups.length; pci++) {
        parentBatch.push({
          action: 'clearLayerParent',
          params: {
            hostingCompUUID: parentCleanups[pci].hostComp,
            layerUUID:       parentCleanups[pci].childUUID
          }
        });
      }
      evalBridge.dispatchBatch(parentBatch);
      for (var pci2 = 0; pci2 < parentCleanups.length; pci2++) {
        delete allWiresAfter[parentCleanups[pci2].wireId];
      }
    }

    return parentCleanups;
  };

})();
