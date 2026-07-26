/**
 * graph/autoLayout/graphBuilder/buildGraph.js
 *
 * Builds the directed adjacency graph from layer wires in graphState.
 * DEPENDS ON: graphState, autoLayoutInternals
 */
(function() {
  var C = autoLayoutInternals;

  function _buildGraph() {
    var nodeMap = graphState.getAllNodes();
    var wireMap = graphState.getAllWires();

    var adjacency = {};
    var edges = [];
    var nodeSet = {};

    for (var id in nodeMap) {
      var n = nodeMap[id];
      if (n.nodeKind === 'data') continue;
      nodeSet[id] = true;
      adjacency[id] = { in: [], out: [] };
    }

    for (var wid in wireMap) {
      var w = wireMap[wid];
      if (w.type !== 'layer') continue;
      if (!nodeSet[w.fromNode] || !nodeSet[w.toNode]) continue;

      edges.push({ from: w.fromNode, to: w.toNode });
      adjacency[w.fromNode].out.push(w.toNode);
      adjacency[w.toNode].in.push(w.fromNode);
    }

    var nodeIds = Object.keys(nodeSet);

    return { nodeIds: nodeIds, edges: edges, adjacency: adjacency };
  }

  C._buildGraph = _buildGraph;
})();
