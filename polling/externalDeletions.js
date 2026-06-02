/**
 * Checks for comps and effects deleted directly in AE (outside Procedia).
 * Depends on: bridge/evalBridge.js, graph/graphState.js, graph/nodeRegistry.js
 * Exports: pollerExternalDeletions object with checkEffectDeletions, checkExternalDeletions
 */
// polling/externalDeletions.js
// DEPENDS ON: bridge/evalBridge.js, graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: polling/poller.js

var pollerExternalDeletions = (function() {

  function checkEffectDeletions(isWriting, onMissing) {
    if (isWriting) return;

    var allNodes = graphState.getAllNodes();
    var entries = [];

    for (var id in allNodes) {
      if (!allNodes.hasOwnProperty(id)) continue;
      var nd = allNodes[id];
      if (nd.state !== 'alive') continue;
      if (nd.nodeKind !== 'effector') continue;
      if (!nd.hostingComps || nd.hostingComps.length === 0) continue;

      var def = nodeRegistry.getDefinition(nd.type);
      if (!def || !def.matchName) continue;

      var hostingCompUUID = nd.hostingComps[0];

      var wires = graphState.getAllWires();
      var layerNodeUUID = null;
      for (var wId in wires) {
        if (!wires.hasOwnProperty(wId)) continue;
        var w = wires[wId];
        if (w.fromNode === id && w.type === 'layer' && w._pathLayerUUID) {
          layerNodeUUID = w._pathLayerUUID;
          break;
        }
      }
      if (!layerNodeUUID) continue;

      entries.push({
        nodeUUID:        id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   layerNodeUUID,
        matchName:       def.matchName
      });
    }

    if (entries.length === 0) return;

    evalBridge.dispatch({
      action: 'pollAliveEffects',
      params: { entries: entries }
    }).then(function(res) {
      if (!res.ok) {
        console.error('[poller] pollAliveEffects failed:', res.error);
        return;
      }

      var missing = res.data.missingEffectNodeUUIDs || [];
      if (missing.length === 0) return;

      onMissing(missing);
    });
  }

  function checkExternalDeletions(isWriting, onMissing) {
    if (isWriting) return;

    var allNodes = graphState.getAllNodes();
    var compUUIDs = [];

    for (var id in allNodes) {
      if (!allNodes.hasOwnProperty(id)) continue;
      var nd = allNodes[id];
      if (nd.state !== 'alive') continue;
      if (nd.type === 'core/comp') {
        compUUIDs.push(id);
      }
    }

    if (compUUIDs.length === 0) return;

    evalBridge.dispatch({
      action: 'pollExternalDeletions',
      params: { compNodeUUIDs: compUUIDs }
    }).then(function(res) {
      if (!res.ok) {
        console.error('[poller] pollExternalDeletions failed:', res.error);
        return;
      }

      var missing = res.data.missingCompNodeUUIDs || [];
      if (missing.length === 0) return;

      onMissing(missing);
    });
  }

  return {
    checkEffectDeletions: checkEffectDeletions,
    checkExternalDeletions: checkExternalDeletions
  };

})();
