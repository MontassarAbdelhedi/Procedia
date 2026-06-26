/**
 * Entry point for the Procedia panel.
 * Initializes CSInterface, loads the graph from persistence, and starts all subsystems.
 * Depends on: lib/CSInterface.js, data/uuidGenerator.js, bridge/evalBridge.js,
 *             graph/graphState.js, graph/nodeRegistry.js, graph/engine/index.js,
 *             graph/canvas/viewport.js, ui/inspector/*, ui/nodeList/*, ui/statusBar.js,
 *             ui/topBar.js, ui/sidebarToggle.js,
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
//             ui/topBar.js, ui/sidebarToggle.js,
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

  if (typeof wireValidator === 'undefined') {
    console.error('[Procedia] wireValidator did not load — check Network tab for graph/wireValidator/index.js');
  }
  if (typeof dirtyFlusher === 'undefined') {
    console.error('[Procedia] dirtyFlusher.js did not load — check Network tab for flush/dirtyFlusher.js');
  }
  if (typeof canvasView === 'undefined') {
    console.error('[Procedia] canvasView did not load');
    return;
  }
  if (typeof canvasInput === 'undefined') {
    console.error('[Procedia] canvasInput did not load');
    return;
  }

  canvasView.init();
  canvasInput.init();
  graphState.onSelectionChange(function(sel) {
    renderer.render();
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
    if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    if (typeof topBar !== 'undefined' && topBar.refreshSelection) topBar.refreshSelection(sel);
    if (typeof topBar !== 'undefined' && topBar.refreshCollapseBtn) topBar.refreshCollapseBtn();
    if (typeof nodeToolbar !== 'undefined' && nodeToolbar.refresh) nodeToolbar.refresh();
  });
  if (typeof wireRenderer !== 'undefined' && wireRenderer.init) wireRenderer.init();
  if (typeof wireTool !== 'undefined' && wireTool.init) wireTool.init();
  if (typeof minimap !== 'undefined' && minimap.init) minimap.init();
  if (typeof topBar !== 'undefined' && topBar.init) topBar.init();
  if (typeof topBar !== 'undefined' && topBar.refreshCollapseBtn) topBar.refreshCollapseBtn();
  if (typeof nodeList !== 'undefined' && nodeList.init) nodeList.init();
  if (typeof inspector !== 'undefined' && inspector.init) inspector.init();
  if (typeof notificationBar !== 'undefined' && notificationBar.init) notificationBar.init();
  if (typeof nodeToolbar !== 'undefined' && nodeToolbar.init) nodeToolbar.init();
  if (typeof statusBar !== 'undefined' && statusBar.init) statusBar.init();
  if (typeof sidebarToggle !== 'undefined' && sidebarToggle.init) sidebarToggle.init();
  if (typeof settingsModal !== 'undefined' && settingsModal.init) settingsModal.init();
  if (typeof compList !== 'undefined' && compList.init) compList.init();
  if (typeof tipField !== 'undefined' && tipField.init) tipField.init();
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
          var allNodes = graphState.getAllNodes();
          for (var nid in allNodes) {
            if (!allNodes.hasOwnProperty(nid)) continue;
            var n = allNodes[nid];
            if (!n.dynamicSchema || !n.dynamicSchema.properties) {
              var def = nodeRegistry.getDefinition(n.type);
              if (def && def.params === 'dynamic' && def.matchName && typeof __e_hlp !== 'undefined') {
                __e_hlp.resolveDynamicSchema(nid, def.matchName);
              }
            }
          }
          renderer.render();
          if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);

        }
      }
    }).then(function() {
      if (typeof graphExporter !== 'undefined' && graphExporter.init) graphExporter.init();
      if (typeof poller !== 'undefined' && poller.start) poller.start();
      if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    }).then(function() {
      if (typeof walkthrough !== 'undefined' && walkthrough.init) walkthrough.init();
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
          importBtn.disabled = false;
          importBtn.innerHTML = '<i class="ti ti-file-import"></i>';
          return;
        }
        return graphImport.importProject(res.data).then(function(summary) {

          if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
          if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
          if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
          if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
          importBtn.disabled = false;
          importBtn.innerHTML = '<i class="ti ti-file-import"></i>';
        });
      }).catch(function(err) {
        console.error('[Procedia] Import error:', err);
        importBtn.disabled = false;
        importBtn.innerHTML = '<i class="ti ti-file-import"></i>';
      });
    });
  }

  window.addEventListener('beforeunload', function() {
    if (typeof graphState === 'undefined') return;
    var graphData = { nodes: graphState.getAllNodes(), wires: graphState.getAllWires() };
    if (typeof evalBridge !== 'undefined' && evalBridge.fireAndForget) {
      evalBridge.fireAndForget({ action: 'writeGraph', params: graphData });
    }
    if (typeof poller !== 'undefined' && poller.stop) poller.stop();
  });
}

document.addEventListener('DOMContentLoaded', init);
