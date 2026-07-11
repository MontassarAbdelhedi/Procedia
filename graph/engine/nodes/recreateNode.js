/**
 * graph/engine/nodes/recreateNode.js
 *
 * Recreates a node in 'error' state by dispatching onAlive commands for each
 * of its hosting compositions. Handles affected, effector, blending, and matte
 * node kind-specific logic.
 *
 * Dependencies: graphState, nodeRegistry, evalBridge, engine/helpers.js
 * Load before: nodes/index.js
 *
 * Exports: recreateNode
 */
// graph/engine/nodes/recreateNode.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             bridge/evalBridge.js, graph/engine/helpers.js
// MUST LOAD BEFORE: nodes/index.js

window.__procedia_internal.nrec = (function() {
  var registry = window.__procedia_internal.registry;
  var hlp = registry.get('hlp');

  /**
   * Recreates a node that is in 'error' state by dispatching onAlive commands
   * for each of its hosting compositions. Handles node kind-specific logic.
   *
   * @param {string} nodeId - ID of the node to recreate
   */
  function recreateNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) { console.warn('[engine] recreateNode: node not found: ' + nodeId); return; }
    if (nodeData.state !== 'error') return;

    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    var wireMap = graphState.getAllWires();

    // comp nodes have no hostingComps — recreate directly
    if (nodeData.type === 'core/comp') {
      var cmd = def.onAlive(nodeData, null);
      if (cmd) {
        (function(nId, cCmd) {
          evalBridge.dispatch(cCmd).then(function(res) {
            if (res.ok) {
              graphState.updateNode(nId, { state: 'alive' });
              hlp.refreshNodeUI();
            }
          });
        })(nodeId, cmd);
      }
      return;
    }

    for (var c = 0; c < nodeData.hostingComps.length; c++) {
      var hostUUID = nodeData.hostingComps[c];

      if (nodeData.nodeKind === 'affected') {
        var oldLayerUUID = hlp.findPathLayerUUID(nodeId);
        // Generate a fresh UUID for the replacement layer to avoid
        // collision if the old AE layer still exists.
        var newLayerUUID = null;
        if (oldLayerUUID) {
          newLayerUUID = uuidGenerator.node();
          var wm = graphState.getAllWires();
          if (wm[oldLayerUUID]) {
            graphState.updateWire(oldLayerUUID, { _pathLayerUUID: newLayerUUID });
          }
        }
        var cmd = def.onAlive(nodeData, hostUUID);
        if (cmd) {
          cmd.params.layerUUID = newLayerUUID || oldLayerUUID;
          (function(nId, cCmd) {
            evalBridge.dispatch(cCmd).then(function(res) {
              if (res.ok) {
                graphState.updateNode(nId, { state: 'alive' });
                hlp.refreshNodeUI();
              } else {
                console.error('[engine] recreateNode onAlive failed: ' + nId + ': ' + res.error);
              }
            });
          })(nodeId, cmd);
        }

      } else if (nodeData.nodeKind === 'effector') {
        var upstreamUUID = null;
        for (var wId in wireMap) {
          if (!wireMap.hasOwnProperty(wId)) continue;
          var w = wireMap[wId];
          if (w.toNode === nodeId && w.toPort === 'main_input') {
            upstreamUUID = hlp.findPathLayerUUID(w.fromNode);
            break;
          }
        }
        var cmd = def.onAlive(nodeData, hostUUID, upstreamUUID);
        if (cmd) {
          (function(nId, cCmd) {
            evalBridge.dispatch(cCmd).then(function(res) {
              if (res.ok) {
                graphState.updateNode(nId, { state: 'alive' });
                hlp.refreshNodeUI();
              }
            });
          })(nodeId, cmd);
        }

      } else if (nodeData.nodeKind === 'blending') {
        var blendUpstreamUUID = null;
        for (var bwId in wireMap) {
          if (!wireMap.hasOwnProperty(bwId)) continue;
          var bw = wireMap[bwId];
          if (bw.toNode === nodeId && bw.toPort === 'main_input') {
            blendUpstreamUUID = hlp.findPathLayerUUID(bw.fromNode);
            break;
          }
        }
        var cmd = def.onAlive(nodeData, hostUUID, blendUpstreamUUID);
        if (cmd) {
          (function(nId2, cCmd2) {
            evalBridge.dispatch(cCmd2).then(function(res) {
              if (res.ok) {
                graphState.updateNode(nId2, { state: 'alive' });
              }
            });
          })(nodeId, cmd);
        }

      } else if (nodeData.nodeKind === 'merge' || nodeData.nodeKind === 'multimerge') {
        graphState.updateNode(nodeId, { state: 'alive' });

      } else if (nodeData.nodeKind === 'matte') {
        var matteTopUUID = null;
        var matteLayerUUID = null;
        for (var mwId in wireMap) {
          if (!wireMap.hasOwnProperty(mwId)) continue;
          var mw = wireMap[mwId];
          if (mw.toNode === nodeId) {
            if (mw.toPort === 'top_layer')   matteTopUUID   = hlp.findPathLayerUUID(mw.fromNode);
            if (mw.toPort === 'matte_layer') matteLayerUUID = hlp.findPathLayerUUID(mw.fromNode);
          }
        }
        var cmd = def.onAlive(nodeData, hostUUID, matteTopUUID, matteLayerUUID);
        if (cmd) {
          (function(nId2, cCmd2) {
            evalBridge.dispatch(cCmd2).then(function(res) {
              if (res.ok) {
                graphState.updateNode(nId2, { state: 'alive' });
              }
            });
          })(nodeId, cmd);
        }
      }
    }
  }

  return {
    recreateNode: recreateNode
  };

})();
window.__procedia_internal.registry.register('nrec', window.__procedia_internal.nrec);
