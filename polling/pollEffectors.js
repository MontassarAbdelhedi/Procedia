/**
 * Polls After Effects for current effect property values of alive effector
 * nodes (e.g. blur amount, fill color changed in Effect Controls panel).
 * Mirrors dirtyFlusher._flushNode logic for effector property resolution.
 * Depends on: propertyPollHelpers, evalBridge, graphState, nodeRegistry
 * Exports: propertyPollEffectors.pollEffects
 */
// polling/pollEffectors.js
// DEPENDS ON: polling/pollHelpers.js, bridge/evalBridge.js, graph/graphState.js,
//             graph/nodeRegistry.js
// MUST LOAD BEFORE: polling/propertyPoller.js

var propertyPollEffectors = (function() {

  /**
   * Resolves the upstream layer UUID for an effector node by inspecting
   * its main_input wire's _pathLayerUUID. Falls back to walking downstream
   * from the source node (mirrors flushPathLayerUtil.resolveUpstreamNodeUUID).
   * @param {string} nodeId
   * @returns {string|null}
   */
  function resolveEffectorLayerUUID(nodeId) {
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      var wire = wires[wireId];
      if (wire.toNode === nodeId && wire.toPort === 'main_input') {
        if (wire._pathLayerUUID != null) return wire._pathLayerUUID;
        return propertyPollHelpers.findLayerUUID(wire.fromNode);
      }
    }
    return null;
  }

  /**
   * Polls all alive effector nodes for their current effect property values
   * in AE. Updates graphState and refreshes UI when external changes are detected.
   */
  function pollEffects() {
    var allNodes = graphState.getAllNodes();
    var entries = [];

    for (var id in allNodes) {
      if (!allNodes.hasOwnProperty(id)) continue;
      var node = allNodes[id];
      if (node.state !== 'alive') continue;
      if (node.dirty) continue;
      if (node._flushCount > 0) continue;
      var def = nodeRegistry.getDefinition(node.type);
      if (!def || def.nodeKind !== 'effector') continue;
      if (!def.matchName) continue;

      var params = typeof def.getParams === 'function' ? def.getParams(node) : null;
      if (!params || params.length === 0) continue;

      var hostingCompUUID = node.hostingComps && node.hostingComps.length > 0
        ? node.hostingComps[0] : null;
      if (!hostingCompUUID) continue;

      var layerUUID = resolveEffectorLayerUUID(id);
      if (!layerUUID) continue;

      var keys = [];
      for (var i = 0; i < params.length; i++) {
        keys.push(params[i].key);
      }
      if (keys.length === 0) continue;

      entries.push({
        nodeUUID:        id,
        hostingCompUUID: hostingCompUUID,
        layerUUID:       layerUUID,
        effectMatchName: def.matchName,
        keys:            keys
      });
    }

    if (entries.length === 0) return;

    evalBridge.dispatch({
      action: 'batchGetEffectProperties',
      params: { entries: entries }
    }).then(function(res) {
      if (!res.ok || !res.data || !res.data.properties) return;

      var changed = false;
      var captured = false;
      var propsByNode = res.data.properties;

      for (var nodeId in propsByNode) {
        if (!propsByNode.hasOwnProperty(nodeId)) continue;
        var node = graphState.getNode(nodeId);
        if (!node) continue;

        var updatedProps = propsByNode[nodeId];
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
      console.warn('[propertyPoller] effects poll error:', err && err.message || err);
    });
  }

  return {
    pollEffects: pollEffects
  };

})();
