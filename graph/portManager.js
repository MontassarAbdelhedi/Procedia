// graph/portManager.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/engine.js, graph/wire/wire.js

var portManager = (function() {

  function isExtendable(nodeId, portId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return false;
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return false;
    for (var i = 0; i < def.ports.length; i++) {
      if (def.ports[i].id === portId) {
        return def.ports[i].extendable === true;
      }
    }
    return false;
  }

  function resolveSlotName(portId, index) {
    return portId + '_' + index;
  }

  function getOpenSlot(nodeId, portId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return null;
    var count = nodeData.portSlots[portId];
    if (count === undefined) count = 1;
    var openIndex = count - 1;
    return resolveSlotName(portId, openIndex);
  }

  function afterConnect(nodeId, portId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;
    if (!isExtendable(nodeId, portId)) return;
    var slots = {};
    var key;
    for (key in nodeData.portSlots) {
      slots[key] = nodeData.portSlots[key];
    }
    var current = slots[portId];
    if (current === undefined) current = 1;
    slots[portId] = current + 1;
    graphState.updateNode(nodeId, { portSlots: slots });
  }

  function afterDisconnect(nodeId, portId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;
    if (!isExtendable(nodeId, portId)) return;
    var prefix = portId + '_';
    var occupied = 0;
    var wires = graphState.getAllWires();
    var wireId, wire;
    for (wireId in wires) {
      wire = wires[wireId];
      if (wire.toNode === nodeId && wire.toPort.indexOf(prefix) === 0) {
        occupied++;
      }
    }
    var newCount = occupied + 1;
    if (newCount < 1) newCount = 1;
    var slots = {};
    var key;
    for (key in nodeData.portSlots) {
      slots[key] = nodeData.portSlots[key];
    }
    slots[portId] = newCount;
    graphState.updateNode(nodeId, { portSlots: slots });
  }

  return {
    afterConnect:    afterConnect,
    afterDisconnect: afterDisconnect,
    getOpenSlot:     getOpenSlot,
    resolveSlotName: resolveSlotName,
    isExtendable:    isExtendable
  };

})();
