/**
 * New Branch modal — styled like the settings modal.
 * Opens when the top-bar "New Branch" button is clicked.
 * @module newBranchModal
 * @dependencies versionControl, branchSelector
 */
// ui/versioning/newBranchModal.js
// DEPENDS ON: versioning/versionControlService.js, ui/versioning/branchSelector.js
// MUST LOAD BEFORE: index.js

var newBranchModal = (function() {

  var _overlay = null;
  var _open = false;
  var _input = null;

  function open() {
    if (!versionControl || !versionControl.isInitialized()) return;
    if (_open) return;

    if (!_overlay) _build();

    _input.value = '';

    _open = true;
    _overlay.style.display = 'flex';

    setTimeout(function() {
      _input.focus();
    }, 50);
  }

  function close() {
    if (!_open) return;
    _open = false;
    _overlay.style.display = 'none';
  }

  function _save() {
    var name = _input.value.trim();
    if (!name) return;

    var result = versionControl.createBranch({ name: name });
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
          '<span class="settings-modal-title">New Branch</span>' +
          '<button class="settings-modal-close" id="nb-close" title="Close"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="settings-modal-body">' +
          '<div class="settings-group">' +
            '<div class="settings-label" style="margin-bottom:8px;">Branch name</div>' +
            '<input type="text" id="nb-name" class="settings-select" style="width:100%; box-sizing:border-box; padding:8px 10px; font-size:13px;" placeholder="Enter branch name...">' +
          '</div>' +
          '<div class="settings-group" style="display:flex; gap:8px; justify-content:flex-end; margin-bottom:0;">' +
            '<button id="nb-cancel" class="settings-replay-btn" style="width:auto; padding:6px 16px;">Cancel</button>' +
            '<button id="nb-create" class="vc-btn-save settings-replay-btn" style="width:auto; padding:6px 16px;">Create</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(_overlay);

    _input = document.getElementById('nb-name');

    // Overlay click-to-close
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) close();
    });

    // Close button
    document.getElementById('nb-close').addEventListener('click', close);

    // Cancel button
    document.getElementById('nb-cancel').addEventListener('click', close);

    // Create button
    document.getElementById('nb-create').addEventListener('click', _save);

    // Enter to create, Escape to close
    _input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') _save();
      if (e.key === 'Escape') close();
    });
  }

  return { open: open, close: close };

})();
