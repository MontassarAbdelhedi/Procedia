// graph/Wire/wire.js
// DEPENDS ON: graph/graphState/lifecycle.js, graph/nodes/nodeRegistry.js, graph/Wire/nodeState.js, data/uuidGenerator.js
// MUST LOAD BEFORE: graph/Wire/wireRenderer.js, graph/canvas/input/labelEditor.js

var wire = (function() {

  // ─── Drag state ───────────────────────────────────────────────

  var drag = {
    active:     false,
    fromNodeId: null,
    fromPort:   null,   // which output port the drag originated from ('output' or 'child_out')
    portType:   null,
    cursorX:    0,
    cursorY:    0
  };

  function isDragging()  { return drag.active; }
  function getDragState() { return drag; }

  function startDrag(fromNodeId, screenX, screenY, portType, fromPort) {
    drag.active     = true;
    drag.fromNodeId = fromNodeId;
    drag.fromPort   = fromPort || 'output';
    drag.portType   = portType || null;
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
    drag.fromPort   = null;
    drag.portType   = null;
  }

  // Fired when mouse is released on empty canvas — keeps drag alive for nodePicker.
  function onCanvasMiss(clientX, clientY) {
    if (!drag.active) return;
    document.dispatchEvent(new CustomEvent('wireReleasedOnCanvas', {
      detail: {
        sourceNodeId: drag.fromNodeId,
        portType:     drag.portType,
        dropX:        clientX,
        dropY:        clientY
      }
    }));
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

  // Cycle check restricted to parent wires only.
  // fromId = the child node (has child_out), toId = the parent node (has parent_in).
  // Traverses parent wires upstream from toId — if fromId is found, it's a cycle.
  function wouldParentCycle(fromId, toId) {
    var visited = {};
    function dfs(id) {
      if (id === fromId) return true;
      if (visited[id]) return false;
      visited[id] = true;
      var wires = graphState.getAllWires();
      for (var wid in wires) {
        if (!wires.hasOwnProperty(wid)) continue;
        var w = wires[wid];
        if (w.toNode === id && (w.type === 'parent' || w.toPort === 'parent_in')) {
          if (dfs(w.fromNode)) return true;
        }
      }
      return false;
    }
    return dfs(toId);
  }

  // ─── Commit wire on mouseup over a valid input port ───────────
  // Returns true if a wire was confirmed, false if rejected.

  function tryCommit(toNodeId, toPortName) {
    if (!drag.active || !drag.fromNodeId) return false;
    if (drag.fromNodeId === toNodeId) { cancelDrag(); return false; }

    var toPortType = nodeState.getPortType(toNodeId, toPortName);
    if (!toPortType) { cancelDrag(); return false; }

    // Resolve output port type from the actual port being dragged (Rule A)
    var fromPortName = drag.fromPort || 'output';
    var fromNode     = graphState.getNode(drag.fromNodeId);
    var fromDef      = fromNode ? nodeRegistry.getByType(fromNode.type) : null;
    var fromPortType = null;
    if (fromDef && fromDef.outputs) {
      for (var oi = 0; oi < fromDef.outputs.length; oi++) {
        if (fromDef.outputs[oi].port === fromPortName) {
          fromPortType = fromDef.outputs[oi].type;
          break;
        }
      }
    }
    // Type mismatch — port does not highlight and no connection is made
    if (fromPortType && fromPortType !== toPortType) { cancelDrag(); return false; }

    // Rule C — parent wire: use parent-chain cycle check only (not layer-wire cycle check)
    if (toPortType === 'parent') {
      if (wouldParentCycle(drag.fromNodeId, toNodeId)) { cancelDrag(); return false; }
    } else {
      if (wouldCycle(drag.fromNodeId, toNodeId)) { cancelDrag(); return false; }
    }

    var allWires      = graphState.getAllWires();
    var toNodeData    = graphState.getNode(toNodeId);
    var toRegistryDef = toNodeData ? nodeRegistry.getByType(toNodeData.type) : null;
    var toPortDef     = null;
    if (toRegistryDef && toRegistryDef.inputs) {
      for (var pi = 0; pi < toRegistryDef.inputs.length; pi++) {
        var inp = toRegistryDef.inputs[pi];
        if (inp.port === toPortName || inp.name === toPortName) { toPortDef = inp; break; }
      }
    }
    var isUnlimited = toPortDef && toPortDef.multiplicity === 'unlimited';

    // Rule B — child_out single-wire enforcement: replace any existing wire from child_out
    if (fromPortName === 'child_out') {
      for (var widB in allWires) {
        if (allWires.hasOwnProperty(widB) &&
            allWires[widB].fromNode === drag.fromNodeId &&
            allWires[widB].fromPort === 'child_out') {
          graphState.removeWire(widB); // triggers onWireRemoved → clearLayerParent via hooks
          break;
        }
      }
    }

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
      // Single-multiplicity input port — replace existing wire on toPort
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

    // Rule D — wire type stored in wireMap
    graphState.addWire({
      id:       wireId,
      fromNode: fromNodeId,
      fromPort: fromPortName,
      toNode:   toNodeId,
      toPort:   toPortName,
      type:     toPortType
    });

    // Parent wires never change node state — cascade is blind to them
    if (toPortType !== 'parent') {
      var fromNewState = nodeState.evaluateNodeState(fromNodeId);
      var toNewState   = nodeState.evaluateNodeState(toNodeId);

      if (fromNewState === 'alive') {
        graphState.onAlive(fromNodeId);
      } else {
        graphState.updateNode(fromNodeId, { state: fromNewState });
      }
      graphState.updateNode(toNodeId, { state: toNewState });
    }

    cancelDrag();
    return true;
  }

  function deleteWire(wireId) {
    var w = graphState.getWire(wireId);
    if (!w) return;
    graphState.removeWire(wireId);
    // Parent wires never trigger ghost cascade — clearLayerParent fires via onWireRemoved hook.
    // Fallback: check toPort in case type is missing (e.g. wires loaded from old persistence data).
    if (w.type !== 'parent' && w.toPort !== 'parent_in') {
      nodeState.cascadeGhost(w);
    }
  }

  // ─── Public API ───────────────────────────────────────────────

  return {
    isDragging:    isDragging,
    getDragState:  getDragState,
    startDrag:     startDrag,
    moveDrag:      moveDrag,
    cancelDrag:    cancelDrag,
    onCanvasMiss:  onCanvasMiss,
    tryCommit:     tryCommit,
    deleteWire:    deleteWire
  };

}());
