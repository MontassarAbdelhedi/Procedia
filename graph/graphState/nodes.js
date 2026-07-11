/**
 * Node CRUD operations for the graph state.
 * Provides addNode, removeNode, updateNode, getNode, getAllNodes,
 * and internal helper _removeWiresForNode.
 * @module graphState/nodes
 * @dependencies graphState/state, graphState/tempGraph
 */
// graph/graphState/nodes.js
// DEPENDS ON: graph/graphState/state.js, graph/graphState/tempGraph.js
// MUST LOAD BEFORE: graph/graphState/index.js

(function(gs) {

  function _removeWiresForNode(uuid) {
    var toRemove = [];
    for (var wireId in gs.wireMap) {
      var wire = gs.wireMap[wireId];
      if (wire.fromNode === uuid || wire.toNode === uuid) {
        toRemove.push(wireId);
      }
    }
    for (var i = 0; i < toRemove.length; i++) {
      delete gs.wireMap[toRemove[i]];
    }
  }

  function addNode(nodeData) {
    if (!nodeData || !nodeData.id) {
      throw new Error('graphState.addNode: nodeData.id is required');
    }
    if (gs.nodeMap.hasOwnProperty(nodeData.id)) {
      throw new Error('graphState.addNode: node already exists: ' + nodeData.id);
    }
    gs.nodeMap[nodeData.id] = nodeData;
    gs.rebuildTempGraph();
  }

  function removeNode(uuid) {
    if (!gs.nodeMap.hasOwnProperty(uuid)) return;
    _removeWiresForNode(uuid);
    delete gs.nodeMap[uuid];
    gs.rebuildTempGraph();
  }

  function updateNode(uuid, patch) {
    if (!gs.nodeMap.hasOwnProperty(uuid)) return;
    var node = gs.nodeMap[uuid];
    for (var key in patch) {
      node[key] = patch[key];
    }
    gs.rebuildTempGraph();
  }

  function batchUpdateNodes(patches) {
    for (var uuid in patches) {
      if (!patches.hasOwnProperty(uuid)) continue;
      if (!gs.nodeMap.hasOwnProperty(uuid)) continue;
      var node = gs.nodeMap[uuid];
      var patch = patches[uuid];
      for (var key in patch) {
        node[key] = patch[key];
      }
    }
    gs.rebuildTempGraph();
  }

  function getNode(uuid) {
    return gs.nodeMap.hasOwnProperty(uuid) ? gs.nodeMap[uuid] : null;
  }

  function getAllNodes() {
    return gs.nodeMap;
  }

  gs.addNode    = addNode;
  gs.removeNode = removeNode;
  gs.updateNode = updateNode;
  gs.batchUpdateNodes = batchUpdateNodes;
  gs.getNode    = getNode;
  gs.getAllNodes = getAllNodes;

})(window.__procedia_internal.gs);
