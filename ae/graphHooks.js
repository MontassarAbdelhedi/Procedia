// ─── Wire hooks — comp-to-comp layer creation / removal ──────────────────────

graphState.onWireAdded(function(w) {
  if (!csInterface) return;
  var fromNode = graphState.getNode(w.fromNode);
  var toNode   = graphState.getNode(w.toNode);
  if (!fromNode || !toNode) return;

  var fromIsComp = (fromNode.type === 'CompNode' || fromNode.type === 'core/comp');
  var toIsComp   = (toNode.type   === 'CompNode' || toNode.type   === 'core/comp');

  // Non-comp layer wired to a comp — prepend to inspector layer order so newest is at top
  if (!fromIsComp && toIsComp) {
    var compNode0 = graphState.getNode(w.toNode);
    var order0 = (compNode0 && compNode0._layerOrder) ? compNode0._layerOrder.slice() : [];
    if (order0.indexOf(w.fromNode) === -1) {
      order0.unshift(w.fromNode);
      graphState.updateNode(w.toNode, { _layerOrder: order0 });
    }
    if (fromNode.state === 'alive') {
      callAddLayerToComp(w.fromNode, w.toNode);
    }
    // If ghost, evaluateNodeState will fire ghost→alive → callMakeNodeAlive handles it
    return;
  }

  // Parent wire added — call setLayerParent if both nodes are alive in the same comp.
  // Fallback: check toPort in case type is missing (old persistence data).
  if (w.type === 'parent' || w.toPort === 'parent_in') {
    if (fromNode.state === 'alive' && toNode.state === 'alive') {
      var sharedCompPA = getSharedHostingComp(w.fromNode, w.toNode);
      if (sharedCompPA) {
        callSetLayerParent(w.fromNode, w.toNode, sharedCompPA);
      }
    }
    return;
  }

  if (!fromIsComp || !toIsComp) return;

  // Comp wired to comp — prepend to inspector layer order so newest is at top
  var compNode1 = graphState.getNode(w.toNode);
  var order1 = (compNode1 && compNode1._layerOrder) ? compNode1._layerOrder.slice() : [];
  if (order1.indexOf(w.fromNode) === -1) {
    order1.unshift(w.fromNode);
    graphState.updateNode(w.toNode, { _layerOrder: order1 });
  }

  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'addCompAsLayer(' + JSON.stringify(w.fromNode) + ', ' + JSON.stringify(w.toNode) + ')'
      );
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] addCompAsLayer failed:', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] addCompAsLayer error:', err.message);
    });
});

graphState.onWireRemoved(function(w) {
  if (!csInterface) return;
  var fromNode = graphState.getNode(w.fromNode);
  var toNode   = graphState.getNode(w.toNode);
  if (!fromNode || !toNode) return;

  var fromIsComp = (fromNode.type === 'CompNode' || fromNode.type === 'core/comp');
  var toIsComp   = (toNode.type   === 'CompNode' || toNode.type   === 'core/comp');

  // Non-comp layer wire to comp removed — prune _layerOrder, then clean up AE layer
  if (!fromIsComp && toIsComp) {
    var compNode0 = graphState.getNode(w.toNode);
    if (compNode0 && compNode0._layerOrder) {
      var pruned0 = [];
      for (var i = 0; i < compNode0._layerOrder.length; i++) {
        if (compNode0._layerOrder[i] !== w.fromNode) pruned0.push(compNode0._layerOrder[i]);
      }
      graphState.updateNode(w.toNode, { _layerOrder: pruned0 });
    }
    callRemoveLayerFromComp(w.fromNode, w.toNode);
    return;
  }

  // Parent wire removed — clear the parenting link if child is still alive.
  // Fallback: check toPort in case type is missing (old persistence data).
  if (w.type === 'parent' || w.toPort === 'parent_in') {
    if (fromNode.state === 'alive') {
      var sharedCompPR = getSharedHostingComp(w.fromNode, w.toNode);
      if (sharedCompPR) {
        callClearLayerParent(w.fromNode, sharedCompPR);
      }
    }
    return;
  }

  if (!fromIsComp || !toIsComp) return;

  // Comp-to-comp wire removed — prune _layerOrder
  var compNode1 = graphState.getNode(w.toNode);
  if (compNode1 && compNode1._layerOrder) {
    var pruned1 = [];
    for (var j = 0; j < compNode1._layerOrder.length; j++) {
      if (compNode1._layerOrder[j] !== w.fromNode) pruned1.push(compNode1._layerOrder[j]);
    }
    graphState.updateNode(w.toNode, { _layerOrder: pruned1 });
  }

  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'removeCompLayerFromComp(' + JSON.stringify(w.fromNode) + ', ' + JSON.stringify(w.toNode) + ')'
      );
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] removeCompLayerFromComp failed:', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] removeCompLayerFromComp error:', err.message);
    });
});

// ─── State change hook — fires makeNodeAlive on ghost → alive ────────────────

graphState.onNodeStateChange(function(uuid, oldState, newState) {
  if (newState === 'alive') {
    callMakeNodeAlive(uuid);
  } else if (newState === 'ghost' && oldState === 'alive') {
    callMakeNodeGhost(uuid);
  }
});
