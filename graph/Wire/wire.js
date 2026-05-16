// graph/Wire/wire.js
// DEPENDS ON: graph/graphState.js, graph/nodes/nodeRegistry.js, graph/Wire/nodeState.js, data/uuidGenerator.js
// MUST LOAD BEFORE: graph/Wire/wireRenderer.js, graph/canvas/input.js

var wire = (function() {

  // ─── Drag state ───────────────────────────────────────────────

  var drag = {
    active:     false,
    fromNodeId: null,
    cursorX:    0,
    cursorY:    0
  };

  function isDragging()  { return drag.active; }
  function getDragState() { return drag; }

  function startDrag(fromNodeId, screenX, screenY) {
    drag.active     = true;
    drag.fromNodeId = fromNodeId;
    drag.cursorX    = screenX;
    drag.cursorY    = screenY;
  }

  function moveDrag(screenX, screenY) {
    drag.cursorX = screenX;
    drag.cursorY = screenY;
  }

  function cancelDrag() {
    drag.active     = false;
    drag.fromNodeId = null;
  }

  // ─── Cycle detection — DFS downstream from startId ───────────

  function hasDownstreamPath(startId, targetId) {
    var visited = {};
    function dfs(id) {
      if (id === targetId) return true;
      if (visited[id]) return false;
      visited[id] = true;
      var wires = graphState.getAllWires();
      for (var wid in wires) {
        if (wires.hasOwnProperty(wid) && wires[wid].fromNode === id) {
          if (dfs(wires[wid].toNode)) return true;
        }
      }
      return false;
    }
    return dfs(startId);
  }

  function wouldCycle(fromId, toId) {
    return hasDownstreamPath(toId, fromId);
  }

  // ─── Commit wire on mouseup over a valid input port ───────────
  // Returns true if a wire was confirmed, false if rejected.

  function tryCommit(toNodeId, toPortName) {
    if (!drag.active || !drag.fromNodeId) return false;
    if (drag.fromNodeId === toNodeId) { cancelDrag(); return false; }

    var toPortType = nodeState.getPortType(toNodeId, toPortName);
    if (!toPortType) { cancelDrag(); return false; }

    // Resolve output port type of the source node
    var fromNode    = graphState.getNode(drag.fromNodeId);
    var fromDef     = fromNode ? nodeRegistry.getByType(fromNode.type) : null;
    var fromPortType = null;
    if (fromDef && fromDef.outputs) {
      for (var oi = 0; oi < fromDef.outputs.length; oi++) {
        if (fromDef.outputs[oi].port === 'output') { fromPortType = fromDef.outputs[oi].type; break; }
      }
    }
    if (fromPortType && fromPortType !== toPortType) { cancelDrag(); return false; }

    if (wouldCycle(drag.fromNodeId, toNodeId)) { cancelDrag(); return false; }

    var allWires    = graphState.getAllWires();
    var toNodeData  = graphState.getNode(toNodeId);
    var toRegistryDef = toNodeData ? nodeRegistry.getByType(toNodeData.type) : null;
    var toPortDef   = null;
    if (toRegistryDef && toRegistryDef.inputs) {
      for (var pi = 0; pi < toRegistryDef.inputs.length; pi++) {
        var inp = toRegistryDef.inputs[pi];
        if (inp.port === toPortName || inp.name === toPortName) { toPortDef = inp; break; }
      }
    }
    var isUnlimited = toPortDef && toPortDef.multiplicity === 'unlimited';

    if (isUnlimited) {
      // Unlimited-multiplicity port — only block exact duplicates
      for (var wid in allWires) {
        if (allWires.hasOwnProperty(wid) &&
            allWires[wid].fromNode === drag.fromNodeId &&
            allWires[wid].toNode  === toNodeId &&
            allWires[wid].toPort  === toPortName) {
          cancelDrag();
          return false;
        }
      }
    } else {
      // All other nodes: one wire per input port — replace existing
      for (var wid in allWires) {
        if (allWires.hasOwnProperty(wid) &&
            allWires[wid].toNode === toNodeId &&
            allWires[wid].toPort === toPortName) {
          graphState.removeWire(wid);
          break;
        }
      }
    }

    var wireId     = uuidGenerator.generateWireId();
    var fromNodeId = drag.fromNodeId;

    graphState.addWire({
      id:       wireId,
      fromNode: fromNodeId,
      fromPort: 'output',
      toNode:   toNodeId,
      toPort:   toPortName
    });

    var fromNewState = nodeState.evaluateNodeState(fromNodeId);
    var toNewState   = nodeState.evaluateNodeState(toNodeId);

    if (fromNewState === 'alive') {
      graphState.onAlive(fromNodeId);
    } else {
      graphState.updateNode(fromNodeId, { state: fromNewState });
    }
    graphState.updateNode(toNodeId, { state: toNewState });

    cancelDrag();
    return true;
  }

  function deleteWire(wireId) {
    var w = graphState.getWire(wireId);
    if (!w) return;
    graphState.removeWire(wireId);
    nodeState.cascadeGhost(w);
  }

  // ─── Public API ───────────────────────────────────────────────

  return {
    isDragging:   isDragging,
    getDragState: getDragState,
    startDrag:    startDrag,
    moveDrag:     moveDrag,
    cancelDrag:   cancelDrag,
    tryCommit:    tryCommit,
    deleteWire:   deleteWire
  };

}());
