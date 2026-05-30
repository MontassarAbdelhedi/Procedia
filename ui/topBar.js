// ui/topBar.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: index.js

var topBar = (function() {

  function init() {
    var el = document.getElementById('top-bar');
    el.innerHTML =
      '<div class="topbar-left">' +
        '<div class="topbar-logo">' +
          '<div class="topbar-logo-mark"><i class="ti ti-topology-star-3"></i></div>' +
          '<span class="topbar-wordmark">Procedia</span>' +
        '</div>' +
      '</div>' +
      '<div class="topbar-center">' +
        '<button class="topbar-btn" title="Save"><i class="ti ti-device-floppy"></i></button>' +
        '<button class="topbar-btn" title="Undo"><i class="ti ti-arrow-back-up"></i></button>' +
        '<button class="topbar-btn" title="Redo"><i class="ti ti-arrow-forward-up"></i></button>' +
        '<div class="topbar-divider"></div>' +
        '<button class="topbar-btn" title="Fit View"><i class="ti ti-focus-2"></i></button>' +
      '</div>' +
      '<div class="topbar-right">' +
        '<div class="topbar-dynamic" id="topbar-dynamic">' +
          '<span class="topbar-selection-badge">node selected</span>' +
          '<button class="topbar-btn" title="Duplicate"><i class="ti ti-copy"></i></button>' +
          '<button class="topbar-btn" title="Lock"><i class="ti ti-lock"></i></button>' +
          '<button class="topbar-btn topbar-btn--delete" title="Delete"><i class="ti ti-trash"></i></button>' +
        '</div>' +
      '</div>';

    showSelection();
  }

  function showSelection() {
    var el = document.getElementById('topbar-dynamic');
    if (!el) return;
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
  }

  function clearSelection() {
    var el = document.getElementById('topbar-dynamic');
    if (!el) return;
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  }

  return {
    init: init,
    showSelection: showSelection,
    clearSelection: clearSelection
  };

})();
