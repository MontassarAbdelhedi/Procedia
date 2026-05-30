// graph/cycleChecker.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: graph/wire/wire.js, graph/engine.js

var cycleChecker = (function() {

  function hasCycle(fromNodeId, toNodeId) {
    var visited = {};
    var stack = [toNodeId];

    while (stack.length > 0) {
      var current = stack.pop();
      if (current === fromNodeId) return true;
      if (visited[current]) continue;
      visited[current] = true;

      var wires = graphState.getAllWires();
      for (var wireId in wires) {
        if (!wires.hasOwnProperty(wireId)) continue;
        var wire = wires[wireId];
        if (wire.type === 'layer' && wire.fromNode === current) {
          stack.push(wire.toNode);
        }
      }
    }
    return false;
  }

  return { hasCycle: hasCycle };

})();
