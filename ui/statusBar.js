// ui/statusBar.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: index.js

var statusBar = (function() {

  function _set(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function update() {
    var nodes     = graphState.getAllNodes();
    var wires     = graphState.getAllWires();
    var nodeCount = 0;
    var aliveCount = 0;
    var ghostCount = 0;

    for (var id in nodes) {
      nodeCount++;
      var s = nodes[id].state;
      if (s === 'alive') aliveCount++;
      else if (s === 'ghost') ghostCount++;
    }

    var wireCount = 0;
    for (var wid in wires) wireCount++;

    var zoom = Math.round(viewport.getTransform().zoom * 100);

    _set('stat-nodes', nodeCount);
    _set('stat-wires', wireCount);
    _set('stat-alive', aliveCount);
    _set('stat-ghost', ghostCount);
    _set('stat-zoom',  zoom + '%');
  }

  return { update: update };

})();
