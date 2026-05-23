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

  function _propagateAlive(nodeId, hostingCompUUID) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;

    // Guard: already alive in this hosting comp
    for (var i = 0; i < nodeData.hostingComps.length; i++) {
      if (nodeData.hostingComps[i] === hostingCompUUID) return;
    }

    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    var command;
    if (nodeData.state === 'ghost' && nodeData.hasParkedLayer) {
      command = { action: 'unparkLayer', params: { nodeUUID: nodeData.id, hostingCompUUID: hostingCompUUID } };
    } else {
      command = def.onAlive(nodeData, hostingCompUUID);
    }

    // Build updated hostingComps array before dispatching
    var updatedHostingComps = [];
    for (var j = 0; j < nodeData.hostingComps.length; j++) {
      updatedHostingComps.push(nodeData.hostingComps[j]);
    }
    updatedHostingComps.push(hostingCompUUID);

    // State update is synchronous — callers can read alive state immediately
    graphState.updateNode(nodeId, { state: 'alive', hostingComps: updatedHostingComps, hasParkedLayer: false });

    if (command !== null) {
      (function(capturedNodeId) {
        evalBridge.dispatch(command).then(function(res) {
          if (!res.ok) {
            console.error('[engine] _propagateAlive dispatch error for ' + capturedNodeId + ': ' + res.error);
            graphState.updateNode(capturedNodeId, { state: 'error' });
            renderer.updateNode(capturedNodeId);
          }
        }).catch(function(err) {
          console.error('[engine] _propagateAlive dispatch rejected for ' + capturedNodeId + ': ' + err.message);
          graphState.updateNode(capturedNodeId, { state: 'error' });
          renderer.updateNode(capturedNodeId);
        });
      }(nodeId));
    }

    // Traverse upstream: find all layer wires flowing INTO this node
    var wires = graphState.getAllWires();
    var upstream = [];
    for (var wireId in wires) {
      var wire = wires[wireId];
      if (wire.toNode === nodeId && wire.type === 'layer') {
        upstream.push(wire.fromNode);
      }
    }
    for (var k = 0; k < upstream.length; k++) {
      _propagateAlive(upstream[k], hostingCompUUID);
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

    // Step 5: parent and data wires do not affect alive/ghost state
    if (wireType === 'parent' || wireType === 'data') {
      return true;
    }

    // Step 6: layer wire — propagate alive if a comp path exists
    // The one acceptable type string in the engine: identifying the terminal comp node.
    var toNode = graphState.getNode(toNodeId);
    var isCompNode = (toNode.nodeKind === 'affected' &&
                      toNode.dedicated === true      &&
                      toNode.type === 'core/comp');

    if (isCompNode) {
      _propagateAlive(fromNodeId, toNodeId);
    } else if (toNode.hostingComps.length > 0) {
      _propagateAlive(fromNodeId, toNode.hostingComps[0]);
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

    // Step 3: if alive, park the layer in every hosting comp before removal
    if (nodeData.state === 'alive') {
      var batchCommands = [];
      for (var i = 0; i < nodeData.hostingComps.length; i++) {
        var ghostCmd = def.onGhost(nodeData, nodeData.hostingComps[i]);
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
    dropNode:        dropNode,
    connectWire:     connectWire,
    deleteNode:      deleteNode,
    disconnectWire:  disconnectWire,
    setNodeProperty: setNodeProperty
  };

})();
