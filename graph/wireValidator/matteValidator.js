/**
 * Validates matte node three-condition wiring constraints.
 * Both top_layer and matte_layer inputs must be connected, their upstream
 * nodes must share the same first-level hosting comp, and the matte output
 * must connect to that shared comp.
 * @module wireValidator/matteValidator
 * @dependencies graph/graphState.js
 * @exports __wv._validateMatteConditions
 */
// graph/wireValidator/matteValidator.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: graph/wireValidator/canConnect.js, graph/wireValidator/index.js

(function() {
  var wv = window.__wv = window.__wv || {};

  /**
   * Validates matte node constraints: both top_layer and matte_layer inputs
   * must be connected, their upstream nodes must share the same first-level
   * hosting comp, and the matte output must connect to that shared comp.
   * @param {string} fromNodeId - Source node UUID
   * @param {string} fromPort - Source port ID
   * @param {string} toNodeId - Target node UUID
   * @param {string} toPort - Target port ID
   * @returns {string|null} Error message if conditions not met, or null
   */
  wv._validateMatteConditions = function(fromNodeId, fromPort, toNodeId, toPort) {
    var toNode = graphState.getNode(toNodeId);
    if (!toNode || toNode.nodeKind !== 'matte') return null;

    var wireMap = graphState.getAllWires();
    var topWire = null;
    var matteWire = null;

    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var existing = wireMap[wireId];
      if (existing.toNode !== toNodeId) continue;
      if (existing.toPort === 'top_layer') topWire = existing;
      if (existing.toPort === 'matte_layer') matteWire = existing;
    }

    if (toPort === 'top_layer') {
      topWire = { fromNode: fromNodeId, fromPort: fromPort, toNode: toNodeId, toPort: toPort };
    } else if (toPort === 'matte_layer') {
      matteWire = { fromNode: fromNodeId, fromPort: fromPort, toNode: toNodeId, toPort: toPort };
    } else {
      return null;
    }

    if (!topWire || !matteWire) return null;

    var topUpstream = graphState.getNode(topWire.fromNode);
    var matteUpstream = graphState.getNode(matteWire.fromNode);
    if (!topUpstream || !matteUpstream) {
      return 'Matte conditions not met: upstream nodes not found';
    }

    if (!topUpstream.hostingComps || !topUpstream.hostingComps[0] ||
        !matteUpstream.hostingComps || !matteUpstream.hostingComps[0]) {
      return 'Matte conditions not met: both upstream layers must share the same first-level hosting comp';
    }
    if (topUpstream.hostingComps[0] !== matteUpstream.hostingComps[0]) {
      return 'Matte conditions not met: both upstream layers must share the same first-level hosting comp';
    }

    var sharedComp = topUpstream.hostingComps[0];
    var outputFound = false;
    for (var wId in wireMap) {
      if (!wireMap.hasOwnProperty(wId)) continue;
      var outWire = wireMap[wId];
      if (outWire.fromNode === toNodeId && outWire.type === 'layer' && outWire.toNode === sharedComp) {
        outputFound = true;
        break;
      }
    }
    if (!outputFound) {
      return 'Matte conditions not met: output must connect to the shared hosting comp';
    }

    return null;
  };
})();
