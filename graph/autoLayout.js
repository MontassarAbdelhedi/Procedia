/**
 * graph/autoLayout.js
 *
 * Layered (Sugiyama-style) auto layout for the Procedia node graph.
 * Reads graphState, computes new positions using the layer-wire topology,
 * and writes positions back via graphState.updateNode().
 *
 * Dependencies: graphState, nodeRegistry
 * Load before: ui/topBar.js
 *
 * Exports: autoLayout { run }
 */
// graph/autoLayout.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var autoLayout = (function() {

  var NODE_W = 180;
  var HEADER_H = 36;
  var PARAM_H = 24;
  var OUTPUT_H = 20;
  var PARENT_H = 16;
  var PAD = 8;

  /**
   * Estimates the height of a node card from its definition and data.
   */
  function _estimateNodeHeight(nodeData) {
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return 120;

    var h = HEADER_H;

    if (def.params === 'dynamic') {
      if (nodeData.dynamicSchema && nodeData.dynamicSchema.properties) {
        h += nodeData.dynamicSchema.properties.length * PARAM_H;
      } else {
        h += PARAM_H;
      }
    } else if (def.params) {
      h += def.params.length * PARAM_H;
    }

    for (var i = 0; i < def.ports.length; i++) {
      if (def.ports[i].category === 'output') { h += OUTPUT_H; break; }
    }
    for (var j = 0; j < def.ports.length; j++) {
      if (def.ports[j].id === 'child_of') h += PARENT_H;
      if (def.ports[j].id === 'parent_of') h += PARENT_H;
    }

    return h + PAD;
  }

  /**
   * Gets the actual DOM height of a node if rendered, else estimates.
   */
  function _getNodeHeight(nodeId, nodeData) {
    if (typeof renderer !== 'undefined' && renderer.getNodeElement) {
      var el = renderer.getNodeElement(nodeId);
      if (el) return el.offsetHeight;
    }
    return _estimateNodeHeight(nodeData);
  }

  /**
   * Builds adjacency and edge lists from layer wires only.
   * Returns { nodes, edges, adjacency, sources, sinks }
   */
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

  /**
   * Finds connected components in the undirected graph.
   * Returns array of arrays of node ids.
   */
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

  /**
   * Assigns layers using longest-path algorithm.
   * Returns { nodeId: layerIndex }
   */
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

    return layer;
  }

  /**
   * Builds ordering as array of arrays from layer assignment.
   */
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

  /**
   * Computes barycenter for a node relative to a given layer's nodes.
   */
  function _barycenterForNode(nodeId, refLayer, adjacency) {
    var refPos = {};
    for (var i = 0; i < refLayer.length; i++) {
      refPos[refLayer[i]] = i;
    }

    var sum = 0;
    var count = 0;

    var inNeighbors = adjacency[nodeId] ? (adjacency[nodeId].in || []) : [];
    for (var j = 0; j < inNeighbors.length; j++) {
      if (refPos[inNeighbors[j]] !== undefined) {
        sum += refPos[inNeighbors[j]];
        count++;
      }
    }

    var outNeighbors = adjacency[nodeId] ? (adjacency[nodeId].out || []) : [];
    for (var k = 0; k < outNeighbors.length; k++) {
      if (refPos[outNeighbors[k]] !== undefined) {
        sum += refPos[outNeighbors[k]];
        count++;
      }
    }

    if (count === 0) return (refLayer.length - 1) / 2;
    return sum / count;
  }

  /**
   * Reduces edge crossings using barycenter heuristic (forward + backward passes).
   */
  function _reduceCrossings(ordering, adjacency) {
    for (var iter = 0; iter < 4; iter++) {
      // Forward pass
      for (var li = 1; li < ordering.length; li++) {
        var layer = ordering[li];
        var bary = {};
        for (var i = 0; i < layer.length; i++) {
          bary[layer[i]] = _barycenterForNode(layer[i], ordering[li - 1], adjacency);
        }
        layer.sort(function(a, b) { return bary[a] - bary[b]; });
      }

      // Backward pass
      for (var lj = ordering.length - 2; lj >= 0; lj--) {
        var layerB = ordering[lj];
        var baryB = {};
        for (var j = 0; j < layerB.length; j++) {
          baryB[layerB[j]] = _barycenterForNode(layerB[j], ordering[lj + 1], adjacency);
        }
        layerB.sort(function(a, b) { return baryB[a] - baryB[b]; });
      }
    }
  }

  /**
   * Assigns x/y coordinates from ordering.
   * Returns { nodeId: { x, y } }
   */
  function _assignCoordinates(ordering, nodeHeights, direction, hSpacing, vSpacing) {
    var positions = {};

    for (var li = 0; li < ordering.length; li++) {
      var layer = ordering[li];

      var totalH = 0;
      for (var i = 0; i < layer.length; i++) {
        totalH += nodeHeights[layer[i]];
      }
      totalH += (layer.length - 1) * vSpacing;

      var startY = -totalH / 2 + (nodeHeights[layer[0]] || 0) / 2;
      var currentY = startY;

      for (var j = 0; j < layer.length; j++) {
        var nid = layer[j];
        var nh = nodeHeights[nid] || 100;

        if (direction === 'TB') {
          positions[nid] = { x: currentY, y: li * (NODE_W + hSpacing) };
        } else {
          positions[nid] = { x: li * (NODE_W + hSpacing), y: currentY };
        }

        currentY += nh + vSpacing;
      }
    }

    return positions;
  }

  /**
   * Positions data nodes near their connected non-data nodes.
   * Returns { nodeId: { x, y } }
   */
  function _positionDataNodes(positions) {
    var nodeMap = graphState.getAllNodes();
    var wireMap = graphState.getAllWires();
    var result = {};

    for (var id in nodeMap) {
      if (nodeMap[id].nodeKind !== 'data') continue;
      if (positions[id]) continue;

      var targets = [];
      for (var wid in wireMap) {
        var w = wireMap[wid];
        if (w.fromNode === id && w.type === 'data') {
          if (positions[w.toNode]) targets.push(positions[w.toNode]);
        }
      }

      if (targets.length > 0) {
        var avgX = 0, avgY = 0;
        for (var t = 0; t < targets.length; t++) {
          avgX += targets[t].x;
          avgY += targets[t].y;
        }
        avgX /= targets.length;
        avgY /= targets.length;
        result[id] = { x: avgX - NODE_W - 60, y: avgY };
      }
    }

    return result;
  }

  /**
   * Positions remaining unpositioned nodes in a grid.
   * Returns { nodeId: { x, y } }
   */
  function _positionRemaining(positions) {
    var nodeMap = graphState.getAllNodes();
    var result = {};
    var gridX = 0, gridY = 0;
    var gridCol = 0;
    var GRID_COLS = 4;
    var GRID_SPACING = 100;

    for (var id in nodeMap) {
      if (positions[id]) continue;
      if (result[id]) continue;

      var nh = _getNodeHeight(id, nodeMap[id]);
      result[id] = { x: gridX, y: gridY };
      gridCol++;
      if (gridCol >= GRID_COLS) {
        gridCol = 0;
        gridX = 0;
        gridY += GRID_SPACING;
      } else {
        gridX += GRID_SPACING;
      }
    }

    return result;
  }

  /**
   * Offsets all positions so the minimum x,y is at a positive origin with padding.
   */
  function _normalizePositions(allPositions) {
    var minX = Infinity, minY = Infinity;
    for (var id in allPositions) {
      if (allPositions[id].x < minX) minX = allPositions[id].x;
      if (allPositions[id].y < minY) minY = allPositions[id].y;
    }

    var OFFSET = 100;
    if (minX === Infinity) return;

    var dx = OFFSET - minX;
    var dy = OFFSET - minY;

    if (dx === 0 && dy === 0) return;

    for (var nid in allPositions) {
      allPositions[nid].x += dx;
      allPositions[nid].y += dy;
    }
  }

  /**
   * Runs the auto layout algorithm.
   * @param {Object} [options] - Override settings
   * @param {string} [options.direction] - 'LR' or 'TB'
   * @param {number} [options.hSpacing] - Horizontal spacing between layers
   * @param {number} [options.vSpacing] - Vertical spacing between nodes in a layer
   */
  function run(options) {
    var nodeMap = graphState.getAllNodes();
    if (!nodeMap) return;

    var nodeIds = Object.keys(nodeMap);
    if (nodeIds.length === 0) return;

    options = options || {};
    var direction = options.direction || (typeof settings !== 'undefined' ? settings.get('layoutDirection') : 'LR');
    var hSpacing = options.hSpacing != null ? options.hSpacing : (typeof settings !== 'undefined' ? settings.get('layoutHSpacing') : 80);
    var vSpacing = options.vSpacing != null ? options.vSpacing : (typeof settings !== 'undefined' ? settings.get('layoutVSpacing') : 40);

    var graph = _buildGraph();

    if (graph.nodeIds.length === 0) {
      // Only data nodes or nothing — grid them
      var gridPos = _positionRemaining({});
      for (var gid in gridPos) {
        graphState.updateNode(gid, gridPos[gid]);
      }
      return;
    }

    var components = _findComponents(graph.nodeIds, graph.adjacency);

    var allPositions = {};
    var componentOffsetX = 0;
    var COMP_PAD = 200;

    for (var ci = 0; ci < components.length; ci++) {
      var comp = components[ci];

      var layers = _assignLayers(comp, graph.edges);
      var ordering = _buildOrdering(layers);

      _reduceCrossings(ordering, graph.adjacency);

      var nodeHeights = {};
      for (var ni = 0; ni < comp.length; ni++) {
        nodeHeights[comp[ni]] = _getNodeHeight(comp[ni], nodeMap[comp[ni]]);
      }

      var compPositions = _assignCoordinates(ordering, nodeHeights, direction, hSpacing, vSpacing);

      // Offset component to avoid overlap
      if (componentOffsetX > 0) {
        for (var pid in compPositions) {
          compPositions[pid].x += componentOffsetX;
        }
      }

      for (var cpid in compPositions) {
        allPositions[cpid] = compPositions[cpid];
      }

      // Calculate component width for next offset
      var maxX = -Infinity, minX = Infinity;
      for (var pp in compPositions) {
        if (compPositions[pp].x > maxX) maxX = compPositions[pp].x;
        if (compPositions[pp].x < minX) minX = compPositions[pp].x;
      }
      componentOffsetX = maxX + COMP_PAD;
    }

    // Position data nodes
    var dataPositions = _positionDataNodes(allPositions);
    for (var dpId in dataPositions) {
      allPositions[dpId] = dataPositions[dpId];
    }

    // Position any remaining unpositioned nodes
    var remainingPositions = _positionRemaining(allPositions);
    for (var rpId in remainingPositions) {
      allPositions[rpId] = remainingPositions[rpId];
    }

    // Normalize so min x,y is at origin + padding
    _normalizePositions(allPositions);

    // Apply positions via graphState, skipping locked nodes
    for (var nid in allPositions) {
      var nodeData = nodeMap[nid];
      if (nodeData && nodeData.locked) continue;
      graphState.updateNode(nid, { x: Math.round(allPositions[nid].x), y: Math.round(allPositions[nid].y) });
    }
  }

  return { run: run };

})();
