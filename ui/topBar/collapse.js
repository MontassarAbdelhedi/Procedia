/**
 * @fileoverview Top bar collapse/expand button logic.
 * Depends on: graphState (global).
 * Exports: _topBarCollapse
 */
// ui/topBar/collapse.js

var _topBarCollapse = (function() {

  function _refreshCollapseBtn(btn) {
    if (!btn || typeof graphState === 'undefined') return;
    var all = graphState.getAllNodes();
    var anyCollapsed = false;
    for (var id in all) {
      if (all.hasOwnProperty(id) && all[id].collapsed) {
        anyCollapsed = true;
        break;
      }
    }
    if (anyCollapsed) {
      btn.title = 'Expand All';
      btn.innerHTML = '<i class="ti ti-chevrons-down"></i>';
    } else {
      btn.title = 'Collapse All';
      btn.innerHTML = '<i class="ti ti-chevrons-up"></i>';
    }
  }

  function refreshCollapseBtn() {
    var btn = document.getElementById('topbar-collapseall');
    if (btn) _refreshCollapseBtn(btn);
  }

  return {
    _refresh: _refreshCollapseBtn,
    refreshBtn: refreshCollapseBtn
  };

})();
