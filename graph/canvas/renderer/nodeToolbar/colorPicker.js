/**
 * @fileoverview Node color picker for the floating action toolbar.
 * Handles color palette DOM, toggle visibility, selection, and document-click dismiss.
 * @dependencies graph/graphState.js, graph/canvas/renderer/index.js
 * @exports __ntb_colorPicker { ensure, toggle, onSelect, onDocClick, isVisible }
 */

// graph/canvas/renderer/nodeToolbar/colorPicker.js
// DEPENDS ON: graph/graphState.js, graph/canvas/renderer/index.js
// MUST LOAD BEFORE: nodeToolbar.js

var __ntb_colorPicker = (function() {
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

  var _picker = null;
  var _visible = false;
  var _getCurrentNodeId = null;
  var _toolbarEl = null;

  function init(toolbarEl, getNodeIdFn) {
    _toolbarEl = toolbarEl;
    _getCurrentNodeId = getNodeIdFn;
  }

  function ensure() {
    if (_picker) return;
    _picker = document.createElement('div');
    _picker.className = 'node-toolbar-colorpicker';
    _picker.style.display = 'none';
    for (var i = 0; i < COLORS.length; i++) {
      var swatch = document.createElement('button');
      swatch.className = 'node-toolbar-color';
      swatch.style.background = COLORS[i].hex;
      swatch.setAttribute('data-color', COLORS[i].hex);
      swatch.setAttribute('title', COLORS[i].name);
      swatch.addEventListener('click', _onSelect);
      _picker.appendChild(swatch);
    }
    _toolbarEl.appendChild(_picker);
  }

  function toggle() {
    _visible = !_visible;
    _picker.style.display = _visible ? 'flex' : 'none';
  }

  function _onSelect(e) {
    var btn = e.currentTarget;
    var color = btn.getAttribute('data-color');
    var nodeId = _getCurrentNodeId();
    if (!nodeId) return;
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;
    if (nodeData.nodeColor === color) {
      graphState.updateNode(nodeId, { nodeColor: null });
    } else {
      graphState.updateNode(nodeId, { nodeColor: color });
    }
    renderer.updateNode(nodeId);
    _visible = false;
    _picker.style.display = 'none';
  }

  function onDocClick(e) {
    if (_visible && _picker && !_picker.contains(e.target)) {
      var colorBtn = _toolbarEl && _toolbarEl.querySelector('[data-action="color"]');
      if (colorBtn && !colorBtn.contains(e.target)) {
        _visible = false;
        _picker.style.display = 'none';
      }
    }
  }

  function hide() {
    _visible = false;
    if (_picker) _picker.style.display = 'none';
  }

  function isVisible() {
    return _visible;
  }

  return {
    init:       init,
    ensure:     ensure,
    toggle:     toggle,
    hide:       hide,
    isVisible:  isVisible,
    onDocClick: onDocClick
  };
})();
