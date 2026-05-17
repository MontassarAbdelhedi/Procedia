// ui/devTools.js
// Dev-only utilities — reset graph and AE project

var devTools = (function() {

  function resetGraph() {
    var confirmed = window.confirm(
      'Reset graph & AE project? This will:\n' +
      '• Delete all nodes from graph\n' +
      '• Delete all AE items (except RESERVED)\n' +
      '• Clear all wires\n\n' +
      'Continue?'
    );
    if (!confirmed) return;

    // Collect all node UUIDs before deletion changes the map
    var uuids = [];
    for (var uid in graphState.nodeMap) {
      if (graphState.nodeMap.hasOwnProperty(uid)) {
        uuids.push(uid);
      }
    }

    // Delete each node — onDelete handles AE cleanup
    for (var i = 0; i < uuids.length; i++) {
      graphState.onDelete(uuids[i]);
    }

    // Redraw
    if (typeof canvas !== 'undefined' && canvas.requestRedraw) {
      canvas.requestRedraw();
    }

    console.log('[devTools] Graph reset — ' + uuids.length + ' nodes deleted');
  }

  return {
    resetGraph: resetGraph
  };

})();
