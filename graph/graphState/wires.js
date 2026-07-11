/**
 * Wire CRUD operations for the graph state.
 * Provides addWire, removeWire, updateWire, getWire, getAllWires.
 * @module graphState/wires
 * @dependencies graphState/state, graphState/tempGraph
 */
// graph/graphState/wires.js
// DEPENDS ON: graph/graphState/state.js, graph/graphState/tempGraph.js
// MUST LOAD BEFORE: graph/graphState/index.js

(function(gs) {

  function addWire(wireData) {
    if (!wireData || !wireData.id) {
      throw new Error('graphState.addWire: wireData.id is required');
    }
    if (gs.wireMap.hasOwnProperty(wireData.id)) {
      throw new Error('graphState.addWire: wire already exists: ' + wireData.id);
    }
    gs.wireMap[wireData.id] = wireData;
    gs.rebuildTempGraph();
  }

  function removeWire(wireId) {
    if (!gs.wireMap.hasOwnProperty(wireId)) return;
    delete gs.wireMap[wireId];
    gs.rebuildTempGraph();
  }

  function updateWire(wireId, patch) {
    if (!gs.wireMap.hasOwnProperty(wireId)) return;
    var wire = gs.wireMap[wireId];
    for (var key in patch) {
      wire[key] = patch[key];
    }
    gs.rebuildTempGraph();
  }

  function getWire(wireId) {
    return gs.wireMap.hasOwnProperty(wireId) ? gs.wireMap[wireId] : null;
  }

  function getAllWires() {
    return gs.wireMap;
  }

  gs.addWire    = addWire;
  gs.removeWire = removeWire;
  gs.updateWire = updateWire;
  gs.getWire    = getWire;
  gs.getAllWires = getAllWires;

})(window.__procedia_internal.gs);
