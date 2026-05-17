// polling/poller.js
// DEPENDS ON: graph/graphState/store.js, ae/nodeOps.js (callPollAliveNodes),
//             flush/dirtyFlusher.js, notifications/notificationBar.js
// MUST LOAD BEFORE: index.js

var poller = (function() {

  var ACTIVE_INTERVAL_MS = 1000;
  var IDLE_INTERVAL_MS   = 5000;
  var IDLE_THRESHOLD_MS  = 5000;

  var timer        = null;
  var lastActivity = 0;
  var inflight     = false;

  function onActivity() {
    lastActivity = Date.now();
  }

  function isActive() {
    return (Date.now() - lastActivity) < IDLE_THRESHOLD_MS;
  }

  // ─── collectAliveUUIDs ──────────────────────────────────────────────────────
  // Collects UUIDs for all alive nodes (comps and layers).

  function collectAliveUUIDs() {
    var all   = graphState.getAllNodes();
    var uuids = [];
    for (var id in all) {
      if (!all.hasOwnProperty(id)) continue;
      if (all[id].state === 'alive') uuids.push(id);
    }
    return uuids;
  }

  // ─── handleResults ──────────────────────────────────────────────────────────

  function handleResults(results) {
    if (!results) return;
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var n = graphState.getNode(r.uuid);
      if (!n) continue;

      if (!r.exists) {
        if (n.state !== 'error') {
          graphState.updateNode(r.uuid, { state: 'error' });
          if (typeof notificationBar !== 'undefined') {
            var def = nodeRegistry.getByType(n.type);
            var displayName = n.label || (def && def.label) || n.type;
            notificationBar.show(displayName + ' was deleted outside Procedia.', 'error');
          }
        }
        continue;
      }

      // Sync AE comp properties back to node state (name, size, duration, fps).
      if (r.kind === 'comp' && r.properties) {
        var prev  = n._aeProps || {};
        var props = r.properties;
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
  }

  // ─── tick ───────────────────────────────────────────────────────────────────

  function tick() {
    if (inflight) return;
    if (dirtyFlusher.isWriting) return;

    var uuids = collectAliveUUIDs();
    if (uuids.length === 0) return;

    inflight = true;
    callPollAliveNodes(uuids)
      .then(function(results) {
        inflight = false;
        handleResults(results);
      })
      .catch(function(err) {
        inflight = false;
        console.error('[Procedia] poller tick error:', err && err.message);
      });
  }

  // ─── start / stop ───────────────────────────────────────────────────────────

  function start() {
    if (timer) return;
    lastActivity = Date.now();
    document.addEventListener('mousemove', onActivity);
    document.addEventListener('keydown',   onActivity);

    // Single setInterval at the faster rate; tick() gates on idle state internally.
    timer = setInterval(function() {
      var interval = isActive() ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
      // Use a lightweight timestamp gate instead of nested intervals.
      if (!poller._lastTick || (Date.now() - poller._lastTick) >= interval) {
        poller._lastTick = Date.now();
        tick();
      }
    }, 500);
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    document.removeEventListener('mousemove', onActivity);
    document.removeEventListener('keydown',   onActivity);
  }

  var poller = { start: start, stop: stop, _lastTick: 0 };
  return poller;

}());
