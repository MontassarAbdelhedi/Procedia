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
      _contentEl.addEventListener('keydown', __ins_events.onInspectorKeydown);
      _contentEl.addEventListener('click', __ins_events.onLayerActionClick);
      _contentEl.addEventListener('click', __ins_events.onColorTriggerClick);
      _contentEl.addEventListener('click', __ins_events.onKeyframeIconClick);
      _contentEl.addEventListener('click', __ins_events.onFootageBrowseClick);
      _contentEl.addEventListener('click', __ins_events.onLayerStackRowClick);
      _contentEl.addEventListener('click', __ins_events.onLayerStackMoveClick);
      _contentEl.addEventListener('dragstart', __ins_events.onLayerStackDragStart);
      _contentEl.addEventListener('dragover', __ins_events.onLayerStackDragOver);
      _contentEl.addEventListener('dragend', __ins_events.onLayerStackDragEnd);
      _contentEl.addEventListener('drop', __ins_events.onLayerStackDrop);
    }

    refresh();
  }

  /**
   * Shows the empty state (no selection or multi-select).
   * When a comp is active (user is "inside" a comp via the comp list),
   * shows the comp's layer stack instead of "select a node".
   */
  function showEmpty() {
    var emptyEl = document.getElementById('inspector-empty');
    var contentEl = document.getElementById('inspector-content');

    // When inside a comp with no selection, show the active comp's layer stack
    if (typeof graphState !== 'undefined') {
      var activeCompId = graphState.getActiveComp();
      if (activeCompId && contentEl) {
        var compData = graphState.getNode(activeCompId);
        if (compData && compData.type === 'core/comp') {
          if (emptyEl) { emptyEl.classList.remove('visible'); }
          contentEl.classList.add('visible');
          contentEl.innerHTML = __ins_layerStack.buildCompEmptyState(activeCompId);
          return;
        }
      }
    }

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

    // Trigger mask fetch for Fill nodes to populate Fill Mask dropdown
    if (view.nodeType === 'generate/fill' && view.hostingCompUUID) {
      __ins_events._fetchFillMasks(view.nodeId, view.hostingCompUUID);
    }
  }

  /**
   * Returns true if an inspector text input currently has focus (user is typing).
   */
  function _isInputFocused() {
    var el = document.activeElement;
    return el && el.classList && el.classList.contains('inspector-param-input') && el.type === 'text';
  }

  /**
   * Refreshes the inspector based on the current graph selection.
   * Skips DOM replacement when a text input is focused to avoid focus loss,
   * unless force is true (used after committing a change like math eval).
   * @param {boolean} force If true, refresh even when an input is focused.
   */
  function refresh(force) {
    if (!force && _isInputFocused()) return;
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
