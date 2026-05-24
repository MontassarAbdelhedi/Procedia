// ui/settingsModal.js
// DEPENDS ON: ui/settings.js
// MUST LOAD BEFORE: index.js

var settingsModal = (function () {

  var _overlay  = null;
  var _isOpen   = false;

  // Registered controls — populated by _buildToggleRow / _buildSelectRow
  // { id: string, key: string, type: 'toggle' | 'select' }
  var _controls = [];

  function _buildDOM() {
    // Overlay
    _overlay = document.createElement('div');
    _overlay.id        = 'settings-overlay';
    _overlay.className = 'settings-overlay hidden';

    // Modal box
    var modal = document.createElement('div');
    modal.id        = 'settings-modal';
    modal.className = 'settings-modal';

    // Header
    var header    = document.createElement('div');
    header.className = 'settings-header';

    var title = document.createElement('span');
    title.className   = 'settings-title';
    title.textContent = 'Settings';

    var closeBtn = document.createElement('button');
    closeBtn.id        = 'settings-close-btn';
    closeBtn.className = 'settings-close';
    closeBtn.textContent = '✕';

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Body
    var body = document.createElement('div');
    body.className = 'settings-body';

    // — Section: Canvas —
    var canvasLabel = document.createElement('div');
    canvasLabel.className   = 'settings-section-label';
    canvasLabel.textContent = 'Canvas';
    body.appendChild(canvasLabel);

    // Minimap toggle row
    body.appendChild(_buildToggleRow('Minimap', 'setting-minimap', 'minimap'));

    // — Section: Wires —
    var wiresLabel = document.createElement('div');
    wiresLabel.className   = 'settings-section-label';
    wiresLabel.textContent = 'Wires';
    body.appendChild(wiresLabel);

    // Wire style select row
    body.appendChild(_buildSelectRow(
      'Style',
      'setting-wire-style',
      'wireStyle',
      [
        { value: 'bezier',  label: 'Bezier'  },
        { value: 'direct',  label: 'Direct'  },
        { value: 'stepped', label: 'Stepped' }
      ]
    ));

    // Animated wires toggle row
    body.appendChild(_buildToggleRow('Animated Wires', 'setting-animated-wires', 'animatedWires'));

    // Assemble
    modal.appendChild(header);
    modal.appendChild(body);
    _overlay.appendChild(modal);
    document.body.appendChild(_overlay);

    // Events
    closeBtn.addEventListener('click', close);

    _overlay.addEventListener('click', function (e) {
      if (e.target === _overlay) close();
    });

    document.addEventListener('keydown', function (e) {
      if (_isOpen && e.key === 'Escape') close();
    });
  }

  function _buildToggleRow(labelText, inputId, settingKey) {
    var row = document.createElement('div');
    row.className = 'settings-row';

    var label = document.createElement('span');
    label.className   = 'settings-row-label';
    label.textContent = labelText;

    var toggle = document.createElement('label');
    toggle.className = 'settings-toggle';

    var checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.id      = inputId;
    checkbox.checked = !!settings.get(settingKey);

    var slider = document.createElement('span');
    slider.className = 'settings-toggle-slider';

    _controls.push({ id: inputId, key: settingKey, type: 'toggle' });

    toggle.appendChild(checkbox);
    toggle.appendChild(slider);

    row.appendChild(label);
    row.appendChild(toggle);
    return row;
  }

  function _buildSelectRow(labelText, selectId, settingKey, optionsList) {
    var row = document.createElement('div');
    row.className = 'settings-row';

    var label = document.createElement('span');
    label.className   = 'settings-row-label';
    label.textContent = labelText;

    var select = document.createElement('select');
    select.id        = selectId;
    select.className = 'settings-select';

    var currentVal = settings.get(settingKey);
    for (var i = 0; i < optionsList.length; i++) {
      var opt      = document.createElement('option');
      opt.value    = optionsList[i].value;
      opt.textContent = optionsList[i].label;
      if (optionsList[i].value === currentVal) opt.selected = true;
      select.appendChild(opt);
    }

    _controls.push({ id: selectId, key: settingKey, type: 'select' });

    row.appendChild(label);
    row.appendChild(select);
    return row;
  }

  function open() {
    if (!_overlay) return;
    // Sync controls to current settings state before showing
    var minimapEl = document.getElementById('setting-minimap');
    if (minimapEl) minimapEl.checked = !!settings.get('minimap');

    var wireStyleEl = document.getElementById('setting-wire-style');
    if (wireStyleEl) wireStyleEl.value = settings.get('wireStyle') || 'bezier';

    var animatedEl = document.getElementById('setting-animated-wires');
    if (animatedEl) animatedEl.checked = !!settings.get('animatedWires');

    _overlay.classList.remove('hidden');
    _isOpen = true;
  }

  function _applyMinimapVisibility() {
    var canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    canvas.style.display = settings.get('minimap') ? '' : 'none';
  }

  function close() {
    if (!_overlay) return;

    // Commit all control values to settings on close
    for (var i = 0; i < _controls.length; i++) {
      var ctrl = _controls[i];
      var el   = document.getElementById(ctrl.id);
      if (!el) continue;
      if (ctrl.type === 'toggle') {
        settings.set(ctrl.key, el.checked);
      } else if (ctrl.type === 'select') {
        settings.set(ctrl.key, el.value);
      }
    }

    _overlay.classList.add('hidden');
    _isOpen = false;

    _applyMinimapVisibility();
    if (typeof wireRenderer !== 'undefined') wireRenderer.render();
    if (typeof minimap     !== 'undefined') minimap.render();
  }

  function init() {
    _buildDOM();
    _applyMinimapVisibility();

    var gearBtn = document.getElementById('settings-btn');
    if (gearBtn) {
      gearBtn.addEventListener('click', open);
    }
  }

  return { init: init, open: open, close: close };

}());
