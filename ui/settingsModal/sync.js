/**
 * @fileoverview Settings modal control synchronization. Reads current settings
 * and updates all form controls to match.
 * Depends on: settings (global).
 * Exports: __sm_sync.sync
 */
// ui/settingsModal/sync.js
// DEPENDS ON: ui/settings.js
// MUST LOAD BEFORE: ui/settingsModal/index.js

var __sm_sync = (function() {

  /**
   * Reads settings and syncs all modal form controls.
   * @param {Object} refs Cached control element references from __sm_events.bind.
   */
  function sync(refs) {
    var prefs = settings.getAll();
    refs.minimapCheckbox.checked = prefs.minimap !== false;
    refs.wireStyleSelect.value = prefs.wireStyle || 'bezier';
    refs.animatedDashCheckbox.checked = prefs.animatedDash === true;
    refs.portLabelsCheckbox.checked = prefs.showPortLabels !== false;
    refs.snapToGridCheckbox.checked = prefs.snapToGrid === true;

    var reportingCheckbox = document.getElementById('settings-allow-reporting');
    if (reportingCheckbox) reportingCheckbox.checked = prefs.allowReporting !== false;

    var layoutDir = document.getElementById('settings-layout-direction');
    if (layoutDir) layoutDir.value = prefs.layoutDirection || 'LR';

    var hSpacing = document.getElementById('settings-layout-hspacing');
    if (hSpacing) {
      hSpacing.value = prefs.layoutHSpacing || 80;
      var valEl = document.getElementById('settings-layout-hspacing-val');
      if (valEl) valEl.textContent = hSpacing.value;
    }

    var vSpacing = document.getElementById('settings-layout-vspacing');
    if (vSpacing) {
      vSpacing.value = prefs.layoutVSpacing || 40;
      var valEl = document.getElementById('settings-layout-vspacing-val');
      if (valEl) valEl.textContent = vSpacing.value;
    }
  }

  return { sync: sync };

})();
