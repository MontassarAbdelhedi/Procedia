/**
 * Polls After Effects for current property values of alive affected nodes.
 * Detects changes made directly in AE (e.g. moving a layer with the transform tool)
 * and syncs them back into graphState, triggering a UI refresh.
 * Depends on: evalBridge, graphState, nodeRegistry, helpers (window.__procedia_internal.hlp)
 * Exports: propertyPoller.poll
 */
// polling/propertyPoller.js
// DEPENDS ON: bridge/evalBridge.js, graph/graphState.js, graph/nodeRegistry.js,
//             graph/engine/helpers.js (window.__procedia_internal.hlp)
// MUST LOAD BEFORE: polling/poller.js

var propertyPoller = (function() {

  /**
   * Compares two values with tolerance for floating point arrays.
   */
  function _valuesEqual(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (Math.abs(a[i] - b[i]) > 0.0001) return false;
      }
      return true;
    }
    return a === b;
  }

  /**
   * Resolves the terminal layer UUID for an affected node by walking
   * downstream wires to find _pathLayerUUID. The layer's .comment in AE
   * was set to this terminal wire UUID during cascade/restamping.
   */
  function _findLayerUUID(nodeId) {
    var wires = graphState.getAllWires();
    var visited = {};
    function _walk(currentId) {
      if (visited[currentId]) return null;
      visited[currentId] = true;
      for (var wid in wires) {
        if (!wires.hasOwnProperty(wid)) continue;
        var w = wires[wid];
        if (w.fromNode === currentId && w.type === 'layer') {
          // Terminal wire: connects to a comp node
          var toNodeData = graphState.getNode(w.toNode);
          if (toNodeData && toNodeData.type === 'core/comp') {
            return w.id;
          }
          var found = _walk(w.toNode);
          if (found != null) return found;
        }
      }
      return null;
    }
    return _walk(nodeId);
  }

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

      // Only poll nodes that have a corresponding AE layer (affected = layer)
      if (def.nodeKind !== 'affected') continue;

      var hostingCompUUID = node.hostingComps && node.hostingComps.length > 0
        ? node.hostingComps[0] : null;
      if (!hostingCompUUID) continue;

      // Resolve the terminal wire UUID, which matches the layer's .comment
      // in AE — NOT the node ID
      var layerUUID = _findLayerUUID(id);
      if (!layerUUID) continue;

      // Build list of property keys that can change in AE (exclude label)
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

          if (!_valuesEqual(newVal, oldVal)) {
            graphState.updateProp(nodeId, key, newVal);
            changed = true;
          }
        }
      }

      if (changed) {
        if (typeof window.__procedia_internal.hlp !== 'undefined' && window.__procedia_internal.hlp.refreshNodeUI) {
          window.__procedia_internal.hlp.refreshNodeUI();
        }
      }
    }).catch(function(err) {
      // Polling is best-effort; silently ignore transient errors
    });
  }

  /**
   * Resolves the upstream layer UUID for an effector node by inspecting
   * its main_input wire's _pathLayerUUID. Falls back to walking downstream
   * from the source node (mirrors dirtyFlusher._resolveUpstreamNodeUUID).
   */
  function _resolveEffectorLayerUUID(nodeId) {
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === nodeId && w.toPort === 'main_input') {
        if (w._pathLayerUUID != null) return w._pathLayerUUID;
        return _findLayerUUID(w.fromNode);
      }
    }
    return null;
  }

  /**
   * Polls all alive effector nodes for their current effect property values
   * in AE (e.g. blur amount, fill color changed in Effect Controls panel).
   * Mirrors dirtyFlusher._flushNode logic for effector property resolution.
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

      // Effectors have dynamic params — resolve via getParams
      var params = typeof def.getParams === 'function' ? def.getParams(node) : null;
      if (!params || params.length === 0) continue;

      var hostingCompUUID = node.hostingComps && node.hostingComps.length > 0
        ? node.hostingComps[0] : null;
      if (!hostingCompUUID) continue;

      var layerUUID = _resolveEffectorLayerUUID(id);
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

          if (!_valuesEqual(newVal, oldVal)) {
            graphState.updateProp(nodeId, key, newVal);
            changed = true;
          }
        }
      }

      if (changed) {
        if (typeof window.__procedia_internal.hlp !== 'undefined' && window.__procedia_internal.hlp.refreshNodeUI) {
          window.__procedia_internal.hlp.refreshNodeUI();
        }
      }
    }).catch(function(err) {
      // Polling is best-effort; silently ignore transient errors
    });
  }

  return {
    poll: poll,
    pollEffects: pollEffects
  };

})();
