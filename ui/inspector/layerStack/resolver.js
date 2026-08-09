/**
 * @fileoverview Layer stack upstream resolver. Walks upstream through layer
 * wires from a node to find its source affected node.
 * Depends on: graphState (global).
 * Exports: __ins_ls_resolver.resolveCompLayerAffectedNode
 */
// ui/inspector/layerStack/resolver.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: ui/inspector/layerStack/builder.js

var __ins_ls_resolver = (function() {

  /**
   * Walks upstream through layer wires from a node to find its source
   * affected node. Used to deduplicate multiple paths from the same
   * affected node into a comp.
   * @param {string} nodeId The starting node ID.
   * @param {Object} visited Map of visited node IDs to break cycles.
   * @return {string|null} The affected node UUID, or null.
   */
  function resolveCompLayerAffectedNode(nodeId, visited) {
    if (visited[nodeId]) return null;
    visited[nodeId] = true;
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return null;
    if (nodeData.nodeKind === 'affected') return nodeId;
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === nodeId && w.type === 'layer') {
        var result = resolveCompLayerAffectedNode(w.fromNode, visited);
        if (result) return result;
      }
    }
    return null;
  }

  return {
    resolveCompLayerAffectedNode: resolveCompLayerAffectedNode
  };

})();
