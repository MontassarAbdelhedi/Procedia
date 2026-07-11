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

  function bind(overlay, closeFn, applyFn) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeFn();
    });

    document.getElementById('settings-close').addEventListener('click', closeFn);

    var tabBar = document.getElementById('settings-tabs');
    if (tabBar) {
      tabBar.addEventListener('click', function(e) {
        var tab = e.target.closest('.settings-tab');
        if (!tab) return;
        var name = tab.dataset.tab;
        tabBar.querySelectorAll('.settings-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.querySelectorAll('.settings-tab-panel').forEach(function(p) { p.classList.remove('active'); });
        var panel = document.getElementById('settings-panel-' + name);
        if (panel) panel.classList.add('active');
      });
    }

    var minimapCheckbox = document.getElementById('settings-minimap');
    var wireStyleSelect = document.getElementById('settings-wire-style');
    var animatedDashCheckbox = document.getElementById('settings-animated-dash');
    var portLabelsCheckbox = document.getElementById('settings-port-labels');
    var snapToGridCheckbox = document.getElementById('settings-snap-to-grid');

    var autoShyCheckbox = document.getElementById('settings-auto-shy');

    var reportingCheckbox = document.getElementById('settings-allow-reporting');
    if (reportingCheckbox) {
      reportingCheckbox.addEventListener('change', function() {
        settings.set('allowReporting', reportingCheckbox.checked);
      });
    }

    if (autoShyCheckbox) {
      autoShyCheckbox.addEventListener('change', function() {
        settings.set('autoShy', autoShyCheckbox.checked);
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
      snapToGridCheckbox: snapToGridCheckbox,
      autoShyCheckbox: autoShyCheckbox
    };
  }

  return { bind: bind };

})();
