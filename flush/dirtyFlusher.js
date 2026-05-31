/**
 * Flushes dirty node property changes to the host application.
 * Debounces flushes and walks upstream wire chains to resolve path-layer UUIDs.
 * Depends on: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js
 * Exports: dirtyFlusher object with schedule, flush, cancel
 */
// flush/dirtyFlusher.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js
// MUST LOAD BEFORE: index.js

var dirtyFlusher = (function() {

  var _timer = null;
  var DEBOUNCE_MS = 300;

  /**
   * Finds the _pathLayerUUID by walking upstream wires from the given node.
   * @param {string} nodeId - The starting node UUID
   * @returns {string|null}
   */
  function _findPathLayerUUID(nodeId) {
    return _findPathLayerUUIDWithVisited(nodeId, {});
  }

  /**
   * Recursively walks upstream wires to find a _pathLayerUUID, tracking visited nodes.
   * @param {string} nodeId - Current node UUID
   * @param {Object} visited - Set of visited node IDs (used to prevent cycles)
   * @returns {string|null}
   */
  function _findPathLayerUUIDWithVisited(nodeId, visited) {
    if (visited[nodeId]) return null;
    visited[nodeId] = true;
    var wireMap = graphState.getAllWires();
    for (var wireId in wireMap) {
      if (!wireMap.hasOwnProperty(wireId)) continue;
      var wire = wireMap[wireId];
      if (wire.fromNode === nodeId && wire.type === 'layer') {
        if (wire._pathLayerUUID !== null && wire._pathLayerUUID !== undefined) {
          return wire._pathLayerUUID;
        }
        var found = _findPathLayerUUIDWithVisited(wire.toNode, visited);
        if (found !== null) return found;
      }
    }
    return null;
  }

  /**
   * Resolves the upstream path-layer UUID for an effector node by inspecting its input wires.
   * @param {string} nodeId - The effector node UUID
   * @returns {string|null}
   */
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

  /**
   * Flushes all dirty properties of a single node by dispatching commands from its definition's onPropertyChange.
   * @param {string} nodeId - The node UUID
   * @param {Object} nodeData - The node's data object
   * @param {Object} def - The node type definition from nodeRegistry
   */
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

  /**
   * Immediately flushes all dirty nodes in the graph.
   * Iterates over every node and dispatches property changes for those marked dirty.
   */
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

  /**
   * Schedules a debounced flush. Cancels any previously scheduled flush.
   */
  function schedule() {
    cancel();
    _timer = setTimeout(flush, DEBOUNCE_MS);
  }

  /**
   * Cancels any pending scheduled flush.
   */
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
