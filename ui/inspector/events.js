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
   * Handles the 'input' event on inspector text inputs.
   * @param {Event} e The input event.
   */
  function _onInspectorInput(e) {
    var target = e.target;
    if (!target || !target.classList || !target.classList.contains('inspector-param-input')) return;
    if (target.type === 'checkbox') return;
    _applyChange(target);
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

  return {
    onInspectorChange:   _onInspectorChange,
    onInspectorInput:    _onInspectorInput,
    onRecoverClick:      _onRecoverClick,
    onLayerActionClick:  _onLayerActionClick
  };

})();
