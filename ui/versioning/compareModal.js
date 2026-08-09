/**
 * Compare modal — styled like the settings modal.
 * Shows diff results between two versions.
 * @module compareModal
 */
// ui/versioning/compareModal.js
// MUST LOAD BEFORE: index.js

var compareModal = (function() {

  var _overlay = null;
  var _open = false;

  /**
   * Opens the compare modal with diff data.
   * @param {string} title - Header title (e.g. revision message).
   * @param {Object} diffData - Result from versionControl.compareSnapshots().
   */
  function open(title, diffData) {
    if (_open) close();
    _build(title, diffData);
    _open = true;
    _overlay.style.display = 'flex';
  }

  function close() {
    if (!_open) return;
    _open = false;
    if (_overlay) {
      _overlay.style.display = 'none';
    }
  }

  function _build(title, diffData) {
    if (_overlay) {
      if (_overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
      _overlay = null;
    }

    var summary = diffData.summary || {};

    _overlay = document.createElement('div');
    _overlay.className = 'settings-overlay';
    _overlay.style.display = 'none';

    _overlay.innerHTML =
      '<div class="settings-modal" style="width:400px; height:auto;">' +
        '<div class="settings-modal-header">' +
          '<span class="settings-modal-title">Compare</span>' +
          '<button class="settings-modal-close" id="cmp-close" title="Close"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="settings-modal-body">' +
          '<div class="settings-label" style="margin-bottom:12px;">' + _esc(title) + '</div>' +
          _buildStatGroup('Nodes', summary.nodesAdded, summary.nodesRemoved, summary.nodesChanged) +
          _buildStatGroup('Wires', summary.wiresAdded, summary.wiresRemoved, summary.wiresChanged) +
          (summary.totalChanges != null ?
            '<div class="settings-row" style="margin-top:12px; padding-top:12px; border-top:1px solid #2a2a28;">' +
              '<span class="settings-label">Total Changes</span>' +
              '<span class="settings-range-value" style="font-size:16px; font-weight:600; color:#534AB7;">' + summary.totalChanges + '</span>' +
            '</div>' : '') +
          '<div class="settings-group" style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px; margin-bottom:0;">' +
            '<button id="cmp-ok" class="vc-btn-save settings-replay-btn" style="width:auto; padding:6px 24px;">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(_overlay);

    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) close();
    });

    document.getElementById('cmp-close').addEventListener('click', close);
    document.getElementById('cmp-ok').addEventListener('click', close);

    document.addEventListener('keydown', _onKey);
  }

  function _onKey(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', _onKey);
    }
  }

  function _buildStatGroup(label, added, removed, changed) {
    if (added == null && removed == null && changed == null) return '';
    return '' +
      '<div class="settings-row" style="margin-bottom:6px;">' +
        '<span class="settings-label-sub">' + _esc(label) + '</span>' +
        '<div style="display:flex; gap:8px; font-size:12px;">' +
          '<span style="color:#4EB36A;">+' + (added || 0) + '</span>' +
          '<span style="color:#e05252;">-' + (removed || 0) + '</span>' +
          '<span style="color:#f0ad4e;">~' + (changed || 0) + '</span>' +
        '</div>' +
      '</div>';
  }

  function _esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { open: open, close: close };

})();
