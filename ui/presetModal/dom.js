/**
 * @fileoverview Preset save modal DOM construction.
 * @exports __pm_dom.build
 */
// ui/presetModal/dom.js
// MUST LOAD BEFORE: ui/presetModal/index.js

var __pm_dom = (function() {

  function build() {
    var overlay = document.createElement('div');
    overlay.className = 'preset-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML =
      '<div class="preset-modal">' +
        '<div class="preset-modal-header">' +
          '<span class="preset-modal-title">Save Preset</span>' +
          '<button class="preset-modal-close" id="preset-close" title="Close"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="preset-modal-body">' +
          '<input type="text" id="preset-name-input" class="preset-modal-input" placeholder="My Preset" autocomplete="off" spellcheck="false" maxlength="64">' +
          '<div class="preset-modal-hint" id="preset-hint">Name for the saved node group</div>' +
        '</div>' +
        '<div class="preset-modal-footer">' +
          '<button class="preset-modal-btn preset-modal-btn--danger" id="preset-delete-all" title="Delete all saved presets">Delete All</button>' +
          '<div class="preset-modal-footer-spacer"></div>' +
          '<button class="preset-modal-btn preset-modal-btn--secondary" id="preset-cancel">Cancel</button>' +
          '<button class="preset-modal-btn preset-modal-btn--primary" id="preset-save" disabled>Save</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  return { build: build };

})();
