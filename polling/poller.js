// polling/poller.js
// DEPENDS ON: graph/graphState.js, bridge/evalBridge.js, notifications/notificationBar.js
// MUST LOAD BEFORE: index.js

var poller = (function() {

  var ACTIVE_INTERVAL = 500;
  var IDLE_INTERVAL   = 5000;
  var IDLE_THRESHOLD  = 5000;

  var timer        = null;
  var lastActivity = 0;
  var nextPollAt   = 0;
  var inflight     = false; // skip tick if previous evalScript hasn't returned yet

  function onActivity() {
    lastActivity = Date.now();
  }

  function getInterval() {
    return (Date.now() - lastActivity < IDLE_THRESHOLD) ? ACTIVE_INTERVAL : IDLE_INTERVAL;
  }

  function collectCompUUIDs() {
    var all   = graphState.getAllNodes();
    var uuids = [];
    for (var id in all) {
      if (!all.hasOwnProperty(id)) continue;
      var n = all[id];
      if (n.type === 'core/comp' && n.state === 'alive') uuids.push(id);
    }
    return uuids;
  }

  function handleResults(results) {
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var n = graphState.getNode(r.uuid);
      if (!n) continue;

      if (r.missing) {
        graphState.updateNode(r.uuid, { state: 'error' });
        notificationBar.show(
          r.uuid,
          (n.label || r.uuid) + ' — AE object not found. Recreate or delete the node.'
        );
        continue;
      }

      var prev    = n._aeProps || {};
      var props   = r.properties;
      var changed = (
        prev.name      !== props.name      ||
        prev.width     !== props.width     ||
        prev.height    !== props.height    ||
        prev.duration  !== props.duration  ||
        prev.frameRate !== props.frameRate
      );

      if (changed) {
        graphState.updateNode(r.uuid, { _aeProps: props });
      }
    }
  }

  function tick() {
    if (inflight) return;
    if (Date.now() < nextPollAt) return;

    var uuids = collectCompUUIDs();
    nextPollAt = Date.now() + getInterval();
    if (uuids.length === 0) return;

    inflight = true;
    evalBridge.evalScript(
      'pollAliveNodes(' + JSON.stringify(JSON.stringify(uuids)) + ')'
    ).then(function(res) {
      inflight = false;
      if (res.ok) {
        handleResults(res.data);
      } else {
        console.error('[Procedia] pollAliveNodes failed:', res.error);
      }
    }).catch(function(err) {
      inflight = false;
      console.error('[Procedia] poller error:', err.message);
    });
  }

  function start() {
    if (timer) return;
    lastActivity = Date.now();
    nextPollAt   = Date.now() + ACTIVE_INTERVAL;
    document.addEventListener('mousemove', onActivity);
    document.addEventListener('keydown',   onActivity);
    timer = setInterval(tick, 500);
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    document.removeEventListener('mousemove', onActivity);
    document.removeEventListener('keydown',   onActivity);
  }

  return { start: start, stop: stop };

}());
