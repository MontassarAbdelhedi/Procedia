/**
 * graph/engine/nodes/deleteNode.js
 *
 * Deletes nodes from the graph with kind-specific cleanup: onGhost/onDelete
 * dispatch, cascade ghosting for comp nodes, and wire removal.
 *
 * Dependencies: graphState, nodeRegistry, evalBridge, cascade/index.js,
 *               engine/helpers.js
 * Load before: nodes/index.js
 *
 * Exports: deleteNode, deleteSelectedNodes
 */
// graph/engine/nodes/deleteNode.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             bridge/evalBridge.js, graph/cascade/index.js,
//             graph/engine/helpers.js
// MUST LOAD BEFORE: nodes/index.js

var __e_ndel = (function() {
  var hlp = __e_hlp;

  /**
   * Deletes a node from the graph. Handles node kind-specific cleanup:
   * dispatching onGhost/onDelete commands, cascade ghosting for comp nodes,
   * and removing all associated wires.
   *
   * @param {string} nodeId - ID of the node to delete
   */
  function deleteNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) {
      console.warn('[engine] deleteNode: node not found: ' + nodeId);
      return;
    }

    var def = nodeRegistry.getDefinition(nodeData.type);
    var delWireMap = graphState.getAllWires();

    if (nodeData.nodeKind === 'data') {
      var dataCmd = def ? def.onDelete(nodeData) : null;
      if (dataCmd) evalBridge.dispatch(dataCmd);

    } else if (nodeData.nodeKind === 'blending' || nodeData.nodeKind === 'matte') {
      var batchCmds = [];
      for (var bi = 0; bi < nodeData.hostingComps.length; bi++) {
        var bmHostUUID = nodeData.hostingComps[bi];
        var bmGhostCmd = null;
        if (nodeData.nodeKind === 'blending') {
          var blendUpstreamUUID = null;
          for (var bwId in delWireMap) {
            if (!delWireMap.hasOwnProperty(bwId)) continue;
            var bw = delWireMap[bwId];
            if (bw.toNode === nodeId && bw.toPort === 'main_input') {
              blendUpstreamUUID = hlp.findPathLayerUUID(bw.fromNode);
              break;
            }
          }
          bmGhostCmd = def ? def.onGhost(nodeData, bmHostUUID, blendUpstreamUUID) : null;
        } else {
          var matteTopUUID = null;
          for (var mwId in delWireMap) {
            if (!delWireMap.hasOwnProperty(mwId)) continue;
            var mw = delWireMap[mwId];
            if (mw.toNode === nodeId && mw.toPort === 'top_layer') {
              matteTopUUID = hlp.findPathLayerUUID(mw.fromNode);
              break;
            }
          }
          bmGhostCmd = def ? def.onGhost(nodeData, bmHostUUID, matteTopUUID) : null;
        }
        if (bmGhostCmd) batchCmds.push(bmGhostCmd);
      }
      if (batchCmds.length > 0) evalBridge.dispatchBatch(batchCmds);
      var bmDeleteCmd = def ? def.onDelete(nodeData) : null;
      if (bmDeleteCmd) evalBridge.dispatch(bmDeleteCmd);

    } else {
      if (nodeData.state === 'alive') {
        var affBatch = [];
        for (var ai = 0; ai < nodeData.hostingComps.length; ai++) {
          var affHostUUID = nodeData.hostingComps[ai];
          var affGhostCmd = null;
          if (nodeData.nodeKind === 'affected') {
            affGhostCmd = def ? def.onGhost(nodeData, affHostUUID) : null;
            if (affGhostCmd && affGhostCmd.params) {
              affGhostCmd.params.layerUUID = hlp.findPathLayerUUID(nodeData.id);
            }
          } else {
            var effPathUUID = null;
            for (var ewId in delWireMap) {
              if (!delWireMap.hasOwnProperty(ewId)) continue;
              var ew = delWireMap[ewId];
              if (ew.toNode === nodeId && ew.toPort === 'main_input') {
                effPathUUID = hlp.findPathLayerUUID(ew.fromNode);
                break;
              }
            }
            affGhostCmd = def ? def.onGhost(nodeData, affHostUUID, effPathUUID) : null;
          }
          if (affGhostCmd) affBatch.push(affGhostCmd);
        }
        if (affBatch.length > 0) evalBridge.dispatchBatch(affBatch);
      }

      // Both branches delegate to cascadeGhost(), which internally skips
      // CompNodes, dormant wires, and non-layer types. The isCompNode branch
      // pre-filters to active wires (_pathLayerUUID !== null) as a minor
      // optimization, but the fallback works identically — cascadeGhost
      // returns early when the cascade set is empty.
      if (cascadeAlgorithm && cascadeAlgorithm.isCompNode && cascadeAlgorithm.isCompNode(nodeId)) {
        var cascadeWireIds = [];
        for (var cwId in delWireMap) {
          if (!delWireMap.hasOwnProperty(cwId)) continue;
          var cw = delWireMap[cwId];
          if (cw.toNode === nodeId && cw.type === 'layer' && cw._pathLayerUUID !== null) {
            cascadeWireIds.push(cwId);
          }
        }
        for (var ci = 0; ci < cascadeWireIds.length; ci++) {
          cascadeAlgorithm.cascadeGhost(cascadeWireIds[ci]);
        }
      } else if (cascadeAlgorithm && cascadeAlgorithm.cascadeGhost) {
        for (var cwId in delWireMap) {
          if (!delWireMap.hasOwnProperty(cwId)) continue;
          var cw = delWireMap[cwId];
          if (cw.toNode === nodeId && cw.type === 'layer') {
            cascadeAlgorithm.cascadeGhost(cwId);
          }
        }
      }

      var affDeleteCmd = def ? def.onDelete(nodeData) : null;
      if (affDeleteCmd) evalBridge.dispatch(affDeleteCmd);
    }

    var parentCleanupBatch = [];
    var parentDelWires = graphState.getAllWires();
    for (var pwId in parentDelWires) {
      if (!parentDelWires.hasOwnProperty(pwId)) continue;
      var pw = parentDelWires[pwId];
      if (pw.type !== 'parent') continue;
      if (pw.fromNode === nodeId || pw.toNode === nodeId) {
        var childData = graphState.getNode(pw.fromNode);
        var childLayerUUID = hlp.findPathLayerUUID(pw.fromNode);
        var hostCompUUID = null;
        if (childData && childData.hostingComps.length > 0) {
          hostCompUUID = childData.hostingComps[0];
        } else {
          var parentData = graphState.getNode(pw.toNode);
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
  }

  /**
   * Deletes all currently selected nodes from the graph.
   */
  function deleteSelectedNodes() {
    var sel = graphState.getSelection().slice();
    if (sel.length === 0) return;
    for (var i = 0; i < sel.length; i++) {
      deleteNode(sel[i]);
    }
  }

  return {
    deleteNode:          deleteNode,
    deleteSelectedNodes: deleteSelectedNodes
  };

})();
