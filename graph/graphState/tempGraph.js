/**
 * Rebuilds the stripped tempGraph snapshot from nodeMap and wireMap.
 * Strips internal fields (dirty, dynamicSchema, secondaryPorts, _transplantLayerUUID)
 * from node copies so the temp graph is safe for external consumers.
 * @module graphState/tempGraph
 * @dependencies graphState/state
 * @internal
 */
// graph/graphState/tempGraph.js
// DEPENDS ON: graph/graphState/state.js
// MUST LOAD BEFORE: graph/graphState/nodes.js, graph/graphState/wires.js,
//                   graph/graphState/graphOps.js, graph/graphState/index.js

(function(gs) {

  gs.rebuildTempGraph = function rebuildTempGraph() {
    var newNodes = {};
    var newWires = {};

    for (var nodeId in gs.nodeMap) {
      var srcNode  = gs.nodeMap[nodeId];
      var copyNode = {};
      for (var field in srcNode) {
        if (!gs._strippedNodeFields[field]) {
          copyNode[field] = srcNode[field];
        }
      }
      newNodes[nodeId] = copyNode;
    }

    for (var wireId in gs.wireMap) {
      var srcWire  = gs.wireMap[wireId];
      var copyWire = {};
      for (var wfield in srcWire) {
        copyWire[wfield] = srcWire[wfield];
      }
      newWires[wireId] = copyWire;
    }

    gs.tempGraph.nodes = newNodes;
    gs.tempGraph.wires = newWires;
  };

})(window.__gs);
