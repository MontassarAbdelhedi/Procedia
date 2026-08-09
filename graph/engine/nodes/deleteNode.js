/**
 * graph/engine/nodes/deleteNode.js
 *
 * Deletes nodes from the graph with kind-specific cleanup: onGhost/onDelete
 * dispatch, cascade ghosting for comp nodes, and wire removal.
 * Delegates terminal-wire resolution to deleteNode/wireUtils.js.
 *
 * Dependencies: graphState, nodeRegistry, evalBridge, cascade/index.js,
 *               engine/helpers/index.js, deleteNode/wireUtils.js
 * Load before: nodes/index.js
 *
 * Exports: deleteNode, deleteSelectedNodes
 */
// graph/engine/nodes/deleteNode.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             bridge/evalBridge.js, graph/cascade/index.js,
//             graph/engine/helpers/index.js, deleteNode/wireUtils.js
// MUST LOAD BEFORE: nodes/index.js

window.__procedia_internal.ndel = (function() {
  var registry = window.__procedia_internal.registry;
  var hlp = registry.get('hlp');
  var lifecycle = window.__procedia_internal.lifecycle;
  var wireUtils = registry.get('ndel_wireUtils');

  function deleteNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) {
      console.warn('[engine] deleteNode: node not found: ' + nodeId);
      return;
    }

    var def = nodeRegistry.getDefinition(nodeData.type);
    var snapshotWireMap = graphState.getAllWires();

    if (nodeData.nodeKind === 'data') {
      var dataCmd = lifecycle.buildLifecycleCommand(nodeData, def, 'onDelete');
      if (dataCmd) evalBridge.dispatch(dataCmd);

    } else if (nodeData.nodeKind === 'blending' || nodeData.nodeKind === 'matte') {
      var blendMatteBatch = [];
      for (var batchIndex = 0; batchIndex < nodeData.hostingComps.length; batchIndex++) {
        var blendMatteHostUUID = nodeData.hostingComps[batchIndex];
        var blendMatteGhostCmd = lifecycle.buildLifecycleCommand(nodeData, def, 'onGhost', undefined, undefined, blendMatteHostUUID);
        if (blendMatteGhostCmd) blendMatteBatch.push(blendMatteGhostCmd);
      }
      if (blendMatteBatch.length > 0) evalBridge.dispatchBatch(blendMatteBatch);
      var blendMatteDeleteCmd = lifecycle.buildLifecycleCommand(nodeData, def, 'onDelete');
      if (blendMatteDeleteCmd) evalBridge.dispatch(blendMatteDeleteCmd);

    } else {
      if (nodeData.state === 'alive') {
        var affectedBatch = [];
        for (var hostIndex = 0; hostIndex < nodeData.hostingComps.length; hostIndex++) {
          var affectedHostUUID = nodeData.hostingComps[hostIndex];
          var affectedGhostCmd = lifecycle.buildLifecycleCommand(nodeData, def, 'onGhost', undefined, undefined, affectedHostUUID);
          if (affectedGhostCmd && nodeData.nodeKind === 'affected' && affectedGhostCmd.params) {
            affectedGhostCmd.params.layerUUID = wireUtils._resolveLayerUUIDForComp(nodeData.id, affectedHostUUID) || hlp.findPathLayerUUID(nodeData.id);
          }
          if (affectedGhostCmd) affectedBatch.push(affectedGhostCmd);
        }
        if (affectedBatch.length > 0) evalBridge.dispatchBatch(affectedBatch);
      }

      if (cascadeAlgorithm && cascadeAlgorithm.isCompNode && cascadeAlgorithm.isCompNode(nodeId)) {
        for (var compWireId in snapshotWireMap) {
          if (!snapshotWireMap.hasOwnProperty(compWireId)) continue;
          var compWire = snapshotWireMap[compWireId];
          if (compWire.toNode === nodeId && compWire.type === 'layer' && compWire._pathLayerUUID !== null) {
            cascadeAlgorithm.cascadeGhost(compWireId);
          }
        }
        var outputBatch = [];
        for (var outputWireId in snapshotWireMap) {
          if (!snapshotWireMap.hasOwnProperty(outputWireId)) continue;
          var outputWire = snapshotWireMap[outputWireId];
          if (outputWire.fromNode === nodeId && outputWire.type === 'layer' && outputWire._pathLayerUUID !== null) {
            outputBatch.push({
              action: 'deletePathLayer',
              params: {
                hostingCompUUID: outputWire.toNode,
                layerUUID:       outputWire._pathLayerUUID
              }
            });
          }
        }
        if (outputBatch.length > 0) {
          evalBridge.dispatchBatch(outputBatch);
        }
        var cloneIds = graphState.getCloneIds ? graphState.getCloneIds(nodeId) : [];
        if (cloneIds.length === 0) {
          var compDeleteCmd = lifecycle.buildLifecycleCommand(nodeData, def, 'onDelete');
          if (compDeleteCmd) evalBridge.dispatch(compDeleteCmd);
        }
      } else if (cascadeAlgorithm && cascadeAlgorithm.cascadeGhost) {
        for (var cascadeWireId in snapshotWireMap) {
          if (!snapshotWireMap.hasOwnProperty(cascadeWireId)) continue;
          var cascadeWire = snapshotWireMap[cascadeWireId];
          if (cascadeWire.toNode === nodeId && cascadeWire.type === 'layer') {
            cascadeAlgorithm.cascadeGhost(cascadeWireId);
          }
        }
        var affectedDeleteCmd = lifecycle.buildLifecycleCommand(nodeData, def, 'onDelete');
        if (affectedDeleteCmd) evalBridge.dispatch(affectedDeleteCmd);
      }
    }

    var parentCleanupBatch = [];
    var parentDelWires = graphState.getAllWires();
    for (var parentWireId in parentDelWires) {
      if (!parentDelWires.hasOwnProperty(parentWireId)) continue;
      var parentWire = parentDelWires[parentWireId];
      if (parentWire.type !== 'parent') continue;
      if (parentWire.fromNode === nodeId || parentWire.toNode === nodeId) {
        var childData = graphState.getNode(parentWire.fromNode);
        var childLayerUUID = hlp.findPathLayerUUID(parentWire.fromNode);
        var hostCompUUID = null;
        if (childData && childData.hostingComps.length > 0) {
          hostCompUUID = childData.hostingComps[0];
        } else {
          var parentData = graphState.getNode(parentWire.toNode);
          if (parentData && parentData.hostingComps.length > 0) {
            hostCompUUID = parentData.hostingComps[0];
          }
        }
        if (childLayerUUID && hostCompUUID) {
          parentCleanupBatch.push({
            action: 'clearLayerParent',
            params: {
              hostingCompUUID: hostCompUUID,
              layerUUID:       childLayerUUID
            }
          });
        }
      }
    }
    if (parentCleanupBatch.length > 0) {
      evalBridge.dispatchBatch(parentCleanupBatch);
    }

    graphState.removeNode(nodeId);
    hlp.refreshNodeUI();

    graphState.removeFromSelection(nodeId);

    if (typeof envSnapshot !== 'undefined' && envSnapshot.addAction) {
      envSnapshot.addAction('deleteNode', { type: nodeData.type, label: nodeData.props && nodeData.props.label });
    }
  }

  function deleteSelectedNodes() {
    var sel = graphState.getSelection().slice();
    if (sel.length === 0) return;
    if (typeof undoManager !== 'undefined') undoManager.capture();
    for (var i = 0; i < sel.length; i++) {
      deleteNode(sel[i]);
    }
    if (typeof undoManager !== 'undefined') undoManager.commit('Delete ' + sel.length + ' node' + (sel.length > 1 ? 's' : ''));
    if (typeof envSnapshot !== 'undefined' && envSnapshot.addAction) {
      envSnapshot.addAction('deleteSelectedNodes', { count: sel.length });
    }
  }

  return {
    deleteNode:          deleteNode,
    deleteSelectedNodes: deleteSelectedNodes
  };
})();
window.__procedia_internal.registry.register('ndel', window.__procedia_internal.ndel);
