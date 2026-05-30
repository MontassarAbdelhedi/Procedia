// flush/dirtyFlusher.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js
// MUST LOAD BEFORE: index.js

var dirtyFlusher = (function() {

  var _timer = null;
  var DEBOUNCE_MS = 300;

  function _findPathLayerUUID(nodeId) {
    var wireMap = graphState.getAllWires();
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.fromNode === nodeId && wire.type === 'layer') {
        if (wire._pathLayerUUID !== null && wire._pathLayerUUID !== undefined) {
          return wire._pathLayerUUID;
        }
        var found = _findPathLayerUUID(wire.toNode);
        if (found !== null) return found;
      }
    }
    return null;
  }

  function _resolveUpstreamNodeUUID(nodeId) {
    var wireMap = graphState.getAllWires();
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.toNode === nodeId && wire.toPort === 'main_input') {
        if (wire._pathLayerUUID !== null && wire._pathLayerUUID !== undefined) {
          return wire._pathLayerUUID;
        }
        return _findPathLayerUUID(wire.fromNode);
      }
    }
    return null;
  }

  function _flushNode(nodeId, nodeData, def) {
    if (!def || typeof def.onPropertyChange !== 'function') {
      graphState.clearDirty(nodeId);
      return;
    }

    var hostingCompUUID = nodeData.hostingComps[0];
    var upstreamNodeUUID = null;
    if (nodeData.nodeKind === 'effector') {
      upstreamNodeUUID = _resolveUpstreamNodeUUID(nodeId);
    }

    var commands = [];
    for (var key in nodeData.props) {
      if (!nodeData.props.hasOwnProperty(key)) continue;
      var cmd;
      if (nodeData.nodeKind === 'effector') {
        cmd = def.onPropertyChange(key, nodeData.props[key], nodeData, hostingCompUUID, upstreamNodeUUID);
      } else {
        cmd = def.onPropertyChange(key, nodeData.props[key], nodeData, hostingCompUUID);
      }
      if (cmd !== null && cmd !== undefined) {
        commands.push(cmd);
      }
    }

    if (commands.length === 0) {
      graphState.clearDirty(nodeId);
      return;
    }

    var chain = Promise.resolve();
    for (var i = 0; i < commands.length; i++) {
      (function(command) {
        chain = chain.then(function() {
          return evalBridge.dispatch(command);
        }).then(function(res) {
          if (!res || !res.ok) {
            throw new Error((res && res.error) ? res.error : 'dispatch failed');
          }
        });
      })(commands[i]);
    }

    chain.then(function() {
      graphState.clearDirty(nodeId);
    }).catch(function(err) {
      console.error('[dirtyFlusher] flush failed for ' + nodeId + ': ' + err);
    });
  }

  function flush() {
    var nodeMap = graphState.getAllNodes();
    for (var nodeId in nodeMap) {
      if (!nodeMap.hasOwnProperty(nodeId)) continue;
      var nodeData = nodeMap[nodeId];
      if (!nodeData || nodeData.dirty !== true) continue;
      if (nodeData.state !== 'alive') continue;
      if (!nodeData.hostingComps || nodeData.hostingComps.length === 0) continue;

      var def = nodeRegistry.getDefinition(nodeData.type);
      _flushNode(nodeId, nodeData, def);
    }
  }

  function schedule() {
    cancel();
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

if (typeof window !== 'undefined') {
  window.dirtyFlusher = dirtyFlusher;
}
