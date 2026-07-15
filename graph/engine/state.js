/**
 * graph/engine/state.js
 *
 * Global state operations for the graph engine: resetting the entire graph
 * (clearing all nodes/wires) and setting individual node properties with
 * automatic propagation for data nodes.
 *
 * Dependencies: graphState, nodeRegistry, evalBridge, dirtyFlusher,
 *               engine/helpers.js
 * Load before: engine/index.js
 *
 * Exports: resetAll, setNodeProperty
 */
// graph/engine/state.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             bridge/evalBridge.js, flush/dirtyFlusher.js,
//             graph/engine/helpers.js
// MUST LOAD BEFORE: engine/index.js

window.__procedia_internal.eState = (function() {
  var registry = window.__procedia_internal.registry;
  var hlp = registry.get('hlp');

  /**
   * Resets the entire graph: dispatches onDelete for all nodes, clears the
   * graph state, and resets all UI components.
   */
  function resetAll() {
    if (typeof undoManager !== 'undefined') undoManager.reset();

    var allNodes = graphState.getAllNodes();
    var ids = Object.keys(allNodes);

    for (var i = ids.length - 1; i >= 0; i--) {
      var nd = allNodes[ids[i]];
      var def = nodeRegistry.getDefinition(nd.type);
      if (def && def.onDelete) { var dataCmd = def.onDelete(nd); if (dataCmd) evalBridge.dispatch(dataCmd); }
    }

    graphState.clearGraph();
    if (typeof commentManager !== 'undefined' && commentManager.removeAll) commentManager.removeAll();

    if (typeof viewport !== 'undefined' && viewport.reset) viewport.reset();
    window.__procedia_internal.refreshUI();
    if (typeof topBar !== 'undefined' && topBar.refreshSelection) topBar.refreshSelection([]);


  }

  /**
   * Sets a property on a node and propagates it to connected data wire targets
   * if the node is a data node and the key is not 'label'.
   *
   * @param {string} nodeId - Node ID to update
   * @param {string} key - Property key
   * @param {*} value - Property value
   */
  function setNodeProperty(nodeId, key, value) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) {
      console.warn('[engine] setNodeProperty: node not found:', nodeId);
      return;
    }
    if (typeof undoManager !== 'undefined') undoManager.capture();
    graphState.updateProp(nodeId, key, value);
    if (nodeData.nodeKind === 'data' && key !== 'label') {
      hlp.propagateDataValue(nodeId, key, value);
    }

    var cloneIds = graphState.getCloneIds(nodeId);
    for (var ci = 0; ci < cloneIds.length; ci++) {
      var cloneData = graphState.getNode(cloneIds[ci]);
      if (cloneData && cloneData.nodeKind === 'data' && key !== 'label') {
        hlp.propagateDataValue(cloneIds[ci], key, value);
      }
    }

    if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.schedule) dirtyFlusher.schedule();
    hlp.refreshNodeUI();
    if (typeof undoManager !== 'undefined') undoManager.commitDebounced('Change property');
  }

  /**
   * Toggles the disabled state of a node. Updates graphState, dispatches
   * onDisable/onEnable lifecycle hooks (or default actions based on nodeKind),
   * and refreshes the UI.
   *
   * @param {string} nodeId - Node ID to toggle
   */
  function toggleNodeDisabled(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) {
      console.warn('[engine] toggleNodeDisabled: node not found:', nodeId);
      return;
    }

    if (typeof undoManager !== 'undefined') undoManager.capture();

    var newDisabled = !nodeData.disabled;
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    graphState.updateNode(nodeId, { disabled: newDisabled });

    if (newDisabled) {
      _dispatchDisableAction(nodeData, def);
    } else {
      _dispatchEnableAction(nodeData, def);
    }

    hlp.refreshNodeUI();
    if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.schedule) dirtyFlusher.schedule();
    if (typeof undoManager !== 'undefined') undoManager.commit(nodeData.disabled ? 'Disable node' : 'Enable node');
  }

  /**
   * Builds and dispatches the disable action for a node.
   * Uses onDisable hook if defined; otherwise applies default behavior per nodeKind.
   * Kind-specific side effects (data defaults propagation) always run regardless.
   */
  function _dispatchDisableAction(nodeData, def) {
    var action = null;

    if (def.onDisable) {
      action = _buildLifecycleAction(nodeData, def, 'onDisable');
    } else {
      // Default AE action per nodeKind (no custom onDisable hook)
      if (nodeData.nodeKind === 'effector') {
        _defaultSetEffectEnabled(nodeData, false);
      } else if (nodeData.nodeKind === 'affected') {
        _defaultSetLayerEnabled(nodeData, false);
      }
    }

    if (action) evalBridge.dispatch(action);

    // Kind-specific side effects that run regardless of hook existence
    if (nodeData.nodeKind === 'data') {
      hlp.propagateDataDefaults(nodeData.id);
    }
  }

  /**
   * Builds and dispatches the enable action for a node.
   * Uses onEnable hook if defined; otherwise applies default behavior per nodeKind.
   * Kind-specific side effects (data re-propagation) always run regardless.
   */
  function _dispatchEnableAction(nodeData, def) {
    var action = null;

    if (def.onEnable) {
      action = _buildLifecycleAction(nodeData, def, 'onEnable');
    } else {
      // Default AE action per nodeKind (no custom onEnable hook)
      if (nodeData.nodeKind === 'effector') {
        _defaultSetEffectEnabled(nodeData, true);
      } else if (nodeData.nodeKind === 'affected') {
        _defaultSetLayerEnabled(nodeData, true);
      }
    }

    if (action) evalBridge.dispatch(action);

    // Kind-specific side effects that run regardless of hook existence
    if (nodeData.nodeKind === 'data') {
      hlp.repropagateDataValues(nodeData.id);
    }
  }

  /**
   * Calls a lifecycle hook (onDisable/onEnable) with appropriate params per nodeKind.
   * For affected nodes, injects the path layer UUID so AE can find the correct layer.
   */
  function _buildLifecycleAction(nodeData, def, hookName) {
    var hook = def[hookName];
    if (!hook) return null;

    var hostingCompUUID = nodeData.hostingComps && nodeData.hostingComps.length > 0
      ? nodeData.hostingComps[0] : null;

    if (nodeData.nodeKind === 'effector') {
      var upstreamNodeUUID = hlp.findPathLayerUUID(nodeData.id);
      return hook(nodeData, hostingCompUUID, upstreamNodeUUID);
    } else if (nodeData.nodeKind === 'affected') {
      var action = hook(nodeData, hostingCompUUID);
      // Inject layerUUID so AE can find the layer by its .comment (pathLayerUUID)
      if (action && action.params) {
        action.params.layerUUID = hlp.findPathLayerUUID(nodeData.id);
      }
      return action;
    }
    return hook(nodeData);
  }

  /**
   * Default enable/disable for effector nodes: set effect.enabled via AE.
   * @param {Object} nodeData
   * @param {boolean} enabled
   */
  function _defaultSetEffectEnabled(nodeData, enabled) {
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def || !def.matchName) return;

    var hostingCompUUID = nodeData.hostingComps && nodeData.hostingComps.length > 0
      ? nodeData.hostingComps[0] : null;
    if (!hostingCompUUID) return;

    var upstreamNodeUUID = hlp.findPathLayerUUID(nodeData.id);

    evalBridge.dispatch({
      action: 'setEffectEnabled',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       def.matchName,
        enabled:         enabled
      }
    });
  }

  /**
   * Default enable/disable for affected nodes: set layer.enabled via AE.
   * @param {Object} nodeData
   * @param {boolean} enabled
   */
  function _defaultSetLayerEnabled(nodeData, enabled) {
    var hostingCompUUID = nodeData.hostingComps && nodeData.hostingComps.length > 0
      ? nodeData.hostingComps[0] : null;
    if (!hostingCompUUID) return;

    evalBridge.dispatch({
      action: 'setLayerEnabled',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerUUID:       hlp.findPathLayerUUID(nodeData.id),
        enabled:         enabled
      }
    });
  }

  return {
    resetAll:              resetAll,
    setNodeProperty:       setNodeProperty,
    toggleNodeDisabled:     toggleNodeDisabled
  };

})();
window.__procedia_internal.registry.register('eState', window.__procedia_internal.eState);
