/**
 * @fileoverview Auto-shy module. When enabled, selecting an affected node
 * automatically shies all other affected layers in the same comp, and
 * unshies all when deselected.
 * Depends on: settings, graphState, evalBridge, hlp (globals).
 * Exports: autoShy.handleSelectionChange
 */
// graph/autoShy.js
// DEPENDS ON: ui/settings.js, graph/graphState/index.js, bridge/evalBridge.js,
//             graph/engine/helpers.js
// MUST LOAD BEFORE: index.js

var autoShy = (function() {

  /**
   * Collects all alive affected nodes in the same hosting comp as the given node.
   * @param {string} compUUID - The hosting comp UUID
   * @returns {Array<{nodeId: string, layerUUID: string}>} Array of nodeId/layerUUID pairs
   */
  function _getAffectedLayersInComp(compUUID) {
    var allNodes = graphState.getAllNodes();
    var hlp = window.__procedia_internal.hlp;
    var layers = [];
    for (var nid in allNodes) {
      if (!allNodes.hasOwnProperty(nid)) continue;
      var n = allNodes[nid];
      if (n.state !== 'alive') continue;
      if (n.nodeKind !== 'affected') continue;
      if (!n.hostingComps || n.hostingComps.indexOf(compUUID) === -1) continue;
      var layerUUID = hlp.findPathLayerUUID(nid);
      if (!layerUUID) continue;
      layers.push({ nodeId: nid, layerUUID: layerUUID });
    }
    return layers;
  }

  /**
   * Handles selection change: shies unselected affected layers, unshies all on deselect.
   * @param {Array<string>} sel - Array of selected node IDs
   */
  function _handleSelectionChange(sel) {
    if (typeof settings === 'undefined' || typeof graphState === 'undefined' ||
        typeof evalBridge === 'undefined' || typeof window.__procedia_internal.hlp === 'undefined') {
      return;
    }

    if (!settings.get('autoShy')) return;

    var hlp = window.__procedia_internal.hlp;

    // No selection or empty selection → unshy all
    if (!sel || sel.length === 0) {
      _unshyAllInActiveComp();
      return;
    }

    // Check if any selected node is affected
    var affectedSelected = [];
    for (var si = 0; si < sel.length; si++) {
      var nodeData = graphState.getNode(sel[si]);
      if (nodeData && nodeData.nodeKind === 'affected' && nodeData.state === 'alive') {
        affectedSelected.push(sel[si]);
      }
    }

    // If no affected nodes selected, unshy all
    if (affectedSelected.length === 0) {
      _unshyAllInActiveComp();
      return;
    }

    // Get the hosting comp from the first selected affected node
    var firstNode = graphState.getNode(affectedSelected[0]);
    var compUUID = firstNode.hostingComps && firstNode.hostingComps.length > 0 ? firstNode.hostingComps[0] : null;
    if (!compUUID) return;

    // Build set of selected layer UUIDs
    var selectedLayerUUIDs = {};
    for (var si = 0; si < affectedSelected.length; si++) {
      var lu = hlp.findPathLayerUUID(affectedSelected[si]);
      if (lu) selectedLayerUUIDs[lu] = true;
    }

    // Collect all alive affected layers in the same comp
    var allNodes = graphState.getAllNodes();
    var commands = [];
    for (var nid in allNodes) {
      if (!allNodes.hasOwnProperty(nid)) continue;
      var n = allNodes[nid];
      if (n.state !== 'alive') continue;
      if (n.nodeKind !== 'affected') continue;
      if (!n.hostingComps || n.hostingComps.indexOf(compUUID) === -1) continue;
      var layerUUID = hlp.findPathLayerUUID(nid);
      if (!layerUUID) continue;
      var shouldShy = !selectedLayerUUIDs.hasOwnProperty(layerUUID);
      commands.push({
        action: 'setLayerShy',
        params: { hostingCompUUID: compUUID, layerUUID: layerUUID, shy: shouldShy }
      });
    }

    if (commands.length > 0) {
      // Also enable the Hide Shy Layers toggle so shy layers are actually hidden
      commands.push({
        action: 'setCompHideShyLayers',
        params: { hostingCompUUID: compUUID, hideShyLayers: true }
      });
      evalBridge.dispatchBatch(commands);
    }
  }

  /**
   * Unshies all affected layers in the active comp.
   */
  function _unshyAllInActiveComp() {
    var allNodes = graphState.getAllNodes();
    var hlp = window.__procedia_internal.hlp;
    var compsSeen = {};
    var commands = [];

    for (var nid in allNodes) {
      if (!allNodes.hasOwnProperty(nid)) continue;
      var n = allNodes[nid];
      if (n.state !== 'alive') continue;
      if (n.nodeKind !== 'affected') continue;
      if (!n.hostingComps || n.hostingComps.length === 0) continue;
      var compUUID = n.hostingComps[0];
      if (compsSeen[compUUID]) continue;
      compsSeen[compUUID] = true;
      var allNodesInComp = _getAffectedLayersInComp(compUUID);
      for (var ci = 0; ci < allNodesInComp.length; ci++) {
        commands.push({
          action: 'setLayerShy',
          params: { hostingCompUUID: compUUID, layerUUID: allNodesInComp[ci].layerUUID, shy: false }
        });
      }
    }

    if (commands.length > 0) {
      // Also disable the Hide Shy Layers toggle when unshying all
      for (var cid in compsSeen) {
        if (compsSeen.hasOwnProperty(cid)) {
          commands.push({
            action: 'setCompHideShyLayers',
            params: { hostingCompUUID: cid, hideShyLayers: false }
          });
        }
      }
      evalBridge.dispatchBatch(commands);
    }
  }

  return {
    handleSelectionChange: _handleSelectionChange
  };

})();