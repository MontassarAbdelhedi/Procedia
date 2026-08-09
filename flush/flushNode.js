/**
 * Flushes a single dirty node's property changes to the host application.
 * Dependencies: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js,
 *               flush/pathLayerUtil.js
 * Exports: flushNodeImpl { flushNode }
 */
// flush/flushNode.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js,
//             flush/pathLayerUtil.js
// MUST LOAD BEFORE: flush/dirtyFlusher.js

var flushNodeImpl = (function() {

  /**
   * Flushes all dirty properties of a single node by dispatching commands from
   * its definition's onPropertyChange.
   * Tracks concurrent flushes via _flushCount so the propertyPoller can skip
   * this node until all in-flight dispatches complete (avoids stale-read race).
   * @param {string} nodeId - The node UUID
   * @param {Object} nodeData - The node's data object
   * @param {Object} def - The node type definition from nodeRegistry
   */
  function flushNode(nodeId, nodeData, def) {
    nodeData._flushCount = (nodeData._flushCount || 0) + 1;

    if (!def || typeof def.onPropertyChange !== 'function') {
      graphState.clearDirty(nodeId);
      nodeData._flushCount = Math.max(0, nodeData._flushCount - 1);
      return Promise.resolve();
    }

    // Clear dirty synchronously before dispatch so a concurrent edit that
    // sets a new dirty flag won't be erased by a stale .then() callback.
    graphState.clearDirty(nodeId);

    var hostingCompUUID = nodeData.hostingComps && nodeData.hostingComps.length > 0
      ? nodeData.hostingComps[0] : null;
    var upstreamNodeUUID = null;
    var pathLayerUUID = null;
    if (nodeData.nodeKind === 'effector') {
      upstreamNodeUUID = flushPathLayerUtil.resolveUpstreamNodeUUID(nodeId);
      if (!upstreamNodeUUID) {
        upstreamNodeUUID = flushPathLayerUtil.findPathLayerUUID(nodeId);
      }
    } else if (nodeData.nodeKind === 'affected') {
      pathLayerUUID = flushPathLayerUtil.findPathLayerUUID(nodeId);
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
        if (pathLayerUUID && cmd.params && !cmd.params.layerUUID) {
          cmd.params.layerUUID = pathLayerUUID;
        }
        commands.push(cmd);
      }
    }

    if (commands.length === 0) {
      nodeData._flushCount = Math.max(0, nodeData._flushCount - 1);
      return Promise.resolve();
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

    return chain.then(function() {
      nodeData._flushCount = Math.max(0, nodeData._flushCount - 1);
    }).catch(function(err) {
      nodeData._flushCount = Math.max(0, nodeData._flushCount - 1);
      console.warn('[dirtyFlusher] flush failed for ' + nodeId + ': ' + err);
    });
  }

  return {
    flushNode: flushNode
  };

})();
