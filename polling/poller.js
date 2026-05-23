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
    var uuidList = [];
    for (var id in nodes) {
      var n = nodes[id];
      if (n.state === 'alive' && n.nodeKind !== 'effector' && n.nodeKind !== 'data') {
        uuidList.push({ uuid: n.id, nodeKind: n.nodeKind, type: n.type });
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
