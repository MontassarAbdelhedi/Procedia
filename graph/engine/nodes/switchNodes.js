/**
 * graph/engine/nodes/switchNodes.js
 *
 * Switch node positions for effectors sharing the same affected upstream.
 * Swaps x/y positions, rewires connections, and reorders AE effects.
 *
 * Dependencies: graphState, nodeRegistry, engine/helpers.js, evalBridge
 * Load before: engine/nodes/index.js, engine/index.js
 *
 * Exports: findAffectedUpstream, findSiblingEffectors, switchEffectors
 */

var __e_nswitch = (function() {

  function findAffectedUpstream(nodeId) {
    var visited = {};
    var current = nodeId;
    while (true) {
      if (visited[current]) return null;
      visited[current] = true;
      var nodeData = graphState.getNode(current);
      if (!nodeData) return null;
      if (nodeData.nodeKind !== 'effector' && nodeData.nodeKind !== 'blending') {
        return current;
      }
      var wires = graphState.getAllWires();
      var found = false;
      for (var wid in wires) {
        var w = wires[wid];
        if (w.toNode === current && w.toPort === 'main_input' && w.type === 'layer') {
          current = w.fromNode;
          found = true;
          break;
        }
      }
      if (!found) return null;
    }
  }

  function findSiblingEffectors(nodeId) {
    var upstream = findAffectedUpstream(nodeId);
    if (!upstream) return [];

    var siblings = [];
    var visited = {};
    var queue = [upstream];
    visited[upstream] = true;

    while (queue.length > 0) {
      var current = queue.shift();
      if (current !== upstream && current !== nodeId) {
        var nodeData = graphState.getNode(current);
        if (nodeData && (nodeData.nodeKind === 'effector' || nodeData.nodeKind === 'blending')) {
          siblings.push(current);
        }
      }
      var wires = graphState.getAllWires();
      for (var wid in wires) {
        var w = wires[wid];
        if (w.fromNode === current && w.type === 'layer' && !visited[w.toNode]) {
          visited[w.toNode] = true;
          queue.push(w.toNode);
        }
      }
    }

    return siblings;
  }

  function switchEffectors(id1, id2) {
    var node1 = graphState.getNode(id1);
    var node2 = graphState.getNode(id2);
    if (!node1 || !node2) return;
    if (node1.nodeKind !== 'effector' || node2.nodeKind !== 'effector') return;

    var wires = graphState.getAllWires();
    var w1_in = null, w1_out = null, w2_in = null, w2_out = null;

    for (var wid in wires) {
      var w = wires[wid];
      if (w.type !== 'layer') continue;
      if (w.toNode === id1 && w.toPort === 'main_input') w1_in = w;
      if (w.fromNode === id1 && w.fromPort === 'output') w1_out = w;
      if (w.toNode === id2 && w.toPort === 'main_input') w2_in = w;
      if (w.fromNode === id2 && w.fromPort === 'output') w2_out = w;
    }

    if (!w1_in || !w1_out || !w2_in || !w2_out) return;

    if (w1_in === w2_out && w1_out === w2_in) return;

    var x1 = node1.x, y1 = node1.y;
    graphState.updateNode(id1, { x: node2.x, y: node2.y });
    graphState.updateNode(id2, { x: x1, y: y1 });

    graphState.updateWire(w1_in.id, { toNode: id2 });
    graphState.updateWire(w1_out.id, { fromNode: id2 });
    graphState.updateWire(w2_in.id, { toNode: id1 });
    graphState.updateWire(w2_out.id, { fromNode: id1 });

    _reorderEffectsInAE(id1, id2);

    __e_hlp.refreshNodeUI();
  }

  function _getEffectorChain(nodeId) {
    var upstream = findAffectedUpstream(nodeId);
    if (!upstream) return [];

    var chain = [];
    var visited = {};
    var queue = [upstream];
    visited[upstream] = true;

    while (queue.length > 0) {
      var current = queue.shift();
      if (current !== upstream) {
        var nodeData = graphState.getNode(current);
        if (nodeData && (nodeData.nodeKind === 'effector' || nodeData.nodeKind === 'blending')) {
          chain.push(current);
        }
      }
      var wires = graphState.getAllWires();
      for (var wid in wires) {
        var w = wires[wid];
        if (w.fromNode === current && w.type === 'layer' && !visited[w.toNode]) {
          visited[w.toNode] = true;
          queue.push(w.toNode);
        }
      }
    }

    return chain;
  }

  function _reorderEffectsInAE(id1, id2) {
    console.log('[switchNodes] _reorderEffectsInAE called with id1=' + id1 + ' id2=' + id2);

    var chain = _getEffectorChain(id1);
    console.log('[switchNodes] effector chain:', JSON.stringify(chain));
    if (chain.length < 2) {
      console.log('[switchNodes] chain too short, skipping reorder');
      return;
    }

    var hostingCompUUID = null;
    var pathLayerUUID = null;
    var order = [];
    for (var ci = 0; ci < chain.length; ci++) {
      var nd = graphState.getNode(chain[ci]);
      if (!nd) {
        console.log('[switchNodes] node not found for id:', chain[ci]);
        continue;
      }
      if (!hostingCompUUID && nd.hostingComps && nd.hostingComps.length > 0) {
        hostingCompUUID = nd.hostingComps[0];
      }
      if (!pathLayerUUID) {
        pathLayerUUID = __e_hlp.findPathLayerUUID(chain[ci]);
        console.log('[switchNodes] pathLayerUUID for ' + chain[ci] + ':', pathLayerUUID);
      }
      var def = nodeRegistry.getDefinition(nd.type);
      if (def && def.matchName) {
        order.push({ nodeUUID: chain[ci], matchName: def.matchName });
        console.log('[switchNodes] added to order:', nd.type, '->', def.matchName, 'UUID:', chain[ci]);
      } else {
        console.log('[switchNodes] no matchName for node:', chain[ci], 'type:', nd && nd.type);
      }
      if (hostingCompUUID && pathLayerUUID && order.length === chain.length) break;
    }

    console.log('[switchNodes] hostingCompUUID:', hostingCompUUID);
    console.log('[switchNodes] pathLayerUUID:', pathLayerUUID);
    console.log('[switchNodes] order:', JSON.stringify(order));

    if (!hostingCompUUID || !pathLayerUUID) {
      console.log('[switchNodes] missing comp or layer UUID, aborting');
      return;
    }
    if (order.length < 2) {
      console.log('[switchNodes] order too short, aborting');
      return;
    }

    var reorderCmd = {
      action: 'reorderEffectChain',
      params: {
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   pathLayerUUID,
        order:           order
      }
    };

    evalBridge.dispatch(reorderCmd).then(function(res) {
      console.log('[switchNodes] reorderEffectChain result:', JSON.stringify(res));
      if (res && res._debug && res._debug.length) {
        for (var di = 0; di < res._debug.length; di++) {
          console.log('[switchNodes:AE] ' + res._debug[di]);
        }
      }
    }).catch(function(err) {
      console.error('[switchNodes] reorderEffectChain failed:', err.message || err);
    });
  }

  return {
    findAffectedUpstream: findAffectedUpstream,
    findSiblingEffectors: findSiblingEffectors,
    switchEffectors: switchEffectors
  };

})();
