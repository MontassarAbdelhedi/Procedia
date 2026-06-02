/**
 * Polls the host application for node aliveness and marks missing nodes as errored.
 * Switches between active and idle polling intervals based on recent activity.
 * Depends on: bridge/evalBridge.js, graph/graphState.js,
 *             polling/missingNodes.js, polling/notifications.js, polling/externalDeletions.js
 * Exports: poller object with start, stop, markActivity, setWriting
 */
// polling/poller.js
// DEPENDS ON: bridge/evalBridge.js, graph/graphState.js,
//             polling/missingNodes.js, polling/notifications.js, polling/externalDeletions.js
// MUST LOAD BEFORE: index.js

var poller = (function() {

  var ACTIVE_INTERVAL = 1000;
  var IDLE_INTERVAL   = 5000;
  var _timer = null;
  var _active = false;
  var _isWriting = false;
  var _lastActivity = 0;

  function _handleMissingNode(uuid) {
    var nd = graphState.getNode(uuid);
    if (!nd || nd.state !== 'alive') return false;
    graphState.updateNode(uuid, { state: 'error' });
    pollerNotifier.pushMissingNotification(uuid);
    return true;
  }

  function _onNodesMissing(uuids) {
    _lastActivity = Date.now();
    var hasMissing = false;
    for (var i = 0; i < uuids.length; i++) {
      if (_handleMissingNode(uuids[i])) hasMissing = true;
    }
    if (hasMissing) {
      renderer.render();
      if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
      if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
      if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    }
  }

  function _tick() {
    if (_isWriting) return;

    var uuids = pollerHelpers.getAliveWireUUIDs();

    var wirePromise = uuids.length > 0
      ? evalBridge.dispatch({
          action: 'pollAliveNodes',
          params: { uuidListJSON: JSON.stringify(uuids) }
        }).then(function(res) {
          if (!res.ok) {
            console.error('[poller] poll failed:', res.error);
            return;
          }
          if (res.data.missing && res.data.missing.length > 0) {
            var nodeIds = [];
            for (var i = 0; i < res.data.missing.length; i++) {
              var found = pollerHelpers.findNodesByWireUUID(res.data.missing[i]);
              for (var f = 0; f < found.length; f++) {
                if (nodeIds.indexOf(found[f]) === -1) nodeIds.push(found[f]);
              }
            }
            _onNodesMissing(nodeIds);
          }
        })
      : Promise.resolve();

    wirePromise.then(function() {
      pollerExternalDeletions.checkExternalDeletions(_isWriting, _onNodesMissing);
      pollerExternalDeletions.checkEffectDeletions(_isWriting, _onNodesMissing);
    });
  }

  function _schedule() {
    if (_timer) clearTimeout(_timer);
    var elapsed = Date.now() - _lastActivity;
    var interval = (elapsed < 3000) ? ACTIVE_INTERVAL : IDLE_INTERVAL;
    _timer = setTimeout(function() {
      _tick();
      _schedule();
    }, interval);
  }

  function markActivity() {
    _lastActivity = Date.now();
  }

  function start() {
    if (_active) return;
    _active = true;
    _lastActivity = Date.now();
    _schedule();
  }

  function stop() {
    _active = false;
    if (_timer) {
      clearTimeout(_timer);
      _timer = null;
    }
  }

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
