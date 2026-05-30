// ui/statusBar.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: index.js

var statusBar = (function() {

  var _el = null;

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

  function _countWires() {
    var wireMap = graphState.getAllWires();
    var total = 0;
    for (var id in wireMap) {
      if (wireMap.hasOwnProperty(id)) total++;
    }
    return total;
  }

  function refresh() {
    if (!_el) return;
    var nc = _countNodes();
    var wires = _countWires();
    var zoom = 100;
    if (typeof viewport !== 'undefined' && viewport.getTransform) {
      zoom = Math.round(viewport.getTransform().zoom * 100);
    }
    _el.textContent =
      nc.total + ' nodes · ' + nc.alive + ' alive · ' + nc.ghost + ' ghost · ' +
      wires + ' wires · ' + zoom + '%';
  }

  function init() {
    var bar = document.getElementById('bottom-bar');
    if (!bar) return;
    var notif = bar.querySelector('.bottombar-notif');
    if (!notif) return;
    _el = document.createElement('span');
    _el.className = 'bottombar-notif-text';
    _el.id = 'statusbar-text';
    notif.innerHTML = '';
    var pip = document.createElement('div');
    pip.className = 'bottombar-pip';
    notif.appendChild(pip);
    notif.appendChild(_el);
    refresh();
  }

  return {
    init:    init,
    refresh: refresh
  };

})();
