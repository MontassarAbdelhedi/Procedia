/**
 * Wire connection validation.
 * Checks port existence, direction, type compatibility, capacity,
 * duplicate wires, cycles, parent-wire constraints, blending-node rules,
 * and matte conditions.
 * @module wireValidator
 * @dependencies graph/graphState.js, graph/nodeRegistry.js, graph/cycleChecker.js
 * @exports canConnect, filterPickerList
 */
// graph/wireValidator.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cycleChecker.js
// MUST LOAD BEFORE: graph/engine/index.js, graph/wire/wire.js

var wireValidator = (function() {

  /**
   * Looks up a port definition by ID, first from the node type definition,
   * then from the node's secondaryPorts.
   * @param {Object} def - Node type definition (may have ports array)
   * @param {Object} nodeData - Runtime node data (may have secondaryPorts)
   * @param {string} portId - Port identifier to find
   * @returns {Object|null} The port definition, or null if not found
   */
  function _findPortDef(def, nodeData, portId) {
    if (def && def.ports) {
      for (var i = 0; i < def.ports.length; i++) {
        if (def.ports[i].id === portId) return def.ports[i];
      }
    }
    if (nodeData && nodeData.secondaryPorts) {
      for (var s = 0; s < nodeData.secondaryPorts.length; s++) {
        if (nodeData.secondaryPorts[s].id === portId) return nodeData.secondaryPorts[s];
      }
    }
    return null;
  }

  /**
   * Checks whether a port category is valid as a wire source.
   * @param {string} category - Port category string
   * @returns {boolean} True if category is 'output' or 'parent'
   */
  function _isValidFromCategory(category) {
    return category === 'output' || category === 'parent';
  }

  /**
   * Checks whether a port category is valid as a wire target.
   * @param {string} category - Port category string
   * @returns {boolean} True if category is 'mainInput', 'secondaryInput', or 'parent'
   */
  function _isValidToCategory(category) {
    return category === 'mainInput' || category === 'secondaryInput' || category === 'parent';
  }

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
  function _validateMatteConditions(fromNodeId, fromPort, toNodeId, toPort) {
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
  }

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
  function canConnect(fromNodeId, fromPort, toNodeId, toPort, wireType) {
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
      return { valid: false, reason: 'Source port not found' };
    }
    if (!toDef) {
      return { valid: false, reason: 'Target port not found' };
    }

    var fromPortDef = _findPortDef(fromDef, fromNode, fromPort);
    if (!fromPortDef) {
      return { valid: false, reason: 'Source port not found' };
    }

    var toPortDef = _findPortDef(toDef, toNode, toPort);
    if (!toPortDef && toPort === 'layer_in') {
      toPortDef = _findPortDef(toDef, toNode, 'main_input');
    }
    if (!toPortDef) {
      return { valid: false, reason: 'Target port not found' };
    }

    if (!_isValidFromCategory(fromPortDef.category)) {
      return { valid: false, reason: 'Invalid port direction' };
    }
    if (!_isValidToCategory(toPortDef.category)) {
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

    var matteReason = _validateMatteConditions(fromNodeId, fromPort, toNodeId, toPort);
    if (matteReason) {
      return { valid: false, reason: matteReason };
    }

    return { valid: true };
  }

  /**
   * Filters a list of nodes to only those that have a mainInput port
   * matching the given wire type. Used for picker UI lists.
   * @param {string} wireType - Wire type to filter by
   * @param {Object[]} nodeList - Array of node data objects
   * @returns {Object[]} Filtered array of matching nodes
   */
  function filterPickerList(wireType, nodeList) {
    if (!nodeList || nodeList.length === 0) return [];

    var result = [];
    for (var i = 0; i < nodeList.length; i++) {
      var nodeData = nodeList[i];
      if (!nodeData) continue;
      var def = nodeRegistry.getDefinition(nodeData.type);
      if (!def || !def.ports) continue;

      var matches = false;
      for (var p = 0; p < def.ports.length; p++) {
        var port = def.ports[p];
        if (port.type === wireType && port.category === 'mainInput') {
          matches = true;
          break;
        }
      }
      if (matches) result.push(nodeData);
    }
    return result;
  }

  return {
    canConnect:       canConnect,
    filterPickerList: filterPickerList
  };

})();

if (typeof window !== 'undefined') {
  window.wireValidator = wireValidator;
}
