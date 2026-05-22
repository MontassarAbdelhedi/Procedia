// flush/dirtyFlusher.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, bridge/evalBridge.js
// MUST LOAD BEFORE: index.js

var dirtyFlusher = (function() {

  var _timer = null;
  var DEBOUNCE_MS = 300;

  function flush() {
    var nodes = graphState.getAllNodes();
    var batch = [];
    var flushedIds = [];
    var nodeId, nodeData, def, hostingCompUUID, key, cmd;

    for (nodeId in nodes) {
      nodeData = nodes[nodeId];
      if (!nodeData.dirty) continue;
      if (nodeData.state !== 'alive') continue;
      if (!nodeData.hostingComps || nodeData.hostingComps.length === 0) continue;

      def = nodeRegistry.getDefinition(nodeData.type);
      if (!def) continue;

      hostingCompUUID = nodeData.hostingComps[0];

      for (key in nodeData.props) {
        cmd = def.onPropertyChange(key, nodeData.props[key], nodeData, hostingCompUUID);
        if (cmd !== null) batch.push(cmd);
      }

      flushedIds.push(nodeId);
    }

    if (batch.length > 0) {
      (function(capturedIds) {
        evalBridge.dispatchBatch(batch).then(function() {
          for (var i = 0; i < capturedIds.length; i++) {
            graphState.clearDirty(capturedIds[i]);
          }
        }).catch(function(err) {
          console.error('[dirtyFlusher] dispatchBatch error:', err);
        });
      }(flushedIds));
    }
  }

  function schedule() {
    if (_timer !== null) {
      clearTimeout(_timer);
      _timer = null;
    }
    _timer = setTimeout(flush, DEBOUNCE_MS);
  }

  function cancel() {
    if (_timer !== null) {
      clearTimeout(_timer);
      _timer = null;
    }
  }

  return {
    schedule: schedule,
    flush:    flush,
    cancel:   cancel
  };

})();
