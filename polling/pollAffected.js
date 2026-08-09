/**
 * Polls After Effects for current property values of alive affected nodes
 * (transform, shape, etc.). Detects changes made directly in AE and syncs
 * them back into graphState, triggering a UI refresh.
 * Depends on: propertyPollHelpers, evalBridge, graphState, nodeRegistry
 * Exports: propertyPollAffected.poll
 */
// polling/pollAffected.js
// DEPENDS ON: polling/pollHelpers.js, bridge/evalBridge.js, graph/graphState.js,
//             graph/nodeRegistry.js
// MUST LOAD BEFORE: polling/propertyPoller.js

var propertyPollAffected = (function() {

  /**
   * Polls all alive affected nodes for their current property values in AE.
   * Updates graphState and refreshes UI when external changes are detected.
   */
  function poll() {
    var allNodes = graphState.getAllNodes();
    var entries = [];
    var layerToNode = {};

    for (var id in allNodes) {
      if (!allNodes.hasOwnProperty(id)) continue;
      var node = allNodes[id];
      if (node.state !== 'alive') continue;
      if (node.dirty) continue;
      if (node._flushCount > 0) continue;
      var def = nodeRegistry.getDefinition(node.type);
      if (!def || !def.params || def.params === 'dynamic') continue;

      if (def.nodeKind !== 'affected') continue;

      var hostingCompUUID = node.hostingComps && node.hostingComps.length > 0
        ? node.hostingComps[0] : null;
      if (!hostingCompUUID) continue;

      var layerUUID = propertyPollHelpers.findLayerUUID(id);
      if (!layerUUID) continue;

      var keys = [];
      for (var i = 0; i < def.params.length; i++) {
        var k = def.params[i].key;
        if (k === 'label') continue;
        keys.push(k);
      }
      if (keys.length === 0) continue;

      layerToNode[layerUUID] = id;
      entries.push({
        hostingCompUUID: hostingCompUUID,
        layerUUID: layerUUID,
        keys: keys
      });
    }

    if (entries.length === 0) return;

    evalBridge.dispatch({
      action: 'batchGetLayerProperties',
      params: { entries: entries }
    }).then(function(res) {
      if (!res.ok || !res.data || !res.data.properties) return;

      var changed = false;
      var captured = false;
      var propsByLayer = res.data.properties;

      for (var layerId in propsByLayer) {
        if (!propsByLayer.hasOwnProperty(layerId)) continue;
        var nodeId = layerToNode[layerId];
        if (!nodeId) continue;
        var node = graphState.getNode(nodeId);
        if (!node) continue;

        var updatedProps = propsByLayer[layerId];
        for (var key in updatedProps) {
          if (!updatedProps.hasOwnProperty(key)) continue;
          var newVal = updatedProps[key];
          if (newVal === null) continue;

          var oldVal = node.props[key];
          if (oldVal === undefined) continue;

          if (!propertyPollHelpers.valuesEqual(newVal, oldVal)) {
            if (!captured) {
              if (typeof undoManager !== 'undefined' && undoManager.capture) undoManager.capture();
              captured = true;
            }
            graphState.updateProp(nodeId, key, newVal);
            changed = true;
          }
        }
      }

      if (changed) {
        if (typeof undoManager !== 'undefined' && undoManager.commit) undoManager.commit('Sync from AE');
        if (typeof window.__procedia_internal.hlp !== 'undefined' && window.__procedia_internal.hlp.refreshNodeUI) {
          window.__procedia_internal.hlp.refreshNodeUI();
        }
      }
    }).catch(function(err) {
      console.warn('[propertyPoller] layer poll error:', err && err.message || err);
    });
  }

  return {
    poll: poll
  };

})();
