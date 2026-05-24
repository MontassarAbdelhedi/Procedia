// flush/dirtyFlusher.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js
// MUST LOAD BEFORE: index.js

var dirtyFlusher = (function() {

  var _timer = null;
  var DEBOUNCE_MS = 300;

  // Returns all terminal wires where nodeId is the source affected node.
  function _terminalWiresForSource(sourceNodeId) {
    var result = [];
    var allWires = graphState.getAllWires();
    var wireId, w, current, nd, foundUp, upWireId, upW, safetyCount;

    for (wireId in allWires) {
      w = allWires[wireId];
      if (!w._pathLayerUUID) continue;

      current = w.fromNode;
      safetyCount = 0;
      while (current && safetyCount < 100) {
        safetyCount++;
        nd = graphState.getNode(current);
        if (!nd) break;
        if (nd.id === sourceNodeId) { result.push(w); break; }
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
    }

    return result;
  }

  // Returns all terminal wires whose path includes effectorNodeId.
  function _terminalWiresForEffector(effectorNodeId) {
    var result = [];
    var allWires = graphState.getAllWires();
    var wireId, w, current, nd, foundUp, upWireId, upW, safetyCount, inPath;

    for (wireId in allWires) {
      w = allWires[wireId];
      if (!w._pathLayerUUID) continue;

      current = w.fromNode;
      inPath = false;
      safetyCount = 0;
      while (current && safetyCount < 100) {
        safetyCount++;
        nd = graphState.getNode(current);
        if (!nd) break;
        if (nd.id === effectorNodeId) { inPath = true; break; }
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

      if (inPath) result.push(w);
    }

    return result;
  }

  // Resolves a param value for a node: if a data wire is bound to this param,
  // returns the source data node's output value instead of the node's own prop.
  function _resolveParamValue(nodeData, paramKey) {
    var allWires = graphState.getAllWires();
    var wId, w, sourceNode, def, p;
    for (wId in allWires) {
      w = allWires[wId];
      if (w.toNode === nodeData.id && w.type === 'data' && w.boundParam === paramKey) {
        sourceNode = graphState.getNode(w.fromNode);
        if (sourceNode) {
          def = nodeRegistry.getDefinition(sourceNode.type);
          if (def && def.params.length > 0) {
            for (p = 0; p < def.params.length; p++) {
              if (def.params[p].key !== 'label') {
                return sourceNode.props[def.params[p].key];
              }
            }
          }
        }
      }
    }
    return nodeData.props[paramKey];
  }

  function flush() {
    var nodes = graphState.getAllNodes();
    var batch = [];
    var flushedIds = [];
    var nodeId, nodeData, def, key, cmd, i, terminalWires, tw;

    for (nodeId in nodes) {
      nodeData = nodes[nodeId];
      if (!nodeData.dirty) continue;
      if (nodeData.state !== 'alive') continue;

      def = nodeRegistry.getDefinition(nodeData.type);
      if (!def) continue;

      // Data nodes never dispatch — their value is sourced by downstream nodes via _resolveParamValue
      if (nodeData.nodeKind === 'data') {
        flushedIds.push(nodeId);
        continue;
      }

      // CompNodes: property changes go directly to the comp item by node UUID
      if (nodeData.nodeKind === 'affected' && nodeData.type === 'core/comp') {
        for (key in nodeData.props) {
          cmd = def.onPropertyChange(key, _resolveParamValue(nodeData, key), nodeData, nodeData.id);
          if (cmd !== null) batch.push(cmd);
        }
        flushedIds.push(nodeId);
        continue;
      }

      // Affected layer nodes: one flush per terminal wire — inject layerUUID so
      // actionSetLayerProperty finds the layer by wire UUID, not node UUID
      if (nodeData.nodeKind === 'affected') {
        terminalWires = _terminalWiresForSource(nodeId);
        for (i = 0; i < terminalWires.length; i++) {
          tw = terminalWires[i];
          for (key in nodeData.props) {
            cmd = def.onPropertyChange(key, _resolveParamValue(nodeData, key), nodeData, tw.toNode);
            if (cmd !== null) {
              if (!cmd.params) cmd.params = {};
              cmd.params.layerUUID = tw._pathLayerUUID;
              batch.push(cmd);
            }
          }
        }
        if (terminalWires.length > 0) flushedIds.push(nodeId);
        continue;
      }

      // Effectors: one flush per path that includes this effector —
      // pass pathLayerUUID as third arg so onPropertyChange builds correct layerNodeUUID
      if (nodeData.nodeKind === 'effector') {
        terminalWires = _terminalWiresForEffector(nodeId);
        for (i = 0; i < terminalWires.length; i++) {
          tw = terminalWires[i];
          for (key in nodeData.props) {
            cmd = def.onPropertyChange(key, _resolveParamValue(nodeData, key), nodeData, tw.toNode, tw._pathLayerUUID);
            if (cmd !== null) batch.push(cmd);
          }
        }
        if (terminalWires.length > 0) flushedIds.push(nodeId);
        continue;
      }
    }

    if (batch.length > 0) {
      (function(capturedIds) {
        evalBridge.dispatchBatch(batch).then(function() {
          for (var i = 0; i < capturedIds.length; i++) {
            graphState.clearDirty(capturedIds[i]);
          }
        }).catch(function(err) {
          console.error('[dirtyFlusher] dispatchBatch error:', err);
        });
      }(flushedIds));
    }
  }

  function schedule() {
    if (_timer !== null) {
      clearTimeout(_timer);
      _timer = null;
    }
    _timer = setTimeout(flush, DEBOUNCE_MS);
  }

  function cancel() {
    if (_timer !== null) {
      clearTimeout(_timer);
      _timer = null;
    }
  }

  return {
    schedule: schedule,
    flush:    flush,
    cancel:   cancel
  };

})();
