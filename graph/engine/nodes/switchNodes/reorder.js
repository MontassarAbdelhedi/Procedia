/**
 * @fileoverview AE effect chain reordering for node switching.
 * Resolves the full effector chain and dispatches reorderEffectChain to AE.
 * @dependencies graph/graphState.js, graph/nodeRegistry.js,
 *               bridge/evalBridge.js, switchNodes/chain.js
 * @exports nswitch_reorder { _reorderEffectsInAE }
 */

// graph/engine/nodes/switchNodes/reorder.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             bridge/evalBridge.js, switchNodes/chain.js
// MUST LOAD BEFORE: switchNodes.js

window.__procedia_internal.nswitch_reorder = (function() {
  var registry = window.__procedia_internal.registry;
  var chain = registry.get('nswitch_chain');

  function _reorderEffectsInAE(id1, id2) {
    var effectorChain = chain._getEffectorChain(id1);
    if (effectorChain.length < 2) return;

    var hostingCompUUID = null;
    var pathLayerUUID = null;
    var order = [];
    for (var chainIndex = 0; chainIndex < effectorChain.length; chainIndex++) {
      var chainNode = graphState.getNode(effectorChain[chainIndex]);
      if (!chainNode) continue;
      if (!hostingCompUUID && chainNode.hostingComps && chainNode.hostingComps.length > 0) {
        hostingCompUUID = chainNode.hostingComps[0];
      }
      if (!pathLayerUUID) {
        pathLayerUUID = registry.get('hlp').findPathLayerUUID(effectorChain[chainIndex]);
      }
      var def = nodeRegistry.getDefinition(chainNode.type);
      if (def && def.matchName) {
        order.push({ nodeUUID: effectorChain[chainIndex], matchName: def.matchName });
      }
      if (hostingCompUUID && pathLayerUUID && order.length === effectorChain.length) break;
    }

    if (!hostingCompUUID || !pathLayerUUID) return;
    if (order.length < 2) return;

    var reorderCmd = {
      action: 'reorderEffectChain',
      params: {
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   pathLayerUUID,
        order:           order
      }
    };

    evalBridge.dispatch(reorderCmd).catch(function(err) {
      console.error('[switchNodes] reorderEffectChain failed:', err.message || err);
    });
  }

  return {
    _reorderEffectsInAE: _reorderEffectsInAE
  };
})();
window.__procedia_internal.registry.register('nswitch_reorder', window.__procedia_internal.nswitch_reorder);
