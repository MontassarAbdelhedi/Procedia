/**
 * Looks up alive wire UUIDs and finds affected node UUIDs from a wire.
 * Depends on: graph/graphState.js
 * Exports: pollerHelpers object with getAliveWireUUIDs, findNodesByWireUUID
 */
// polling/missingNodes.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: polling/poller.js

var pollerHelpers = (function() {

  function getAliveWireUUIDs() {
    var wires = graphState.getAllWires();
    var uuids = [];
    for (var id in wires) {
      if (!wires.hasOwnProperty(id)) continue;
      if (!wires[id]._pathLayerUUID) continue;

      // Skip stale _pathLayerUUID from nodes that are not alive — the layer
      // either was never created (e.g. footage node with no imported file)
      // or was parked/cascaded away.
      var fromNode = graphState.getNode(wires[id].fromNode);
      if (!fromNode || fromNode.state !== 'alive') continue;
      if (fromNode.nodeKind === 'effector') {
        var hasMainInput = false;
        for (var wid2 in wires) {
          if (!wires.hasOwnProperty(wid2)) continue;
          var w = wires[wid2];
          if (w.toNode === fromNode.id && w.toPort === 'main_input') {
            hasMainInput = true;
            break;
          }
        }
        if (!hasMainInput) continue;
      }

      // Only poll terminal wires (entering a comp node). Non-terminal wires
      // have _pathLayerUUID set to their own wire ID, which never matches
      // any layer's .comment (always the terminal wire UUID).
      var toNode = graphState.getNode(wires[id].toNode);
      if (!toNode || toNode.type !== 'core/comp') continue;

      // Skip UUIDs that are pending creation in AE — protects against a race
      // condition where the poller runs before the async dispatch that creates
      // the layer (e.g. createTextLayer) has completed.
      if (typeof window.__procedia_internal.prop !== 'undefined' && window.__procedia_internal.prop.isPathLayerPending && window.__procedia_internal.prop.isPathLayerPending(wires[id]._pathLayerUUID)) continue;

      uuids.push(wires[id]._pathLayerUUID);
    }
    return uuids;
  }

  function findNodesByWireUUID(wireUUID) {
    var wire = graphState.getWire(wireUUID);
    if (!wire) return [];
    var compNodeData = graphState.getNode(wire.toNode);
    if (!compNodeData) return [];

    if (compNodeData.hostingComps && compNodeData.hostingComps[0]) {
      var aeCompUUID = compNodeData.hostingComps[0];
      var nodes = graphState.getAllNodes();
      var result = [];
      for (var id in nodes) {
        if (!nodes.hasOwnProperty(id)) continue;
        if (nodes[id].state !== 'alive') continue;
        for (var hc = 0; hc < (nodes[id].hostingComps || []).length; hc++) {
          if (nodes[id].hostingComps[hc] === aeCompUUID) {
            result.push(id);
            break;
          }
        }
      }
      return result;
    }

    if (compNodeData.type === 'core/comp') {
      // Root CompNodes have no hostingComps — their .id IS the comp UUID.
      // Find all alive nodes hosted in this comp, same as the parent path.
      var aeCompUUID = compNodeData.id;
      var nodes = graphState.getAllNodes();
      var result = [];
      for (var id in nodes) {
        if (!nodes.hasOwnProperty(id)) continue;
        if (nodes[id].state !== 'alive') continue;
        for (var hc = 0; hc < (nodes[id].hostingComps || []).length; hc++) {
          if (nodes[id].hostingComps[hc] === aeCompUUID) {
            result.push(id);
            break;
          }
        }
      }
      if (result.length > 0) return result;
      // Last resort: flag the direct upstream node.
      if (wire.fromNode) return [wire.fromNode];
    }

    return [];
  }

  return {
    getAliveWireUUIDs: getAliveWireUUIDs,
    findNodesByWireUUID: findNodesByWireUUID
  };

})();
