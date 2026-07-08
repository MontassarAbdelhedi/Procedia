/**
 * @fileoverview Top bar selection-dependent button visibility.
 * Depends on: (none).
 * Exports: _topBarSelection
 */
// ui/topBar/selection.js

var _topBarSelection = (function() {

  function refreshSelection(sel) {
    var el = document.getElementById('topbar-dynamic');
    if (!el) return;
    if (sel.length === 0) {
      el.style.opacity = '0.4';
      el.style.pointerEvents = 'none';
    } else {
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    }
  }

  function showSelection() {
    var el = document.getElementById('topbar-dynamic');
    if (!el) return;
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
  }

  function clearSelection() {
    refreshSelection([]);
  }

  return {
    refreshSelection: refreshSelection,
    showSelection: showSelection,
    clearSelection: clearSelection
  };

})();
