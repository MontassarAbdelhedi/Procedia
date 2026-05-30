// index.js
// DEPENDS ON: lib/CSInterface.js, data/uuidGenerator.js, bridge/evalBridge.js,
//             graph/graphState.js, graph/nodeRegistry.js, graph/engine.js,
//             graph/canvas/viewport.js,
//             ui/nodeList.js, ui/inspector.js, ui/statusBar.js,
//             ui/topBar.js, ui/bottomBar.js, ui/sidebarToggle.js,
//             graph/schemaCache.js, flush/dirtyFlusher.js
// MUST LOAD BEFORE: nothing (this is the entry point)

var csInterface = new CSInterface();

// Remove or set false before release — seeds the graph so canvas UX can be tested without AE drop wiring.
var SEED_TEST_NODE = true;

function _seedTestNode() {
  if (!SEED_TEST_NODE) return;
  var textDef = nodeRegistry.getDefinition('layers/text');
  var compDef = nodeRegistry.getDefinition('core/comp');
  if (!textDef || !compDef) {
    console.warn('[Procedia] test seed skipped — text or comp not registered');
    return;
  }
  var textNode = engine.dropNode(textDef, 200, 160);
  var compNode = engine.dropNode(compDef, 480, 160);
  if (!textNode || !compNode) return;

  var attempts = 0;
  var maxAttempts = 100;

  function _tryConnect() {
    var compData = graphState.getNode(compNode.id);
    if (!compData) return;

    if (compData.state === 'alive') {
      engine.connectWire(textNode.id, 'output', compNode.id, 'main_input');
      graphState.setSelection(textNode.id);
      renderer.render();
      if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
      console.log('[Procedia] test graph seeded:', textNode.id, '→', compNode.id);
      return;
    }

    if (compData.state === 'error') {
      console.warn('[Procedia] test seed aborted — comp node failed to create in AE');
      return;
    }

    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(_tryConnect, 50);
    } else {
      console.warn('[Procedia] test seed timed out waiting for comp node to become alive');
    }
  }

  _tryConnect();
}

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
  graphState.onSelectionChange(function() {
    renderer.render();
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
    if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
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
      _seedTestNode();
      if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
