/**
 * @fileoverview Effector chain traversal utilities for node switching.
 * Finds the upstream affected node, sibling effectors sharing the same
 * upstream, and the full effector chain.
 * @dependencies graph/graphState.js, graph/nodeRegistry.js
 * @exports nswitch_chain { findAffectedUpstream, findSiblingEffectors, _getEffectorChain }
 */

// graph/engine/nodes/switchNodes/chain.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: switchNodes/reorder.js, switchNodes.js

window.__procedia_internal.nswitch_chain = (function() {
  var registry = window.__procedia_internal.registry;

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

  return {
    findAffectedUpstream: findAffectedUpstream,
    findSiblingEffectors: findSiblingEffectors,
    _getEffectorChain:    _getEffectorChain
  };
})();
window.__procedia_internal.registry.register('nswitch_chain', window.__procedia_internal.nswitch_chain);
