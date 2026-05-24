// polling/poller.js
// DEPENDS ON: bridge/evalBridge.js, graph/graphState.js, graph/canvas/renderer.js,
//             notifications/notificationBar.js
// MUST LOAD BEFORE: index.js

var poller = (function() {

  var _timer        = null;
  var _running      = false;
  var _lastActivity = Date.now();
  var IDLE_THRESHOLD = 10000;

  function _isIdle() {
    return (Date.now() - _lastActivity) > IDLE_THRESHOLD;
  }

  function notifyActivity() {
    _lastActivity = Date.now();
  }

  function _processPollResults(results) {
    for (var i = 0; i < results.length; i++) {
      var result   = results[i];
      var uuid     = result.uuid;
      var nodeData = graphState.getNode(uuid);

      if (!nodeData) continue;

      if (result.found === false) {
        graphState.updateNode(uuid, { state: 'error' });
        if (typeof notificationBar !== 'undefined' &&
            typeof notificationBar.showError === 'function') {
          notificationBar.showError(uuid, nodeData.props.label || nodeData.type);
        }
        renderer.updateNode(uuid);

      } else if (result.found === true && result.props) {
        var changed = false;
        for (var key in result.props) {
          if (result.props[key] !== nodeData.props[key]) {
            graphState.updateProp(uuid, key, result.props[key]);
            changed = true;
          }
        }
        if (changed) {
          graphState.clearDirty(uuid);
          renderer.updateNode(uuid);
        }
      }
    }
  }

  function _tick() {
    if (!_running) return;

    if (evalBridge.isWriting()) {
      _timer = setTimeout(_tick, 1000);
      return;
    }

    var nodes    = graphState.getAllNodes();
    var wires    = graphState.getAllWires();
    var uuidList = [];
    var id, n, wireId, w, current, nd, sourceNode, foundUp, upWireId, upW, safetyCount;

    // CompNodes: still polled by node UUID (they are AE CompItems, not layers)
    for (id in nodes) {
      n = nodes[id];
      if (n.state === 'alive' && n.nodeKind === 'affected' && n.type === 'core/comp') {
        uuidList.push({ uuid: n.id, nodeKind: n.nodeKind, type: n.type });
      }
    }

    // Path-created layers: one entry per terminal wire — layer identified by wire UUID within a specific comp
    for (wireId in wires) {
      w = wires[wireId];
      if (!w._pathLayerUUID) continue;

      // Walk upstream to find the source affected node for this path
      current = w.fromNode;
      sourceNode = null;
      safetyCount = 0;
      while (current && safetyCount < 100) {
        safetyCount++;
        nd = graphState.getNode(current);
        if (!nd) break;
        if (nd.nodeKind !== 'effector') { sourceNode = nd; break; }
        foundUp = false;
        for (upWireId in wires) {
          upW = wires[upWireId];
          if (upW.toNode === current && upW.type === 'layer') {
            current = upW.fromNode;
            foundUp = true;
            break;
          }
        }
        if (!foundUp) break;
      }

      if (sourceNode && sourceNode.state === 'alive') {
        uuidList.push({
          uuid:      sourceNode.id,
          layerUUID: w._pathLayerUUID,
          compUUID:  w.toNode,
          nodeKind:  sourceNode.nodeKind,
          type:      sourceNode.type
        });
      }
    }

    if (uuidList.length === 0) {
      _timer = setTimeout(_tick, _isIdle() ? 5000 : 1000);
      return;
    }

    evalBridge.dispatch({ action: 'pollAliveNodes', params: { uuidList: uuidList } })
      .then(function(res) {
        if (!res.ok) {
          console.warn('[poller] poll error:', res.error);
          return;
        }
        _processPollResults(res.data);
      })
      .catch(function(e) {
        console.warn('[poller] dispatch error:', e.message);
      })
      .then(function() {
        if (_running) {
          _timer = setTimeout(_tick, _isIdle() ? 5000 : 1000);
        }
      });
  }

  function start() {
    if (_running) return;
    _running = true;
    _timer   = setTimeout(_tick, 1000);
  }

  function stop() {
    _running = false;
    if (_timer) { clearTimeout(_timer); _timer = null; }
  }

  return { start: start, stop: stop, notifyActivity: notifyActivity };

})();
