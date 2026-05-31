/**
 * @fileoverview Top bar UI module. Renders the toolbar with logo, save/undo/redo,
 * duplicate/delete, reset/reload/settings buttons. Updates selection-dependent controls.
 * Depends on: engine, settingsModal (globals).
 * Exports: topBar.init, topBar.refreshSelection, topBar.showSelection, topBar.clearSelection
 */
// ui/topBar.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: index.js

var topBar = (function() {

  /**
   * Builds the top-bar DOM and wires all button event listeners.
   */
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
        '<button class="topbar-btn" id="topbar-autolayout" title="Auto Layout"><i class="ti ti-sitemap"></i></button>' +
        '<button class="topbar-btn" title="Fit View"><i class="ti ti-focus-2"></i></button>' +
      '</div>' +
      '<div class="topbar-right">' +
        '<div class="topbar-dynamic" id="topbar-dynamic">' +
          '<button class="topbar-btn" id="topbar-duplicate" title="Duplicate"><i class="ti ti-copy"></i></button>' +
          '<button class="topbar-btn topbar-btn--delete" id="topbar-delete" title="Delete"><i class="ti ti-trash"></i></button>' +
        '</div>' +
        '<div class="topbar-divider"></div>' +
        '<button class="topbar-btn" id="topbar-reset" title="Reset"><i class="ti ti-rotate"></i></button>' +
        '<button class="topbar-btn" id="topbar-reload" title="Reload"><i class="ti ti-refresh"></i></button>' +
        '<button class="topbar-btn" id="topbar-settings" title="Settings"><i class="ti ti-settings"></i></button>' +
      '</div>';

    refreshSelection([]);

    var dupeBtn = document.getElementById('topbar-duplicate');
    if (dupeBtn && typeof engine !== 'undefined') {
      dupeBtn.addEventListener('click', function() { engine.duplicateSelectedNodes(); });
    }

    var delBtn = document.getElementById('topbar-delete');
    if (delBtn && typeof engine !== 'undefined') {
      delBtn.addEventListener('click', function() { engine.deleteSelectedNodes(); });
    }

    var autoBtn = document.getElementById('topbar-autolayout');
    if (autoBtn && typeof autoLayout !== 'undefined') {
      autoBtn.addEventListener('click', function() {
        autoLayout.run();
        if (typeof minimap !== 'undefined' && minimap.fitAll) minimap.fitAll();
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
        if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
      });
    }

    document.getElementById('topbar-reset').addEventListener('click', function() {
      if (typeof engine !== 'undefined' && engine.resetAll) {
        if (confirm('Reset graph? This will delete all Procedia objects in AE.')) {
          engine.resetAll();
        }
      }
    });

    document.getElementById('topbar-reload').addEventListener('click', function() {
      window.location.reload();
    });

    var settingsBtn = document.getElementById('topbar-settings');
    if (settingsBtn && typeof settingsModal !== 'undefined') {
      settingsBtn.addEventListener('click', function() { settingsModal.open(); });
    }
  }

  /**
   * Sets the opacity of the dynamic (selection-dependent) buttons based on selection.
   * @param {Array} sel Array of selected node IDs.
   */
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

  /**
   * Makes the dynamic section visible (selection present).
   */
  function showSelection() {
    var el = document.getElementById('topbar-dynamic');
    if (!el) return;
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
  }

  /**
   * Hides the dynamic section (no selection).
   */
  function clearSelection() {
    var el = document.getElementById('topbar-dynamic');
    if (!el) return;
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  }

  return {
    init: init,
    refreshSelection: refreshSelection,
    showSelection: showSelection,
    clearSelection: clearSelection
  };

})();
