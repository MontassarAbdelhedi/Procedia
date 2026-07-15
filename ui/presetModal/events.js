/**
 * @fileoverview Preset save modal event wiring.
 * @exports __pm_events
 */
// ui/presetModal/events.js
// DEPENDS ON: ui/presetModal/dom.js, graph/presets/presetManager.js,
//             graph/graphState.js, notifications/notificationBar.js
// MUST LOAD BEFORE: ui/presetModal/index.js

var __pm_events = (function() {

  var _overlay = null;
  var _selectedNodeIds = null;

  function wireStatic(overlay) {
    _overlay = overlay;
    var closeBtn = document.getElementById('preset-close');
    var cancelBtn = document.getElementById('preset-cancel');
    var saveBtn = document.getElementById('preset-save');
    var deleteAllBtn = document.getElementById('preset-delete-all');
    var nameInput = document.getElementById('preset-name-input');
    var hintEl = document.getElementById('preset-hint');

    if (!overlay || !nameInput || !saveBtn) return;

    function close() {
      overlay.style.display = 'none';
    }

    function save() {
      var name = nameInput.value.trim();
      if (!name) return;
      var saved = presetManager.savePreset(name, _selectedNodeIds);
      if (saved) {
        if (typeof nodeList !== 'undefined' && typeof nodeList.rebuildList === 'function') {
          nodeList.rebuildList();
        }
        if (typeof notificationBar !== 'undefined' && notificationBar.push) {
          notificationBar.push({
            severity: 'success',
            message: 'Preset "' + name + '" saved',
            duration: 3000
          });
        }
        close();
      } else {
        hintEl.textContent = 'Failed to save preset';
        hintEl.style.color = '#e74c3c';
      }
    }

    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);
    saveBtn.addEventListener('click', save);

    if (deleteAllBtn) {
      deleteAllBtn.addEventListener('click', function() {
        if (!confirm('Delete all saved presets? This cannot be undone.')) return;
        var names = presetManager.listPresets();
        for (var di = 0; di < names.length; di++) {
          presetManager.deletePreset(names[di]);
        }
        close();
        if (typeof notificationBar !== 'undefined' && notificationBar.push) {
          notificationBar.push({
            severity: 'info',
            message: 'All presets deleted',
            duration: 3000
          });
        }
        if (typeof nodeList !== 'undefined' && typeof nodeList.rebuildList === 'function') {
          nodeList.rebuildList();
        }
      });
    }

    nameInput.addEventListener('input', function validate() {
      var val = nameInput.value.trim();
      if (val.length === 0) {
        saveBtn.disabled = true;
        hintEl.textContent = '\u00a0';
        hintEl.style.color = '';
        return;
      }
      var existing = presetManager.getPreset(val);
      if (existing) {
        hintEl.textContent = 'A preset named "' + val + '" already exists. Saving will overwrite it.';
        hintEl.style.color = '#e67e22';
        saveBtn.disabled = false;
      } else {
        hintEl.textContent = 'Name for the saved node group';
        hintEl.style.color = '';
        saveBtn.disabled = false;
      }
    });

    nameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !saveBtn.disabled) {
        save();
      }
      if (e.key === 'Escape') {
        close();
      }
    });
  }

  function wire(selectedNodeIds) {
    _selectedNodeIds = selectedNodeIds;
    var nameInput = document.getElementById('preset-name-input');
    var saveBtn = document.getElementById('preset-save');
    var hintEl = document.getElementById('preset-hint');
    if (nameInput) nameInput.value = '';
    if (hintEl) {
      hintEl.textContent = 'Name for the saved node group';
      hintEl.style.color = '';
    }
    if (saveBtn) saveBtn.disabled = true;
    setTimeout(function() {
      if (nameInput) nameInput.focus();
    }, 50);
  }

  return { wireStatic: wireStatic, wire: wire };

})();
