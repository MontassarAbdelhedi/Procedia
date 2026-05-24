// index.js
// DEPENDS ON: everything
// MUST LOAD BEFORE: nothing
// Entry point. Full panel-open sequence: read graph → restore → start poller.

(function init() {

  console.log('[Procedia] registered nodes:', nodeRegistry.listTypes());

  // 1. Viewport
  viewport.reset();

  // 2. Canvas and wire interaction
  canvasInput.init();
  wireInteraction.init();
  minimap.init();

  // 3. UI
  nodeList.init();
  drag.init();
  keyboard.init();
  settingsModal.init();

  // 4. Consolidated selection callback
  graphState.onSelectionChange(function(uuid) {
    renderer.render();
    wireRenderer.render();
    inspector.renderInspector(uuid);
    minimap.render();
  });

  // 5. Activity tracking for poller idle detection
  var canvasWrap = document.getElementById('canvas-wrap');
  if (canvasWrap) {
    canvasWrap.addEventListener('mousedown', function() { poller.notifyActivity(); });
  }
  document.addEventListener('keydown', function() { poller.notifyActivity(); });

  // 6. Panel-open graph read sequence
  evalBridge.readGraph()
    .then(function(res) {

      if (!res.ok) {
        console.error('[Procedia] Graph read error:', res.error);
        notificationBar.showMessage(
          'Could not read saved graph. Starting fresh. (' + res.error + ')'
        );
        _finishInit(false);
        return;
      }

      if (res.data.fresh) {
        console.log('[Procedia] No saved graph found. Starting fresh.');
        _finishInit(false);
        return;
      }

      graphState.loadGraph({ version: '4.0', nodes: res.data.nodes, wires: res.data.wires });
      console.log('[Procedia] Graph loaded.',
        Object.keys(res.data.nodes).length, 'nodes,',
        Object.keys(res.data.wires).length, 'wires.');

      _finishInit(true);
    })
    .catch(function(e) {
      // evalBridge not available (browser context) — start fresh silently
      console.log('[Procedia] Running outside AE. Starting fresh.');
      _finishInit(false);
    });

  // 7. AE lifecycle events — save/quit/unload triggers persistence write
  if (typeof CSInterface !== 'undefined') {
    var cs = new CSInterface();
    cs.addEventListener('documentAfterSave', _onAESave);
    cs.addEventListener('applicationBeforeQuit', _onAEQuit);
    window.addEventListener('beforeunload', _onPanelUnload);
  }

  console.log('[Procedia] Panel initialized.');

})();

function _finishInit(graphWasLoaded) {
  notificationBar.dismissAll();
  renderer.render();
  wireRenderer.render();
  minimap.render();
  poller.start();
  console.log('[Procedia] Init complete. Poller started.');
}

function _writeGraphNow() {
  graphState.rebuildTempGraph();
  evalBridge.writeGraph({
    version: '4.0',
    nodes:   graphState.getTempGraph().nodes,
    wires:   graphState.getTempGraph().wires
  })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] writeGraph error:', res.error);
      else console.log('[Procedia] Graph saved.');
    })
    .catch(function(e) { console.warn('[Procedia] writeGraph failed:', e.message); });
}

function _onAESave()      { _writeGraphNow(); }
function _onAEQuit()      { _writeGraphNow(); }
function _onPanelUnload() { _writeGraphNow(); }
