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

      // Skip stale _pathLayerUUID from effectors whose main_input was
      // cascaded away — the layer they pointed to was parked.
      var fromNode = graphState.getNode(wires[id].fromNode);
      if (fromNode && fromNode.nodeKind === 'effector') {
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

    if (compNodeData.type === 'core/comp' && wire.fromNode) {
      return [wire.fromNode];
    }

    return [];
  }

  return {
    getAliveWireUUIDs: getAliveWireUUIDs,
    findNodesByWireUUID: findNodesByWireUUID
  };

})();
