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

    if (wouldCycle(drag.fromNodeId, toNodeId)) { cancelDrag(); return false; }

    var allWires  = graphState.getAllWires();
    var toNodeDef = graphState.getNode(toNodeId);
    var isComp    = toNodeDef && toNodeDef.type === 'core/comp';

    if (isComp) {
      // Comp input accepts unlimited wires — only block exact duplicates
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

    nodeState.evaluateNodeState(fromNodeId);
    nodeState.evaluateNodeState(toNodeId);

    cancelDrag();
    return true;
  }

  function deleteWire(wireId) {
    var w = graphState.getWire(wireId);
    if (!w) return;
    var portType = nodeState.getPortType(w.toNode, w.toPort);
    var fromNode = w.fromNode;
    var toNode   = w.toNode;
    graphState.removeWire(wireId);

    if (portType === 'data') {
      graphState.updateNode(fromNode, { state: 'ghost' });
      return;
    }

    nodeState.evaluateNodeState(fromNode);
    nodeState.evaluateNodeState(toNode);
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
