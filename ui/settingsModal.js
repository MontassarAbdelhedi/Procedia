/**
 * @fileoverview Settings modal UI module. Builds and controls the settings overlay.
 * Depends on: settings (global), wireRenderer (global), css/settingsModal.css.
 * Exports: settingsModal.init, settingsModal.open, settingsModal.close
 */
// ui/settingsModal.js
// DEPENDS ON: ui/settings.js, css/settingsModal.css
// MUST LOAD BEFORE: index.js

var settingsModal = (function() {

  var _overlay = null;
  var _open = false;

  var _minimapCheckbox = null;
  var _wireStyleSelect = null;
  var _animatedDashCheckbox = null;

  /**
   * Creates the settings modal DOM and appends it to the body.
   */
  function _buildDOM() {
    _overlay = document.createElement('div');
    _overlay.className = 'settings-overlay';
    _overlay.style.display = 'none';

    _overlay.innerHTML =
      '<div class="settings-modal">' +
        '<div class="settings-modal-header">' +
          '<span class="settings-modal-title">Settings</span>' +
          '<button class="settings-modal-close" id="settings-close" title="Close"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="settings-modal-body">' +

          '<div class="settings-group">' +
            '<div class="settings-row">' +
              '<span class="settings-label">Minimap</span>' +
              '<label class="settings-toggle">' +
                '<input type="checkbox" id="settings-minimap">' +
                '<span class="settings-toggle-slider"></span>' +
              '</label>' +
            '</div>' +
            '<div class="settings-hint">Show minimap in the bottom-right corner of the canvas</div>' +
          '</div>' +

          '<div class="settings-group">' +
            '<div class="settings-row">' +
              '<span class="settings-label">Wire Style</span>' +
              '<select id="settings-wire-style" class="settings-select">' +
                '<option value="bezier">Bezier</option>' +
                '<option value="direct">Direct</option>' +
                '<option value="stepped">Stepped</option>' +
              '</select>' +
            '</div>' +
            '<div class="settings-hint">Appearance of connection wires between nodes</div>' +
          '</div>' +

          '<div class="settings-group">' +
            '<div class="settings-row">' +
              '<span class="settings-label">Animated Dash</span>' +
              '<label class="settings-toggle">' +
                '<input type="checkbox" id="settings-animated-dash">' +
                '<span class="settings-toggle-slider"></span>' +
              '</label>' +
            '</div>' +
            '<div class="settings-hint">Dash animation flows along wires (applies to any wire style)</div>' +
          '</div>' +

          '<div class="settings-group">' +
            '<div class="settings-row">' +
              '<span class="settings-label">Layout Direction</span>' +
              '<select id="settings-layout-direction" class="settings-select">' +
                '<option value="LR">Left to Right</option>' +
                '<option value="TB">Top to Bottom</option>' +
              '</select>' +
            '</div>' +
            '<div class="settings-hint">Flow direction for auto layout</div>' +
          '</div>' +

          '<div class="settings-group">' +
            '<div class="settings-row">' +
              '<span class="settings-label">Layout Spacing</span>' +
            '</div>' +
            '<div class="settings-row">' +
              '<span class="settings-label-sub">Horizontal</span>' +
              '<input type="range" id="settings-layout-hspacing" class="settings-range" min="40" max="300" value="80">' +
              '<span class="settings-range-value" id="settings-layout-hspacing-val">80</span>' +
            '</div>' +
            '<div class="settings-row">' +
              '<span class="settings-label-sub">Vertical</span>' +
              '<input type="range" id="settings-layout-vspacing" class="settings-range" min="20" max="200" value="40">' +
              '<span class="settings-range-value" id="settings-layout-vspacing-val">40</span>' +
            '</div>' +
            '<div class="settings-hint">Spacing between layers and nodes in auto layout</div>' +
          '</div>' +

        '</div>' +
      '</div>';

    document.body.appendChild(_overlay);
  }

  /**
   * Wires click/change events for the modal overlay, close button, and controls.
   */
  function _bindEvents() {
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) close();
    });

    document.getElementById('settings-close').addEventListener('click', close);

    _minimapCheckbox = document.getElementById('settings-minimap');
    _wireStyleSelect = document.getElementById('settings-wire-style');
    _animatedDashCheckbox = document.getElementById('settings-animated-dash');

    _minimapCheckbox.addEventListener('change', function() {
      settings.set('minimap', _minimapCheckbox.checked);
      _applySettings();
    });

    _wireStyleSelect.addEventListener('change', function() {
      settings.set('wireStyle', _wireStyleSelect.value);
      _applySettings();
    });

    _animatedDashCheckbox.addEventListener('change', function() {
      settings.set('animatedDash', _animatedDashCheckbox.checked);
      _applySettings();
    });

    var layoutDir = document.getElementById('settings-layout-direction');
    if (layoutDir) {
      layoutDir.addEventListener('change', function() {
        settings.set('layoutDirection', layoutDir.value);
        _applySettings();
      });
    }

    var hSpacing = document.getElementById('settings-layout-hspacing');
    if (hSpacing) {
      hSpacing.addEventListener('input', function() {
        settings.set('layoutHSpacing', parseInt(hSpacing.value, 10));
        var valEl = document.getElementById('settings-layout-hspacing-val');
        if (valEl) valEl.textContent = hSpacing.value;
        _applySettings();
      });
    }

    var vSpacing = document.getElementById('settings-layout-vspacing');
    if (vSpacing) {
      vSpacing.addEventListener('input', function() {
        settings.set('layoutVSpacing', parseInt(vSpacing.value, 10));
        var valEl = document.getElementById('settings-layout-vspacing-val');
        if (valEl) valEl.textContent = vSpacing.value;
        _applySettings();
      });
    }
  }

  /**
   * Reads current settings and updates the checkbox and select values.
   */
  function _syncControls() {
    var prefs = settings.getAll();
    _minimapCheckbox.checked = prefs.minimap !== false;
    _wireStyleSelect.value = prefs.wireStyle || 'bezier';
    _animatedDashCheckbox.checked = prefs.animatedDash === true;

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

  /**
   * Applies current settings to the UI (minimap visibility, wire re-render).
   */
  function _applySettings() {
    var prefs = settings.getAll();

    var minimapCanvas = document.getElementById('minimap-canvas');
    if (minimapCanvas) {
      minimapCanvas.style.display = prefs.minimap ? '' : 'none';
    }

    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
  }

  /**
   * Opens the settings modal.
   */
  function open() {
    if (_open) return;
    _open = true;
    _overlay.style.display = 'flex';
    _syncControls();
  }

  /**
   * Closes the settings modal.
   */
  function close() {
    if (!_open) return;
    _open = false;
    _overlay.style.display = 'none';
    _applySettings();
  }

  /**
   * Initializes the settings modal: builds DOM, binds events, syncs controls, applies settings.
   */
  function init() {
    if (!_overlay) {
      _buildDOM();
      _bindEvents();
    }
    _syncControls();
    _applySettings();
  }

  return {
    init:  init,
    open:  open,
    close: close
  };

})();
