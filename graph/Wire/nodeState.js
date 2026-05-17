// graph/Wire/nodeState.js
// DEPENDS ON: graph/graphState/store.js, graph/nodes/nodeRegistry.js
// MUST LOAD BEFORE: graph/Wire/wire.js

var nodeState = (function() {

  // ─── Port type lookup ─────────────────────────────────────────

  function getPortType(nodeId, portName) {
    var n = graphState.getNode(nodeId);
    if (!n) return null;
    var def = nodeRegistry.getByType(n.type);
    if (!def || !def.inputs) return null;
    for (var i = 0; i < def.inputs.length; i++) {
      if (def.inputs[i].name === portName || def.inputs[i].port === portName) {
        return def.inputs[i].type;
      }
    }
    return null;
  }

  function isComp(nodeId) {
    var n = graphState.getNode(nodeId);
    if (!n) return false;
    return n.type === 'CompNode' || n.type === 'core/comp';
  }

  // ─── getReachableComps ────────────────────────────────────────
  // Returns array of CompNode UUIDs reachable downstream via layer wires.
  // Used by onAlive to determine which AE comps to host the node in.

  function getReachableComps(uuid) {
    if (isComp(uuid)) return [uuid];
    var visited = {};
    var result  = [];
    function dfs(id) {
      if (visited[id]) return;
      visited[id] = true;
      if (isComp(id)) { result.push(id); return; }
      var allWires = graphState.getAllWires();
      for (var wid in allWires) {
        if (!allWires.hasOwnProperty(wid)) continue;
        var w = allWires[wid];
        if (w.fromNode !== id) continue;
        if (getPortType(w.toNode, w.toPort) === 'data') continue;
        if (getPortType(w.toNode, w.toPort) === 'parent') continue;
        dfs(w.toNode);
      }
    }
    dfs(uuid);
    return result;
  }

  // ─── hasCompDownstream ────────────────────────────────────────
  // Returns true if any CompNode is reachable downstream via layer wires.
  // Stops at data-wire boundaries (does not follow data-typed input ports).
  // Stops at CompNode boundaries (CompNode has no outputs worth traversing).

  function hasCompDownstream(uuid) {
    if (isComp(uuid)) return true;
    var visited = {};
    function dfs(id) {
      if (visited[id]) return false;
      visited[id] = true;
      if (isComp(id)) return true;
      var allWires = graphState.getAllWires();
      for (var wid in allWires) {
        if (!allWires.hasOwnProperty(wid)) continue;
        var w = allWires[wid];
        if (w.fromNode !== id) continue;
        // Skip data and parent wire boundaries — neither traverses into comp paths
        if (getPortType(w.toNode, w.toPort) === 'data') continue;
        if (getPortType(w.toNode, w.toPort) === 'parent') continue;
        if (dfs(w.toNode)) return true;
      }
      return false;
    }
    return dfs(uuid);
  }

  // ─── evaluateNodeState ────────────────────────────────────────
  // Pure: returns 'alive' or 'ghost'. Does NOT mutate nodeMap.

  function evaluateNodeState(uuid) {
    if (isComp(uuid)) return 'alive';
    return hasCompDownstream(uuid) ? 'alive' : 'ghost';
  }

  // ─── cascadeGhost ─────────────────────────────────────────────
  // Called after a wire is removed. BFS upstream from deletedWire.fromNode,
  // collecting every node that has lost its comp path.
  // Effectors ghost first (deepest first), then affected nodes.
  // AE calls (removeEffector / parkLayer) are guarded — fire only when nodeOps is ready.

  function cascadeGhost(deletedWire) {
    var startId = deletedWire.fromNode;
    var visited = {};
    var queue   = [{ id: startId, depth: 0 }];
    var effectors = [];
    var affected  = [];

    while (queue.length > 0) {
      var item  = queue.shift();
      var id    = item.id;
      var depth = item.depth;
      if (visited[id]) continue;
      visited[id] = true;

      var n = graphState.getNode(id);
      if (!n) continue;
      if (n.type === 'CompNode' || n.type === 'core/comp') continue;
      if (hasCompDownstream(id)) continue; // still alive via another path

      if (n.nodeKind === 'effector') {
        effectors.push({ id: id, depth: depth });
      } else {
        affected.push({ id: id, depth: depth });
      }

      // Traverse upstream via layer wires only
      var allWires = graphState.getAllWires();
      for (var wid in allWires) {
        if (!allWires.hasOwnProperty(wid)) continue;
        var w = allWires[wid];
        if (w.toNode !== id) continue;
        if (getPortType(id, w.toPort) === 'data') continue;   // skip data boundaries
        if (getPortType(id, w.toPort) === 'parent') continue; // skip parent boundaries — parent wires never cascade
        queue.push({ id: w.fromNode, depth: depth + 1 });
      }
    }

    // Effectors deepest first
    effectors.sort(function(a, b) { return b.depth - a.depth; });

    // Effectors: AE removeEffector first (cascade responsibility), then state update via onGhost.
    // Guard: nodeOps.removeEffector wired at T12.1 — no-op until then.
    for (var i = 0; i < effectors.length; i++) {
      var uuid = effectors[i].id;
      var en   = graphState.getNode(uuid);
      if (en && en.hostingComps) {
        for (var j = 0; j < en.hostingComps.length; j++) {
          if (typeof nodeOps !== 'undefined' && typeof nodeOps.removeEffector === 'function') {
            nodeOps.removeEffector(uuid, null, en.hostingComps[j]);
          }
        }
      }
      graphState.onGhost(uuid);
    }

    // Step 3.5 — clear AE parent links before parking
    // Parent wires are invisible to the cascade, so we clear them explicitly here.
    for (var s = 0; s < affected.length; s++) {
      var sUUID = affected[s].id;
      var sNode = graphState.getNode(sUUID);
      var sComp = null;
      if (sNode && sNode.hostingComps && sNode.hostingComps.length > 0) {
        sComp = sNode.hostingComps[0];
      }
      if (!sComp && sNode) { sComp = sNode._hostingCompUUID || null; }
      if (!sComp) continue;

      var allWires35 = graphState.getAllWires();
      for (var wid35 in allWires35) {
        if (!allWires35.hasOwnProperty(wid35)) continue;
        var w35 = allWires35[wid35];
        if (w35.type !== 'parent' && w35.toPort !== 'parent_in') continue;

        // This node is a child — clear its outbound parent link
        if (w35.fromNode === sUUID) {
          if (typeof callClearLayerParent === 'function') {
            callClearLayerParent(sUUID, sComp);
          }
        }

        // This node is a parent — clear links for children still alive
        if (w35.toNode === sUUID) {
          var childUUID35  = w35.fromNode;
          var childGhosting = false;
          for (var sg = 0; sg < affected.length; sg++) {
            if (affected[sg].id === childUUID35) { childGhosting = true; break; }
          }
          if (!childGhosting) {
            var childNode35 = graphState.getNode(childUUID35);
            if (childNode35 && childNode35.state === 'alive') {
              if (typeof callClearLayerParent === 'function') {
                callClearLayerParent(childUUID35, sComp);
              }
            }
          }
        }
      }
    }

    // Affected nodes: onGhost parks the layer in AE and updates state.
    for (var i = 0; i < affected.length; i++) {
      graphState.onGhost(affected[i].id);
    }

    graphState.rebuildTempGraph();
  }

  return {
    getPortType:       getPortType,
    getReachableComps: getReachableComps,
    hasCompDownstream: hasCompDownstream,
    evaluateNodeState: evaluateNodeState,
    cascadeGhost:      cascadeGhost
  };

}());
