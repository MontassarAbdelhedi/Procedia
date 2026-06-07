/**
 * @fileoverview Inspector event handlers. Delegates change/input events on
 * inspector param inputs to the engine, and handles recovery/layer action clicks.
 * Depends on: engine, graphState, evalBridge, __ins_vm, inspector, wireRenderer, statusBar (globals).
 * Exports: __ins_events.onInspectorChange, .onInspectorInput, .onRecoverClick, .onLayerActionClick
 */
// ui/inspector/events.js
// DEPENDS ON: graph/graphState.js, graph/engine/index.js, bridge/evalBridge.js
// MUST LOAD BEFORE: ui/inspector/index.js

var __ins_events = (function() {

  /**
   * Reads the target input, parses the value, and applies it via engine.setNodeProperty().
   * @param {HTMLElement} target The input element.
   */
  function _applyChange(target) {
    var nodeId = target.getAttribute('data-node-id');
    var key    = target.getAttribute('data-param-key');
    var type   = target.getAttribute('data-param-type');
    if (!nodeId || !key) return;

    var raw = target.type === 'checkbox' ? target.checked : target.value;
    engine.setNodeProperty(nodeId, key, __ins_vm.parseInputValue({ type: type, key: key }, raw));
  }

  /**
   * Handles the 'change' event on inspector param inputs (checkbox changes).
   * @param {Event} e The change event.
   */
  function _onInspectorChange(e) {
    var target = e.target;
    if (!target || !target.classList || !target.classList.contains('inspector-param-input')) return;
    _applyChange(target);
  }

  /**
   * Handles the 'input' event on a color swatch picker.
   * Converts hex to RGBA, syncs the sibling text input, and applies to engine.
   * @param {HTMLElement} swatch The color swatch input element.
   */
  function _onColorSwatchInput(swatch) {
    var nodeId = swatch.getAttribute('data-node-id');
    var key    = swatch.getAttribute('data-param-key');
    if (!nodeId || !key) return;

    var alpha = 1;
    var nodeData = graphState.getNode(nodeId);
    if (nodeData && nodeData.props && Array.isArray(nodeData.props[key])) {
      alpha = nodeData.props[key][3] !== undefined ? nodeData.props[key][3] : 1;
    }

    var rgba = __ins_vm.hexToRgba(swatch.value, alpha);

    var textInput = swatch.parentNode.querySelector('.inspector-color-input');
    if (textInput) textInput.value = __ins_vm.formatValueForInput({ type: 'color' }, rgba);

    engine.setNodeProperty(nodeId, key, rgba);
  }

  /**
   * Syncs the color swatch to match the current node property after a text edit.
   * @param {HTMLElement} target The color text input element.
   */
  function _syncColorSwatch(target) {
    var swatch = target.parentNode.querySelector('.inspector-color-swatch');
    if (!swatch) return;
    var nodeId = target.getAttribute('data-node-id');
    var key    = target.getAttribute('data-param-key');
    if (!nodeId || !key) return;
    var nodeData = graphState.getNode(nodeId);
    if (nodeData && Array.isArray(nodeData.props[key])) {
      swatch.value = __ins_vm.rgbaToHex(nodeData.props[key]);
    }
  }

  /**
   * Handles the 'input' event on inspector text inputs (and color swatches).
   * @param {Event} e The input event.
   */
  function _onInspectorInput(e) {
    var target = e.target;
    if (!target || !target.classList) return;

    if (target.classList.contains('inspector-color-swatch')) {
      _onColorSwatchInput(target);
      return;
    }

    if (!target.classList.contains('inspector-param-input')) return;
    if (target.type === 'checkbox') return;
    _applyChange(target);

    if (target.classList.contains('inspector-color-input')) {
      _syncColorSwatch(target);
    }
  }

  /**
   * Handles clicks on error recovery buttons (recreate / remove).
   * @param {Event} e The click event.
   */
  function _onRecoverClick(e) {
    var btn = e.target;
    if (!btn || !btn.classList || !btn.classList.contains('inspector-recover-btn')) return;

    var nodeId = btn.getAttribute('data-node-id');
    var action = btn.getAttribute('data-action');
    if (!nodeId || !action) return;

    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;

    if (action === 'recreate') {
      if (typeof engine !== 'undefined' && engine.recreateNode) {
        engine.recreateNode(nodeId);
      }
      renderer.render();
      if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
      if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
      if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    } else if (action === 'remove') {
      var graphData = { nodes: graphState.getAllNodes(), wires: graphState.getAllWires() };
      evalBridge.dispatch({ action: 'writeGraph', params: graphData });
      engine.deleteNode(nodeId);
    }
  }

  /**
   * Handles clicks on layer order buttons (Move Up / Move Down).
   * @param {Event} e The click event.
   */
  function _onLayerActionClick(e) {
    var btn = e.target;
    if (!btn || !btn.classList || !btn.classList.contains('inspector-layer-btn')) return;

    var nodeId = btn.getAttribute('data-node-id');
    var hostUUID = btn.getAttribute('data-host-uuid');
    var direction = btn.getAttribute('data-direction') || 'top';
    if (!nodeId || !hostUUID) return;

    evalBridge.dispatch({
      action: 'setLayerOrder',
      params: { layerUUID: nodeId, hostingCompUUID: hostUUID, direction: direction }
    });
  }

  /**
   * Handles clicks on the color picker trigger button.
   * Opens the custom color picker popover.
   * @param {Event} e The click event.
   */
  function _onColorTriggerClick(e) {
    var btn = e.target.closest('.cp-trigger');
    if (!btn) return;

    var nodeId = btn.getAttribute('data-node-id');
    var key = btn.getAttribute('data-param-key');
    if (!nodeId || !key) return;

    var nodeData = graphState.getNode(nodeId);
    if (!nodeData || !Array.isArray(nodeData.props[key])) return;

    __ins_colorPicker.open(btn, nodeId, key, nodeData.props[key].slice());
  }

  /**
   * Handles clicks on the footage browse/import button.
   * Opens a file dialog via ExtendScript and imports the selected footage.
   * @param {Event} e The click event.
   */
  function _onFootageBrowseClick(e) {
    var btn = e.target;
    if (!btn || !btn.classList || !btn.classList.contains('inspector-footage-btn')) return;
    if (btn.classList.contains('loading')) return;

    var nodeId = btn.getAttribute('data-node-id');
    if (!nodeId) return;

    btn.classList.add('loading');
    btn.innerHTML = '<i class="ti ti-loader"></i> Importing\u2026';

    evalBridge.dispatch({
      action: 'browseAndImportFootage',
      params: { nodeUUID: nodeId }
    }).then(function(res) {
      btn.classList.remove('loading');
      if (res.ok && res.data && !res.data.cancelled) {
        var nodeData = graphState.getNode(nodeId);
        if (nodeData) {
          nodeData.props.filePath = res.data.filePath;
          nodeData.props.label = res.data.itemName;
          graphState.updateNode(nodeId, { props: nodeData.props, state: 'alive' });
        }
      }
      if (res.ok && res.data && res.data.cancelled) {
        btn.innerHTML = '<i class="ti ti-folder-open"></i> Browse &amp; Import';
      }
      renderer.render();
      if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
    });
  }

  return {
    onInspectorChange:   _onInspectorChange,
    onInspectorInput:    _onInspectorInput,
    onRecoverClick:      _onRecoverClick,
    onLayerActionClick:  _onLayerActionClick,
    onColorTriggerClick: _onColorTriggerClick,
    onFootageBrowseClick: _onFootageBrowseClick
  };

})();
