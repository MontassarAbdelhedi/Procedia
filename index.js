/**
 * Entry point for the Procedia panel.
 * Initializes CSInterface, loads the graph from persistence, and starts all subsystems.
 * Depends on: lib/CSInterface.js, data/uuidGenerator.js, bridge/evalBridge.js,
 *             graph/graphState.js, graph/nodeRegistry.js, graph/engine/index.js,
 *             graph/canvas/viewport.js, ui/inspector/*, ui/nodeList/*, ui/statusBar.js,
 *             ui/topBar.js, ui/bottomBar.js, ui/sidebarToggle.js,
 *             graph/schemaCache/state.js, graph/schemaCache/persistence.js,
 *             graph/schemaCache/diff.js, graph/schemaCache/index.js,
 *             flush/dirtyFlusher.js
 * Exports: (none — side-effect module)
 */
// index.js
// DEPENDS ON: lib/CSInterface.js, data/uuidGenerator.js, bridge/evalBridge.js,
//             graph/graphState.js, graph/nodeRegistry.js, graph/engine/index.js,
//             graph/canvas/viewport.js,
//             ui/inspector/viewModel.js, ui/inspector/render.js, ui/inspector/events.js, ui/inspector/index.js,
//             ui/nodeList/categories.js, ui/nodeList/render.js, ui/nodeList/search.js,
//             ui/nodeList/dragdrop.js, ui/nodeList/index.js, ui/statusBar.js,
//             ui/topBar.js, ui/bottomBar.js, ui/sidebarToggle.js,
//             graph/schemaCache/state.js, graph/schemaCache/persistence.js,
//             graph/schemaCache/diff.js, graph/schemaCache/index.js,
//             flush/dirtyFlusher.js
// MUST LOAD BEFORE: nothing (this is the entry point)

var csInterface = new CSInterface();

/**
 * Initializes all panel subsystems after DOM content is loaded.
 * Sets up evalBridge, canvas, wire tools, minimap, UI components, and
 * restores the persisted graph from the host application.
 */
function init() {
  evalBridge.init(csInterface);
  var _extPath = (typeof window.__adobe_cep__ !== 'undefined')
    ? csInterface.getSystemPath(SystemPath.EXTENSION)
    : '[browser preview — no CEP context]';
  console.log('[Procedia] Panel loaded. Path: ' + _extPath);
  if (typeof wireValidator === 'undefined') {
    console.error('[Procedia] wireValidator did not load — check Network tab for graph/wireValidator/index.js');
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
    if (typeof nodeToolbar !== 'undefined' && nodeToolbar.refresh) nodeToolbar.refresh();
  });
  wireRenderer.init();
  wireTool.init();
  minimap.init();
  topBar.init();
  nodeList.init();
  inspector.init();
  bottomBar.init();
  notificationBar.init();
  if (typeof nodeToolbar !== 'undefined' && nodeToolbar.init) nodeToolbar.init();
  if (typeof graphExporter !== 'undefined' && graphExporter.init) graphExporter.init();
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

  var importBtn = document.getElementById('topbar-import');
  if (importBtn) {
    importBtn.addEventListener('click', function() {
      if (typeof evalBridge === 'undefined' || typeof graphImport === 'undefined') return;
      var existingNodes = (typeof graphState !== 'undefined') ? graphState.getAllNodes() : {};
      var hasExisting = false;
      for (var _k in existingNodes) { hasExisting = true; break; }
      if (hasExisting && !confirm('Merge imported project into the current graph? Imported nodes will be added alongside existing ones.')) {
        return;
      }
      importBtn.disabled = true;
      importBtn.innerHTML = '<i class="ti ti-loader"></i>';
      evalBridge.dispatch({ action: 'importProject' }).then(function(res) {
        if (!res.ok) {
          console.error('[Procedia] Import failed: ' + (res.error || 'unknown error'));
          if (typeof bottomBar !== 'undefined' && bottomBar.notify) bottomBar.notify('Import failed: ' + (res.error || 'unknown error'));
          importBtn.disabled = false;
          importBtn.innerHTML = '<i class="ti ti-file-import"></i>';
          return;
        }
        return graphImport.importProject(res.data).then(function(summary) {
          console.log('[Procedia] Import complete:', summary);
          if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
          if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
          if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
          if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
          if (typeof bottomBar !== 'undefined' && bottomBar.notify) {
            var msg = 'Imported: ' + summary.comps + ' comps, ' + summary.layers + ' layers, ' + summary.effects + ' effects';
            if (summary.footage > 0) msg += ', ' + summary.footage + ' footage';
            if (summary.unknowns > 0) msg += ', ' + summary.unknowns + ' unknown effects';
            if (summary.errors && summary.errors.length > 0) msg += ', ' + summary.errors.length + ' warnings';
            bottomBar.notify(msg);
          }
          importBtn.disabled = false;
          importBtn.innerHTML = '<i class="ti ti-file-import"></i>';
        });
      }).catch(function(err) {
        console.error('[Procedia] Import error:', err);
        if (typeof bottomBar !== 'undefined' && bottomBar.notify) bottomBar.notify('Import error: ' + err.message);
        importBtn.disabled = false;
        importBtn.innerHTML = '<i class="ti ti-file-import"></i>';
      });
    });
  }

  window.addEventListener('beforeunload', function() {
    if (typeof graphState === 'undefined') return;
    var graphData = { nodes: graphState.getAllNodes(), wires: graphState.getAllWires() };
    evalBridge.dispatch({ action: 'writeGraph', params: graphData });
    if (typeof poller !== 'undefined' && poller.stop) poller.stop();
  });
}

document.addEventListener('DOMContentLoaded', init);
