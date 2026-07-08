/**
 * @fileoverview Top bar UI module. Renders the toolbar with logo, save/undo/redo,
 * duplicate/delete, reset/reload/settings buttons. Updates selection-dependent controls.
 * Depends on: engine, settingsModal (global from ui/settingsModal/), sub-modules under ui/topBar/.
 * Exports: topBar.init, topBar.refreshSelection, topBar.showSelection, topBar.clearSelection
 */
// ui/topBar/index.js
// DEPENDS ON: ui/topBar/collapse.js, ui/topBar/selection.js, ui/topBar/io.js, ui/topBar/init.js
// MUST LOAD BEFORE: index.js

var topBar = (function() {

  return {
    init: typeof _topBarInit !== 'undefined' ? _topBarInit.init : undefined,
    refreshSelection: typeof _topBarSelection !== 'undefined' ? _topBarSelection.refreshSelection : undefined,
    showSelection: typeof _topBarSelection !== 'undefined' ? _topBarSelection.showSelection : undefined,
    clearSelection: typeof _topBarSelection !== 'undefined' ? _topBarSelection.clearSelection : undefined,
    refreshCollapseBtn: typeof _topBarCollapse !== 'undefined' ? _topBarCollapse.refreshBtn : undefined
  };

})();
