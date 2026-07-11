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
   * Validates matte node input wiring constraints.
   * When connecting to top_layer or matte_layer: if both inputs are already
   * connected, their upstream layers must share the same first-level hosting
   * comp. Does not require the output to be connected yet.
   * Output connections are validated separately by the engine's
   * _checkMatteActivation.
   * @param {string} fromNodeId - Source node UUID
   * @param {string} fromPort - Source port ID
   * @param {string} toNodeId - Target node UUID
   * @param {string} toPort - Target port ID
   * @returns {string|null} Error message if conditions not met, or null
   */
  wv._validateMatteConditions = function(fromNodeId, fromPort, toNodeId, toPort) {
    var toNode = graphState.getNode(toNodeId);
    if (!toNode || toNode.nodeKind !== 'matte') return null;

    if (toPort !== 'top_layer' && toPort !== 'matte_layer') return null;

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
    } else {
      matteWire = { fromNode: fromNodeId, fromPort: fromPort, toNode: toNodeId, toPort: toPort };
    }

    if (!topWire || !matteWire) return null;

    var topUpstream = graphState.getNode(topWire.fromNode);
    var matteUpstream = graphState.getNode(matteWire.fromNode);
    if (!topUpstream || !matteUpstream) return null;

    if (!topUpstream.hostingComps || !matteUpstream.hostingComps) {
      return 'Matte conditions not met: both upstream layers must be in a composition';
    }

    var _sharedComp = null;
    for (var _ti = 0; _ti < topUpstream.hostingComps.length; _ti++) {
      for (var _mi = 0; _mi < matteUpstream.hostingComps.length; _mi++) {
        if (topUpstream.hostingComps[_ti] === matteUpstream.hostingComps[_mi]) {
          _sharedComp = topUpstream.hostingComps[_ti];
          break;
        }
      }
      if (_sharedComp) break;
    }
    if (!_sharedComp) {
      return 'Matte conditions not met: both upstream layers must share the same first-level hosting comp';
    }

    return null;
  };
})();
