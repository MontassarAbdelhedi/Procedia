/**
 * Merge validator — validates a candidate merged graph against structural
 * and topological rules. Pure JS, no AE or UI dependencies.
 * @module vcMergeValidator
 * @dependencies none
 */
// versioning/merge/mergeValidator.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/merge/threeWayMerge.js

var vcMergeValidator = (function() {

  /**
   * Validates a candidate graph snapshot for structural correctness.
   * @param {Object} candidateSnapshot — the merged snapshot
   * @returns {{ok: boolean, errors: string[]}}
   */
  function validate(candidateSnapshot) {
    var errors = [];

    if (!candidateSnapshot || !candidateSnapshot.graph) {
      errors.push('No graph in candidate snapshot');
      return { ok: false, errors: errors };
    }

    var graph = candidateSnapshot.graph;
    var nodes = graph.nodes || {};
    var wires = graph.wires || {};

    // Validate all wire endpoints exist
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.fromNode && !nodes[w.fromNode]) {
        errors.push('Wire ' + wid + ' references missing fromNode: ' + w.fromNode);
      }
      if (w.toNode && !nodes[w.toNode]) {
        errors.push('Wire ' + wid + ' references missing toNode: ' + w.toNode);
      }
    }

    // Check for layer cycle
    var layerCycles = _findLayerCycles(nodes, wires);
    for (var lci = 0; lci < layerCycles.length; lci++) {
      errors.push('Layer cycle detected: ' + layerCycles[lci]);
    }

    // Check for duplicate semantic wires
    var dupWires = _findDuplicateWires(wires);
    for (var dpi = 0; dpi < dupWires.length; dpi++) {
      errors.push('Duplicate semantic wire: ' + dupWires[dpi]);
    }

    // Check for wires referencing ports that don't exist on nodes
    for (var wid2 in wires) {
      if (!wires.hasOwnProperty(wid2)) continue;
      var w2 = wires[wid2];
      if (w2.fromNode && w2.fromPort) {
        var fromNode = nodes[w2.fromNode];
        if (fromNode && fromNode.ports && !_hasPort(fromNode.ports, w2.fromPort)) {
          errors.push('Wire ' + wid2 + ' fromPort ' + w2.fromPort + ' not found on node ' + w2.fromNode);
        }
      }
      if (w2.toNode && w2.toPort) {
        var toNode = nodes[w2.toNode];
        if (toNode && toNode.ports && !_hasPort(toNode.ports, w2.toPort)) {
          errors.push('Wire ' + wid2 + ' toPort ' + w2.toPort + ' not found on node ' + w2.toNode);
        }
      }
    }

    return { ok: errors.length === 0, errors: errors };
  }

  function _hasPort(ports, portId) {
    for (var i = 0; i < ports.length; i++) {
      if (ports[i].id === portId) return true;
    }
    return false;
  }

  function _findLayerCycles(nodes, wires) {
    var errors = [];
    var layerWires = [];
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      if (wires[wid].type === 'layer') layerWires.push(wires[wid]);
    }

    // Detect cycles in layer graph using simple DFS
    var nodeIds = [];
    for (var nid in nodes) {
      if (nodes.hasOwnProperty(nid)) nodeIds.push(nid);
    }

    // Build adjacency list only for layer wires
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
          // Found cycle — find where it starts in path
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

  function _findDuplicateWires(wires) {
    var keys = {};
    var duplicates = [];

    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      var key = [w.type, w.fromNode, w.fromPort, w.toNode, w.toPort, w.boundParam || ''].join('|');
      if (keys[key]) {
        duplicates.push(key + ' (wires: ' + keys[key] + ', ' + wid + ')');
      } else {
        keys[key] = wid;
      }
    }

    return duplicates;
  }

  return {
    validate: validate
  };

})();
