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
  var lifecycle = window.__procedia_internal.lifecycle;

  function recreateNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) { console.warn('[engine] recreateNode: node not found: ' + nodeId); return; }
    if (nodeData.state !== 'error') return;

    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

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

      // merge/multimerge: no AE action, set alive immediately
      if (nodeData.nodeKind === 'merge' || nodeData.nodeKind === 'multimerge') {
        graphState.updateNode(nodeId, { state: 'alive' });
        continue;
      }

      // affected: regenerate UUID to avoid collision, then dispatch hook
      if (nodeData.nodeKind === 'affected') {
        var oldLayerUUID = hlp.findPathLayerUUID(nodeId);
        var newLayerUUID = null;
        if (oldLayerUUID) {
          newLayerUUID = uuidGenerator.node();
          var wm = graphState.getAllWires();
          if (wm[oldLayerUUID]) {
            graphState.updateWire(oldLayerUUID, { _pathLayerUUID: newLayerUUID });
          }
        }
        var cmd = lifecycle.buildLifecycleCommand(nodeData, def, 'onAlive', undefined, undefined, hostUUID);
        if (cmd) {
          cmd.params.layerUUID = newLayerUUID || oldLayerUUID;
          _dispatchAlive(nodeId, cmd);
        }
        continue;
      }

      var cmd = lifecycle.buildLifecycleCommand(nodeData, def, 'onAlive', undefined, undefined, hostUUID);
      if (cmd) {
        _dispatchAlive(nodeId, cmd);
      }
    }
  }

  function _dispatchAlive(nodeId, cmd) {
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

  return {
    recreateNode: recreateNode
  };

})();
window.__procedia_internal.registry.register('nrec', window.__procedia_internal.nrec);
