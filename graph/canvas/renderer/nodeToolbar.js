/**
 * @fileoverview Floating action toolbar for the selected node on the graph canvas.
 * Displays buttons: clone, duplicate, color, collapse, disable/enable, switch, delete.
 * Delegates color picker to nodeToolbar/colorPicker.js and switch mode to
 * nodeToolbar/switchMode.js.
 * @dependencies graph/graphState.js, graph/canvas/renderer/index.js,
 *               nodeToolbar/colorPicker.js, nodeToolbar/switchMode.js
 * @exports nodeToolbar { init, refresh }
 */

// graph/canvas/renderer/nodeToolbar.js
// DEPENDS ON: graph/graphState.js, graph/canvas/renderer/index.js,
//             nodeToolbar/colorPicker.js, nodeToolbar/switchMode.js
// MUST LOAD AFTER: graph/canvas/renderer/index.js

var nodeToolbar = (function() {
  var _toolbar = null;
  var _currentNodeId = null;
  var _docListenerAdded = false;

  function _getCurrentNodeId() { return _currentNodeId; }

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

    __ntb_colorPicker.init(_toolbar, _getCurrentNodeId);
    __ntb_colorPicker.ensure();
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
        __ntb_colorPicker.toggle();
        break;
      case 'collapse':
        _handleCollapse();
        break;
      case 'toggle':
        engine.toggleNodeDisabled(_currentNodeId);
        _updateToggleIcon();
        break;
      case 'switch':
        __ntb_switchMode.enter(_currentNodeId);
        break;
    }
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
    __ntb_colorPicker.hide();
    if (!_docListenerAdded) {
      document.addEventListener('mousedown', _onDocClick);
      _docListenerAdded = true;
    }
  }

  function hide() {
    _detach();
    _currentNodeId = null;
    __ntb_colorPicker.hide();
    if (_docListenerAdded) {
      document.removeEventListener('mousedown', _onDocClick);
      _docListenerAdded = false;
    }
  }

  function _onDocClick(e) {
    __ntb_colorPicker.onDocClick(e);
  }

  function refresh() {
    var sel = graphState.getSelection();
    if (__ntb_switchMode.isActive()) {
      var swState = __ntb_switchMode.getState();
      if (sel.length === 1 && sel[0] !== swState.sourceId) {
        if (swState.siblingIds.indexOf(sel[0]) !== -1) {
          var id1 = swState.sourceId;
          var id2 = sel[0];
          __ntb_switchMode.clear();
          engine.switchEffectors(id1, id2);
        } else {
          __ntb_switchMode.clear();
        }
      } else if (sel.length !== 1) {
        __ntb_switchMode.clear();
      }
    }
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
