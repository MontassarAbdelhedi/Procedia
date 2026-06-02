/**
 * graph/autoLayout/positioning.js
 *
 * Coordinate assignment and fallback positioning (data nodes, remaining, normalization).
 * DEPENDS ON: graphState, autoLayoutInternals
 */
(function() {
  var C = autoLayoutInternals;

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
          positions[nid] = { x: currentY, y: li * (C.NODE_W + hSpacing) };
        } else {
          positions[nid] = { x: li * (C.NODE_W + hSpacing), y: currentY };
        }

        currentY += nh + vSpacing;
      }
    }

    return positions;
  }

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
        result[id] = { x: avgX - C.NODE_W - 60, y: avgY };
      }
    }

    return result;
  }

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

      var nh = C._getNodeHeight(id, nodeMap[id]);
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

  C._assignCoordinates = _assignCoordinates;
  C._positionDataNodes = _positionDataNodes;
  C._positionRemaining = _positionRemaining;
  C._normalizePositions = _normalizePositions;
})();
