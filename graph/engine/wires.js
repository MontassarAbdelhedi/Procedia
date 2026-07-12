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
   * @param {*} [boundParam] - Optional bound parameter
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
      if (!(boundParam && validation.reason === 'Target port not found')) {
        console.warn('[engine] connectWire rejected:', validation.reason);
        return false;
      }
    }

    var activeComp = typeof graphState.getActiveComp === 'function' ? graphState.getActiveComp() : null;
    var _replacedAutoWire = false;
    if (activeComp && fromNodeId !== activeComp) {
      var existingWires = graphState.getAllWires();
      for (var _wid in existingWires) {
        if (existingWires.hasOwnProperty(_wid)) {
          var _w = existingWires[_wid];
          if (_w.fromNode === fromNodeId && _w.fromPort === fromPort && _w.toNode === activeComp && _w.toPort === 'main_input') {
            disconnectWire(_wid);
            _replacedAutoWire = true;
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

    if (_replacedAutoWire && activeComp && toNodeId !== activeComp) {
      var allWiresAfter = graphState.getAllWires();
      var alreadyWiredToComp = false;
      for (var _awid in allWiresAfter) {
        if (allWiresAfter.hasOwnProperty(_awid)) {
          if (allWiresAfter[_awid].fromNode === toNodeId && allWiresAfter[_awid].toNode === activeComp && allWiresAfter[_awid].toPort === 'main_input') {
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
      for (var _ewid in allWires) {
        if (!allWires.hasOwnProperty(_ewid)) continue;
        var _ew = allWires[_ewid];
        if (_ew.type !== 'parent') continue;
        var isChild = (_ew.fromNode === toNodeId && _ew.fromPort === 'child_of') ||
                      (_ew.toNode === toNodeId && _ew.toPort === 'child_of');
        if (!isChild) continue;
        if (_ew.fromNode === fromNodeId || _ew.toNode === fromNodeId) continue;
        disconnectWire(_ewid);
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
      for (var pk in fromNodeData.props) {
        if (!fromNodeData.props.hasOwnProperty(pk)) continue;
        if (pk === 'label') continue;
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
                  evalBridge.dispatch({
                    action: 'removeAllKeyframes',
                    params: { hostingCompUUID: hostUUID, layerUUID: bakeLayerUUID, key: boundParam }
                  }).then(function() {
                    keyframeState.clearKeyframes(toNodeId, boundParam);
                  });
                });
              }
            }
          }
        }
        hlp.propagateDataValue(fromNodeId, pk, fromNodeData.props[pk]);
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

    if (toNodeData.hostingComps.length > 0) {
      var terminalUUID = hlp.findPathLayerUUID(fromNodeId) || wireData.id;
      graphState.updateWire(wireData.id, { _pathLayerUUID: terminalUUID });
      prop.propagateAlive(fromNodeId, toNodeData.hostingComps[0], terminalUUID);
      if (toNodeData.nodeKind === 'effector') {
        var _toDef = nodeRegistry.getDefinition(toNodeData.type);
        if (_toDef && _toDef.onAlive) {
          var _effUpUUID = hlp.findPathLayerUUID(fromNodeId);
          if (_effUpUUID) {
            var _effCmd = _toDef.onAlive(toNodeData, toNodeData.hostingComps[0], _effUpUUID);
            if (_effCmd) {
              _effCmd.params._moveToBottom = true;
              evalBridge.dispatch(_effCmd);
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
        pathLayerUUID = hlp.findPathLayerUUID(toNodeId);
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
        var baked = targetNode._bakedKeyframes[targetParam];
        delete targetNode._bakedKeyframes[targetParam];
        if (baked.length > 0 && targetNode.hostingComps && targetNode.hostingComps.length > 0) {
          var rHostUUID = targetNode.hostingComps[0];
          var rLayerUUID = hlp.findPathLayerUUID(targetId);
          if (rLayerUUID) {
            var rChain = Promise.resolve();
            for (var ri = 0; ri < baked.length; ri++) {
              (function(kf) {
                rChain = rChain.then(function() {
                  return evalBridge.dispatch({
                    action: 'addKeyframe',
                    params: {
                      hostingCompUUID: rHostUUID,
                      layerUUID: rLayerUUID,
                      key: targetParam,
                      time: kf.time,
                      value: kf.value
                    }
                  });
                });
              })(baked[ri]);
            }
            rChain.then(function() {
              if (typeof keyframeState !== 'undefined') {
                var times = [];
                for (var ti = 0; ti < baked.length; ti++) { times.push(baked[ti].time); }
                keyframeState.setKeyframes(targetId, targetParam, times);
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
