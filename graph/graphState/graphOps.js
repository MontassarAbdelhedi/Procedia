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
    gs.nodeMap   = {};
    gs.wireMap   = {};
    gs.selection = [];
    gs._viewFilter   = null;
    gs._activeCompId = null;

    if (graphData && graphData.nodes) {
      for (var nodeId in graphData.nodes) {
        var node = graphData.nodes[nodeId];
        gs.nodeMap[nodeId] = node;
        if (node.dirty          === undefined) node.dirty          = false;
        if (node.hasParkedLayer === undefined) node.hasParkedLayer = false;
        if (node.secondaryPorts === undefined) node.secondaryPorts = null;
        if (node.dynamicSchema  === undefined) node.dynamicSchema  = null;
        if (node.locked         === undefined) node.locked         = false;
        if (node.disabled       === undefined) node.disabled       = false;
      }
    }

    if (graphData && graphData.wires) {
      for (var wireId in graphData.wires) {
        gs.wireMap[wireId] = graphData.wires[wireId];
      }
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
    gs.nodeMap   = {};
    gs.wireMap   = {};
    gs.tempGraph = { version: '4.0', nodes: {}, wires: {} };
    gs.selection = [];
    gs._viewFilter   = null;
    gs._activeCompId = null;
    gs._fireGraphChange();
  }

  gs.loadGraph  = loadGraph;
  gs.clearGraph = clearGraph;

})(window.__gs);
