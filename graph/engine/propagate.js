/**
 * graph/engine/propagate.js
 *
 * Propagation engine for alive state along layer wires. Handles transplant
 * restamping, matte activation detection, and path creation fire when a
 * terminal wire is connected to a composition node.
 *
 * Dependencies: graphState, nodeRegistry, cascade/index.js, evalBridge,
 *               dirtyFlusher, engine/helpers/index.js
 * Load before: engine/wires.js, engine/nodes/index.js, engine/index.js
 *
 * Exports: propagateAlive, checkMatteActivation, firePathCreation
 */
// graph/engine/propagate.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cascade/index.js,
//             bridge/evalBridge.js, flush/dirtyFlusher.js, graph/engine/helpers/index.js
// MUST LOAD BEFORE: engine/wires.js, engine/nodes/index.js, engine/index.js

window.__procedia_internal.prop = (function() {
  var registry = window.__procedia_internal.registry;
  var hlp = registry.get('hlp');
  var lifecycle = window.__procedia_internal.lifecycle;

  /**
   * Set of path layer UUIDs that are pending creation in AE.
   * Protects against a race condition where the poller checks for a layer
   * UUID before the async evalBridge.dispatch(createTextLayer) has completed.
   * UUIDs are added here in _firePathCreation / _propagateAlive and removed
   * when the dispatch promise resolves (success or failure).
   * @type {Object<string, boolean>}
   */
  var _pendingPathUUIDs = {};

  /**
   * Checks if a path layer UUID is pending creation in AE.
   * Used by the poller to skip UUIDs that haven't had their layer created yet.
   * @param {string} uuid - The path layer UUID to check
   * @returns {boolean} True if the UUID is pending creation
   */
  function _isPathLayerPending(uuid) {
    return (_pendingPathUUIDs[uuid] || 0) > 0;
  }

  /**
   * Merges a hosting comp into a hostingComps array, deduplicating.
   * @param {string[]} existing - Current hosting comps
   * @param {string} newComp - New comp UUID to add
   * @returns {string[]} New array with the comp added
   */
  function _mergeHostingComps(existing, newComp) {
    for (var mi = 0; mi < existing.length; mi++) {
      if (existing[mi] === newComp) return existing;
    }
    var result = existing.slice();
    result.push(newComp);
    return result;
  }

  /**
   * Builds the onAlive command for a node based on its nodeKind.
   * @param {Object} nodeData - The node data
   * @param {Object} def - The node definition
   * @param {string} hostingCompUUID - Hosting comp UUID
   * @param {string} pathLayerUUID - Terminal wire layer UUID
   * @returns {Object|null} Command object or null
   */
  function _buildOnAliveCommand(nodeData, def, hostingCompUUID, pathLayerUUID) {
    if (nodeData.nodeKind === 'affected' && nodeData.hasParkedLayer) {
      return {
        action: 'unparkLayer',
        params: {
          nodeUUID:        nodeData.id,
          hostingCompUUID: hostingCompUUID,
          layerUUID:       pathLayerUUID
        }
      };
    }
    if (nodeData.nodeKind === 'merge' || nodeData.nodeKind === 'multimerge') {
      return def.onAlive(nodeData, hostingCompUUID, pathLayerUUID);
    }
    var cmd = lifecycle.buildLifecycleCommand(nodeData, def, 'onAlive', undefined, undefined, hostingCompUUID);
    if (cmd && nodeData.nodeKind === 'affected') {
      cmd.params.layerUUID = pathLayerUUID;
    }
    return cmd;
  }

  /**
   * Dispatches an onAlive command and handles errors.
   * @param {string} nodeId - Node ID for error reporting
   * @param {Object|null} command - Command to dispatch
   */
  function _dispatchCommand(nodeId, command) {
    if (command === null) return;
    (function(dispatchNodeId, dispatchCmd) {
      if (dispatchCmd.params && dispatchCmd.params.layerUUID) {
        _pendingPathUUIDs[dispatchCmd.params.layerUUID] = (_pendingPathUUIDs[dispatchCmd.params.layerUUID] || 0) + 1;
      }
      evalBridge.dispatch(dispatchCmd).then(function(res) {
        if (typeof res === 'undefined' || res === null) return;
        if (!res.ok) {
          console.error('[engine] onAlive failed for ' + dispatchNodeId + ': ' + (res.error || 'unknown error'));
          graphState.updateNode(dispatchNodeId, { state: 'error' });
          var nodeAtFail = graphState.getNode(dispatchNodeId);
          if (nodeAtFail && nodeAtFail.type === 'core/footage' && dispatchCmd.action === 'createFootageLayer') {
            if (typeof notificationBar !== 'undefined' && notificationBar.push) {
              notificationBar.push({
                message: 'Footage node "' + (nodeAtFail.props.label || 'Footage') + '" has no file imported',
                severity: 'error',
                duration: 5000
              });
            }
          }
        } else {
          var nodeAfterOk = graphState.getNode(dispatchNodeId);
          if (nodeAfterOk && nodeAfterOk.state === 'error') {
            console.warn('[engine] onAlive dispatch succeeded for ' + dispatchNodeId + ' but node was in error state — recovering to alive');
            graphState.updateNode(dispatchNodeId, { state: 'alive' });
          }
        }
      }).catch(function(err) {
        console.error('[engine] onAlive dispatch failed for ' + dispatchNodeId + ': ' + (err || 'unknown error'));
        graphState.updateNode(dispatchNodeId, { state: 'error' });
      }).finally(function() {
        if (dispatchCmd.params && dispatchCmd.params.layerUUID) {
          if (_pendingPathUUIDs[dispatchCmd.params.layerUUID] > 0) {
            _pendingPathUUIDs[dispatchCmd.params.layerUUID]--;
          }
          if (_pendingPathUUIDs[dispatchCmd.params.layerUUID] <= 0) {
            delete _pendingPathUUIDs[dispatchCmd.params.layerUUID];
          }
        }
      });
    }(nodeId, window.__procedia_internal.deepClone(command)));
  }

  /**
   * Recursively propagates alive upstream through layer wires.
   * @param {string} nodeId - Current node ID
   * @param {string} hostingCompUUID - Hosting comp UUID
   * @param {string} pathLayerUUID - Terminal wire layer UUID
   */
  function _propagateUpstream(nodeId, hostingCompUUID, pathLayerUUID, visited) {
    var wireMap = graphState.getAllWires();
    for (var upstreamWireId in wireMap) {
      if (!wireMap.hasOwnProperty(upstreamWireId)) continue;
      var upstreamWire = wireMap[upstreamWireId];
      if (upstreamWire.toNode !== nodeId || upstreamWire.type !== 'layer') continue;
      var upstreamNode = graphState.getNode(upstreamWire.fromNode);
      if (!upstreamNode) continue;
      if (upstreamNode.nodeKind === 'data') continue;
      if (upstreamNode.nodeKind === 'matte') continue;
      var alreadyAlive = false;
      for (var hostIndex = 0; hostIndex < upstreamNode.hostingComps.length; hostIndex++) {
        if (upstreamNode.hostingComps[hostIndex] === hostingCompUUID) { alreadyAlive = true; break; }
      }
      if (alreadyAlive) continue;
      graphState.updateWire(upstreamWire.id, { _pathLayerUUID: upstreamWire.id });
      _propagateAlive(upstreamWire.fromNode, hostingCompUUID, pathLayerUUID, visited);
    }
  }

  /**
   * Propagates 'alive' state upstream from a composition node through layer
   * wires. Handles transplant restamping, unparking parked layers, and
   * dispatching onAlive commands for affected, effector, and blending nodes.
   *
   * @param {string} nodeId - Node to propagate alive to
   * @param {string} hostingCompUUID - UUID of the hosting composition
   * @param {string} pathLayerUUID - Terminal wire layer UUID
   */
  function _propagateAlive(nodeId, hostingCompUUID, pathLayerUUID, visited) {
    visited = visited || {};
    if (visited[nodeId]) return;
    visited[nodeId] = true;

    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;

    var sentryTransaction = null;
    if (typeof reporter !== 'undefined' && reporter.captureMessage && typeof Sentry !== 'undefined' && Sentry.startTransaction) {
      sentryTransaction = Sentry.startTransaction({ name: 'propagateAlive', op: 'engine.propagate', tags: { nodeId: nodeId, nodeType: nodeData.type } });
    }

    for (var h = 0; h < nodeData.hostingComps.length; h++) {
      if (nodeData.hostingComps[h] === hostingCompUUID) {
        if (sentryTransaction) { sentryTransaction.finish(); }
        return;
      }
    }

    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) {
      if (sentryTransaction) { sentryTransaction.finish(); }
      return;
    }

    if (nodeData._transplantLayerUUID) {
      evalBridge.dispatch({
        action: 'restampLayer',
        params: {
          hostingCompUUID: hostingCompUUID,
          oldUUID:         nodeData._transplantLayerUUID,
          newUUID:         pathLayerUUID
        }
      });
      graphState.updateNode(nodeId, {
        state:                'alive',
        hostingComps:         _mergeHostingComps(nodeData.hostingComps, hostingCompUUID),
        _transplantLayerUUID: null
      });
      _propagateUpstream(nodeId, hostingCompUUID, pathLayerUUID, visited);
      var transplantCmd = _buildOnAliveCommand(nodeData, def, hostingCompUUID, pathLayerUUID);
      if (transplantCmd) transplantCmd.params._moveToBottom = true;
      _dispatchCommand(nodeId, transplantCmd);
      if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.flush) dirtyFlusher.flush();
      if (sentryTransaction) { sentryTransaction.finish(); }
      return;
    }

    if (cascadeAlgorithm.isCompNode(nodeId)) {
      graphState.updateNode(nodeId, {
        state:          'alive',
        hostingComps:   _mergeHostingComps(nodeData.hostingComps, hostingCompUUID),
        hasParkedLayer: false
      });
      _dispatchCommand(nodeId, _buildOnAliveCommand(nodeData, def, hostingCompUUID, pathLayerUUID));
      if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.flush) dirtyFlusher.flush();
      if (sentryTransaction) { sentryTransaction.finish(); }
      return;
    }

    var command = _buildOnAliveCommand(nodeData, def, hostingCompUUID, pathLayerUUID);

    if (command === null &&
        nodeData.nodeKind !== 'merge' &&
        nodeData.nodeKind !== 'multimerge' &&
        nodeData.nodeKind !== 'blending' &&
        nodeData.nodeKind !== 'effector') {
      if (sentryTransaction) { sentryTransaction.finish(); }
      return;
    }

    graphState.updateNode(nodeId, {
      state:          'alive',
      hostingComps:   _mergeHostingComps(nodeData.hostingComps, hostingCompUUID),
      hasParkedLayer: false
    });

    _propagateUpstream(nodeId, hostingCompUUID, pathLayerUUID, visited);
    if (command !== null) {
      if (nodeData.nodeKind === 'effector' || nodeData.nodeKind === 'blending') {
        setTimeout(function() { _dispatchCommand(nodeId, command); }, 0);
      } else {
        _dispatchCommand(nodeId, command);
      }
    }

    if (command !== null &&
        (nodeData.nodeKind === 'effector' || nodeData.nodeKind === 'blending')) {
      _ensureDownstreamOrder(nodeId, hostingCompUUID, pathLayerUUID);
    }

    if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.flush) dirtyFlusher.flush();

    if (sentryTransaction) { sentryTransaction.finish(); }
  }

  /**
   * Ensures correct effect order for non-terminal (midstream) insertion.
   * When a new effector goes alive between an upstream source and an already-alive
   * downstream effector chain, all downstream effector effects are removed in
   * upstream-to-downstream order, the new effect is added (position 1), then
   * re-added in upstream-to-downstream order (with _moveToBottom) so the stream
   * ordering is preserved without relying on ExtendScript moveToBeginning().
   *
   * @param {string} nodeId - The newly-alive effector node ID
   * @param {string} hostingCompUUID - Hosting comp UUID
   * @param {string} pathLayerUUID - Terminal wire layer UUID
   */
  function _ensureDownstreamOrder(nodeId, hostingCompUUID, pathLayerUUID) {
    var downstreamChain = [];

    function _collect(nId) {
      var wireMap = graphState.getAllWires();
      for (var wireId in wireMap) {
        if (!wireMap.hasOwnProperty(wireId)) continue;
        var wire = wireMap[wireId];
        if (wire.fromNode !== nId || wire.type !== 'layer') continue;
        var downstreamData = graphState.getNode(wire.toNode);
        if (!downstreamData) continue;
        if (downstreamData.nodeKind !== 'effector' && downstreamData.nodeKind !== 'blending') continue;

        var found = false;
        for (var hostIndex = 0; hostIndex < downstreamData.hostingComps.length; hostIndex++) {
          if (downstreamData.hostingComps[hostIndex] === hostingCompUUID) { found = true; break; }
        }
        if (!found) continue;

        var downDef = nodeRegistry.getDefinition(downstreamData.type);
        if (!downDef || !downDef.onGhost || !downDef.onAlive) continue;

        var removeCmd = downDef.onGhost(downstreamData, hostingCompUUID, pathLayerUUID);
        if (removeCmd) evalBridge.dispatch(removeCmd);

        downstreamChain.push({ node: downstreamData, def: downDef });

        _collect(downstreamData.id);
      }
    }

    _collect(nodeId);

    for (var chainIndex = 0; chainIndex < downstreamChain.length; chainIndex++) {
      var chainItem = downstreamChain[chainIndex];
      var applyCmd = chainItem.def.onAlive(chainItem.node, hostingCompUUID, pathLayerUUID);
      if (applyCmd) {
        applyCmd.params._moveToBottom = true;
        evalBridge.dispatch(applyCmd);
      }
    }
  }

  /**
   * Checks whether a matte node has both top_layer and matte_layer wires
   * connected from the same hosting composition, and if so, activates it.
   *
   * @param {string} matteNodeId - ID of the matte node to check
   */
  function _checkMatteActivation(matteNodeId) {
    var matteNodeData = graphState.getNode(matteNodeId);
    if (!matteNodeData) return;

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

    var topLayerUUID   = hlp.findPathLayerUUID(topUpstreamId);
    var matteLayerUUID = hlp.findPathLayerUUID(matteUpstreamId);

    var topUpstreamData   = graphState.getNode(topUpstreamId);
    var matteUpstreamData = graphState.getNode(matteUpstreamId);
    if (!topUpstreamData || !matteUpstreamData) return;

    var sharedCompUUID = null;
    var topComps = topUpstreamData.hostingComps || [];
    var matteComps = matteUpstreamData.hostingComps || [];
    for (var topCompIndex = 0; topCompIndex < topComps.length; topCompIndex++) {
      for (var matteCompIndex = 0; matteCompIndex < matteComps.length; matteCompIndex++) {
        if (topComps[topCompIndex] === matteComps[matteCompIndex]) {
          sharedCompUUID = topComps[topCompIndex];
          break;
        }
      }
      if (sharedCompUUID !== null) break;
    }
    if (sharedCompUUID === null) return;

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

    var def = nodeRegistry.getDefinition(matteNodeData.type);
    if (!def) return;
    var command = def.onAlive(matteNodeData, sharedCompUUID, topLayerUUID, matteLayerUUID);
    if (command) evalBridge.dispatch(command);
  }

  /**
   * Fires path creation when a terminal layer wire is wired to a composition
   * node. Sets _pathLayerUUID on the wire and propagates alive upstream.
   *
   * @param {string} terminalWireId - ID of the terminal wire to fire
   */
  function _firePathCreation(terminalWireId) {
    var sentryTransaction = null;
    if (typeof reporter !== 'undefined' && reporter.captureMessage && typeof Sentry !== 'undefined' && Sentry.startTransaction) {
      sentryTransaction = Sentry.startTransaction({ name: 'firePathCreation', op: 'engine.propagate', tags: { terminalWireId: terminalWireId } });
    }

    var wireMap = graphState.getAllWires();
    var wireData = wireMap[terminalWireId] || null;
    if (!wireData) {
      console.error('[engine] _firePathCreation: wire not found: ' + terminalWireId);
      if (sentryTransaction) { sentryTransaction.finish(); }
      return;
    }

    graphState.updateWire(terminalWireId, { _pathLayerUUID: terminalWireId });

    var hostingCompUUID = wireData.toNode;

    _propagateAlive(wireData.fromNode, hostingCompUUID, terminalWireId);

    if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.flush) {
      dirtyFlusher.flush();
    }

    if (sentryTransaction) { sentryTransaction.finish(); }
  }

  /**
   * Clears all pending path UUIDs. Called on graph reset/load.
   */
  function _clearPendingPathUUIDs() {
    _pendingPathUUIDs = {};
  }

  return {
    propagateAlive:        _propagateAlive,
    checkMatteActivation:  _checkMatteActivation,
    firePathCreation:      _firePathCreation,
    isPathLayerPending:    _isPathLayerPending,
    clearPendingPathUUIDs: _clearPendingPathUUIDs
  };

})();
window.__procedia_internal.registry.register('prop', window.__procedia_internal.prop);
