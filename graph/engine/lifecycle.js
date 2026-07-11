/**
 * Shared lifecycle dispatch helpers for graph engine and AE reconciliation.
 * Consolidates kind-specific hook invocation (affected, effector, blending, matte)
 * so aeReconcile.js and propagate.js don't duplicate the branching logic.
 *
 * @module engine/lifecycle
 * @dependencies engine/helpers, graphState
 * @exports resolveNodeConnections, forEachHostingComp, injectLayerUUID
 */
// graph/engine/lifecycle.js
// DEPENDS ON: graph/engine/helpers.js, graph/graphState
// MUST LOAD BEFORE: graph/engine/propagate.js, graph/undoManager/aeReconcile.js

window.__procedia_internal.lifecycle = (function() {
  var registry = window.__procedia_internal.registry;

  function _hlp() { return registry.get('hlp'); }

  function _findUpstreamNodeUUID(nodeId) {
    var hlp = _hlp();
    if (!hlp) return null;
    var wires = graphState.getAllWires() || {};
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === nodeId && (w.toPort === 'main_input' || w.toPort === 'output')) {
        return hlp.findPathLayerUUID(w.fromNode);
      }
    }
    return null;
  }

  function _findPortUUID(nodeId, portId) {
    var hlp = _hlp();
    if (!hlp) return null;
    var wires = graphState.getAllWires() || {};
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === nodeId && w.toPort === portId) {
        return hlp.findPathLayerUUID(w.fromNode);
      }
    }
    return null;
  }

  /**
   * Resolves upstream connection UUIDs for a given node based on its kind.
   * @param {Object} nodeData
   * @returns {{ upstreamUUID: string|null, blendUpstream: string|null, topUUID: string|null, matteUUID: string|null }}
   */
  function resolveNodeConnections(nodeData) {
    var connections = { upstreamUUID: null, blendUpstream: null, topUUID: null, matteUUID: null };
    if (nodeData.nodeKind === 'effector' || nodeData.nodeKind === 'blending') {
      connections.upstreamUUID = _findUpstreamNodeUUID(nodeData.id);
    }
    if (nodeData.nodeKind === 'blending') {
      connections.blendUpstream = connections.upstreamUUID;
    }
    if (nodeData.nodeKind === 'matte') {
      connections.topUUID = _findPortUUID(nodeData.id, 'top_layer');
      connections.matteUUID = _findPortUUID(nodeData.id, 'matte_layer');
    }
    return connections;
  }

  /**
   * Calls fn(hostUUID, connections) for each hosting comp of the node.
   * @param {Object} nodeData
   * @param {function(string, Object)} fn
   */
  function forEachHostingComp(nodeData, fn) {
    var comps = nodeData.hostingComps || [];
    var connections = resolveNodeConnections(nodeData);
    for (var ci = 0; ci < comps.length; ci++) {
      fn(comps[ci], connections);
    }
  }

  /**
   * Builds a command from a lifecycle hook with kind-appropriate params.
   * @param {Object} nodeData
   * @param {Object} def - Node definition from registry
   * @param {string} hookName - 'onAlive', 'onGhost', 'onDisable', 'onEnable', etc.
   * @param {string} [key] - Property key for onPropertyChange
   * @param {*} [value] - Property value for onPropertyChange
   * @returns {Object|null} Command object or null
   */
  function buildLifecycleCommand(nodeData, def, hookName, key, value, hostUUID) {
    if (!def || !def[hookName]) return null;
    var hook = def[hookName];
    var connections = resolveNodeConnections(nodeData);
    if (hostUUID === undefined) {
      hostUUID = (nodeData.hostingComps && nodeData.hostingComps.length > 0)
        ? nodeData.hostingComps[0] : null;
    }

    if (hookName === 'onPropertyChange') {
      if (nodeData.nodeKind === 'affected') {
        return hook(key, value, nodeData, hostUUID);
      }
      if (nodeData.nodeKind === 'effector' || nodeData.nodeKind === 'blending') {
        return hook(key, value, nodeData, hostUUID, connections.upstreamUUID);
      }
      if (nodeData.nodeKind === 'matte') {
        return hook(key, value, nodeData, hostUUID, connections.topUUID, connections.matteUUID);
      }
      return hook(key, value, nodeData, hostUUID);
    }

    if (nodeData.nodeKind === 'effector') {
      return hook(nodeData, hostUUID, connections.upstreamUUID);
    }
    if (nodeData.nodeKind === 'blending') {
      return hook(nodeData, hostUUID, connections.blendUpstream);
    }
    if (nodeData.nodeKind === 'matte') {
      return hook(nodeData, hostUUID, connections.topUUID, connections.matteUUID);
    }
    if (nodeData.nodeKind === 'affected') {
      return hook(nodeData, hostUUID);
    }
    return hook(nodeData, hostUUID);
  }

  /**
   * Injects layerUUID into a command's params for affected nodes.
   * @param {Object} cmd
   * @param {Object} nodeData
   */
  function injectLayerUUID(cmd, nodeData) {
    if (!cmd || nodeData.nodeKind !== 'affected') return;
    var hlp = _hlp();
    if (!hlp) return;
    cmd.params = cmd.params || {};
    cmd.params.layerUUID = hlp.findPathLayerUUID(nodeData.id);
  }

  return {
    resolveNodeConnections: resolveNodeConnections,
    forEachHostingComp:     forEachHostingComp,
    buildLifecycleCommand:  buildLifecycleCommand,
    injectLayerUUID:        injectLayerUUID
  };

})();
