/**
 * graph/autoLayout/graphBuilder.js
 *
 * Builds the directed graph from layer wires and finds connected components.
 * DEPENDS ON: graphState, autoLayoutInternals
 */
(function() {
  var C = autoLayoutInternals;

  function _buildGraph() {
    var nodeMap = graphState.getAllNodes();
    var wireMap = graphState.getAllWires();

    var inDegree = {};
    var outDegree = {};
    var adjacency = {};
    var edges = [];
    var nodeSet = {};

    for (var id in nodeMap) {
      var n = nodeMap[id];
      if (n.nodeKind === 'data') continue;
      nodeSet[id] = true;
      inDegree[id] = 0;
      outDegree[id] = 0;
      adjacency[id] = { in: [], out: [] };
    }

    for (var wid in wireMap) {
      var w = wireMap[wid];
      if (w.type !== 'layer') continue;
      if (!nodeSet[w.fromNode] || !nodeSet[w.toNode]) continue;

      edges.push({ from: w.fromNode, to: w.toNode });
      adjacency[w.fromNode].out.push(w.toNode);
      adjacency[w.toNode].in.push(w.fromNode);
      outDegree[w.fromNode]++;
      inDegree[w.toNode]++;
    }

    var nodeIds = Object.keys(nodeSet);
    var sources = [];
    var sinks = [];
    for (var i = 0; i < nodeIds.length; i++) {
      var nid = nodeIds[i];
      if (inDegree[nid] === 0) sources.push(nid);
      if (outDegree[nid] === 0) sinks.push(nid);
    }

    return { nodeIds: nodeIds, edges: edges, adjacency: adjacency, sources: sources, sinks: sinks };
  }

  function _findComponents(nodeIds, adjacency) {
    var visited = {};
    var components = [];

    for (var i = 0; i < nodeIds.length; i++) {
      var nid = nodeIds[i];
      if (visited[nid]) continue;

      var comp = [];
      var queue = [nid];
      visited[nid] = true;

      while (queue.length > 0) {
        var cur = queue.shift();
        comp.push(cur);
        var neighbors = (adjacency[cur].in || []).concat(adjacency[cur].out || []);
        for (var j = 0; j < neighbors.length; j++) {
          if (!visited[neighbors[j]]) {
            visited[neighbors[j]] = true;
            queue.push(neighbors[j]);
          }
        }
      }

      if (comp.length > 0) components.push(comp);
    }

    return components;
  }

  C._buildGraph = _buildGraph;
  C._findComponents = _findComponents;
})();
