// graph/cascadeAlgorithm.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js,
//             graph/portManager.js
// MUST LOAD BEFORE: graph/engine.js

var cascadeAlgorithm = (function() {

  // Strip trailing _N index: 'layer_in_0' → 'layer_in'
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

  function _isCompNode(nodeData) {
    return nodeData.nodeKind === 'affected' &&
           nodeData.dedicated === true &&
           nodeData.type === 'core/comp';
  }

  // Returns array of comp UUIDs reachable downstream from nodeId, excluding excludeWireId.
  function _hasCompDownstreamExcluding(nodeId, excludeWireId, visited) {
    if (visited[nodeId]) return [];
    visited[nodeId] = true;

    var result = [];
    var wires = graphState.getAllWires();
    var wireId, wire, downNode, deeper, i;

    for (wireId in wires) {
      if (wireId === excludeWireId) continue;
      wire = wires[wireId];
      if (wire.type !== 'layer') continue;
      if (wire.fromNode !== nodeId) continue;

      downNode = graphState.getNode(wire.toNode);
      if (!downNode) continue;

      if (_isCompNode(downNode)) {
        // Only count active terminal wires — dormant ones (_pathLayerUUID === null) are not live paths
        if (wire._pathLayerUUID !== null && wire._pathLayerUUID !== undefined) {
          result.push(downNode.id);
        }
      } else {
        deeper = _hasCompDownstreamExcluding(wire.toNode, excludeWireId, visited);
        for (i = 0; i < deeper.length; i++) {
          result.push(deeper[i]);
        }
      }
    }

    return result;
  }

  function hasCompDownstream(nodeId) {
    return _hasCompDownstreamExcluding(nodeId, null, {});
  }

  // Walks upstream from a terminal wire's fromNode following layer wires.
  // Returns { sourceNode: nodeData|null, effectors: [nodeData, ...] }
  // effectors are ordered closest-to-source first.
  function collectPathUpstream(terminalWireId) {
    var wire = graphState.getWire(terminalWireId);
    if (!wire) return { sourceNode: null, effectors: [] };

    var effectors = [];
    var current = wire.fromNode;
    var allWires = graphState.getAllWires();
    var nodeData, wireId, w, foundUpstream;

    while (true) {
      nodeData = graphState.getNode(current);
      if (!nodeData) return { sourceNode: null, effectors: effectors };

      if (nodeData.nodeKind !== 'effector') {
        return { sourceNode: nodeData, effectors: effectors };
      }

      effectors.unshift(nodeData); // prepend → closest-to-source first

      foundUpstream = false;
      for (wireId in allWires) {
        w = allWires[wireId];
        if (w.toNode === current && w.type === 'layer') {
          current = w.fromNode;
          foundUpstream = true;
          break;
        }
      }
      if (!foundUpstream) return { sourceNode: null, effectors: effectors };
    }
  }

  // Walks downstream from startNodeId collecting all terminal wire IDs reachable
  // through layer wires, excluding excludeWireId.
  function _findStrandedTerminalWireIds(startNodeId, excludeWireId) {
    var result = [];
    var visited = {};
    var stack = [startNodeId];
    var wires = graphState.getAllWires();
    var current, wireId, wire;

    while (stack.length > 0) {
      current = stack.pop();
      if (visited[current]) continue;
      visited[current] = true;

      for (wireId in wires) {
        if (wireId === excludeWireId) continue;
        wire = wires[wireId];
        if (wire.type !== 'layer') continue;
        if (wire.fromNode !== current) continue;

        if (wire._pathLayerUUID !== null && wire._pathLayerUUID !== undefined) {
          result.push(wireId);
        } else {
          if (!visited[wire.toNode]) stack.push(wire.toNode);
        }
      }
    }

    return result;
  }

  // Builds teardown commands and node updates for one terminal wire.
  // Does NOT modify wireMap, does NOT dispatch, does NOT call rebuildTempGraph.
  function _buildTeardownForTerminalWire(terminalWireId) {
    var wire = graphState.getWire(terminalWireId);
    if (!wire) return { batchCommands: [], nodeUpdates: {} };

    var path = collectPathUpstream(terminalWireId);
    var hostingCompUUID = wire.toNode;
    var pathLayerUUID = wire._pathLayerUUID;

    var batchCommands = [];
    var nodeUpdates = {};
    var i, effNode, effDef, effCmd, effRemainingComps;

    // Ghost effectors outermost-first (reverse of effectors array which is closest-to-source first)
    for (i = path.effectors.length - 1; i >= 0; i--) {
      effNode = path.effectors[i];
      effDef = nodeRegistry.getDefinition(effNode.type);
      if (effDef && effNode.state === 'alive') {
        effCmd = effDef.onGhost(effNode, hostingCompUUID, pathLayerUUID);
        if (effCmd !== null) batchCommands.push(effCmd);
      }
      effRemainingComps = _hasCompDownstreamExcluding(effNode.id, terminalWireId, {});
      nodeUpdates[effNode.id] = {
        state:          effRemainingComps.length === 0 ? 'ghost' : 'alive',
        hostingComps:   effRemainingComps,
        hasParkedLayer: false
      };
    }

    // Handle source affected node
    if (path.sourceNode) {
      var sourceNode = path.sourceNode;
      var sourceDef = nodeRegistry.getDefinition(sourceNode.type);
      var sourceRemainingComps = _hasCompDownstreamExcluding(sourceNode.id, terminalWireId, {});

      if (sourceRemainingComps.length === 0) {
        // Last path — park the layer to preserve keyframes
        if (sourceDef && sourceNode.state === 'alive') {
          var parkCmd = sourceDef.onGhost(sourceNode, hostingCompUUID);
          if (parkCmd !== null) {
            // Inject layerUUID so actionParkLayer finds the layer by wire UUID and re-stamps it
            if (!parkCmd.params) parkCmd.params = {};
            parkCmd.params.layerUUID = pathLayerUUID;
            batchCommands.push(parkCmd);
          }
        }
        nodeUpdates[sourceNode.id] = {
          state:          'ghost',
          hostingComps:   [],
          hasParkedLayer: true
        };
      } else {
        // Still has other paths — delete just this path's layer from comp
        batchCommands.push({
          action: 'deletePathLayer',
          params: { layerUUID: pathLayerUUID, compUUID: hostingCompUUID }
        });
        nodeUpdates[sourceNode.id] = {
          state:          'alive',
          hostingComps:   sourceRemainingComps,
          hasParkedLayer: sourceNode.hasParkedLayer
        };
      }
    }

    return { batchCommands: batchCommands, nodeUpdates: nodeUpdates };
  }

  // EVENT 2 — terminal wire deleted.
  function _teardownTerminalWire(terminalWireId) {
    var wire = graphState.getWire(terminalWireId);
    if (!wire) return;

    var td = _buildTeardownForTerminalWire(terminalWireId);
    var nodeId;

    for (nodeId in td.nodeUpdates) {
      graphState.updateNode(nodeId, td.nodeUpdates[nodeId]);
    }

    var basePortId = _getBasePortId(wire.toPort);
    graphState.removeWire(terminalWireId);
    portManager.afterDisconnect(wire.toNode, basePortId);

    if (td.batchCommands.length > 0) {
      evalBridge.dispatchBatch(td.batchCommands).then(function(res) {
        if (!res.ok) {
          console.error('[cascadeAlgorithm] _teardownTerminalWire error: ' + res.error);
        }
      });
    }

    graphState.rebuildTempGraph();
  }

  // EVENT 4 — non-terminal wire deleted (path broken mid-chain).
  // Finds all active terminal wires stranded downstream, tears each one down, then makes
  // them dormant (_pathLayerUUID = null) so they stay in the graph for later re-activation.
  function _teardownIntermediateWire(nonTerminalWireId) {
    var wire = graphState.getWire(nonTerminalWireId);
    if (!wire) return;

    // Collect stranded terminal wires while non-terminal wire still in wireMap
    // (so collectPathUpstream inside _buildTeardownForTerminalWire sees the full chain)
    var strandedIds = _findStrandedTerminalWireIds(wire.toNode, nonTerminalWireId);

    var allBatchCommands = [];
    var allNodeUpdates = {};
    var i, j, twId, td, nodeId;

    for (i = 0; i < strandedIds.length; i++) {
      twId = strandedIds[i];
      td = _buildTeardownForTerminalWire(twId);

      for (j = 0; j < td.batchCommands.length; j++) {
        allBatchCommands.push(td.batchCommands[j]);
      }
      for (nodeId in td.nodeUpdates) {
        allNodeUpdates[nodeId] = td.nodeUpdates[nodeId];
      }

      // Make dormant instead of removing: clear _pathLayerUUID so the wire stays in the
      // graph (can be re-activated by reconnecting a source) but no longer counts as an
      // active path. _hasCompDownstreamExcluding skips wires with null _pathLayerUUID,
      // so iterating multiple stranded wires still produces correct park/delete decisions.
      graphState.updateWire(twId, { _pathLayerUUID: null });
    }

    // Remove only the non-terminal wire that was explicitly deleted
    var basePortId = _getBasePortId(wire.toPort);
    graphState.removeWire(nonTerminalWireId);
    portManager.afterDisconnect(wire.toNode, basePortId);

    for (nodeId in allNodeUpdates) {
      graphState.updateNode(nodeId, allNodeUpdates[nodeId]);
    }

    if (allBatchCommands.length > 0) {
      evalBridge.dispatchBatch(allBatchCommands).then(function(res) {
        if (!res.ok) {
          console.error('[cascadeAlgorithm] _teardownIntermediateWire error: ' + res.error);
        }
      });
    }

    graphState.rebuildTempGraph();
  }

  function cascadeGhost(deletedWireId) {
    var wire = graphState.getWire(deletedWireId);
    if (!wire) {
      console.warn('[cascadeAlgorithm] cascadeGhost: wire not found: ' + deletedWireId);
      return;
    }

    if (wire.type !== 'layer') return;

    if (wire._pathLayerUUID !== null && wire._pathLayerUUID !== undefined) {
      _teardownTerminalWire(deletedWireId);
    } else {
      _teardownIntermediateWire(deletedWireId);
    }
  }

  return {
    cascadeGhost:        cascadeGhost,
    hasCompDownstream:   hasCompDownstream,
    collectPathUpstream: collectPathUpstream,
    isCompNode:          _isCompNode
  };

})();
