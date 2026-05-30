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

  function _getAliveWireUUIDs() {
    var wires = graphState.getAllWires();
    var uuids = [];
    for (var id in wires) {
      if (!wires.hasOwnProperty(id)) continue;
      if (wires[id]._pathLayerUUID) uuids.push(wires[id]._pathLayerUUID);
    }
    return uuids;
  }

  function _findNodesByWireUUID(wireUUID) {
    var wire = graphState.getWire(wireUUID);
    if (!wire) return [];
    var compNodeData = graphState.getNode(wire.toNode);
    if (!compNodeData) return [];
    var aeCompUUID = (compNodeData.hostingComps && compNodeData.hostingComps[0]) || null;
    if (!aeCompUUID) return [];

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

  function _tick() {
    if (_isWriting) return;

    var uuids = _getAliveWireUUIDs();
    if (uuids.length === 0) return;

    evalBridge.dispatch({
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
          }
        }
        renderer.render();
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
        if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
        if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
      }
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
