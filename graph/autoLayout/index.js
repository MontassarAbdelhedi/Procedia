/**
 * graph/autoLayout/index.js
 *
 * Layered (Sugiyama-style) auto layout for the Procedia node graph.
 * Reads graphState, computes new positions using the layer-wire topology,
 * and writes positions back via graphState.updateNode().
 *
 * Sub-modules (load in order):
 *   graph/autoLayout/constants.js
 *   graph/autoLayout/estimateHeight.js
 *   graph/autoLayout/graphBuilder.js
 *   graph/autoLayout/layerAssignment.js
 *   graph/autoLayout/crossingReduction.js
 *   graph/autoLayout/positioning.js
 *   graph/autoLayout/index.js
 *
 * Dependencies: graphState, nodeRegistry
 *
 * Exports: window.autoLayout { run }
 */
(function() {
  var C = autoLayoutInternals;

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

    var graph = C._buildGraph();

    if (graph.nodeIds.length === 0) {
      // Only data nodes or nothing — grid them
      var gridPos = C._positionRemaining({});
      for (var gid in gridPos) {
        graphState.updateNode(gid, gridPos[gid]);
      }
      return;
    }

    var components = C._findComponents(graph.nodeIds, graph.adjacency);

    var allPositions = {};
    var componentOffsetX = 0;
    var COMP_PAD = 200;

    for (var ci = 0; ci < components.length; ci++) {
      var comp = components[ci];

      var layers = C._assignLayers(comp, graph.edges);
      var ordering = C._buildOrdering(layers);

      C._reduceCrossings(ordering, graph.adjacency);

      var nodeHeights = {};
      for (var ni = 0; ni < comp.length; ni++) {
        nodeHeights[comp[ni]] = C._getNodeHeight(comp[ni], nodeMap[comp[ni]]);
      }

      var compPositions = C._assignCoordinates(ordering, nodeHeights, direction, hSpacing, vSpacing);

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
    var dataPositions = C._positionDataNodes(allPositions);
    for (var dpId in dataPositions) {
      allPositions[dpId] = dataPositions[dpId];
    }

    // Position any remaining unpositioned nodes
    var remainingPositions = C._positionRemaining(allPositions);
    for (var rpId in remainingPositions) {
      allPositions[rpId] = remainingPositions[rpId];
    }

    // Normalize so min x,y is at origin + padding
    C._normalizePositions(allPositions);

    // Apply positions via graphState, skipping locked nodes
    for (var nid in allPositions) {
      var nodeData = nodeMap[nid];
      if (nodeData && nodeData.locked) continue;
      graphState.updateNode(nid, { x: Math.round(allPositions[nid].x), y: Math.round(allPositions[nid].y) });
    }

    if (typeof envSnapshot !== 'undefined' && envSnapshot.addAction) {
      envSnapshot.addAction('autoLayout', { direction: options.direction || settings.get('layoutDirection') });
    }
  }

  window.autoLayout = { run: run };
  delete window.autoLayoutInternals;
})();
