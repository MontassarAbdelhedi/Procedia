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

window.__procedia_internal.wires = (function() {
  var registry = window.__procedia_internal.registry;
  var hlp  = registry.get('hlp');
  var prop = registry.get('prop');

  /**
   * Connects two nodes with a wire. Validates the connection, creates the wire
   * data, and handles wire-type-specific behavior (parent, data, layer to comp,
   * matte, or upstream alive propagation).
   *
   * @param {string} fromNodeId - Source node ID
   * @param {string} fromPort - Source port ID
   * @param {string} toNodeId - Target node ID
   * @param {string} toPort - Target port ID
   * @param {*} [boundParam] - Optional bound parameter for keyframe baking
   * @returns {boolean} True if the wire was connected successfully
   */
  function connectWire(fromNodeId, fromPort, toNodeId, toPort, boundParam) {
    if (typeof undoManager !== 'undefined') undoManager.capture();

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
      console.warn('[engine] connectWire rejected:', validation.reason);
      return false;
    }

    var activeComp = typeof graphState.getActiveComp === 'function' ? graphState.getActiveComp() : null;
    var targetHadHostingComps = toNodeData.hostingComps.length > 0;
    var replacedAutoWire = false;
    if (activeComp && fromNodeId !== activeComp) {
      var existingWires = graphState.getAllWires();
      for (var existingWireId in existingWires) {
        if (existingWires.hasOwnProperty(existingWireId)) {
          var existingWire = existingWires[existingWireId];
          if (existingWire.fromNode === fromNodeId && existingWire.fromPort === fromPort && existingWire.toNode === activeComp && existingWire.toPort === 'main_input') {
            disconnectWire(existingWireId);
            replacedAutoWire = true;
            break;
          }
        }
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

    if (replacedAutoWire && activeComp && toNodeId !== activeComp) {
      var allWiresAfter = graphState.getAllWires();
      var alreadyWiredToComp = false;
      for (var afterWireId in allWiresAfter) {
        if (allWiresAfter.hasOwnProperty(afterWireId)) {
          if (allWiresAfter[afterWireId].fromNode === toNodeId && allWiresAfter[afterWireId].toNode === activeComp && allWiresAfter[afterWireId].toPort === 'main_input') {
            alreadyWiredToComp = true;
            break;
          }
        }
      }
      if (!alreadyWiredToComp) {
        connectWire(toNodeId, 'output', activeComp, 'main_input');
      }
    }

    if (wireType === 'parent') {
      // Reparent: disconnect any existing parent wire for this child
      var allWires = graphState.getAllWires();
      for (var existingWireId in allWires) {
        if (!allWires.hasOwnProperty(existingWireId)) continue;
        var existingWire = allWires[existingWireId];
        if (existingWire.type !== 'parent') continue;
        var isChild = (existingWire.fromNode === toNodeId && existingWire.fromPort === 'child_of') ||
                      (existingWire.toNode === toNodeId && existingWire.toPort === 'child_of');
        if (!isChild) continue;
        if (existingWire.fromNode === fromNodeId || existingWire.toNode === fromNodeId) continue;
        disconnectWire(existingWireId);
        break;
      }

      if (fromNodeData.state === 'alive' && toNodeData.state === 'alive') {
        var childLayerUUID = hlp.findPathLayerUUID(fromNodeData.id);
        var parentLayerUUID = hlp.findPathLayerUUID(toNodeData.id);
        if (childLayerUUID && parentLayerUUID) {
          evalBridge.dispatch({
            action: 'setLayerParent',
            params: {
              hostingCompUUID: toNodeData.hostingComps[0],
              childLayerUUID:  childLayerUUID,
              parentLayerUUID: parentLayerUUID
            }
          });
        }
      }
      if (typeof undoManager !== 'undefined') undoManager.commit('Connect wire');
      _addWireAction('connectWire', wireData);
      return true;
    }

    if (wireType === 'data') {
      _addWireAction('connectWire', wireData);
      for (var propKey in fromNodeData.props) {
        if (!fromNodeData.props.hasOwnProperty(propKey)) continue;
        if (propKey === 'label') continue;
        if (boundParam) {
          var targetNodeData = graphState.getNode(toNodeId);
          if (targetNodeData && targetNodeData.hostingComps && targetNodeData.hostingComps.length > 0) {
            var hostUUID = targetNodeData.hostingComps[0];
            if (typeof keyframeState !== 'undefined' && keyframeState.hasKeyframes(toNodeId, boundParam)) {
              var bakeLayerUUID = hlp.findPathLayerUUID(toNodeId);
              if (bakeLayerUUID) {
                evalBridge.dispatch({
                  action: 'getKeyframeData',
                  params: { hostingCompUUID: hostUUID, layerUUID: bakeLayerUUID, key: boundParam }
                }).then(function(res) {
                  if (!res.ok || !res.data) return;
                  if (!targetNodeData._bakedKeyframes) targetNodeData._bakedKeyframes = {};
                  targetNodeData._bakedKeyframes[boundParam] = res.data.keyframes || [];
                  return evalBridge.dispatch({
                    action: 'removeAllKeyframes',
                    params: { hostingCompUUID: hostUUID, layerUUID: bakeLayerUUID, key: boundParam }
                  }).then(function() {
                    keyframeState.clearKeyframes(toNodeId, boundParam);
                  });
                }).catch(function(err) {
                  console.error('[engine] keyframe bake failed:', err && err.message || err);
                });
              }
            }
          }
        }
        hlp.propagateDataValue(fromNodeId, propKey, fromNodeData.props[propKey]);
      }
      if (typeof undoManager !== 'undefined') undoManager.commit('Connect wire');
      return true;
    }

    if (toNodeData.type === 'core/comp') {
      prop.firePathCreation(wireData.id);
      if (typeof undoManager !== 'undefined') undoManager.commit('Connect wire');
      return true;
    }

    if (toNodeData.nodeKind === 'matte') {
      prop.checkMatteActivation(toNodeId);
      if (typeof undoManager !== 'undefined') undoManager.commit('Connect wire');
      return true;
    }

    if (targetHadHostingComps) {
      var terminalUUID = hlp.findPathLayerUUID(fromNodeId) || wireData.id;
      graphState.updateWire(wireData.id, { _pathLayerUUID: terminalUUID });
      prop.propagateAlive(fromNodeId, toNodeData.hostingComps[0], terminalUUID);
      if (toNodeData.nodeKind === 'effector') {
        var toNodeDef = nodeRegistry.getDefinition(toNodeData.type);
        if (toNodeDef && toNodeDef.onAlive) {
          var effectorUpstreamUUID = hlp.findPathLayerUUID(fromNodeId);
          if (effectorUpstreamUUID) {
            var effectorAliveCmd = toNodeDef.onAlive(toNodeData, toNodeData.hostingComps[0], effectorUpstreamUUID);
            if (effectorAliveCmd) {
              (function(effectorCmd) {
                effectorCmd.params._moveToBottom = true;
                setTimeout(function() { evalBridge.dispatch(effectorCmd); }, 0);
              })(effectorAliveCmd);
            }
          }
        }
      }
      if (typeof undoManager !== 'undefined') undoManager.commit('Connect wire');
      return true;
    }

    if (wireType === 'layer' && toNodeData.hostingComps.length === 0 && toNodeData.hasParkedLayer) {
      var downstreamComps = cascadeAlgorithm.hasCompDownstream(toNodeId);
      if (downstreamComps.length > 0) {
        var pathLayerUUID = hlp.findPathLayerUUID(toNodeId);
        if (pathLayerUUID) {
          prop.propagateAlive(fromNodeId, downstreamComps[0], pathLayerUUID);
        }
      }
    }

    _addWireAction('connectWire', wireData);
    if (typeof undoManager !== 'undefined') undoManager.commit('Connect wire');
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

    if (typeof undoManager !== 'undefined') undoManager.capture();

    if (wireData.type === 'parent') {
      var childNodeId = wireData.fromNode;
      var childNodeData = graphState.getNode(childNodeId);
      if (childNodeData && childNodeData.hostingComps.length > 0) {
        var childLayerUUID = hlp.findPathLayerUUID(childNodeId);
        if (childLayerUUID) {
          evalBridge.dispatch({
            action: 'clearLayerParent',
            params: {
              hostingCompUUID: childNodeData.hostingComps[0],
              layerUUID:       childLayerUUID
            }
          });
        }
      }
      graphState.removeWire(wireId);
      hlp.refreshNodeUI();
      if (typeof undoManager !== 'undefined') undoManager.commit('Disconnect wire');
      _addWireAction('disconnectWire', wireData);
      return;
    }

    if (wireData.type === 'data') {
      var targetId = wireData.toNode;
      var targetParam = wireData.boundParam || wireData.toPort;
      graphState.removeWire(wireId);
      var targetNode = graphState.getNode(targetId);
      if (targetParam && targetNode && targetNode._bakedKeyframes && targetNode._bakedKeyframes[targetParam]) {
        var bakedKeyframes = targetNode._bakedKeyframes[targetParam];
        delete targetNode._bakedKeyframes[targetParam];
        if (bakedKeyframes.length > 0 && targetNode.hostingComps && targetNode.hostingComps.length > 0) {
          var restoreHostUUID = targetNode.hostingComps[0];
          var restoreLayerUUID = hlp.findPathLayerUUID(targetId);
          if (restoreLayerUUID) {
            var restoreChain = Promise.resolve();
            for (var restoreIndex = 0; restoreIndex < bakedKeyframes.length; restoreIndex++) {
              (function(keyframeEntry) {
                restoreChain = restoreChain.then(function() {
                  return evalBridge.dispatch({
                    action: 'addKeyframe',
                    params: {
                      hostingCompUUID: restoreHostUUID,
                      layerUUID: restoreLayerUUID,
                      key: targetParam,
                      time: keyframeEntry.time,
                      value: keyframeEntry.value
                    }
                  });
                });
              })(bakedKeyframes[restoreIndex]);
            }
            restoreChain.then(function() {
              if (typeof keyframeState !== 'undefined') {
                var restoredTimes = [];
                for (var timeIndex = 0; timeIndex < bakedKeyframes.length; timeIndex++) { restoredTimes.push(bakedKeyframes[timeIndex].time); }
                keyframeState.setKeyframes(targetId, targetParam, restoredTimes);
              }
              window.__procedia_internal.refreshUI({ wireRenderer: false, minimap: false, statusBar: false });
            });
          }
        }
      }
      hlp.refreshNodeUI();
      if (typeof undoManager !== 'undefined') undoManager.commit('Disconnect wire');
      _addWireAction('disconnectWire', wireData);
      return;
    }

    cascadeAlgorithm.cascadeGhost(wireId);
    hlp.refreshNodeUI();
    if (typeof undoManager !== 'undefined') undoManager.commit('Disconnect wire');
    _addWireAction('disconnectWire', wireData);
  }

  function _addWireAction(action, wireData) {
    if (typeof envSnapshot !== 'undefined' && envSnapshot.addAction) {
      envSnapshot.addAction(action, { type: wireData.type, fromNode: wireData.fromNode, toNode: wireData.toNode });
    }
  }

  return {
    connectWire:    connectWire,
    disconnectWire: disconnectWire
  };

})();
window.__procedia_internal.registry.register('wires', window.__procedia_internal.wires);
