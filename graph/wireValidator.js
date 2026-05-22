// graph/wireValidator.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cycleChecker.js,
//             graph/portManager.js
// MUST LOAD BEFORE: graph/engine.js, graph/wire/wire.js

var wireValidator = (function() {

  // Strip trailing _N index: 'layer_in_0' → 'layer_in', 'output' → 'output'
  function _getBasePortId(portId) {
    var lastUnder = portId.lastIndexOf('_');
    if (lastUnder === -1) return portId;
    var suffix = portId.substring(lastUnder + 1);
    if (suffix.length > 0) {
      var isNum = true;
      var i, code;
      for (i = 0; i < suffix.length; i++) {
        code = suffix.charCodeAt(i);
        if (code < 48 || code > 57) { isNum = false; break; }
      }
      if (isNum) return portId.substring(0, lastUnder);
    }
    return portId;
  }

  function _findPortDef(def, portId) {
    var i;
    for (i = 0; i < def.ports.length; i++) {
      if (def.ports[i].id === portId) return def.ports[i];
    }
    var baseId = _getBasePortId(portId);
    if (baseId !== portId) {
      for (i = 0; i < def.ports.length; i++) {
        if (def.ports[i].id === baseId) return def.ports[i];
      }
    }
    return null;
  }

  function _isNewbornSlot(toNodeId, toPort) {
    var basePortId = _getBasePortId(toPort);
    if (basePortId === toPort) return false;
    var openSlot = portManager.getOpenSlot(toNodeId, basePortId);
    return openSlot === toPort;
  }

  function validate(fromNodeId, fromPort, toNodeId, toPort, wireType) {
    // Rule 1: Both nodes exist
    var fromNode = graphState.getNode(fromNodeId);
    var toNode   = graphState.getNode(toNodeId);
    if (!fromNode || !toNode) {
      return { valid: false, reason: 'Node not found' };
    }

    // Rule 2: No self-wire (checked before port lookups)
    if (fromNodeId === toNodeId) {
      return { valid: false, reason: 'Cannot wire a node to itself' };
    }

    // Rule 3: From-port exists on from-node definition
    var fromDef = nodeRegistry.getDefinition(fromNode.type);
    if (!fromDef) return { valid: false, reason: 'Source port not found' };
    var fromPortDef = _findPortDef(fromDef, fromPort);
    if (!fromPortDef) {
      return { valid: false, reason: 'Source port not found' };
    }

    // Rule 4: To-port exists on to-node definition
    var toDef = nodeRegistry.getDefinition(toNode.type);
    if (!toDef) return { valid: false, reason: 'Target port not found' };
    var toPortDef = _findPortDef(toDef, toPort);
    if (!toPortDef) {
      return { valid: false, reason: 'Target port not found' };
    }

    // Rule 5: Port directions are compatible
    var fromCat = fromPortDef.category;
    var toCat   = toPortDef.category;
    if (fromCat !== 'output' && fromCat !== 'parent') {
      return { valid: false, reason: 'Invalid port direction' };
    }
    if (toCat !== 'input' && toCat !== 'parent') {
      return { valid: false, reason: 'Invalid port direction' };
    }

    // Rule 6: Wire types match
    // wireType must equal fromPort declared type
    if (wireType !== fromPortDef.type) {
      return { valid: false, reason: 'Wire type mismatch' };
    }
    // Exception: newborn extendable slot accepts any 'data' wireType (picker assigns param)
    if (!(_isNewbornSlot(toNodeId, toPort) && wireType === 'data')) {
      if (wireType !== toPortDef.type) {
        return { valid: false, reason: 'Wire type mismatch' };
      }
    }

    // Rule 7: No duplicate wire
    var wires = graphState.getAllWires();
    var wireId, w;
    for (wireId in wires) {
      w = wires[wireId];
      if (w.fromNode === fromNodeId && w.fromPort === fromPort &&
          w.toNode   === toNodeId   && w.toPort   === toPort) {
        return { valid: false, reason: 'Wire already exists' };
      }
    }

    // Rule 8: No cycle (layer wires only)
    if (wireType === 'layer') {
      if (cycleChecker.hasCycle(fromNodeId, toNodeId)) {
        return { valid: false, reason: 'Connection would create a cycle' };
      }
    }

    // Rule 9: Same-comp constraint (parent wires only)
    if (wireType === 'parent') {
      var fromHosting = fromNode.hostingComps || [];
      var toHosting   = toNode.hostingComps   || [];
      var sharedComp  = false;
      var i, j;
      for (i = 0; i < fromHosting.length; i++) {
        for (j = 0; j < toHosting.length; j++) {
          if (fromHosting[i] === toHosting[j]) { sharedComp = true; break; }
        }
        if (sharedComp) break;
      }
      if (!sharedComp) {
        return { valid: false, reason: 'Both nodes must be alive in the same comp to parent' };
      }
    }

    return { valid: true };
  }

  function getPickerParams(toNodeId, wireDataType) {
    var nodeData = graphState.getNode(toNodeId);
    if (!nodeData) return [];
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def || !def.params) return [];
    var result = [];
    var i;
    for (i = 0; i < def.params.length; i++) {
      if (def.params[i].type === wireDataType) {
        result.push(def.params[i]);
      }
    }
    return result;
  }

  return {
    validate:        validate,
    getPickerParams: getPickerParams
  };

})();
