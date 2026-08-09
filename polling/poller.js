/**
 * Polls the host application for node aliveness and marks missing nodes as errored.
 * Switches between active and idle polling intervals based on recent activity.
 * Depends on: bridge/evalBridge.js, graph/graphState.js,
 *             polling/missingNodes.js, polling/notifications.js, polling/externalDeletions.js,
 *             polling/missingNodeHandler.js
 * Exports: poller object with start, stop, markActivity, withWriteLock
 */
// polling/poller.js
// DEPENDS ON: bridge/evalBridge.js, graph/graphState.js,
//             polling/missingNodes.js, polling/notifications.js, polling/externalDeletions.js,
//             polling/missingNodeHandler.js
// MUST LOAD BEFORE: index.js

var poller = (function() {

  var ACTIVE_INTERVAL = 500;
  var IDLE_INTERVAL   = 2000;
  var _timer = null;
  var _active = false;
  var _writeLockCount = 0;
  var _lastActivity = 0;

  function _onNodesMissing(uuids) {
    _lastActivity = Date.now();
    if (typeof undoManager !== 'undefined' && undoManager.capture) undoManager.capture();
    var hasMissing = false;
    for (var i = 0; i < uuids.length; i++) {
      if (pollerMissingHandler.handleMissingNode(uuids[i])) hasMissing = true;
    }
    if (typeof undoManager !== 'undefined' && undoManager.commit) undoManager.commit('Sync from AE');
    if (hasMissing) {
      window.__procedia_internal.refreshUI({ minimap: false });
    }
  }

  function _tick() {
    if (_writeLockCount > 0) return;

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
              for (var foundIndex = 0; foundIndex < found.length; foundIndex++) {
                if (nodeIds.indexOf(found[foundIndex]) === -1) nodeIds.push(found[foundIndex]);
              }
            }
            _onNodesMissing(nodeIds);
          }
        })
      : Promise.resolve();

    wirePromise.then(function() {
      pollerExternalDeletions.checkExternalDeletions(_writeLockCount > 0, _onNodesMissing);
      pollerExternalDeletions.checkEffectDeletions(_writeLockCount > 0, _onNodesMissing);
      if (typeof propertyPoller !== 'undefined' && propertyPoller.poll) propertyPoller.poll();
      if (typeof propertyPoller !== 'undefined' && propertyPoller.pollEffects) propertyPoller.pollEffects();
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

  function withWriteLock(fn) {
    _writeLockCount++;
    return Promise.resolve().then(function() {
      return fn();
    }).then(function(result) {
      _writeLockCount--;
      return result;
    }, function(err) {
      _writeLockCount--;
      throw err;
    });
  }

  return {
    start:        start,
    stop:         stop,
    markActivity: markActivity,
    withWriteLock: withWriteLock
  };

})();
