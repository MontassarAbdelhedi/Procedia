/**
 * @fileoverview Status bar UI module. Shows live counts of nodes (alive/ghost),
 * wires, zoom level, and selection size in the top bar.
 * Depends on: graphState, viewport (globals).
 * Exports: statusBar.init, statusBar.refresh
 */
// ui/statusBar.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: index.js

var statusBar = (function() {

  var _el = null;

  /**
   * Counts total, alive, and ghost nodes from graphState.
   * @return {Object} { total, alive, ghost }
   */
  function _countNodes() {
    var nodeMap = graphState.getAllNodes();
    var total = 0;
    var alive = 0;
    var ghost = 0;
    for (var id in nodeMap) {
      if (!nodeMap.hasOwnProperty(id)) continue;
      total++;
      var n = nodeMap[id];
      if (n.state === 'alive') alive++;
      else if (n.state === 'ghost') ghost++;
    }
    return { total: total, alive: alive, ghost: ghost };
  }

  /**
   * Counts total wires from graphState.
   * @return {number} The wire count.
   */
  function _countWires() {
    var wireMap = graphState.getAllWires();
    var total = 0;
    for (var id in wireMap) {
      if (wireMap.hasOwnProperty(id)) total++;
    }
    return total;
  }

  /**
   * Recalculates and updates the status bar text with current graph metrics.
   */
  function refresh() {
    if (!_el) return;
    var nc = _countNodes();
    var wires = _countWires();
    var zoom = 100;
    if (typeof viewport !== 'undefined' && viewport.getTransform) {
      var _t = viewport.getTransform();
      if (_t) zoom = Math.round(_t.zoom * 100);
    }
    var selCount = 0;
    if (typeof graphState !== 'undefined' && typeof graphState.getSelectionCount === 'function') {
      selCount = graphState.getSelectionCount();
    }
    var selPart = selCount > 0 ? selCount + ' selected · ' : '';
    _el.textContent =
      selPart + nc.total + ' nodes · ' + nc.alive + ' alive · ' + nc.ghost + ' ghost · ' +
      wires + ' wires · ' + zoom + '%';
  }

  /**
   * Initializes the status bar by finding or creating the display element, then refreshes.
   */
  function init() {
    _el = document.getElementById('topbar-status');
    if (!_el) {
      var bar = document.getElementById('top-bar');
      if (!bar) return;
      _el = document.createElement('span');
      _el.className = 'topbar-status';
      _el.id = 'topbar-status';
      bar.appendChild(_el);
    }
    refresh();
  }

  return {
    init:    init,
    refresh: refresh
  };

})();
