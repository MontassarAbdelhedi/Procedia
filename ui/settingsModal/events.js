/**
 * @fileoverview Settings modal event wiring. Binds click/change events for
 * the overlay, close button, and all settings controls.
 * Depends on: settings, walkthrough (globals).
 * Exports: __sm_events.bind
 */
// ui/settingsModal/events.js
// DEPENDS ON: ui/settings.js
// MUST LOAD BEFORE: ui/settingsModal/index.js

var __sm_events = (function() {

  /**
   * Wires all events on the settings modal.
   * @param {HTMLElement} overlay The settings overlay element.
   * @param {Function} closeFn Callback to close the modal.
   * @param {Function} applyFn Callback to apply current settings.
   * @return {Object} Refs object with cached control element references.
   */
  function bind(overlay, closeFn, applyFn) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeFn();
    });

    document.getElementById('settings-close').addEventListener('click', closeFn);

    var minimapCheckbox = document.getElementById('settings-minimap');
    var wireStyleSelect = document.getElementById('settings-wire-style');
    var animatedDashCheckbox = document.getElementById('settings-animated-dash');
    var portLabelsCheckbox = document.getElementById('settings-port-labels');
    var snapToGridCheckbox = document.getElementById('settings-snap-to-grid');

    var reportingCheckbox = document.getElementById('settings-allow-reporting');
    if (reportingCheckbox) {
      reportingCheckbox.addEventListener('change', function() {
        settings.set('allowReporting', reportingCheckbox.checked);
      });
    }

    minimapCheckbox.addEventListener('change', function() {
      settings.set('minimap', minimapCheckbox.checked);
      applyFn();
    });

    wireStyleSelect.addEventListener('change', function() {
      settings.set('wireStyle', wireStyleSelect.value);
      applyFn();
    });

    animatedDashCheckbox.addEventListener('change', function() {
      settings.set('animatedDash', animatedDashCheckbox.checked);
      applyFn();
    });

    portLabelsCheckbox.addEventListener('change', function() {
      settings.set('showPortLabels', portLabelsCheckbox.checked);
      applyFn();
    });

    snapToGridCheckbox.addEventListener('change', function() {
      settings.set('snapToGrid', snapToGridCheckbox.checked);
      applyFn();
    });

    var layoutDir = document.getElementById('settings-layout-direction');
    if (layoutDir) {
      layoutDir.addEventListener('change', function() {
        settings.set('layoutDirection', layoutDir.value);
        applyFn();
      });
    }

    var hSpacing = document.getElementById('settings-layout-hspacing');
    if (hSpacing) {
      hSpacing.addEventListener('input', function() {
        settings.set('layoutHSpacing', parseInt(hSpacing.value, 10));
        var valEl = document.getElementById('settings-layout-hspacing-val');
        if (valEl) valEl.textContent = hSpacing.value;
        applyFn();
      });
    }

    var replayBtn = document.getElementById('settings-replay-tutorial');
    if (replayBtn) {
      replayBtn.addEventListener('click', function() {
        closeFn();
        if (typeof walkthrough !== 'undefined' && walkthrough.show) walkthrough.show();
      });
    }

    var vSpacing = document.getElementById('settings-layout-vspacing');
    if (vSpacing) {
      vSpacing.addEventListener('input', function() {
        settings.set('layoutVSpacing', parseInt(vSpacing.value, 10));
        var valEl = document.getElementById('settings-layout-vspacing-val');
        if (valEl) valEl.textContent = vSpacing.value;
        applyFn();
      });
    }

    return {
      minimapCheckbox: minimapCheckbox,
      wireStyleSelect: wireStyleSelect,
      animatedDashCheckbox: animatedDashCheckbox,
      portLabelsCheckbox: portLabelsCheckbox,
      snapToGridCheckbox: snapToGridCheckbox
    };
  }

  return { bind: bind };

})();
