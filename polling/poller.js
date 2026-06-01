/**
 * Polls the host application for node aliveness and marks missing nodes as errored.
 * Switches between active and idle polling intervals based on recent activity.
 * Depends on: bridge/evalBridge.js, graph/graphState.js
 * Exports: poller object with start, stop, markActivity, setWriting
 */
// polling/poller.js
// DEPENDS ON: bridge/evalBridge.js, graph/graphState.js
// MUST LOAD BEFORE: index.js

var poller = (function() {

  var ACTIVE_INTERVAL = 1000;
  var IDLE_INTERVAL   = 5000;
  var _timer = null;
  var _active = false;
  var _isWriting = false;
  var _lastActivity = 0;
  var _notifiedMissing = {};

  /**
   * Collects all wire UUIDs that have a _pathLayerUUID set.
   * @returns {string[]}
   */
  function _getAliveWireUUIDs() {
    var wires = graphState.getAllWires();
    var uuids = [];
    for (var id in wires) {
      if (!wires.hasOwnProperty(id)) continue;
      if (wires[id]._pathLayerUUID) uuids.push(wires[id]._pathLayerUUID);
    }
    return uuids;
  }

  /**
   * Finds alive node UUIDs affected by a missing wire path layer.
   * For nodes inside a comp (blending/matte/etc), scans for all nodes sharing
   * the same hosting comp. For layer nodes wired directly to a comp, returns
   * the wire's fromNode (the node whose AE layer is missing).
   * @param {string} wireUUID - The wire UUID to search from
   * @returns {string[]}
   */
  function _findNodesByWireUUID(wireUUID) {
    var wire = graphState.getWire(wireUUID);
    if (!wire) return [];
    var compNodeData = graphState.getNode(wire.toNode);
    if (!compNodeData) return [];

    if (compNodeData.hostingComps && compNodeData.hostingComps[0]) {
      var aeCompUUID = compNodeData.hostingComps[0];
      var nodes = graphState.getAllNodes();
      var result = [];
      for (var id in nodes) {
        if (!nodes.hasOwnProperty(id)) continue;
        if (nodes[id].state !== 'alive') continue;
        for (var hc = 0; hc < (nodes[id].hostingComps || []).length; hc++) {
          if (nodes[id].hostingComps[hc] === aeCompUUID) {
            result.push(id);
            break;
          }
        }
      }
      return result;
    }

    // Comp node with no hostingComps — the fromNode is the layer node affected
    if (compNodeData.type === 'core/comp' && wire.fromNode) {
      return [wire.fromNode];
    }

    return [];
  }

  /**
   * Pushes a notification for a missing/deleted node and marks it notified.
   * @param {string} uuid - Node UUID that is missing
   */
  function _pushMissingNotification(uuid) {
    if (_notifiedMissing[uuid]) return;
    _notifiedMissing[uuid] = true;

    var nd = graphState.getNode(uuid);
    if (!nd) return;

    var label = (nd.props && nd.props.label) || (nd.id ? nd.id.slice(0, 8) : 'unknown');
    notificationBar.push({
      message: label + ' is deleted outside Procedia',
      severity: 'error',
      cta: {
        label: 'Recreate',
        action: function(nId) {
          return function() {
            delete _notifiedMissing[nId];
            if (typeof engine !== 'undefined' && engine.recreateNode) engine.recreateNode(nId);
          };
        }(uuid)
      },
      secondary: {
        label: 'Remove node',
        action: function(nId) {
          return function() {
            delete _notifiedMissing[nId];
            if (typeof engine !== 'undefined' && engine.deleteNode) engine.deleteNode(nId);
            if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
            if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
          };
        }(uuid)
      }
    });
  }

  /**
   * Checks for effects deleted directly in AE (outside Procedia).
   * Checks each alive effector node to see if its effect still exists on the host layer.
   */
  function _checkEffectDeletions() {
    if (_isWriting) return;

    var allNodes = graphState.getAllNodes();
    var entries = [];

    for (var id in allNodes) {
      if (!allNodes.hasOwnProperty(id)) continue;
      var nd = allNodes[id];
      if (nd.state !== 'alive') continue;
      if (nd.nodeKind !== 'effector') continue;
      if (!nd.hostingComps || nd.hostingComps.length === 0) continue;

      var def = nodeRegistry.getDefinition(nd.type);
      if (!def || !def.matchName) continue;

      var hostingCompUUID = nd.hostingComps[0];

      // Find the downstream wire's _pathLayerUUID — this identifies the host layer
      var wires = graphState.getAllWires();
      var layerNodeUUID = null;
      for (var wId in wires) {
        if (!wires.hasOwnProperty(wId)) continue;
        var w = wires[wId];
        if (w.fromNode === id && w.type === 'layer' && w._pathLayerUUID) {
          layerNodeUUID = w._pathLayerUUID;
          break;
        }
      }
      if (!layerNodeUUID) continue;

      entries.push({
        nodeUUID:        id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   layerNodeUUID,
        matchName:       def.matchName
      });
    }

    if (entries.length === 0) return;

    evalBridge.dispatch({
      action: 'pollAliveEffects',
      params: { entries: entries }
    }).then(function(res) {
      if (!res.ok) {
        console.error('[poller] pollAliveEffects failed:', res.error);
        return;
      }

      var missing = res.data.missingEffectNodeUUIDs || [];
      if (missing.length === 0) return;

      _lastActivity = Date.now();

      for (var i = 0; i < missing.length; i++) {
        var uuid = missing[i];
        var nd = graphState.getNode(uuid);
        if (!nd || nd.state !== 'alive') continue;
        graphState.updateNode(uuid, { state: 'error' });
        _pushMissingNotification(uuid);
      }

      renderer.render();
      if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
      if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
      if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    });
  }

  /**
   * Checks for comps deleted directly in AE (outside Procedia).
   * Layer nodes are handled by pollAliveNodes in _tick().
   */
  function _checkExternalDeletions() {
    if (_isWriting) return;

    var allNodes = graphState.getAllNodes();
    var compUUIDs = [];

    for (var id in allNodes) {
      if (!allNodes.hasOwnProperty(id)) continue;
      var nd = allNodes[id];
      if (nd.state !== 'alive') continue;
      if (nd.type === 'core/comp') {
        compUUIDs.push(id);
      }
    }

    if (compUUIDs.length === 0) return;

    evalBridge.dispatch({
      action: 'pollExternalDeletions',
      params: { compNodeUUIDs: compUUIDs }
    }).then(function(res) {
      if (!res.ok) {
        console.error('[poller] pollExternalDeletions failed:', res.error);
        return;
      }

      var missing = res.data.missingCompNodeUUIDs || [];
      if (missing.length === 0) return;

      _lastActivity = Date.now();

      for (var i = 0; i < missing.length; i++) {
        var uuid = missing[i];
        var nd = graphState.getNode(uuid);
        if (!nd || nd.state !== 'alive') continue;
        graphState.updateNode(uuid, { state: 'error' });
        _pushMissingNotification(uuid);
      }

      renderer.render();
      if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
      if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
      if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    });
  }

  /**
   * Performs a single poll cycle: requests alive wire UUIDs from the host and
   * marks any missing nodes as errored. Also checks for external deletions.
   */
  function _tick() {
    if (_isWriting) return;

    var uuids = _getAliveWireUUIDs();

    var wirePromise = uuids.length > 0
      ? evalBridge.dispatch({
          action: 'pollAliveNodes',
          params: { uuidListJSON: JSON.stringify(uuids) }
        }).then(function(res) {
          if (!res.ok) {
            console.error('[poller] poll failed:', res.error);
            return;
          }
          var now = Date.now();
          if (res.data.missing && res.data.missing.length > 0) {
            _lastActivity = now;
            var nodeIds = [];
            for (var i = 0; i < res.data.missing.length; i++) {
              var found = _findNodesByWireUUID(res.data.missing[i]);
              for (var f = 0; f < found.length; f++) {
                if (nodeIds.indexOf(found[f]) === -1) nodeIds.push(found[f]);
              }
            }
            for (var j = 0; j < nodeIds.length; j++) {
              var nodeData = graphState.getNode(nodeIds[j]);
              if (nodeData && nodeData.state === 'alive') {
                graphState.updateNode(nodeIds[j], { state: 'error' });
                _pushMissingNotification(nodeIds[j]);
              }
            }
            renderer.render();
            if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
            if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
            if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
          }
        })
      : Promise.resolve();

    wirePromise.then(function() {
      _checkExternalDeletions();
      _checkEffectDeletions();
    });
  }

  /**
   * Schedules the next poll tick, choosing an active or idle interval
   * based on elapsed time since the last activity.
   */
  function _schedule() {
    if (_timer) clearTimeout(_timer);
    var elapsed = Date.now() - _lastActivity;
    var interval = (elapsed < 3000) ? ACTIVE_INTERVAL : IDLE_INTERVAL;
    _timer = setTimeout(function() {
      _tick();
      _schedule();
    }, interval);
  }

  /**
   * Records the current time as the latest activity, which keeps the poller in active mode.
   */
  function markActivity() {
    _lastActivity = Date.now();
  }

  /**
   * Starts the polling loop if it is not already active.
   */
  function start() {
    if (_active) return;
    _active = true;
    _lastActivity = Date.now();
    _schedule();
  }

  /**
   * Stops the polling loop and clears the timer.
   */
  function stop() {
    _active = false;
    if (_timer) {
      clearTimeout(_timer);
      _timer = null;
    }
  }

  /**
   * Sets the writing flag to prevent polling while a write operation is in progress.
   * @param {boolean} flag
   */
  function setWriting(flag) {
    _isWriting = !!flag;
  }

  return {
    start:        start,
    stop:         stop,
    markActivity: markActivity,
    setWriting:   setWriting
  };

})();
