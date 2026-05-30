// ui/settingsModal.js
// DEPENDS ON: ui/settings.js, css/settingsModal.css
// MUST LOAD BEFORE: index.js

var settingsModal = (function() {

  var _overlay = null;
  var _open = false;

  var _minimapCheckbox = null;
  var _wireStyleSelect = null;

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

        '</div>' +
      '</div>';

    document.body.appendChild(_overlay);
  }

  function _bindEvents() {
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) close();
    });

    document.getElementById('settings-close').addEventListener('click', close);

    _minimapCheckbox = document.getElementById('settings-minimap');
    _wireStyleSelect = document.getElementById('settings-wire-style');

    _minimapCheckbox.addEventListener('change', function() {
      settings.set('minimap', _minimapCheckbox.checked);
      _applySettings();
    });

    _wireStyleSelect.addEventListener('change', function() {
      settings.set('wireStyle', _wireStyleSelect.value);
      _applySettings();
    });
  }

  function _syncControls() {
    var prefs = settings.getAll();
    _minimapCheckbox.checked = prefs.minimap !== false;
    _wireStyleSelect.value = prefs.wireStyle || 'bezier';
  }

  function _applySettings() {
    var prefs = settings.getAll();

    var minimapCanvas = document.getElementById('minimap-canvas');
    if (minimapCanvas) {
      minimapCanvas.style.display = prefs.minimap ? '' : 'none';
    }

    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
  }

  function open() {
    if (_open) return;
    _open = true;
    _overlay.style.display = 'flex';
    _syncControls();
  }

  function close() {
    if (!_open) return;
    _open = false;
    _overlay.style.display = 'none';
    _applySettings();
  }

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
