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

window.__procedia_internal.ndel = (function() {
  var registry = window.__procedia_internal.registry;
  var hlp = registry.get('hlp');

  /**
   * Resolves the terminal wire UUID for a specific hosting comp.
   * Unlike hlp.findPathLayerUUID (which caches and returns the first path),
   * this follows each outgoing layer wire and only returns a match when
   * the downstream chain terminates at the given compUUID.
   *
   * @param {string} nodeId - Source node ID
   * @param {string} compUUID - Target comp node UUID
   * @returns {string|null} Terminal wire UUID, or null
   */
  function _resolveLayerUUIDForComp(nodeId, compUUID) {
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.fromNode !== nodeId || w.type !== 'layer') continue;
      var uuid = _walkToTerminalComp(w, compUUID, {});
      if (uuid) return uuid;
    }
    return null;
  }

  /**
   * Walks downstream from a wire to find if its chain terminates at targetCompUUID.
   *
   * @param {Object} wire - Wire data
   * @param {string} targetCompUUID - Target comp node UUID
   * @param {Object} visited - Visited set for cycle prevention
   * @returns {string|null} Terminal wire UUID, or null
   */
  function _walkToTerminalComp(wire, targetCompUUID, visited) {
    if (visited[wire.id]) return null;
    visited[wire.id] = true;
    var toData = graphState.getNode(wire.toNode);
    if (!toData) return null;
    if (toData.type === 'core/comp') {
      return wire.toNode === targetCompUUID ? (wire._pathLayerUUID || wire.id) : null;
    }
    var allWires = graphState.getAllWires();
    for (var wid in allWires) {
      if (!allWires.hasOwnProperty(wid)) continue;
      var nw = allWires[wid];
      if (nw.fromNode === wire.toNode && nw.type === 'layer') {
        var found = _walkToTerminalComp(nw, targetCompUUID, visited);
        if (found) return found;
      }
    }
    return null;
  }

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
            affGhostCmd = def && typeof def.onGhost === 'function' ? def.onGhost(nodeData, affHostUUID) : null;
            if (affGhostCmd && affGhostCmd.params) {
              affGhostCmd.params.layerUUID = _resolveLayerUUIDForComp(nodeData.id, affHostUUID) || hlp.findPathLayerUUID(nodeData.id);
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
            if (!effPathUUID) {
              effPathUUID = hlp.findPathLayerUUID(nodeId);
            }
            affGhostCmd = def ? def.onGhost(nodeData, affHostUUID, effPathUUID) : null;
          }
          if (affGhostCmd) affBatch.push(affGhostCmd);
        }
        if (affBatch.length > 0) evalBridge.dispatchBatch(affBatch);
      }

      if (cascadeAlgorithm && cascadeAlgorithm.isCompNode && cascadeAlgorithm.isCompNode(nodeId)) {
        // Comp node path
        // Upstream: ghost/park affected nodes and their effectors
        for (var cwId in delWireMap) {
          if (!delWireMap.hasOwnProperty(cwId)) continue;
          var cw = delWireMap[cwId];
          if (cw.toNode === nodeId && cw.type === 'layer' && cw._pathLayerUUID !== null) {
            cascadeAlgorithm.cascadeGhost(cwId);
          }
        }
        // Downstream: remove the AE layer from all hosting comps
        var outBatch = [];
        for (var owId in delWireMap) {
          if (!delWireMap.hasOwnProperty(owId)) continue;
          var ow = delWireMap[owId];
          if (ow.fromNode === nodeId && ow.type === 'layer' && ow._pathLayerUUID !== null) {
            outBatch.push({
              action: 'deletePathLayer',
              params: {
                hostingCompUUID: ow.toNode,
                layerUUID:       ow._pathLayerUUID
              }
            });
          }
        }
        if (outBatch.length > 0) {
          evalBridge.dispatchBatch(outBatch);
        }
        // Only delete the AE comp object if no clones reference this comp
        var cloneIds = graphState.getCloneIds ? graphState.getCloneIds(nodeId) : [];
        if (cloneIds.length === 0) {
          var compDeleteCmd = def ? def.onDelete(nodeData) : null;
          if (compDeleteCmd) evalBridge.dispatch(compDeleteCmd);
        }
      } else if (cascadeAlgorithm && cascadeAlgorithm.cascadeGhost) {
        for (var cwId in delWireMap) {
          if (!delWireMap.hasOwnProperty(cwId)) continue;
          var cw = delWireMap[cwId];
          if (cw.toNode === nodeId && cw.type === 'layer') {
            cascadeAlgorithm.cascadeGhost(cwId);
          }
        }
        var affDeleteCmd = def ? def.onDelete(nodeData) : null;
        if (affDeleteCmd) evalBridge.dispatch(affDeleteCmd);
      }
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

    if (typeof envSnapshot !== 'undefined' && envSnapshot.addAction) {
      envSnapshot.addAction('deleteNode', { type: nodeData.type, label: nodeData.props && nodeData.props.label });
    }
  }

  /**
   * Deletes all currently selected nodes from the graph.
   */
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
