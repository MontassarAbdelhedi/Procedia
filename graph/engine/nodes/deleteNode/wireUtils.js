/**
 * @fileoverview Terminal wire resolution utilities for node deletion.
 * Resolves which terminal wire UUID corresponds to a specific hosting comp
 * by walking downstream layer wires.
 * @dependencies graph/graphState.js
 * @exports ndel_wireUtils { _resolveLayerUUIDForComp, _walkToTerminalComp }
 */

// graph/engine/nodes/deleteNode/wireUtils.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: deleteNode.js

window.__procedia_internal.ndel_wireUtils = (function() {

  function _resolveLayerUUIDForComp(nodeId, compUUID) {
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.fromNode !== nodeId || w.type !== 'layer') continue;
      var uuid = _walkToTerminalComp(w, compUUID, {});
      if (uuid) return uuid;
    }
    return null;
  }

  function _walkToTerminalComp(wire, targetCompUUID, visited) {
    if (visited[wire.id]) return null;
    visited[wire.id] = true;
    var toData = graphState.getNode(wire.toNode);
    if (!toData) return null;
    if (toData.type === 'core/comp') {
      return wire.toNode === targetCompUUID ? (wire._pathLayerUUID || wire.id) : null;
    }
    var allWires = graphState.getAllWires();
    for (var wid in allWires) {
      if (!allWires.hasOwnProperty(wid)) continue;
      var nextWire = allWires[wid];
      if (nextWire.fromNode === wire.toNode && nextWire.type === 'layer') {
        var found = _walkToTerminalComp(nextWire, targetCompUUID, visited);
        if (found) return found;
      }
    }
    return null;
  }

  return {
    _resolveLayerUUIDForComp: _resolveLayerUUIDForComp,
    _walkToTerminalComp:      _walkToTerminalComp
  };
})();
window.__procedia_internal.registry.register('ndel_wireUtils', window.__procedia_internal.ndel_wireUtils);
