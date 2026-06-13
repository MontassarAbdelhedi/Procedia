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
      var restampCmd = {
        action: 'restampLayer',
        params: {
          hostingCompUUID: hostingCompUUID,
          oldUUID:         nodeData._transplantLayerUUID,
          newUUID:         pathLayerUUID
        }
      };
      evalBridge.dispatch(restampCmd);

      var transplantHostingComps = nodeData.hostingComps.slice();
      transplantHostingComps.push(hostingCompUUID);
      graphState.updateNode(nodeId, {
        state:                'alive',
        hostingComps:         transplantHostingComps,
        _transplantLayerUUID: null
      });

      var transplantWires = graphState.getAllWires();
      for (var twId in transplantWires) {
        if (!transplantWires.hasOwnProperty(twId)) continue;
        var tw = transplantWires[twId];
        if (tw.toNode !== nodeId || tw.type !== 'layer') continue;
        var tUpstreamData = graphState.getNode(tw.fromNode);
        if (!tUpstreamData) continue;
        if (tUpstreamData.nodeKind === 'data') continue;
        if (tUpstreamData.nodeKind === 'matte') continue;
        var alreadyAlive = false;
        for (var ti = 0; ti < tUpstreamData.hostingComps.length; ti++) {
          if (tUpstreamData.hostingComps[ti] === hostingCompUUID) { alreadyAlive = true; break; }
        }
        if (alreadyAlive) continue;
        _propagateAlive(tw.fromNode, hostingCompUUID, nodeData.id);
      }

      if (nodeData.nodeKind === 'effector' || nodeData.nodeKind === 'blending') {
        var txCmd = def.onAlive(nodeData, hostingCompUUID, pathLayerUUID);
        if (txCmd !== null) {
          (function(nId, cmd) {
            evalBridge.dispatch(cmd).then(function(res) {
              if (!res.ok) {
                console.error('[engine] onAlive failed for ' + nId + ': ' + res.error);
                graphState.updateNode(nId, { state: 'error' });
              }
            });
          }(nodeId, txCmd));
        }
      }

      if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.flush) dirtyFlusher.flush();
      return;
    }

    var command = null;

    if (nodeData.nodeKind === 'affected') {
      if (nodeData.hasParkedLayer) {
        command = {
          action: 'unparkLayer',
          params: {
            nodeUUID:        nodeData.id,
            hostingCompUUID: hostingCompUUID,
            layerUUID:       pathLayerUUID
          }
        };
      } else {
        command = def.onAlive(nodeData, hostingCompUUID);
        if (command !== null) {
          command.params.layerUUID = pathLayerUUID;
        }
      }
    } else if (nodeData.nodeKind === 'effector') {
      command = def.onAlive(nodeData, hostingCompUUID, pathLayerUUID);
    } else if (nodeData.nodeKind === 'blending') {
      command = def.onAlive(nodeData, hostingCompUUID, pathLayerUUID);
    } else {
      return;
    }

    var updatedHostingComps = nodeData.hostingComps.slice();
    updatedHostingComps.push(hostingCompUUID);
    graphState.updateNode(nodeId, {
      state:          'alive',
      hostingComps:   updatedHostingComps,
      hasParkedLayer: false
    });

    if (cascadeAlgorithm.isCompNode(nodeId)) {
      if (command !== null) {
        (function(nId, cmd) {
          evalBridge.dispatch(cmd).then(function(res) {
            if (!res.ok) {
              console.error('[engine] onAlive failed for ' + nId + ': ' + res.error);
              graphState.updateNode(nId, { state: 'error' });
            }
          });
        }(nodeId, command));
      }
      if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.flush) dirtyFlusher.flush();
      return;
    }

    var wireMap = graphState.getAllWires();
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.toNode !== nodeId || wire.type !== 'layer') continue;
      var upstreamData = graphState.getNode(wire.fromNode);
      if (!upstreamData) continue;
      if (upstreamData.nodeKind === 'data') continue;
      if (upstreamData.nodeKind === 'matte') continue;
      var alreadyAlive = false;
      for (var i = 0; i < upstreamData.hostingComps.length; i++) {
        if (upstreamData.hostingComps[i] === hostingCompUUID) { alreadyAlive = true; break; }
      }
      if (alreadyAlive) continue;
      _propagateAlive(wire.fromNode, hostingCompUUID, pathLayerUUID);
    }

    if (command !== null) {
      (function(nId, cmd) {
        evalBridge.dispatch(cmd).then(function(res) {
          if (!res.ok) {
            console.error('[engine] onAlive failed for ' + nId + ': ' + res.error);
            graphState.updateNode(nId, { state: 'error' });
          }
        });
      }(nodeId, command));
    }
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
