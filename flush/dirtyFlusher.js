/**
 * Flushes dirty node property changes to the host application.
 * Debounces flushes and delegates single-node flushing to flushNodeImpl.
 * Dependencies: graph/graphState.js, graph/nodeRegistry.js, flush/flushNode.js
 * Exports: dirtyFlusher object with schedule, flush, cancel
 */
// flush/dirtyFlusher.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, flush/flushNode.js
// MUST LOAD BEFORE: index.js

var dirtyFlusher = (function() {

  var _timer = null;
  var DEBOUNCE_MS = 300;

  /**
   * Immediately flushes all dirty nodes in the graph.
   * Iterates over every node and dispatches property changes for those marked dirty.
   */
  function flush() {
    var nodeMap = graphState.getAllNodes();
    var chain = Promise.resolve();
    for (var nodeId in nodeMap) {
      if (!nodeMap.hasOwnProperty(nodeId)) continue;
      var nodeData = nodeMap[nodeId];
      if (!nodeData || nodeData.dirty !== true) continue;
      if (nodeData.state !== 'alive' && nodeData.state !== 'error') continue;
      if (!nodeData.hostingComps || nodeData.hostingComps.length === 0) {
        if (nodeData.type !== 'core/comp') continue;
      }

      var def = nodeRegistry.getDefinition(nodeData.type);
      (function(id, data, definition) {
        chain = chain.then(function() {
          return flushNodeImpl.flushNode(id, data, definition);
        });
      })(nodeId, nodeData, def);
    }
  }

  /**
   * Schedules a debounced flush. Cancels any previously scheduled flush.
   */
  function schedule() {
    cancel();
    _timer = setTimeout(flush, DEBOUNCE_MS);
  }

  /**
   * Cancels any pending scheduled flush.
   */
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

if (typeof window !== 'undefined') {
  window.dirtyFlusher = dirtyFlusher;
}
