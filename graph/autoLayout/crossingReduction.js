/**
 * graph/autoLayout/crossingReduction.js
 *
 * Barycenter heuristic for reducing edge crossings.
 * DEPENDS ON: autoLayoutInternals
 */
(function() {
  var C = autoLayoutInternals;

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

  C._barycenterForNode = _barycenterForNode;
  C._reduceCrossings = _reduceCrossings;
})();
