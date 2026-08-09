/**
 * Restore Revision modal — confirmation dialog styled like the settings modal.
 * @module restoreModal
 */
// ui/versioning/restoreModal.js
// MUST LOAD BEFORE: index.js

var restoreModal = (function() {

  var _overlay = null;
  var _open = false;
  var _onConfirm = null;

  /**
   * Opens the restore confirmation modal.
   * @param {Function} onConfirm - Called when the user clicks Restore.
   */
  function open(onConfirm) {
    if (_open) close();
    _onConfirm = onConfirm;
    _build();
    _open = true;
    _overlay.style.display = 'flex';
  }

  function close() {
    if (!_open) return;
    _open = false;
    _onConfirm = null;
    if (_overlay) {
      _overlay.style.display = 'none';
    }
  }

  function _confirm() {
    var cb = _onConfirm;
    close();
    if (typeof cb === 'function') cb();
  }

  function _build() {
    if (_overlay) {
      if (_overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
      _overlay = null;
    }

    _overlay = document.createElement('div');
    _overlay.className = 'settings-overlay';
    _overlay.style.display = 'none';

    _overlay.innerHTML =
      '<div class="settings-modal" style="width:400px; height:auto;">' +
        '<div class="settings-modal-header">' +
          '<span class="settings-modal-title">Restore Version</span>' +
          '<button class="settings-modal-close" id="rst-close" title="Close"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="settings-modal-body">' +
          '<div class="settings-hint" style="font-size:13px; color:#B4B2A9; margin-bottom:12px;">' +
            'Restore this version? Your current uncommitted changes will be captured as a safety checkpoint.' +
          '</div>' +
          '<div class="settings-group" style="display:flex; gap:8px; justify-content:flex-end; margin-bottom:0;">' +
            '<button id="rst-cancel" class="settings-replay-btn" style="width:auto; padding:6px 16px;">Cancel</button>' +
            '<button id="rst-confirm" class="vc-btn-save settings-replay-btn" style="width:auto; padding:6px 16px;">Restore</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(_overlay);

    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) close();
    });

    document.getElementById('rst-close').addEventListener('click', close);
    document.getElementById('rst-cancel').addEventListener('click', close);
    document.getElementById('rst-confirm').addEventListener('click', _confirm);

    document.addEventListener('keydown', _onKey);
  }

  function _onKey(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', _onKey);
    }
  }

  return { open: open, close: close };

})();
