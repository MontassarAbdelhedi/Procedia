/**
 * Layer cycle detector — finds cycles in the layer wire graph using DFS.
 * Pure JS, no AE or UI dependencies.
 * @module vcMergeLayerCycleDetector
 * @dependencies none
 */
// versioning/merge/layerCycleDetector.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/merge/mergeValidator.js

var vcMergeLayerCycleDetector = (function() {

  /**
   * @param {Object} nodes — map of nodeId → node
   * @param {Object} wires — map of wireId → wire
   * @returns {string[]} cycle descriptions, empty if none
   */
  function detect(nodes, wires) {
    var errors = [];
    var layerWires = [];
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      if (wires[wid].type === 'layer') layerWires.push(wires[wid]);
    }

    var nodeIds = [];
    for (var nid in nodes) {
      if (nodes.hasOwnProperty(nid)) nodeIds.push(nid);
    }

    var adj = {};
    for (var ni = 0; ni < nodeIds.length; ni++) {
      adj[nodeIds[ni]] = [];
    }
    for (var lwi = 0; lwi < layerWires.length; lwi++) {
      var lw = layerWires[lwi];
      if (adj[lw.fromNode] && adj[lw.toNode]) {
        adj[lw.fromNode].push(lw.toNode);
      }
    }

    var WHITE = 0, GRAY = 1, BLACK = 2;
    var color = {};
    for (var nj = 0; nj < nodeIds.length; nj++) {
      color[nodeIds[nj]] = WHITE;
    }

    function dfs(u, path) {
      color[u] = GRAY;
      for (var vIdx = 0; vIdx < adj[u].length; vIdx++) {
        var v = adj[u][vIdx];
        if (color[v] === GRAY) {
          var cycleStart = path.indexOf(v);
          if (cycleStart >= 0) {
            var cycleNodes = path.slice(cycleStart).concat([v]);
            errors.push(cycleNodes.join(' → '));
          }
        } else if (color[v] === WHITE) {
          dfs(v, path.concat([v]));
        }
      }
      color[u] = BLACK;
    }

    for (var nk = 0; nk < nodeIds.length; nk++) {
      if (color[nodeIds[nk]] === WHITE) {
        dfs(nodeIds[nk], [nodeIds[nk]]);
      }
    }

    return errors;
  }

  return {
    detect: detect
  };

})();
