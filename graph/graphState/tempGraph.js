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

  gs._fireGraphChange = function _fireGraphChange() {
    var listeners = gs._graphChangeListeners;
    if (!listeners) {

      return;
    }

    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i]();
      } catch (e) {
        console.error('[graphState] _fireGraphChange listener error:', e);
      }
    }
  };

  function _rebuildFromMaps() {
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
        if (!gs._strippedWireFields[wfield]) {
          copyWire[wfield] = srcWire[wfield];
        }
      }
      newWires[wireId] = copyWire;
    }

    gs.tempGraph.nodes = newNodes;
    gs.tempGraph.wires = newWires;
  }

  gs.rebuildTempGraph = function rebuildTempGraph() {
    gs._tempDirty = true;
    gs._dirty = true;
    gs._fireGraphChange();
  };

  gs.getTempGraph = function getTempGraph() {
    if (gs._tempDirty) {
      _rebuildFromMaps();
      gs._tempDirty = false;
    }
    return gs.tempGraph;
  };

})(window.__procedia_internal.gs);
