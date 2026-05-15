// ─── Wire hooks — comp-to-comp layer creation / removal ──────────────────────

graphState.onWireAdded(function(w) {
  if (!csInterface) return;
  var fromNode = graphState.getNode(w.fromNode);
  var toNode   = graphState.getNode(w.toNode);
  if (!fromNode || !toNode) return;

  // Non-comp layer wired to a comp — prepend to inspector layer order so newest is at top
  if (fromNode.type !== 'core/comp' && toNode.type === 'core/comp') {
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

  if (fromNode.type !== 'core/comp' || toNode.type !== 'core/comp') return;

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

  // Non-comp layer wire to comp removed — prune _layerOrder, then clean up AE layer
  if (fromNode.type !== 'core/comp' && toNode.type === 'core/comp') {
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

  if (fromNode.type !== 'core/comp' || toNode.type !== 'core/comp') return;

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
