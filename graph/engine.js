// graph/engine.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cascadeAlgorithm.js,
//             graph/portManager.js, graph/wireValidator.js, bridge/evalBridge.js,
//             data/uuidGenerator.js, flush/dirtyFlusher.js
// MUST LOAD BEFORE: index.js

var engine = (function() {

  // ── Internal helpers ───────────────────────────────────────

  // Strip trailing _N index from slot names: 'layer_in_0' → 'layer_in'
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

  function _buildInitialProps(params) {
    var props = {};
    for (var i = 0; i < params.length; i++) {
      props[params[i].key] = params[i].default;
    }
    return props;
  }

  function _buildInitialPortSlots(ports) {
    var slots = {};
    for (var i = 0; i < ports.length; i++) {
      if (ports[i].extendable === true && ports[i].category === 'input') {
        slots[ports[i].id] = 1;
      }
    }
    return slots;
  }

  // Resolves a runtime port ID (e.g. 'layer_in_0') to a base port declaration.
  // Extendable slot IDs follow the pattern baseId + '_' + index.
  function _findPortDef(ports, portId) {
    for (var i = 0; i < ports.length; i++) {
      if (ports[i].id === portId) return ports[i];
      if (portId.indexOf(ports[i].id + '_') === 0) return ports[i];
    }
    return null;
  }

  // Walks upstream through effector chain to find the first non-effector (the actual AE layer node).
  // Used by deleteNode to resolve the upstream layer UUID for effector ghost/delete commands.
  function _resolveLayerNodeUUID(nodeId) {
    var wires = graphState.getAllWires();
    var wireId, wire, upstreamData;
    for (wireId in wires) {
      wire = wires[wireId];
      if (wire.toNode !== nodeId || wire.type !== 'layer') continue;
      upstreamData = graphState.getNode(wire.fromNode);
      if (!upstreamData) continue;
      if (upstreamData.nodeKind === 'effector') {
        return _resolveLayerNodeUUID(upstreamData.id);
      }
      return upstreamData.id;
    }
    return null;
  }

  // EVENT 5 — non-terminal wire connected; re-activate any dormant terminal wires downstream
  // whose path is now complete (i.e., _pathLayerUUID was cleared by a prior teardown).
  function _activateDormantTerminalWiresDownstream(startNodeId) {
    var wires = graphState.getAllWires();
    var visited = {};
    var stack = [startNodeId];
    var current, wireId, wire, downNodeData, path;

    while (stack.length > 0) {
      current = stack.pop();
      if (visited[current]) continue;
      visited[current] = true;

      for (wireId in wires) {
        wire = wires[wireId];
        if (wire.type !== 'layer') continue;
        if (wire.fromNode !== current) continue;

        downNodeData = graphState.getNode(wire.toNode);
        if (!downNodeData) continue;

        if (cascadeAlgorithm.isCompNode(downNodeData)) {
          // Terminal wire — fire EVENT 1 if dormant and path is now complete
          if (wire._pathLayerUUID === null || wire._pathLayerUUID === undefined) {
            path = cascadeAlgorithm.collectPathUpstream(wireId);
            if (path.sourceNode) {
              _firePathCreation(wireId);
            }
          }
        } else {
          if (!visited[wire.toNode]) stack.push(wire.toNode);
        }
      }
    }
  }

  // EVENT 1 — terminal wire confirmed (toNode is a CompNode).
  // Walks the path upstream, creates the AE layer, applies effectors, stamps _pathLayerUUID.
  function _firePathCreation(wireId) {
    var wire = graphState.getWire(wireId);
    if (!wire) return;

    var path = cascadeAlgorithm.collectPathUpstream(wireId);
    if (!path.sourceNode) {
      console.warn('[engine] _firePathCreation: no source node found for wire: ' + wireId);
      return;
    }

    var hostingCompUUID = wire.toNode;
    var sourceNode = path.sourceNode;
    var sourceDef = nodeRegistry.getDefinition(sourceNode.type);
    if (!sourceDef) return;

    var batchCommands = [];
    var i, j, k, effNode, effDef, effCmd;

    // Build create/unpark command for source node
    var createCmd;
    if (sourceNode.state === 'ghost' && sourceNode.hasParkedLayer) {
      createCmd = {
        action: 'unparkLayer',
        params: { nodeUUID: sourceNode.id, hostingCompUUID: hostingCompUUID, newLayerUUID: wireId }
      };
    } else {
      createCmd = sourceDef.onAlive(sourceNode, hostingCompUUID);
      if (createCmd !== null) {
        if (!createCmd.params) createCmd.params = {};
        createCmd.params.layerUUID = wireId;
      }
    }
    if (createCmd !== null) batchCommands.push(createCmd);

    // Apply effectors in order (closest-to-source first).
    // wireId is passed as third arg so it becomes layerNodeUUID in applyEffect — matches layer.comment.
    for (i = 0; i < path.effectors.length; i++) {
      effNode = path.effectors[i];
      effDef = nodeRegistry.getDefinition(effNode.type);
      if (effDef) {
        effCmd = effDef.onAlive(effNode, hostingCompUUID, wireId);
        if (effCmd !== null) batchCommands.push(effCmd);
      }
    }

    // Stamp _pathLayerUUID before dispatch so wireMap is consistent if a poll fires
    graphState.updateWire(wireId, { _pathLayerUUID: wireId });

    // Update source node hostingComps
    var updatedHostingComps = [];
    for (j = 0; j < sourceNode.hostingComps.length; j++) {
      updatedHostingComps.push(sourceNode.hostingComps[j]);
    }
    var alreadyHosting = false;
    for (j = 0; j < updatedHostingComps.length; j++) {
      if (updatedHostingComps[j] === hostingCompUUID) { alreadyHosting = true; break; }
    }
    if (!alreadyHosting) updatedHostingComps.push(hostingCompUUID);
    graphState.updateNode(sourceNode.id, {
      state:          'alive',
      hostingComps:   updatedHostingComps,
      hasParkedLayer: false
    });

    // Update effector node states
    for (i = 0; i < path.effectors.length; i++) {
      effNode = path.effectors[i];
      var effHostingComps = [];
      for (k = 0; k < effNode.hostingComps.length; k++) {
        effHostingComps.push(effNode.hostingComps[k]);
      }
      var effAlreadyHosting = false;
      for (k = 0; k < effHostingComps.length; k++) {
        if (effHostingComps[k] === hostingCompUUID) { effAlreadyHosting = true; break; }
      }
      if (!effAlreadyHosting) effHostingComps.push(hostingCompUUID);
      graphState.updateNode(effNode.id, { state: 'alive', hostingComps: effHostingComps });
    }

    if (batchCommands.length > 0) {
      (function(capturedSourceId) {
        evalBridge.dispatchBatch(batchCommands).then(function(res) {
          if (!res.ok) {
            console.error('[engine] _firePathCreation error for ' + capturedSourceId + ': ' + res.error);
            graphState.updateNode(capturedSourceId, { state: 'error' });
            renderer.updateNode(capturedSourceId);
          }
        }).catch(function(err) {
          console.error('[engine] _firePathCreation rejected for ' + capturedSourceId + ': ' + err.message);
          graphState.updateNode(capturedSourceId, { state: 'error' });
          renderer.updateNode(capturedSourceId);
        });
      }(sourceNode.id));
    }
  }

  // ── Public API ─────────────────────────────────────────────

  function dropNode(type, x, y) {
    var def = nodeRegistry.getDefinition(type);
    if (!def) {
      console.error('[engine] dropNode: unknown type: ' + type);
      return null;
    }

    var nodeData = {
      id:           uuidGenerator.node(),
      type:         def.type,
      nodeKind:     def.nodeKind,
      dedicated:    def.dedicated,
      state:        'ghost',
      dirty:        false,
      x:            x,
      y:            y,
      props:          _buildInitialProps(def.params),
      hostingComps:   [],
      hasParkedLayer: false,
      portSlots:      _buildInitialPortSlots(def.ports)
    };

    graphState.addNode(nodeData);

    // Data nodes are always alive — they have no AE dependency
    if (def.nodeKind === 'data') {
      graphState.updateNode(nodeData.id, { state: 'alive' });
    }

    renderer.render();

    var command = def.onDrop(nodeData);
    if (command === null) {
      return nodeData;
    }

    // Command returned (e.g. CompNode) — fire async, update state on resolution
    (function(capturedId) {
      evalBridge.dispatch(command).then(function(res) {
        if (res.ok) {
          graphState.updateNode(capturedId, { state: 'alive' });
        } else {
          console.error('[engine] dropNode dispatch error for ' + capturedId + ': ' + res.error);
          graphState.updateNode(capturedId, { state: 'error' });
        }
        renderer.updateNode(capturedId);
      }).catch(function(err) {
        console.error('[engine] dropNode dispatch rejected for ' + capturedId + ': ' + err.message);
        graphState.updateNode(capturedId, { state: 'error' });
        renderer.updateNode(capturedId);
      });
    }(nodeData.id));

    return nodeData;
  }

  function connectWire(fromNodeId, fromPort, toNodeId, toPort, boundParam) {
    if (boundParam === undefined) boundParam = null;

    // Step 1: determine wire type from the source port (needed for wire data)
    var fromNode = graphState.getNode(fromNodeId);
    if (!fromNode) {
      console.error('[engine] connectWire: fromNode not found: ' + fromNodeId);
      return false;
    }
    var fromDef = nodeRegistry.getDefinition(fromNode.type);
    if (!fromDef) {
      console.error('[engine] connectWire: fromNode definition not found');
      return false;
    }
    var fromPortDef = _findPortDef(fromDef.ports, fromPort);
    if (!fromPortDef) {
      console.error('[engine] connectWire: fromPort not found: ' + fromPort);
      return false;
    }
    var wireType = fromPortDef.type;

    // Step 2: full validation via wireValidator
    var validation = wireValidator.validate(fromNodeId, fromPort, toNodeId, toPort, wireType);
    if (!validation.valid) {
      console.error('[engine] connectWire: ' + validation.reason);
      return false;
    }

    // Step 3: build and commit wire
    var wireData = {
      id:         uuidGenerator.wire(),
      type:       wireType,
      fromNode:   fromNodeId,
      fromPort:   fromPort,
      toNode:     toNodeId,
      toPort:     toPort,
      boundParam: boundParam
    };
    graphState.addWire(wireData);
    renderer.render();

    // Step 4: notify portManager of new connection on destination slot
    var toBasePort = _getBasePortId(toPort);
    portManager.afterConnect(toNodeId, toBasePort);

    // Step 5: parent wires do not affect alive/ghost state
    if (wireType === 'parent') {
      return true;
    }

    // Step 5b: data wires — mark target node dirty so dirtyFlusher applies the sourced value
    if (wireType === 'data') {
      if (boundParam !== null) {
        var toNodeCheck = graphState.getNode(toNodeId);
        if (toNodeCheck && toNodeCheck.state === 'alive') {
          graphState.updateNode(toNodeId, { dirty: true });
          dirtyFlusher.schedule();
        }
      }
      return true;
    }

    // Step 6: layer wire — fire EVENT 1 if terminal, or re-activate dormant terminal
    // wires downstream if non-terminal (path may have been broken then reconnected).
    var toNode = graphState.getNode(toNodeId);
    if (cascadeAlgorithm.isCompNode(toNode)) {
      _firePathCreation(wireData.id);
    } else {
      _activateDormantTerminalWiresDownstream(toNodeId);
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

    // Data nodes have no AE presence — skip ghost/delete, remove directly
    if (nodeData.nodeKind === 'data') {
      graphState.removeNode(nodeId);
      renderer.render();
      if (graphState.getSelection() === nodeId) graphState.setSelection(null);
      return;
    }

    // Resolve the actual AE layer UUID for effector nodes before ghost/delete hooks
    var upstreamForDelete = null;
    if (nodeData.nodeKind === 'effector') {
      upstreamForDelete = _resolveLayerNodeUUID(nodeId);
    }

    // Step 3: if alive, ghost the node in every hosting comp before removal
    if (nodeData.state === 'alive') {
      var batchCommands = [];
      for (var i = 0; i < nodeData.hostingComps.length; i++) {
        var ghostCmd = def.onGhost(nodeData, nodeData.hostingComps[i], upstreamForDelete);
        if (ghostCmd !== null) {
          batchCommands.push(ghostCmd);
        }
      }
      if (batchCommands.length > 0) {
        evalBridge.dispatchBatch(batchCommands).then(function() {
          // proceed regardless — if AE object is gone, still clean up the graph
        });
      }
    }

    // Step 4: fire delete command (fire and forget)
    var deleteCmd = def.onDelete(nodeData);
    if (deleteCmd !== null) {
      // Fill in layerNodeUUID for effector onDelete commands (node leaves it null)
      if (nodeData.nodeKind === 'effector' && deleteCmd.params && deleteCmd.params.layerNodeUUID === null) {
        deleteCmd.params.layerNodeUUID = upstreamForDelete;
      }
      evalBridge.dispatch(deleteCmd);
    }

    // Step 5: remove from graph (graphState also removes all connected wires)
    graphState.removeNode(nodeId);
    renderer.render();

    // Step 6: clear selection if this node was selected
    if (graphState.getSelection() === nodeId) {
      graphState.setSelection(null);
    }
  }

  function disconnectWire(wireId) {
    var wire = graphState.getWire(wireId);
    if (!wire) {
      console.warn('[engine] disconnectWire: wire not found: ' + wireId);
      return;
    }

    if (wire.type === 'parent') {
      evalBridge.dispatch({
        action: 'clearLayerParent',
        params: { nodeUUID: wire.fromNode }
      });
      graphState.removeWire(wireId);
      renderer.render();
      return;
    }

    if (wire.type === 'data') {
      graphState.removeWire(wireId);
      renderer.render();
      return;
    }

    // Layer wire — cascade owns removal; graph state is updated synchronously
    cascadeAlgorithm.cascadeGhost(wireId);
    renderer.render();
  }

  function recreateNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;

    // Reset to ghost with no parked layer so _firePathCreation takes the create path
    graphState.updateNode(nodeId, { state: 'ghost', hostingComps: [], hasParkedLayer: false });

    var allWires = graphState.getAllWires();
    var wireId, w, current, nd, foundUp, upWireId, upW, isSource, safetyCount;

    for (wireId in allWires) {
      w = allWires[wireId];
      if (!w._pathLayerUUID) continue;

      // Walk upstream from this terminal wire to check if nodeId is its source
      current = w.fromNode;
      isSource = false;
      safetyCount = 0;
      while (current && safetyCount < 100) {
        safetyCount++;
        nd = graphState.getNode(current);
        if (!nd) break;
        if (nd.id === nodeId) { isSource = true; break; }
        if (nd.nodeKind !== 'effector') break;
        foundUp = false;
        for (upWireId in allWires) {
          upW = allWires[upWireId];
          if (upW.toNode === current && upW.type === 'layer') {
            current = upW.fromNode;
            foundUp = true;
            break;
          }
        }
        if (!foundUp) break;
      }

      if (isSource) {
        _firePathCreation(wireId);
      }
    }
  }

  function setNodeProperty(nodeId, key, value) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) {
      console.warn('[engine] setNodeProperty: node not found:', nodeId);
      return;
    }
    graphState.updateProp(nodeId, key, value);

    // Data nodes propagate dirty to all downstream nodes connected via data wires
    if (nodeData.nodeKind === 'data') {
      var allWires = graphState.getAllWires();
      var wId, w, downstreamData;
      for (wId in allWires) {
        w = allWires[wId];
        if (w.fromNode === nodeId && w.type === 'data') {
          downstreamData = graphState.getNode(w.toNode);
          if (downstreamData && downstreamData.state === 'alive') {
            graphState.updateNode(w.toNode, { dirty: true });
          }
        }
      }
    }

    dirtyFlusher.schedule();
  }

  return {
    dropNode:        dropNode,
    connectWire:     connectWire,
    deleteNode:      deleteNode,
    disconnectWire:  disconnectWire,
    setNodeProperty: setNodeProperty,
    recreateNode:    recreateNode
  };

})();
