/**
 * @fileoverview Inspector panel UI module. Shows node properties and actions
 * for the currently selected node in the right sidebar.
 * Depends on: graphState, nodeRegistry (globals), __ins_vm, __ins_render, __ins_events.
 * Exports: inspector.init, inspector.refresh, inspector.showEmpty, inspector.showNode
 */
// ui/inspector/index.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/engine/index.js,
//             ui/inspector/viewModel.js, ui/inspector/render.js, ui/inspector/events.js
// MUST LOAD BEFORE: index.js

var inspector = (function() {

  var _contentEl = null;

  /**
   * Builds the inspector DOM and wires event listeners.
   */
  function init() {
    var el = document.getElementById('right-bar');
    el.innerHTML =
      '<div class="inspector-empty visible" id="inspector-empty">' +
        '<i class="ti ti-cursor-text inspector-empty-icon"></i>' +
        '<span class="inspector-empty-text">select a node</span>' +
      '</div>' +
      '<div class="inspector-content" id="inspector-content"></div>';

    _contentEl = document.getElementById('inspector-content');
    if (_contentEl) {
      _contentEl.addEventListener('change', __ins_events.onInspectorChange);
      _contentEl.addEventListener('input', __ins_events.onInspectorInput);
      _contentEl.addEventListener('click', __ins_events.onRecoverClick);
      _contentEl.addEventListener('click', __ins_events.onLayerActionClick);
      _contentEl.addEventListener('click', __ins_events.onColorTriggerClick);
      _contentEl.addEventListener('click', __ins_events.onFootageBrowseClick);
    }

    refresh();
  }

  /**
   * Shows the empty state (no selection or multi-select).
   */
  function showEmpty() {
    var emptyEl = document.getElementById('inspector-empty');
    var contentEl = document.getElementById('inspector-content');
    if (emptyEl) {
      emptyEl.classList.add('visible');
      emptyEl.innerHTML =
        '<i class="ti ti-cursor-text inspector-empty-icon"></i>' +
        '<span class="inspector-empty-text">select a node</span>';
    }
    if (contentEl) {
      contentEl.classList.remove('visible');
      contentEl.innerHTML = '';
    }
  }

  /**
   * Renders the inspector content for a single node view model.
   * @param {Object} view The view model from __ins_vm.buildViewModel().
   */
  function showNode(view) {
    var emptyEl = document.getElementById('inspector-empty');
    var contentEl = document.getElementById('inspector-content');
    if (!emptyEl || !contentEl) return;

    emptyEl.classList.remove('visible');
    contentEl.classList.add('visible');
    contentEl.innerHTML = __ins_render.renderNodeContent(view);
  }

  /**
   * Refreshes the inspector based on the current graph selection.
   */
  function refresh() {
    var sel = graphState.getSelection();
    if (sel.length === 0) {
      showEmpty();
      return;
    }
    if (sel.length > 1) {
      var emptyEl = document.getElementById('inspector-empty');
      var contentEl = document.getElementById('inspector-content');
      if (emptyEl) {
        emptyEl.classList.add('visible');
        emptyEl.innerHTML =
          '<i class="ti ti-cursor-text inspector-empty-icon"></i>' +
          '<span class="inspector-empty-text">' + sel.length + ' nodes selected</span>';
      }
      if (contentEl) {
        contentEl.classList.remove('visible');
        contentEl.innerHTML = '';
      }
      return;
    }
    var nodeData = graphState.getNode(sel[0]);
    if (!nodeData) {
      showEmpty();
      return;
    }
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) {
      showEmpty();
      return;
    }
    showNode(__ins_vm.buildViewModel(nodeData, def));
  }

  return {
    init:      init,
    refresh:   refresh,
    showEmpty: showEmpty,
    showNode:  showNode
  };

})();
