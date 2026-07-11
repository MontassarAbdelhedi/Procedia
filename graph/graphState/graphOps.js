/**
 * High-level graph operations: load a full graph and clear the entire state.
 * Provides loadGraph and clearGraph.
 * @module graphState/graphOps
 * @dependencies graphState/state, graphState/tempGraph
 */
// graph/graphState/graphOps.js
// DEPENDS ON: graph/graphState/state.js, graph/graphState/tempGraph.js
// MUST LOAD BEFORE: graph/graphState/index.js

(function(gs) {

  function loadGraph(graphData) {
    if (typeof undoManager !== 'undefined') undoManager.reset();
    gs.nodeMap   = {};
    gs.wireMap   = {};
    gs.selection = [];
    gs._viewFilter   = null;
    gs._activeCompId = null;

    if (graphData && graphData.nodes) {
      for (var nodeId in graphData.nodes) {
        var node = graphData.nodes[nodeId];
        if (!node || !node.id || !node.type) {
          console.warn('[Procedia] loadGraph: skipping malformed node ' + nodeId);
          continue;
        }
        gs.nodeMap[nodeId] = node;
      }
    }

    if (graphData && graphData.wires) {
      for (var wireId in graphData.wires) {
        gs.wireMap[wireId] = graphData.wires[wireId];
      }
    }

    if (graphData && graphData.keyframes) {
      gs._keyframes = graphData.keyframes;
    } else {
    if (typeof keyframeState !== 'undefined' && keyframeState.reset) keyframeState.reset();
    }

    if (graphData && graphData.parkedNodeUUIDs) {
      var parkedSet = {};
      for (var pi = 0; pi < graphData.parkedNodeUUIDs.length; pi++) {
        var puid = graphData.parkedNodeUUIDs[pi];
        parkedSet[puid] = true;
        if (gs.nodeMap[puid]) {
          gs.nodeMap[puid].hasParkedLayer = true;
        }
      }
      for (var nid in gs.nodeMap) {
        if (gs.nodeMap.hasOwnProperty(nid) && gs.nodeMap[nid].hasParkedLayer && !parkedSet[nid]) {
          gs.nodeMap[nid].hasParkedLayer = false;
        }
      }
    }

    gs.rebuildTempGraph();
  }

  function clearGraph() {
    if (typeof undoManager !== 'undefined') undoManager.reset();
    gs.nodeMap   = {};
    gs.wireMap   = {};
    gs.selection = [];
    gs._viewFilter   = null;
    gs._activeCompId = null;
    gs._keyframes = {};
    gs.rebuildTempGraph();
  }

  gs.loadGraph  = loadGraph;
  gs.clearGraph = clearGraph;

})(window.__procedia_internal.gs);
