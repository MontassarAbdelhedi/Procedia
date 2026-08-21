/**
 * @fileoverview Top bar DOM construction. Builds the toolbar HTML.
 * Depends on: (none).
 * Exports: __topBar_dom
 */
// ui/topBar/dom.js
// MUST LOAD BEFORE: ui/topBar/init.js

var __topBar_dom = (function() {

  function build(el) {
    el.innerHTML =
      '<div class="topbar-left">' +
        '<div class="topbar-logo">' +
          '<div class="topbar-logo-mark"><i class="ti ti-topology-star-3"></i></div>' +
          '<span class="topbar-wordmark">Procedia</span>' +
          '<button id="topbar-update-badge" class="topbar-update-badge" style="display:none" aria-label="Update available" title="Update available"><span aria-hidden="true"></span></button>' +
        '</div>' +
      '</div>' +
      '<div class="topbar-center">' +
        '<button class="topbar-btn" id="topbar-save" title="Save"><i class="ti ti-device-floppy"></i></button>' +
        '<button class="topbar-btn" id="topbar-open" title="Open"><i class="ti ti-folder-open"></i></button>' +
        '<button class="topbar-btn" id="topbar-import" title="Import Project"><i class="ti ti-file-import"></i></button>' +
        '<button class="topbar-btn" id="topbar-undo" title="Undo" disabled><i class="ti ti-arrow-back-up"></i></button>' +
        '<button class="topbar-btn" id="topbar-redo" title="Redo" disabled><i class="ti ti-arrow-forward-up"></i></button>' +
        '<div class="topbar-divider"></div>' +
        '<button class="topbar-btn" id="topbar-autolayout" title="Auto Layout"><i class="ti ti-sitemap"></i></button>' +
        '<button class="topbar-btn" id="topbar-fitview" title="Fit View"><i class="ti ti-focus-2"></i></button>' +
        '<button class="topbar-btn" id="topbar-collapseall" title="Collapse All"><i class="ti ti-chevrons-up"></i></button>' +
        '<div class="topbar-divider"></div>' +
        '<div class="topbar-dynamic" id="topbar-dynamic">' +
          '<button class="topbar-btn" id="topbar-save-preset" title="Save Preset"><i class="ti ti-device-floppy"></i></button>' +
          '<button class="topbar-btn" id="topbar-duplicate" title="Duplicate"><i class="ti ti-copy"></i></button>' +
          '<button class="topbar-btn topbar-btn--delete" id="topbar-delete" title="Delete"><i class="ti ti-trash"></i></button>' +
        '</div>' +
        '<div class="topbar-divider"></div>' +
        '<button class="topbar-btn" id="topbar-save-version" title="Save Version"><i class="ti ti-device-floppy"></i></button>' +
        '<button class="topbar-btn" id="topbar-new-branch" title="New Branch"><i class="ti ti-git-branch"></i></button>' +
        '<button class="topbar-btn" id="topbar-history" title="Version History"><i class="ti ti-history"></i></button>' +
        '<div class="topbar-divider"></div>' +
        '<button class="topbar-btn" id="topbar-reset" title="Reset"><i class="ti ti-rotate"></i></button>' +
        '<button class="topbar-btn" id="topbar-reload" title="Reload"><i class="ti ti-refresh"></i></button>' +
        '<button class="topbar-btn" id="topbar-settings" title="Settings"><i class="ti ti-settings"></i></button>' +
      '</div>' +
      '<div class="topbar-right">' +
        '<button class="topbar-btn" id="topbar-report" title="Report a Bug"><i class="ti ti-bug"></i></button>' +
        '<span class="topbar-status" id="topbar-status"></span>' +
      '</div>';
  }

  return { build: build };

})();
