/**
 * @fileoverview Top bar graph save/load logic (including fallbacks).
 * Depends on: graphState, _topBarCollapse, renderer, wireRenderer, minimap, statusBar (globals).
 * Exports: _topBarIO
 */
// ui/topBar/io.js

var _topBarIO = (function() {

  function _loadGraphData(data) {
    if (typeof graphState === 'undefined') return;
    if (typeof undoManager !== 'undefined') undoManager.reset();
    graphState.loadGraph(data);
    window.__procedia_internal.refreshUI({ inspector: false });
    if (typeof _topBarCollapse !== 'undefined' && _topBarCollapse.refreshBtn) _topBarCollapse.refreshBtn();
  }

  function _fallbackOpen() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.procedia.json,.json';
    input.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var parsed = JSON.parse(ev.target.result);
          _loadGraphData({ nodes: parsed.nodes || {}, wires: parsed.wires || {} });
        } catch (err) {
          console.warn('[topBar] fallback open parse error:', err);
        }
      };
      reader.readAsText(file);
    });
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  function _fallbackSave(graphData) {
    var jsonStr = JSON.stringify({ version: '1.0', nodes: graphData.nodes, wires: graphData.wires }, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'procedia_graph_' + Date.now() + '.procedia.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
  }

  return {
    loadGraphData: _loadGraphData,
    fallbackOpen: _fallbackOpen,
    fallbackSave: _fallbackSave
  };

})();
