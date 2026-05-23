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
        result.push(downNode.id);
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

  function _collectCascadeSet(sourceNodeId, excludeWireId) {
    var cascadeSet = [];
    var visited = {};
    var stack = [sourceNodeId];
    var wires = graphState.getAllWires();
    var current, nodeData, wireId, wire, fromNodeData, nodeId;
    var i;

    while (stack.length > 0) {
      current = stack.pop();
      if (visited[current]) continue;
      visited[current] = true;

      nodeData = graphState.getNode(current);
      if (!nodeData) continue;
      if (nodeData.state !== 'alive') continue;
      if (_isCompNode(nodeData)) continue;

      cascadeSet.push(nodeData);

      for (wireId in wires) {
        if (wireId === excludeWireId) continue;
        wire = wires[wireId];
        if (wire.type !== 'layer') continue;
        if (wire.toNode !== current) continue;
        if (!visited[wire.fromNode]) stack.push(wire.fromNode);
      }
    }

    // Collect effectors wired into each affected node in cascade set
    for (i = 0; i < cascadeSet.length; i++) {
      nodeId = cascadeSet[i].id;
      for (wireId in wires) {
        wire = wires[wireId];
        if (wire.toNode !== nodeId) continue;
        if (visited[wire.fromNode]) continue;
        fromNodeData = graphState.getNode(wire.fromNode);
        if (!fromNodeData) continue;
        if (fromNodeData.nodeKind !== 'effector') continue;
        if (fromNodeData.state !== 'alive') continue;
        visited[wire.fromNode] = true;
        cascadeSet.push(fromNodeData);
      }
    }

    return cascadeSet;
  }

  function _orderCascadeSet(cascadeSet) {
    var effectors = [];
    var affected  = [];
    var i;

    for (i = 0; i < cascadeSet.length; i++) {
      if (cascadeSet[i].nodeKind === 'effector') {
        effectors.push(cascadeSet[i]);
      } else {
        affected.push(cascadeSet[i]);
      }
    }

    var ordered = [];
    for (i = 0; i < effectors.length; i++) ordered.push(effectors[i]);
    for (i = 0; i < affected.length; i++)  ordered.push(affected[i]);
    return ordered;
  }

  function cascadeGhost(deletedWireId) {
    var wire = graphState.getWire(deletedWireId);
    if (!wire) {
      console.warn('[cascadeAlgorithm] cascadeGhost: wire not found: ' + deletedWireId);
      return;
    }

    if (wire.type !== 'layer') return;

    var sourceNodeData = graphState.getNode(wire.fromNode);
    if (!sourceNodeData) {
      graphState.removeWire(deletedWireId);
      return;
    }

    var remainingComps = _hasCompDownstreamExcluding(sourceNodeData.id, deletedWireId, {});
    if (remainingComps.length > 0) {
      // Source node still has a comp path — no cascade needed, but still remove wire
      graphState.removeWire(deletedWireId);
      return;
    }

    var cascadeSet = _collectCascadeSet(sourceNodeData.id, deletedWireId);
    var ordered    = _orderCascadeSet(cascadeSet);

    var batchCommands = [];
    var nodeUpdates   = [];
    var i, j, k, m, u;
    var nodeData, nodeRemainingComps, losingComps, found, def, cmd;

    for (i = 0; i < ordered.length; i++) {
      nodeData = ordered[i];
      nodeRemainingComps = _hasCompDownstreamExcluding(nodeData.id, deletedWireId, {});

      losingComps = [];
      for (j = 0; j < nodeData.hostingComps.length; j++) {
        found = false;
        for (k = 0; k < nodeRemainingComps.length; k++) {
          if (nodeData.hostingComps[j] === nodeRemainingComps[k]) { found = true; break; }
        }
        if (!found) losingComps.push(nodeData.hostingComps[j]);
      }

      def = nodeRegistry.getDefinition(nodeData.type);
      if (def) {
        for (m = 0; m < losingComps.length; m++) {
          cmd = def.onGhost(nodeData, losingComps[m]);
          if (cmd !== null) batchCommands.push(cmd);
        }
      }

      nodeUpdates.push({
        id:             nodeData.id,
        state:          nodeRemainingComps.length === 0 ? 'ghost' : 'alive',
        hostingComps:   nodeRemainingComps,
        hasParkedLayer: nodeRemainingComps.length === 0
      });
    }

    for (u = 0; u < nodeUpdates.length; u++) {
      graphState.updateNode(nodeUpdates[u].id, {
        state:          nodeUpdates[u].state,
        hostingComps:   nodeUpdates[u].hostingComps,
        hasParkedLayer: nodeUpdates[u].hasParkedLayer
      });
    }

    graphState.removeWire(deletedWireId);

    // Notify portManager that a slot was freed on the destination node
    var cascadeBasePortId = _getBasePortId(wire.toPort);
    portManager.afterDisconnect(wire.toNode, cascadeBasePortId);

    if (batchCommands.length > 0) {
      evalBridge.dispatchBatch(batchCommands).then(function(res) {
        if (!res.ok) {
          console.error('[cascadeAlgorithm] dispatchBatch error: ' + res.error);
        }
      });
    }

    graphState.rebuildTempGraph();
  }

  return {
    cascadeGhost:      cascadeGhost,
    hasCompDownstream: hasCompDownstream
  };

})();
