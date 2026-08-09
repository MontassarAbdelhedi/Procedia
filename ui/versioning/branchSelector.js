/**
 * Branch selector — floating dropdown at bottom-left of canvas above the
 * comp list. Shows active branch name with an arrow; opens a menu listing
 * all branches.
 * @module branchSelector
 * @dependencies versionControl, capabilities
 */
// ui/versioning/branchSelector.js
// DEPENDS ON: versioning/versionControlService.js, versioning/capabilities.js
// MUST LOAD BEFORE: index.js

var branchSelector = (function() {

  var _dropdown = null;
  var _trigger = null;
  var _triggerLabel = null;
  var _menu = null;
  var _menuOpen = false;
  var _refreshTimer = null;
  var _inserted = false;

  /**
   * Injects the floating branch dropdown into #canvas-wrap,
   * positioned above the comp list.
   */
  function init() {
    if (!capabilities.canUse('version-control')) return;
    if (!versionControl || !versionControl.isInitialized()) return;
    if (_inserted) return;

    var canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasWrap) return;

    var dropdown = document.createElement('div');
    dropdown.id = 'vc-branch-dropdown';
    dropdown.innerHTML =
      '<div class="vc-branch-trigger">' +
        '<span class="vc-branch-trigger-label">main</span>' +
        '<span class="vc-branch-dirty" id="vc-branch-dirty" title="Unsaved changes" style="display:none">&#9679;</span>' +
        '<span class="vc-branch-arrow">&#9660;</span>' +
      '</div>' +
      '<div class="vc-branch-menu"></div>';

    canvasWrap.appendChild(dropdown);
    _dropdown = dropdown;
    _trigger = dropdown.querySelector('.vc-branch-trigger');
    _triggerLabel = dropdown.querySelector('.vc-branch-trigger-label');
    _menu = dropdown.querySelector('.vc-branch-menu');
    _inserted = true;

    _bindEvents();
    _refresh();

    // Auto-refresh every 2 seconds
    _refreshTimer = setInterval(_refresh, 2000);
  }

  function _bindEvents() {
    _trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      _toggle();
    });

    document.addEventListener('click', function(e) {
      if (_dropdown && !_dropdown.contains(e.target)) {
        _close();
      }
    });
  }

  function _toggle() {
    if (_menuOpen) {
      _close();
    } else {
      _open();
    }
  }

  function _open() {
    _menuOpen = true;
    _trigger.classList.add('vc-branch-open');
    _menu.classList.add('vc-branch-open');
    _refresh();
  }

  function _close() {
    _menuOpen = false;
    _trigger.classList.remove('vc-branch-open');
    _menu.classList.remove('vc-branch-open');
  }

  function _refresh() {
    if (!_dropdown) return;

    var result = versionControl.listBranches();
    if (!result.ok) return;

    var branches = result.data;
    var activeInfo = versionControl.getActiveBranch();
    var activeId = activeInfo.ok ? activeInfo.data.id : null;
    var dirty = activeInfo.ok ? activeInfo.data.dirty : false;
    var activeName = activeInfo.ok ? activeInfo.data.name : 'main';

    // Update trigger label
    if (_triggerLabel) {
      _triggerLabel.textContent = activeName;
    }

    // Update dirty indicator
    var dirtyEl = document.getElementById('vc-branch-dirty');
    if (dirtyEl) {
      dirtyEl.style.display = dirty ? 'inline' : 'none';
    }

    // Update menu items
    if (_menu && _menuOpen) {
      _menu.innerHTML = '';
      for (var i = 0; i < branches.length; i++) {
        var b = branches[i];
        var item = document.createElement('div');
        item.className = 'vc-branch-item';
        if (b.id === activeId) {
          item.className += ' vc-branch-item--active';
        }

        var labelText = b.name;
        if (b.dirty && b.id !== activeId) labelText += ' *';
        if (b.id === activeId) labelText += ' \u2714';

        item.textContent = labelText;
        item.setAttribute('data-branch-id', b.id);

        item.addEventListener('click', function(e) {
          e.stopPropagation();
          var bid = this.getAttribute('data-branch-id');
          if (bid && bid !== activeId) {
            versionControl.switchBranch(bid).then(function(switchResult) {
              if (!switchResult.ok) {
                alert('Branch switch failed: ' + switchResult.error);
              }
              _close();
              _refresh();
            });
          }
        });

        _menu.appendChild(item);
      }
    }
  }

  return {
    init: init,
    refresh: _refresh
  };

})();
