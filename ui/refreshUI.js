/**
 * Unified UI refresh utility. Replaces inline sequences of
 * renderer.render(), wireRenderer.render(null), minimap.render(),
 * inspector.refresh(), statusBar.refresh() spread across the codebase.
 *
 * @module ui/refreshUI
 * @dependencies graph/graphState, graph/canvas/renderer/index.js,
 *               graph/wire/wireRenderer/render.js, etc.
 * @exports window.__procedia_internal.refreshUI
 */
// ui/refreshUI.js
// DEPENDS ON: graph/graphState, graph/canvas/renderer/index.js,
//             graph/wire/wireRenderer/render.js, ui/minimap/index.js,
//             ui/inspector/viewModel.js, ui/statusBar.js
// MUST LOAD BEFORE: graph/engine/helpers.js, graph/engine/state.js,
//                   graph/undoManager/restore.js, the rest of the UI

(function() {

  var _NOOP = {};

  function _safe(name, arg) {
    var parts = name.split('.');
    var obj = window;
    for (var i = 0; i < parts.length; i++) {
      if (!obj || typeof obj !== 'object') return;
      obj = obj[parts[i]];
      if (!obj) return;
    }
    if (typeof obj === 'function') obj(arg);
  }

  window.__procedia_internal.refreshUI = function refreshUI(opts) {
    opts = opts || {};
    if (opts.renderer !== false)  _safe('renderer.render');
    if (opts.wireRenderer !== false) _safe('wireRenderer.render', null);
    if (opts.minimap !== false)   _safe('minimap.render');
    if (opts.inspector !== false) _safe('inspector.refresh');
    if (opts.statusBar !== false) _safe('statusBar.refresh');
  };

})();
