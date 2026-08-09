/**
 * Version History panel — modal overlay showing revision list,
 * compare options, and restore functionality.
 * @module versionHistoryPanel
 * @dependencies versionControl, capabilities
 */
// ui/versioning/versionHistoryPanel.js
// DEPENDS ON: versioning/versionControlService.js, versioning/capabilities.js,
//             versioning/diff/semanticDiff.js
// MUST LOAD BEFORE: index.js

var versionHistoryPanel = (function() {

  var _overlayEl = null;
  var _isOpen = false;

  /**
   * Opens the version history panel.
   */
  function open() {
    if (_isOpen) return;
    if (!capabilities.canUse('version-control-history')) return;
    if (!versionControl || !versionControl.isInitialized()) return;

    _isOpen = true;
    _buildDOM();
    _render();
  }

  function close() {
    if (_overlayEl && _overlayEl.parentNode) {
      _overlayEl.parentNode.removeChild(_overlayEl);
    }
    _overlayEl = null;
    _isOpen = false;
  }

  function _buildDOM() {
    var overlay = document.createElement('div');
    overlay.className = 'vc-modal-overlay';
    overlay.onclick = function(e) {
      if (e.target === overlay) close();
    };
    overlay.innerHTML =
      '<div class="vc-modal vc-history-panel">' +
        '<div class="vc-modal-header">' +
          '<h2>Version History</h2>' +
          '<button class="vc-modal-close" id="vc-history-close"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="vc-modal-body">' +
          '<div class="vc-history-toolbar">' +
            '<select class="vc-branch-filter" id="vc-history-branch-filter"><option value="">All Branches</option></select>' +
            '<input type="text" class="vc-history-search" id="vc-history-search" placeholder="Search versions...">' +
          '</div>' +
          '<div class="vc-history-list" id="vc-history-list"></div>' +
        '</div>' +
        '<div class="vc-modal-footer">' +
          '<button class="vc-btn vc-btn-primary" id="vc-history-save-version">Save Version</button>' +
          '<button class="vc-btn" id="vc-history-compare">Compare with Current</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    _overlayEl = overlay;

    // Bind events
    document.getElementById('vc-history-close').onclick = close;
    document.getElementById('vc-history-save-version').onclick = function() {
      close();
      if (typeof saveVersionModal !== 'undefined') {
        saveVersionModal.open();
      }
    };

    document.getElementById('vc-history-compare').onclick = function() {
      _compareWithCurrent();
    };

    document.getElementById('vc-history-branch-filter').onchange = function() {
      _render();
    };

    document.getElementById('vc-history-search').oninput = function() {
      _render();
    };
  }

  function _render() {
    var filterBranch = document.getElementById('vc-history-branch-filter');
    var searchInput = document.getElementById('vc-history-search');
    var branchId = filterBranch ? filterBranch.value : '';
    var searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    // Populate branch filter dropdown
    if (filterBranch && filterBranch.options.length <= 1) {
      var branchResult = versionControl.listBranches();
      if (branchResult.ok) {
        for (var i = 0; i < branchResult.data.length; i++) {
          var b = branchResult.data[i];
          var opt = document.createElement('option');
          opt.value = b.id;
          opt.textContent = b.name;
          filterBranch.appendChild(opt);
        }
      }
    }

    // Get revisions
    var revResult = versionControl.listRevisions({ branchId: branchId || null });
    if (!revResult.ok) return;

    var revisions = revResult.data;

    // Filter by search
    if (searchTerm) {
      revisions = revisions.filter(function(r) {
        return r.message && r.message.toLowerCase().indexOf(searchTerm) !== -1;
      });
    }

    // Render list
    var listEl = document.getElementById('vc-history-list');
    if (!listEl) return;

    if (revisions.length === 0) {
      listEl.innerHTML = '<div class="vc-empty">No versions found</div>';
      return;
    }

    var html = '';
    for (var r = 0; r < revisions.length; r++) {
      var rev = revisions[r];
      var dt = new Date(rev.createdAt).toLocaleString();
      var kindBadge = '';
      if (rev.kind === 'root') kindBadge = '<span class="vc-badge vc-badge-root">root</span>';
      else if (rev.kind === 'checkpoint') kindBadge = '<span class="vc-badge vc-badge-checkpoint">checkpoint</span>';
      else if (rev.kind === 'merge') kindBadge = '<span class="vc-badge vc-badge-merge">merge</span>';

      html +=
        '<div class="vc-history-item" data-revision-id="' + rev.id + '">' +
          '<div class="vc-history-item-header">' +
            '<span class="vc-history-message">' + _escapeHtml(rev.message || 'Untitled') + '</span>' +
            kindBadge +
          '</div>' +
          '<div class="vc-history-item-meta">' +
            '<span>' + dt + '</span>' +
            (rev.summary ? '<span class="vc-history-changes">' + _formatSummary(rev.summary) + '</span>' : '') +
          '</div>' +
          '<div class="vc-history-item-actions">' +
            '<button class="vc-btn-sm vc-restore-btn" data-action="restore" data-revision-id="' + rev.id + '">Restore</button>' +
            '<button class="vc-btn-sm vc-compare-btn" data-action="compare" data-revision-id="' + rev.id + '">Compare</button>' +
          '</div>' +
        '</div>';
    }

    listEl.innerHTML = html;

    // Bind action buttons
    var items = listEl.querySelectorAll('.vc-history-item-actions button');
    for (var b = 0; b < items.length; b++) {
      items[b].onclick = function() {
        var action = this.getAttribute('data-action');
        var revId = this.getAttribute('data-revision-id');
        if (action === 'restore') {
          restoreModal.open(function() {
            versionControl.restoreRevision(revId).then(function(res) {
              if (res.ok) {
                close();
                if (typeof branchSelector !== 'undefined') branchSelector.refresh();
                if (typeof window.__procedia_internal !== 'undefined' && window.__procedia_internal.refreshUI) {
                  window.__procedia_internal.refreshUI({ minimap: true });
                }
              } else {
                alert('Restore failed: ' + res.error);
              }
            });
          });
        } else if (action === 'compare') {
          _showCompare(revId);
        }
      };
    }
  }

  function _compareWithCurrent() {
    var activeBranch = versionControl.getActiveBranch();
    if (!activeBranch.ok) return;

    var revResult = versionControl.listRevisions({ branchId: activeBranch.data.id, limit: 1 });
    if (!revResult.ok || revResult.data.length === 0) return;

    _showCompare(revResult.data[0].id);
  }

  function _showCompare(revisionId) {
    var repo = vcRepositoryStore.getRepository();
    var revision = vcRepositoryStore.getRevision(revisionId);
    if (!revision) { alert('Revision not found'); return; }

    var activeBranch = versionControl.getActiveBranch();
    if (!activeBranch.ok) return;

    // Get current working snapshot
    var currentSnap = vcSnapshotSerializer.captureActiveGraph();
    var histSnap = vcRepositoryStore.getSnapshot(revision.snapshotId);

    if (!histSnap) { alert('Historical snapshot not found'); return; }

    var diff = versionControl.compareSnapshots(histSnap.id, currentSnap.id);
    if (!diff.ok) { alert('Comparison failed: ' + diff.error); return; }

    // Show compare in modal
    compareModal.open(
      'Changes since "' + (revision.message || 'version') + '"',
      diff.data
    );
  }

  function _formatSummary(summary) {
    var parts = [];
    if (summary.nodesAdded) parts.push('+' + summary.nodesAdded + 'n');
    if (summary.nodesRemoved) parts.push('-' + summary.nodesRemoved + 'n');
    if (summary.nodesChanged) parts.push('~' + summary.nodesChanged + 'n');
    if (summary.wiresAdded) parts.push('+' + summary.wiresAdded + 'w');
    if (summary.wiresRemoved) parts.push('-' + summary.wiresRemoved + 'w');
    return parts.join(' ') || '';
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    open: open,
    close: close,
    isOpen: function() { return _isOpen; }
  };

})();
