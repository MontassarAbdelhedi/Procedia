/**
 * graph/engine/nodes/switchNodes.js
 *
 * Switch node positions for effectors sharing the same affected upstream.
 * Swaps x/y positions, rewires connections, and reorders AE effects.
 * Delegates chain traversal to switchNodes/chain.js and AE reordering to
 * switchNodes/reorder.js.
 *
 * Dependencies: graphState, nodeRegistry, engine/helpers.js, evalBridge,
 *               switchNodes/chain.js, switchNodes/reorder.js
 * Load before: engine/nodes/index.js, engine/index.js
 *
 * Exports: findAffectedUpstream, findSiblingEffectors, switchEffectors
 */

window.__procedia_internal.nswitch = (function() {
  var registry = window.__procedia_internal.registry;
  var chain = registry.get('nswitch_chain');
  var reorder = registry.get('nswitch_reorder');

  function switchEffectors(id1, id2) {
    var node1 = graphState.getNode(id1);
    var node2 = graphState.getNode(id2);
    if (!node1 || !node2) return;
    if (node1.nodeKind !== 'effector' || node2.nodeKind !== 'effector') return;

    var wires = graphState.getAllWires();
    var node1InputWire = null, node1OutputWire = null, node2InputWire = null, node2OutputWire = null;

    for (var wid in wires) {
      var w = wires[wid];
      if (w.type !== 'layer') continue;
      if (w.toNode === id1 && w.toPort === 'main_input') node1InputWire = w;
      if (w.fromNode === id1 && w.fromPort === 'output') node1OutputWire = w;
      if (w.toNode === id2 && w.toPort === 'main_input') node2InputWire = w;
      if (w.fromNode === id2 && w.fromPort === 'output') node2OutputWire = w;
    }

    if (!node1InputWire || !node1OutputWire || !node2InputWire || !node2OutputWire) return;

    if (node1InputWire === node2OutputWire && node1OutputWire === node2InputWire) return;

    var x1 = node1.x, y1 = node1.y;
    graphState.updateNode(id1, { x: node2.x, y: node2.y });
    graphState.updateNode(id2, { x: x1, y: y1 });

    graphState.updateWire(node1InputWire.id, { toNode: id2 });
    graphState.updateWire(node1OutputWire.id, { fromNode: id2 });
    graphState.updateWire(node2InputWire.id, { toNode: id1 });
    graphState.updateWire(node2OutputWire.id, { fromNode: id1 });

    reorder._reorderEffectsInAE(id1, id2);

    registry.get('hlp').refreshNodeUI();
  }

  return {
    findAffectedUpstream: chain.findAffectedUpstream,
    findSiblingEffectors: chain.findSiblingEffectors,
    switchEffectors:      switchEffectors
  };
})();
window.__procedia_internal.registry.register('nswitch', window.__procedia_internal.nswitch);
