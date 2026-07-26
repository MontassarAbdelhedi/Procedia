/**
 * graph/autoLayout/graphBuilder/findComponents.js
 *
 * Finds connected components in the graph via BFS.
 * DEPENDS ON: autoLayoutInternals
 */
(function() {
  var C = autoLayoutInternals;

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

  C._findComponents = _findComponents;
})();
