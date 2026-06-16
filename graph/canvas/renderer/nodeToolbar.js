/**
 * @fileoverview Floating action toolbar for the selected node on the graph canvas.
 * Displays buttons: clone, duplicate, color, collapse, disable/enable, switch, delete.
 * Appears above a single selected node, hidden otherwise.
 * @dependencies graph/graphState.js, graph/canvas/renderer/index.js
 * @exports nodeToolbar { init, refresh }
 */

// graph/canvas/renderer/nodeToolbar.js
// DEPENDS ON: graph/graphState.js, graph/canvas/renderer/index.js
// MUST LOAD AFTER: graph/canvas/renderer/index.js

var nodeToolbar = (function() {
  var _toolbar = null;
  var _currentNodeId = null;
  var _colorPicker = null;
  var _colorPickerVisible = false;

  var COLORS = [
    { name: 'white',  hex: '#FFFFFF' },
    { name: 'yellow', hex: '#FFD700' },
    { name: 'green',  hex: '#4CAF50' },
    { name: 'red',    hex: '#F44336' },
    { name: 'blue',   hex: '#2196F3' },
    { name: 'orange', hex: '#FF9800' },
    { name: 'violet', hex: '#9C27B0' },
    { name: 'lime',   hex: '#CDDC39' }
  ];

  function _ensureToolbar() {
    if (_toolbar) return;
    _toolbar = document.createElement('div');
    _toolbar.className = 'node-toolbar';
    _toolbar.innerHTML =
      '<button class="node-toolbar-btn" data-action="clone" title="Clone"><i class="ti ti-layers-intersect"></i></button>' +
      '<button class="node-toolbar-btn" data-action="duplicate" title="Duplicate"><i class="ti ti-copy"></i></button>' +
      '<button class="node-toolbar-btn" data-action="color" title="Color"><i class="ti ti-palette"></i></button>' +
      '<button class="node-toolbar-btn" data-action="collapse" title="Collapse"><i class="ti ti-chevron-up"></i></button>' +
      '<button class="node-toolbar-btn" data-action="toggle" title="Disable"><i class="ti ti-player-pause"></i></button>' +
      '<button class="node-toolbar-btn" data-action="switch" title="Switch"><i class="ti ti-arrows-shuffle"></i></button>' +
      '<span class="node-toolbar-sep"></span>' +
      '<button class="node-toolbar-btn node-toolbar-btn--delete" data-action="delete" title="Delete"><i class="ti ti-trash"></i></button>';

    _toolbar.addEventListener('click', _onToolbarClick);
  }

  function _ensureColorPicker() {
    if (_colorPicker) return;
    _colorPicker = document.createElement('div');
    _colorPicker.className = 'node-toolbar-colorpicker';
    _colorPicker.style.display = 'none';
    for (var i = 0; i < COLORS.length; i++) {
      var swatch = document.createElement('button');
      swatch.className = 'node-toolbar-color';
      swatch.style.background = COLORS[i].hex;
      swatch.setAttribute('data-color', COLORS[i].hex);
      swatch.setAttribute('title', COLORS[i].name);
      swatch.addEventListener('click', _onColorSelect);
      _colorPicker.appendChild(swatch);
    }
    _toolbar.appendChild(_colorPicker);
  }

  function _updateToggleIcon() {
    var nodeData = graphState.getNode(_currentNodeId);
    var toggleBtn = _toolbar ? _toolbar.querySelector('[data-action="toggle"]') : null;
    if (!toggleBtn || !nodeData) return;
    if (nodeData.disabled) {
      toggleBtn.innerHTML = '<i class="ti ti-player-play"></i>';
      toggleBtn.title = 'Enable';
    } else {
      toggleBtn.innerHTML = '<i class="ti ti-player-pause"></i>';
      toggleBtn.title = 'Disable';
    }
  }

  function _onToolbarClick(e) {
    var btn = e.target.closest('.node-toolbar-btn');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    if (!action) return;
    if (_currentNodeId === null) return;

    switch (action) {
      case 'duplicate':
        engine.duplicateSelectedNodes();
        break;
      case 'delete':
        engine.deleteSelectedNodes();
        break;
      case 'clone':
        engine.cloneNode(_currentNodeId);
        break;
      case 'color':
        _toggleColorPicker();
        break;
      case 'collapse':
        _handleCollapse();
        break;
      case 'toggle':
        engine.toggleNodeDisabled(_currentNodeId);
        _updateToggleIcon();
        break;
      case 'switch':
        break;
    }
  }

  function _toggleColorPicker() {
    _ensureColorPicker();
    _colorPickerVisible = !_colorPickerVisible;
    _colorPicker.style.display = _colorPickerVisible ? 'flex' : 'none';
  }

  function _onColorSelect(e) {
    var btn = e.currentTarget;
    var color = btn.getAttribute('data-color');
    if (!_currentNodeId) return;
    var nodeData = graphState.getNode(_currentNodeId);
    if (!nodeData) return;
    if (nodeData.nodeColor === color) {
      graphState.updateNode(_currentNodeId, { nodeColor: null });
    } else {
      graphState.updateNode(_currentNodeId, { nodeColor: color });
    }
    renderer.updateNode(_currentNodeId);
    _colorPickerVisible = false;
    _colorPicker.style.display = 'none';
  }

  function _handleCollapse() {
    if (!_currentNodeId) return;
    var nodeData = graphState.getNode(_currentNodeId);
    if (!nodeData) return;
    graphState.updateNode(_currentNodeId, { collapsed: !nodeData.collapsed });
    renderer.updateNode(_currentNodeId);
  }

  function _detach() {
    if (_toolbar && _toolbar.parentNode) {
      _toolbar.parentNode.removeChild(_toolbar);
    }
  }

  function show(nodeId) {
    _ensureToolbar();

    var nodeEl = renderer.getNodeElement(nodeId);
    if (!nodeEl) { hide(); return; }

    if (_toolbar.parentNode === nodeEl) return;

    _detach();
    _currentNodeId = nodeId;

    _updateToggleIcon();

    nodeEl.appendChild(_toolbar);
    _toolbar.style.display = 'flex';
    if (_colorPicker) {
      _colorPickerVisible = false;
      _colorPicker.style.display = 'none';
    }
    document.removeEventListener('mousedown', _onDocClick);
    document.addEventListener('mousedown', _onDocClick);
  }

  function hide() {
    _detach();
    _currentNodeId = null;
    if (_colorPicker) {
      _colorPickerVisible = false;
      _colorPicker.style.display = 'none';
    }
    document.removeEventListener('mousedown', _onDocClick);
  }

  function _onDocClick(e) {
    if (_colorPickerVisible && _colorPicker && !_colorPicker.contains(e.target)) {
      var colorBtn = _toolbar && _toolbar.querySelector('[data-action="color"]');
      if (colorBtn && !colorBtn.contains(e.target)) {
        _colorPickerVisible = false;
        _colorPicker.style.display = 'none';
      }
    }
  }

  function refresh() {
    var sel = graphState.getSelection();
    if (sel.length === 1) {
      show(sel[0]);
    } else {
      hide();
    }
  }

  function init() {
    _ensureToolbar();
  }

  return {
    init: init,
    refresh: refresh,
    hide: hide
  };
})();
