/**
 * Core wire connection validation. Checks node existence, self-wire, port
 * existence, direction, type match, single capacity, duplicate wires, cycles
 * (for layer wires), parent comp sharing, blending-node rules, and matte
 * conditions.
 * @module wireValidator/canConnect
 * @dependencies graph/graphState.js, graph/nodeRegistry.js, graph/cycleChecker.js,
 *               wireValidator/portUtils.js, wireValidator/matteValidator.js
 * @exports __wv.canConnect
 */
// graph/wireValidator/canConnect.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cycleChecker.js,
//             graph/wireValidator/portUtils.js, graph/wireValidator/matteValidator.js
// MUST LOAD BEFORE: graph/wireValidator/index.js

(function() {
  var wv = window.__wv = window.__wv || {};

  /**
   * Validates whether a wire can be created between the given ports.
   * Checks: node existence, self-wire, port existence, direction, type match,
   * single capacity, duplicate wires, cycles (for layer wires),
   * parent comp sharing (for parent wires), blending-node rules, and matte conditions.
   * @param {string} fromNodeId - Source node UUID
   * @param {string} fromPort - Source port ID
   * @param {string} toNodeId - Target node UUID
   * @param {string} toPort - Target port ID
   * @param {string} wireType - Wire type (e.g. 'layer', 'parent', 'value')
   * @returns {{valid: boolean, reason?: string}} Result object
   */
  wv.canConnect = function(fromNodeId, fromPort, toNodeId, toPort, wireType) {
    var fromNode = graphState.getNode(fromNodeId);
    var toNode = graphState.getNode(toNodeId);

    if (!fromNode || !toNode) {
      return { valid: false, reason: 'Node not found' };
    }

    if (fromNodeId === toNodeId) {
      return { valid: false, reason: 'Cannot wire a node to itself' };
    }

    var fromDef = nodeRegistry.getDefinition(fromNode.type);
    var toDef = nodeRegistry.getDefinition(toNode.type);
    if (!fromDef) {
      return { valid: false, reason: 'Unknown source node type' };
    }
    if (!toDef) {
      return { valid: false, reason: 'Unknown target node type' };
    }

    var fromPortDef = wv._findPortDef(fromDef, fromNode, fromPort);
    if (!fromPortDef) {
      return { valid: false, reason: 'Source port not found' };
    }

    var toPortDef = wv._findPortDef(toDef, toNode, toPort);
    if (!toPortDef && toPort === 'layer_in') {
      toPortDef = wv._findPortDef(toDef, toNode, 'main_input');
    }
    if (!toPortDef) {
      return { valid: false, reason: 'Target port not found' };
    }

    if (!wv._isValidFromCategory(fromPortDef.category)) {
      return { valid: false, reason: 'Invalid port direction' };
    }
    if (!wv._isValidToCategory(toPortDef.category)) {
      return { valid: false, reason: 'Invalid port direction' };
    }

    if (fromPortDef.type !== toPortDef.type || wireType !== fromPortDef.type) {
      return { valid: false, reason: 'Wire type mismatch' };
    }

    var wireMap = graphState.getAllWires();

    if (toPortDef.capacity === 'single') {
      for (var wireId in wireMap) {
        if (!wireMap.hasOwnProperty(wireId)) continue;
        var occupied = wireMap[wireId];
        if (occupied.toNode === toNodeId && occupied.toPort === toPort) {
          if (wireType === 'parent') break;
          return { valid: false, reason: 'Port already has a connected wire' };
        }
      }
    }

    for (var dupId in wireMap) {
      if (!wireMap.hasOwnProperty(dupId)) continue;
      var dup = wireMap[dupId];
      if (dup.fromNode === fromNodeId && dup.fromPort === fromPort &&
          dup.toNode === toNodeId && dup.toPort === toPort) {
        return { valid: false, reason: 'Wire already exists' };
      }
    }

    if (wireType === 'layer') {
      if (cycleChecker.hasCycle(fromNodeId, toNodeId)) {
        return { valid: false, reason: 'Connection would create a cycle' };
      }
    }

    if (wireType === 'parent') {
      var sharedComp = false;
      var fromComps = fromNode.hostingComps || [];
      var toComps = toNode.hostingComps || [];
      for (var fi = 0; fi < fromComps.length; fi++) {
        for (var ti = 0; ti < toComps.length; ti++) {
          if (fromComps[fi] === toComps[ti]) {
            sharedComp = true;
            break;
          }
        }
        if (sharedComp) break;
      }
      if (!sharedComp) {
        return { valid: false, reason: 'Both nodes must be alive in the same comp to parent' };
      }
    }

    if (toNode.nodeKind === 'blending' && toPort === 'main_input') {
      if (fromNode.nodeKind !== 'affected') {
        return { valid: false, reason: 'Blending node input must come directly from an affected node' };
      }
    }

    if (toNode.nodeKind === 'multimerge' && toPort === 'main_input') {
      if (fromNode.nodeKind !== 'affected') {
        return { valid: false, reason: 'Multimerge node input must come directly from an affected node' };
      }
    }

    if (toNode.nodeKind === 'merge' && (toPort === 'input_a' || toPort === 'input_b')) {
      if (fromNode.nodeKind !== 'affected') {
        return { valid: false, reason: 'Merge node input must come directly from an affected node' };
      }
    }

    var matteReason = wv._validateMatteConditions(fromNodeId, fromPort, toNodeId, toPort);
    if (matteReason) {
      return { valid: false, reason: matteReason };
    }

    return { valid: true };
  };
})();
