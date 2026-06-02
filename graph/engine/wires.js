/**
 * graph/engine/wires.js
 *
 * Wire connection and disconnection logic for the graph engine. Handles wire
 * creation with validation, parent/data/layer wire-specific behavior, and
 * cascade ghosting on layer wire removal.
 *
 * Dependencies: graphState, nodeRegistry, wireValidator, cascade/index.js,
 *               evalBridge, uuidGenerator, dirtyFlusher, engine/helpers.js,
 *               engine/propagate.js
 * Load before: engine/index.js
 *
 * Exports: connectWire, disconnectWire
 */
// graph/engine/wires.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/wireValidator/index.js,
//             graph/cascade/index.js, bridge/evalBridge.js,
//             data/uuidGenerator.js, flush/dirtyFlusher.js,
//             graph/engine/helpers.js, graph/engine/propagate.js
// MUST LOAD BEFORE: engine/index.js

var __e_wires = (function() {
  var hlp  = __e_hlp;
  var prop = __e_prop;

  /**
   * Connects two nodes with a wire. Validates the connection, creates the wire
   * data, and handles wire-type-specific behavior (parent, data, layer to comp,
   * matte, or upstream alive propagation).
   *
   * @param {string} fromNodeId - Source node ID
   * @param {string} fromPort - Source port ID
   * @param {string} toNodeId - Target node ID
   * @param {string} toPort - Target port ID
   * @param {*} [boundParam] - Optional bound parameter
   * @returns {boolean} True if the wire was connected successfully
   */
  function connectWire(fromNodeId, fromPort, toNodeId, toPort, boundParam) {
    var fromNodeData = graphState.getNode(fromNodeId);
    var toNodeData   = graphState.getNode(toNodeId);
    if (!fromNodeData || !toNodeData) {
      console.error('[engine] connectWire: node not found');
      return false;
    }

    var fromDef = nodeRegistry.getDefinition(fromNodeData.type);
    if (!fromDef) {
      console.error('[engine] connectWire: node definition not found');
      return false;
    }

    var wireType = null;
    for (var i = 0; i < fromDef.ports.length; i++) {
      if (fromDef.ports[i].id === fromPort) {
        wireType = fromDef.ports[i].type;
        break;
      }
    }
    if (!wireType) {
      console.error('[engine] connectWire: fromPort not found on definition: ' + fromPort);
      return false;
    }

    var validation = wireValidator.canConnect(fromNodeId, fromPort, toNodeId, toPort, wireType);
    if (!validation.valid) {
      if (!(boundParam && validation.reason === 'Target port not found')) {
        console.warn('[engine] connectWire rejected:', validation.reason);
        return false;
      }
    }

    var wireData = {
      id:             uuidGenerator.wire(),
      type:           wireType,
      fromNode:       fromNodeId,
      fromPort:       fromPort,
      toNode:         toNodeId,
      toPort:         toPort,
      boundParam:     boundParam || null,
      _pathLayerUUID: null
    };

    graphState.addWire(wireData);
    hlp.refreshNodeUI();

    if (wireType === 'parent') {
      if (fromNodeData.state === 'alive' && toNodeData.state === 'alive') {
        evalBridge.dispatch({
          action: 'setLayerParent',
          params: {
            hostingCompUUID: toNodeData.hostingComps[0],
            childNodeUUID:  fromNodeData.id,
            parentNodeUUID: toNodeData.id
          }
        });
      }
      return true;
    }

    if (wireType === 'data') {
      for (var pk in fromNodeData.props) {
        if (!fromNodeData.props.hasOwnProperty(pk)) continue;
        if (pk === 'label') continue;
        graphState.updateProp(toNodeId, toPort, fromNodeData.props[pk]);
        if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.schedule) dirtyFlusher.schedule();
        break;
      }
      return true;
    }

    if (toNodeData.type === 'core/comp') {
      prop.firePathCreation(wireData.id);
      return true;
    }

    if (toNodeData.nodeKind === 'matte') {
      prop.checkMatteActivation(toNodeId);
      return true;
    }

    if (toNodeData.hostingComps.length > 0) {
      var pathLayerUUID = hlp.findPathLayerUUID(toNodeId);
      if (pathLayerUUID) {
        prop.propagateAlive(fromNodeId, toNodeData.hostingComps[0], pathLayerUUID);
      }
      return true;
    }

    if (wireType === 'layer' && toNodeData.hostingComps.length === 0 && toNodeData.hasParkedLayer) {
      var downstreamComps = cascadeAlgorithm.hasCompDownstream(toNodeId);
      if (downstreamComps.length > 0) {
        pathLayerUUID = hlp.findPathLayerUUID(toNodeId);
        if (pathLayerUUID) {
          prop.propagateAlive(fromNodeId, downstreamComps[0], pathLayerUUID);
        }
      }
    }

    return true;
  }

  /**
   * Disconnects a wire by ID. Handles parent/data wire removal directly, and
   * triggers cascade ghosting for layer wires.
   *
   * @param {string} wireId - ID of the wire to disconnect
   */
  function disconnectWire(wireId) {
    var wireData = graphState.getWire(wireId);
    if (!wireData) {
      console.warn('[engine] disconnectWire: wire not found: ' + wireId);
      hlp.refreshNodeUI();
      return;
    }

    if (wireData.type === 'parent') {
      evalBridge.dispatch({
        action: 'clearLayerParent',
        params: { nodeUUID: wireData.fromNode }
      });
      graphState.removeWire(wireId);
      hlp.refreshNodeUI();
      return;
    }

    if (wireData.type === 'data') {
      graphState.removeWire(wireId);
      hlp.refreshNodeUI();
      return;
    }

    cascadeAlgorithm.cascadeGhost(wireId);
    hlp.refreshNodeUI();
  }

  return {
    connectWire:    connectWire,
    disconnectWire: disconnectWire
  };

})();
