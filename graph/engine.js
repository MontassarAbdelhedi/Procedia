// graph/engine.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/schemaCache.js,
//             graph/cascadeAlgorithm.js, graph/wireValidator.js,
//             bridge/evalBridge.js, data/uuidGenerator.js, flush/dirtyFlusher.js
// MUST LOAD BEFORE: index.js

var engine = (function() {

  // ── Internal helpers ─────────────────────────────────────────

  function _buildInitialProps(params) {
    if (params === 'dynamic') return {};
    var result = {};
    for (var i = 0; i < params.length; i++) {
      result[params[i].key] = params[i]['default'];
    }
    return result;
  }

  function _refreshNodeUI() {
    minimap.render();
    renderer.render();
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
    if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
  }

  function _resolveDynamicSchema(nodeId, matchName) {
    if (typeof schemaCache === 'undefined' || !schemaCache.fetchSchema) {
      console.warn('[engine] schemaCache not available for', matchName);
      return;
    }
    schemaCache.fetchSchema(matchName).then(function(schema) {
      _applyDynamicSchema(nodeId, schema);
      _refreshNodeUI();
    }).catch(function(err) {
      console.error('[engine] dynamic schema failed for ' + matchName + ': ' + err);
    });
  }

  function _applyDynamicSchema(nodeId, schema) {
    if (!schema || !schema.properties) return;
    var secondaryPorts = [];
    var initialProps = {};
    for (var i = 0; i < schema.properties.length; i++) {
      var prop = schema.properties[i];
      secondaryPorts.push({
        id:       prop.matchName,
        category: 'secondaryInput',
        type:     'data',
        capacity: 'single',
        label:    prop.label
      });
      initialProps[prop.matchName] = prop.defaultValue;
    }
    graphState.updateNode(nodeId, {
      secondaryPorts: secondaryPorts,
      dynamicSchema:  schema,
      props:          initialProps
    });
  }

  function _findPathLayerUUID(nodeId) {
    var wireMap = graphState.getAllWires();
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.fromNode === nodeId && wire.type === 'layer') {
        if (wire._pathLayerUUID !== null) return wire._pathLayerUUID;
        var found = _findPathLayerUUID(wire.toNode);
        if (found !== null) return found;
      }
    }
    return null;
  }

  function _propagateAlive(nodeId, hostingCompUUID, pathLayerUUID) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;

    // Infinite loop guard
    for (var h = 0; h < nodeData.hostingComps.length; h++) {
      if (nodeData.hostingComps[h] === hostingCompUUID) return;
    }

    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    var command = null;

    if (nodeData.nodeKind === 'affected') {
      command = def.onAlive(nodeData, hostingCompUUID);
      if (command !== null) {
        command.params.layerUUID = pathLayerUUID;
      }
    } else if (nodeData.nodeKind === 'effector') {
      command = def.onAlive(nodeData, hostingCompUUID, pathLayerUUID);
    } else if (nodeData.nodeKind === 'blending') {
      command = def.onAlive(nodeData, hostingCompUUID, pathLayerUUID);
    } else {
      // data, matte, comp — never propagated to
      return;
    }

    // Update state before recursing so the guard catches re-entry
    var updatedHostingComps = nodeData.hostingComps.slice();
    updatedHostingComps.push(hostingCompUUID);
    graphState.updateNode(nodeId, { state: 'alive', hostingComps: updatedHostingComps });

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

    // Traverse upstream layer wires
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
  }

  function _checkMatteActivation(matteNodeId) {
    var matteNodeData = graphState.getNode(matteNodeId);
    if (!matteNodeData) return;

    // Condition 1: both input wires present
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

    var topLayerUUID   = _findPathLayerUUID(topUpstreamId);
    var matteLayerUUID = _findPathLayerUUID(matteUpstreamId);

    // Condition 2: both upstream nodes share the same first-level hosting comp
    var topUpstreamData   = graphState.getNode(topUpstreamId);
    var matteUpstreamData = graphState.getNode(matteUpstreamId);
    if (!topUpstreamData || !matteUpstreamData) return;
    if (!topUpstreamData.hostingComps[0] || !matteUpstreamData.hostingComps[0]) return;
    if (topUpstreamData.hostingComps[0] !== matteUpstreamData.hostingComps[0]) return;

    var sharedCompUUID = topUpstreamData.hostingComps[0];

    // Condition 3: matte output wire connects to the same comp
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

    // All three conditions met
    var def = nodeRegistry.getDefinition(matteNodeData.type);
    if (!def) return;
    var command = def.onAlive(matteNodeData, sharedCompUUID, topLayerUUID, matteLayerUUID);
    if (command) evalBridge.dispatch(command);
  }

  // ── Public API ───────────────────────────────────────────────

  function dropNode(nodeDef, x, y) {
    if (!nodeDef) {
      console.error('[engine] dropNode: nodeDef is null or undefined');
      return null;
    }

    var id = uuidGenerator.node();

    var nodeData = {
      id:             id,
      type:           nodeDef.type,
      nodeKind:       nodeDef.nodeKind,
      dedicated:      nodeDef.dedicated,
      state:          'ghost',
      dirty:          false,
      x:              x,
      y:              y,
      props:          _buildInitialProps(nodeDef.params),
      hostingComps:   [],
      hasParkedLayer: false,
      dynamicSchema:  null,
      secondaryPorts: null
    };

    graphState.addNode(nodeData);
    _refreshNodeUI();

    // Immediately-alive nodeKinds — no onDrop, no ghost/alive cycle
    if (nodeDef.nodeKind === 'data' ||
        nodeDef.nodeKind === 'blending' ||
        nodeDef.nodeKind === 'matte') {
      graphState.updateNode(id, { state: 'alive' });
      if (nodeDef.params === 'dynamic' && nodeDef.matchName) {
        _resolveDynamicSchema(id, nodeDef.matchName);
      }
      return nodeData;
    }

    if (nodeDef.params === 'dynamic' && nodeDef.matchName) {
      _resolveDynamicSchema(id, nodeDef.matchName);
    }

    var command = nodeDef.onDrop(nodeData);
    if (command === null) {
      return nodeData;
    }

    (function(nId, cmd) {
      evalBridge.dispatch(cmd).then(function(res) {
        if (res.ok) {
          graphState.updateNode(nId, { state: 'alive' });
        } else {
          console.error('[engine] onDrop dispatch failed: ' + res.error);
          graphState.updateNode(nId, { state: 'error' });
        }
        _refreshNodeUI();
      });
    }(id, command));

    return nodeData;
  }

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
    _refreshNodeUI();

    if (wireType === 'parent' || wireType === 'data') {
      return true;
    }

    if (toNodeData.type === 'core/comp') {
      _firePathCreation(wireData.id);
      return true;
    }

    if (toNodeData.nodeKind === 'matte') {
      _checkMatteActivation(toNodeId);
      return true;
    }

    if (toNodeData.hostingComps.length > 0) {
      var pathLayerUUID = _findPathLayerUUID(toNodeId);
      if (pathLayerUUID) {
        _propagateAlive(fromNodeId, toNodeData.hostingComps[0], pathLayerUUID);
      }
    }

    return true;
  }

  function deleteNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) {
      console.warn('[engine] deleteNode: node not found: ' + nodeId);
      return;
    }

    var def = nodeRegistry.getDefinition(nodeData.type);
    var delWireMap = graphState.getAllWires();

    if (nodeData.nodeKind === 'data') {
      var dataCmd = def ? def.onDelete(nodeData) : null;
      if (dataCmd) evalBridge.dispatch(dataCmd);

    } else if (nodeData.nodeKind === 'blending' || nodeData.nodeKind === 'matte') {
      var batchCmds = [];
      for (var bi = 0; bi < nodeData.hostingComps.length; bi++) {
        var bmHostUUID = nodeData.hostingComps[bi];
        var bmGhostCmd = null;
        if (nodeData.nodeKind === 'blending') {
          var blendUpstreamUUID = null;
          for (var bwId in delWireMap) {
            if (!delWireMap.hasOwnProperty(bwId)) continue;
            var bw = delWireMap[bwId];
            if (bw.toNode === nodeId && bw.toPort === 'main_input') {
              blendUpstreamUUID = _findPathLayerUUID(bw.fromNode);
              break;
            }
          }
          bmGhostCmd = def ? def.onGhost(nodeData, bmHostUUID, blendUpstreamUUID) : null;
        } else {
          var matteTopUUID = null;
          for (var mwId in delWireMap) {
            if (!delWireMap.hasOwnProperty(mwId)) continue;
            var mw = delWireMap[mwId];
            if (mw.toNode === nodeId && mw.toPort === 'top_layer') {
              matteTopUUID = _findPathLayerUUID(mw.fromNode);
              break;
            }
          }
          bmGhostCmd = def ? def.onGhost(nodeData, bmHostUUID, matteTopUUID) : null;
        }
        if (bmGhostCmd) batchCmds.push(bmGhostCmd);
      }
      if (batchCmds.length > 0) evalBridge.dispatchBatch(batchCmds);
      var bmDeleteCmd = def ? def.onDelete(nodeData) : null;
      if (bmDeleteCmd) evalBridge.dispatch(bmDeleteCmd);

    } else {
      // affected or effector
      if (nodeData.state === 'alive') {
        var affBatch = [];
        for (var ai = 0; ai < nodeData.hostingComps.length; ai++) {
          var affHostUUID = nodeData.hostingComps[ai];
          var affGhostCmd = null;
          if (nodeData.nodeKind === 'affected') {
            affGhostCmd = def ? def.onGhost(nodeData, affHostUUID) : null;
          } else {
            // effector: find pathLayerUUID from main_input wire
            var effPathUUID = null;
            for (var ewId in delWireMap) {
              if (!delWireMap.hasOwnProperty(ewId)) continue;
              var ew = delWireMap[ewId];
              if (ew.toNode === nodeId && ew.toPort === 'main_input') {
                effPathUUID = _findPathLayerUUID(ew.fromNode);
                break;
              }
            }
            affGhostCmd = def ? def.onGhost(nodeData, affHostUUID, effPathUUID) : null;
          }
          if (affGhostCmd) affBatch.push(affGhostCmd);
        }
        if (affBatch.length > 0) evalBridge.dispatchBatch(affBatch);
        // fire and forget — do not wait before onDelete
      }
      var affDeleteCmd = def ? def.onDelete(nodeData) : null;
      if (affDeleteCmd) evalBridge.dispatch(affDeleteCmd);
    }

    // Remove from graph — also removes all wires connected to this node
    graphState.removeNode(nodeId);
    _refreshNodeUI();

    // Clear selection if this node was selected
    if (graphState.getSelection() === nodeId) {
      graphState.setSelection(null);
    }
  }

  function disconnectWire(wireId) {
    var wireData = graphState.getWire(wireId);
    if (!wireData) {
      console.warn('[engine] disconnectWire: wire not found: ' + wireId);
      _refreshNodeUI();
      return;
    }

    if (wireData.type === 'parent') {
      evalBridge.dispatch({
        action: 'clearLayerParent',
        params: { nodeUUID: wireData.fromNode }
      });
      graphState.removeWire(wireId);
      _refreshNodeUI();
      return;
    }

    if (wireData.type === 'data') {
      graphState.removeWire(wireId);
      _refreshNodeUI();
      return;
    }

    // Layer wire — cascade owns removal
    cascadeAlgorithm.cascadeGhost(wireId);
    _refreshNodeUI();
  }

  function setNodeProperty(nodeId, key, value) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) {
      console.warn('[engine] setNodeProperty: node not found:', nodeId);
      return;
    }
    graphState.updateProp(nodeId, key, value);
    dirtyFlusher.schedule();
  }

  return {
    dropNode:            dropNode,
    connectWire:         connectWire,
    deleteNode:          deleteNode,
    disconnectWire:      disconnectWire,
    setNodeProperty:     setNodeProperty,
    _firePathCreation:   _firePathCreation,
    _applyDynamicSchema: _applyDynamicSchema
  };

}());
