/**
 * graph/engine/propagate.js
 *
 * Propagation engine for alive state along layer wires. Handles transplant
 * restamping, matte activation detection, and path creation fire when a
 * terminal wire is connected to a composition node.
 *
 * Dependencies: graphState, nodeRegistry, cascade/index.js, evalBridge,
 *               dirtyFlusher, engine/helpers.js
 * Load before: engine/wires.js, engine/nodes/index.js, engine/index.js
 *
 * Exports: propagateAlive, checkMatteActivation, firePathCreation
 */
// graph/engine/propagate.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cascade/index.js,
//             bridge/evalBridge.js, flush/dirtyFlusher.js, graph/engine/helpers.js
// MUST LOAD BEFORE: engine/wires.js, engine/nodes/index.js, engine/index.js

var __e_prop = (function() {
  var hlp = __e_hlp;

  /**
   * Merges a hosting comp into a hostingComps array, deduplicating.
   * @param {string[]} existing - Current hosting comps
   * @param {string} newComp - New comp UUID to add
   * @returns {string[]} New array with the comp added
   */
  function _mergeHostingComps(existing, newComp) {
    for (var mi = 0; mi < existing.length; mi++) {
      if (existing[mi] === newComp) return existing;
    }
    var result = existing.slice();
    result.push(newComp);
    return result;
  }

  /**
   * Builds the onAlive command for a node based on its nodeKind.
   * @param {Object} nodeData - The node data
   * @param {Object} def - The node definition
   * @param {string} hostingCompUUID - Hosting comp UUID
   * @param {string} pathLayerUUID - Terminal wire layer UUID
   * @returns {Object|null} Command object or null
   */
  function _buildOnAliveCommand(nodeData, def, hostingCompUUID, pathLayerUUID) {
    if (nodeData.nodeKind === 'affected') {
      if (nodeData.hasParkedLayer) {
        return {
          action: 'unparkLayer',
          params: {
            nodeUUID:        nodeData.id,
            hostingCompUUID: hostingCompUUID,
            layerUUID:       pathLayerUUID
          }
        };
      }
      var cmd = def.onAlive(nodeData, hostingCompUUID);
      if (cmd !== null) cmd.params.layerUUID = pathLayerUUID;
      return cmd;
    }
    if (nodeData.nodeKind === 'effector' || nodeData.nodeKind === 'blending') {
      return def.onAlive(nodeData, hostingCompUUID, pathLayerUUID);
    }
    return null;
  }

  /**
   * Dispatches an onAlive command and handles errors.
   * @param {string} nodeId - Node ID for error reporting
   * @param {Object|null} command - Command to dispatch
   */
  function _dispatchCommand(nodeId, command) {
    if (command === null) return;
    (function(nId, cmd) {
      evalBridge.dispatch(cmd).then(function(res) {
        if (!res.ok) {
          console.error('[engine] onAlive failed for ' + nId + ': ' + res.error);
          graphState.updateNode(nId, { state: 'error' });
        }
      });
    }(nodeId, command));
  }

  /**
   * Recursively propagates alive upstream through layer wires.
   * @param {string} nodeId - Current node ID
   * @param {string} hostingCompUUID - Hosting comp UUID
   * @param {string} pathLayerUUID - Terminal wire layer UUID
   */
  function _propagateUpstream(nodeId, hostingCompUUID, pathLayerUUID) {
    var wireMap = graphState.getAllWires();
    for (var puId in wireMap) {
      if (!wireMap.hasOwnProperty(puId)) continue;
      var puw = wireMap[puId];
      if (puw.toNode !== nodeId || puw.type !== 'layer') continue;
      var puData = graphState.getNode(puw.fromNode);
      if (!puData) continue;
      if (puData.nodeKind === 'data') continue;
      if (puData.nodeKind === 'matte') continue;
      var alreadyAlive = false;
      for (var pui = 0; pui < puData.hostingComps.length; pui++) {
        if (puData.hostingComps[pui] === hostingCompUUID) { alreadyAlive = true; break; }
      }
      if (alreadyAlive) continue;
      _propagateAlive(puw.fromNode, hostingCompUUID, pathLayerUUID);
    }
  }

  /**
   * Propagates 'alive' state upstream from a composition node through layer
   * wires. Handles transplant restamping, unparking parked layers, and
   * dispatching onAlive commands for affected, effector, and blending nodes.
   *
   * @param {string} nodeId - Node to propagate alive to
   * @param {string} hostingCompUUID - UUID of the hosting composition
   * @param {string} pathLayerUUID - Terminal wire layer UUID
   */
  function _propagateAlive(nodeId, hostingCompUUID, pathLayerUUID) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;

    for (var h = 0; h < nodeData.hostingComps.length; h++) {
      if (nodeData.hostingComps[h] === hostingCompUUID) return;
    }

    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    if (nodeData._transplantLayerUUID) {
      evalBridge.dispatch({
        action: 'restampLayer',
        params: {
          hostingCompUUID: hostingCompUUID,
          oldUUID:         nodeData._transplantLayerUUID,
          newUUID:         pathLayerUUID
        }
      });
      graphState.updateNode(nodeId, {
        state:                'alive',
        hostingComps:         _mergeHostingComps(nodeData.hostingComps, hostingCompUUID),
        _transplantLayerUUID: null
      });
      _propagateUpstream(nodeId, hostingCompUUID, nodeData.id);
      _dispatchCommand(nodeId, _buildOnAliveCommand(nodeData, def, hostingCompUUID, pathLayerUUID));
      if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.flush) dirtyFlusher.flush();
      return;
    }

    if (cascadeAlgorithm.isCompNode(nodeId)) {
      graphState.updateNode(nodeId, {
        state:          'alive',
        hostingComps:   _mergeHostingComps(nodeData.hostingComps, hostingCompUUID),
        hasParkedLayer: false
      });
      _dispatchCommand(nodeId, _buildOnAliveCommand(nodeData, def, hostingCompUUID, pathLayerUUID));
      if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.flush) dirtyFlusher.flush();
      return;
    }

    var command = _buildOnAliveCommand(nodeData, def, hostingCompUUID, pathLayerUUID);
    if (command === null) return;

    graphState.updateNode(nodeId, {
      state:          'alive',
      hostingComps:   _mergeHostingComps(nodeData.hostingComps, hostingCompUUID),
      hasParkedLayer: false
    });

    _propagateUpstream(nodeId, hostingCompUUID, pathLayerUUID);
    _dispatchCommand(nodeId, command);
  }

  /**
   * Checks whether a matte node has both top_layer and matte_layer wires
   * connected from the same hosting composition, and if so, activates it.
   *
   * @param {string} matteNodeId - ID of the matte node to check
   */
  function _checkMatteActivation(matteNodeId) {
    var matteNodeData = graphState.getNode(matteNodeId);
    if (!matteNodeData) return;

    var wireMap = graphState.getAllWires();
    var topWire = null;
    var matteWire = null;
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.toNode !== matteNodeId) continue;
      if (wire.toPort === 'top_layer')   topWire   = wire;
      if (wire.toPort === 'matte_layer') matteWire = wire;
    }
    if (!topWire || !matteWire) return;

    var topUpstreamId   = topWire.fromNode;
    var matteUpstreamId = matteWire.fromNode;

    var topLayerUUID   = hlp.findPathLayerUUID(topUpstreamId);
    var matteLayerUUID = hlp.findPathLayerUUID(matteUpstreamId);

    var topUpstreamData   = graphState.getNode(topUpstreamId);
    var matteUpstreamData = graphState.getNode(matteUpstreamId);
    if (!topUpstreamData || !matteUpstreamData) return;

    var sharedCompUUID = null;
    var topComps = topUpstreamData.hostingComps || [];
    var matteComps = matteUpstreamData.hostingComps || [];
    for (var ci = 0; ci < topComps.length; ci++) {
      for (var cj = 0; cj < matteComps.length; cj++) {
        if (topComps[ci] === matteComps[cj]) {
          sharedCompUUID = topComps[ci];
          break;
        }
      }
      if (sharedCompUUID !== null) break;
    }
    if (sharedCompUUID === null) return;

    var outputWire = null;
    for (var wId in wireMap) {
      if (!wireMap.hasOwnProperty(wId)) continue;
      var w = wireMap[wId];
      if (w.fromNode === matteNodeId && w.type === 'layer') {
        outputWire = w;
        break;
      }
    }
    if (!outputWire || outputWire.toNode !== sharedCompUUID) return;

    var def = nodeRegistry.getDefinition(matteNodeData.type);
    if (!def) return;
    var command = def.onAlive(matteNodeData, sharedCompUUID, topLayerUUID, matteLayerUUID);
    if (command) evalBridge.dispatch(command);
  }

  /**
   * Fires path creation when a terminal layer wire is wired to a composition
   * node. Sets _pathLayerUUID on the wire and propagates alive upstream.
   *
   * @param {string} terminalWireId - ID of the terminal wire to fire
   */
  function _firePathCreation(terminalWireId) {
    var wireMap = graphState.getAllWires();
    var wireData = wireMap[terminalWireId] || null;
    if (!wireData) {
      console.error('[engine] _firePathCreation: wire not found: ' + terminalWireId);
      return;
    }

    graphState.updateWire(terminalWireId, { _pathLayerUUID: terminalWireId });

    var hostingCompUUID = wireData.toNode;

    _propagateAlive(wireData.fromNode, hostingCompUUID, terminalWireId);

    if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.flush) {
      dirtyFlusher.flush();
    }
  }

  return {
    propagateAlive:     _propagateAlive,
    checkMatteActivation: _checkMatteActivation,
    firePathCreation:   _firePathCreation
  };

})();
