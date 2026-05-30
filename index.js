// index.js
// DEPENDS ON: lib/CSInterface.js, data/uuidGenerator.js, bridge/evalBridge.js,
//             graph/graphState.js, graph/nodeRegistry.js, graph/engine.js,
//             graph/canvas/viewport.js,
//             ui/nodeList.js, ui/inspector.js, ui/statusBar.js,
//             ui/topBar.js, ui/bottomBar.js, ui/sidebarToggle.js,
//             graph/schemaCache.js, flush/dirtyFlusher.js
// MUST LOAD BEFORE: nothing (this is the entry point)

var csInterface = new CSInterface();

function init() {
  evalBridge.init(csInterface);
  var _extPath = (typeof window.__adobe_cep__ !== 'undefined')
    ? csInterface.getSystemPath(SystemPath.EXTENSION)
    : '[browser preview — no CEP context]';
  console.log('[Procedia] Panel loaded. Path: ' + _extPath);
  if (typeof wireValidator === 'undefined') {
    console.error('[Procedia] wireValidator.js did not load — check Network tab for graph/wireValidator.js');
  }
  if (typeof dirtyFlusher === 'undefined') {
    console.error('[Procedia] dirtyFlusher.js did not load — check Network tab for flush/dirtyFlusher.js');
  }

  canvasView.init();
  canvasInput.init();
  graphState.onSelectionChange(function(sel) {
    renderer.render();
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
    if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    if (typeof topBar !== 'undefined' && topBar.refreshSelection) topBar.refreshSelection(sel);
  });
  wireRenderer.init();
  wireTool.init();
  minimap.init();
  topBar.init();
  nodeList.init();
  inspector.init();
  bottomBar.init();
  statusBar.init();
  sidebarToggle.init();
  settingsModal.init();
  evalBridge.onReady(function(ready) {
    if (!ready) {
      console.warn('[Procedia] test seed skipped — evalBridge preamble not loaded');
      return;
    }
    var chain = Promise.resolve();
    if (typeof schemaCache !== 'undefined' && schemaCache.init) {
      chain = schemaCache.init();
    }
    chain.then(function() {
      return evalBridge.dispatch({ action: 'ensureReservedComp' });
    }).then(function() {
      return evalBridge.dispatch({ action: 'readGraph' });
    }).then(function(res) {
      if (res && res.ok && res.data && res.data.nodes) {
        var hasNodes = false;
        for (var k in res.data.nodes) { hasNodes = true; break; }
        if (hasNodes) {
          graphState.loadGraph(res.data);
          renderer.render();
          if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
          console.log('[Procedia] graph restored from persistence');
        }
      }
    }).then(function() {
      if (typeof poller !== 'undefined' && poller.start) poller.start();
      if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    });
  });

  window.addEventListener('beforeunload', function() {
    if (typeof graphState === 'undefined') return;
    var graphData = { nodes: graphState.getAllNodes(), wires: graphState.getAllWires() };
    evalBridge.dispatch({ action: 'writeGraph', params: graphData });
    if (typeof poller !== 'undefined' && poller.stop) poller.stop();
  });
}

document.addEventListener('DOMContentLoaded', init);
