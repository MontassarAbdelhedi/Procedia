/**
 * Cycle detection for layer-type wires.
 * Uses DFS from the target node to check whether connecting
 * fromNode -> toNode would create a cycle.
 * @module cycleChecker
 * @dependencies graph/graphState.js
 * @exports hasCycle
 */
// graph/cycleChecker.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: graph/wire/wire.js, graph/engine/index.js

var cycleChecker = (function() {

  /**
   * Performs DFS from toNodeId to check if fromNodeId is reachable,
   * which would indicate a cycle if the wire is added.
   * @param {string} fromNodeId - Source node of the proposed wire
   * @param {string} toNodeId - Target node of the proposed wire
   * @returns {boolean} True if a cycle would be created
   */
  function hasCycle(fromNodeId, toNodeId) {
    var visited = {};
    var stack = [toNodeId];
    var wires = graphState.getAllWires();

    while (stack.length > 0) {
      var current = stack.pop();
      if (current === fromNodeId) return true;
      if (visited[current]) continue;
      visited[current] = true;

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
