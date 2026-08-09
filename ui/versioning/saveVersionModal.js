/**
 * Save Version modal — styled like the settings modal.
 * Opens when the top-bar "Save Version" button is clicked.
 * @module saveVersionModal
 * @dependencies versionControl, branchSelector
 */
// ui/versioning/saveVersionModal.js
// DEPENDS ON: versioning/versionControlService.js, ui/versioning/branchSelector.js
// MUST LOAD BEFORE: index.js

var saveVersionModal = (function() {

  var _overlay = null;
  var _open = false;
  var _input = null;

  function open() {
    if (!versionControl || !versionControl.isInitialized()) return;
    if (_open) return;

    if (!_overlay) _build();

    var msg = versionControl.getSuggestedVersionMessage();
    _input.value = msg || '';

    _open = true;
    _overlay.style.display = 'flex';

    setTimeout(function() {
      _input.focus();
      _input.select();
    }, 50);
  }

  function close() {
    if (!_open) return;
    _open = false;
    _overlay.style.display = 'none';
  }

  function _save() {
    var msg = _input.value.trim();
    if (!msg) return;

    var result = versionControl.createVersion(msg);
    if (!result.ok) {
      alert(result.error);
    }
    close();

    if (typeof branchSelector !== 'undefined' && branchSelector.refresh) {
      branchSelector.refresh();
    }
  }

  function _build() {
    _overlay = document.createElement('div');
    _overlay.className = 'settings-overlay';
    _overlay.style.display = 'none';

    _overlay.innerHTML =
      '<div class="settings-modal" style="width:400px; height:auto;">' +
        '<div class="settings-modal-header">' +
          '<span class="settings-modal-title">Save Version</span>' +
          '<button class="settings-modal-close" id="sv-close" title="Close"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="settings-modal-body">' +
          '<div class="settings-group">' +
            '<div class="settings-label" style="margin-bottom:8px;">Version message</div>' +
            '<input type="text" id="sv-message" class="settings-select" style="width:100%; box-sizing:border-box; padding:8px 10px; font-size:13px;" placeholder="Describe this version...">' +
          '</div>' +
          '<div class="settings-group" style="display:flex; gap:8px; justify-content:flex-end; margin-bottom:0;">' +
            '<button id="sv-cancel" class="settings-replay-btn" style="width:auto; padding:6px 16px;">Cancel</button>' +
            '<button id="sv-save" class="vc-btn-save settings-replay-btn" style="width:auto; padding:6px 16px;">Save</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(_overlay);

    _input = document.getElementById('sv-message');

    // Overlay click-to-close
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) close();
    });

    // Close button
    document.getElementById('sv-close').addEventListener('click', close);

    // Cancel button
    document.getElementById('sv-cancel').addEventListener('click', close);

    // Save button
    document.getElementById('sv-save').addEventListener('click', _save);

    // Enter key to save
    _input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') _save();
      if (e.key === 'Escape') close();
    });
  }

  return { open: open, close: close };

})();
