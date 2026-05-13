var nodeState = (function() {

  function getPortType(nodeId, portName) {
    var n = graphState.getNode(nodeId);
    if (!n) return null;
    var def = nodeRegistry.getByType(n.type);
    if (!def || !def.inputs) return null;
    for (var i = 0; i < def.inputs.length; i++) {
      if (def.inputs[i].name === portName) return def.inputs[i].type;
    }
    return null;
  }

  function hasCompDownstream(uuid) {
    var n = graphState.getNode(uuid);
    if (!n) return false;
    if (n.type === 'core/comp') return true;
    var visited = {};
    function dfs(id) {
      if (visited[id]) return false;
      visited[id] = true;
      var curr = graphState.getNode(id);
      if (curr && curr.type === 'core/comp') return true;
      var allWires = graphState.getAllWires();
      for (var wid in allWires) {
        if (allWires.hasOwnProperty(wid) && allWires[wid].fromNode === id) {
          if (dfs(allWires[wid].toNode)) return true;
        }
      }
      return false;
    }
    return dfs(uuid);
  }

  function evaluateNodeState(uuid, visited) {
    if (!visited) visited = {};
    if (visited[uuid]) return;
    visited[uuid] = true;
    var n = graphState.getNode(uuid);
    if (!n) return;
    if (n.type === 'core/comp') return;

    if (hasCompDownstream(uuid)) {
      graphState.updateNode(uuid, { state: 'alive' });
    } else {
      graphState.updateNode(uuid, { state: 'ghost' });
      var allWires = graphState.getAllWires();
      for (var wid in allWires) {
        if (!allWires.hasOwnProperty(wid)) continue;
        var w = allWires[wid];
        if (w.toNode === uuid && getPortType(uuid, w.toPort) === 'layer') {
          evaluateNodeState(w.fromNode, visited);
        }
      }
    }
  }

  return {
    getPortType:       getPortType,
    evaluateNodeState: evaluateNodeState
  };

}());
