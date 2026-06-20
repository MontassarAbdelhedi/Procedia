/**
 * graph/autoLayout/layerAssignment.js
 *
 * Longest-path layer assignment and ordering construction.
 * DEPENDS ON: autoLayoutInternals
 */
(function() {
  var C = autoLayoutInternals;

  function _assignLayers(componentNodes, edges) {
    var layer = {};
    for (var i = 0; i < componentNodes.length; i++) {
      layer[componentNodes[i]] = 0;
    }

    var compSet = {};
    for (var j = 0; j < componentNodes.length; j++) {
      compSet[componentNodes[j]] = true;
    }

    var localEdges = [];
    for (var k = 0; k < edges.length; k++) {
      if (compSet[edges[k].from] && compSet[edges[k].to]) {
        localEdges.push(edges[k]);
      }
    }

    var changed = true;
    var maxIter = componentNodes.length;
    while (changed && maxIter > 0) {
      changed = false;
      maxIter--;
      for (var e = 0; e < localEdges.length; e++) {
        var u = localEdges[e].from;
        var v = localEdges[e].to;
        if (layer[v] < layer[u] + 1) {
          layer[v] = layer[u] + 1;
          changed = true;
        }
      }
    }

    if (maxIter === 0) {
      console.warn('[autoLayout] layer assignment exhausted iterations — possible cycle in subgraph');
    }

    return layer;
  }

  function _buildOrdering(layers) {
    var maxLayer = 0;
    for (var id in layers) {
      if (layers[id] > maxLayer) maxLayer = layers[id];
    }

    var ordering = [];
    for (var i = 0; i <= maxLayer; i++) {
      ordering.push([]);
    }

    for (var nid in layers) {
      ordering[layers[nid]].push(nid);
    }

    return ordering;
  }

  C._assignLayers = _assignLayers;
  C._buildOrdering = _buildOrdering;
})();
