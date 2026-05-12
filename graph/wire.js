var wire = (function() {

  var WIRE_COLOR = { layer: '#5b8dd9', data: '#d4a04a' };

  // ─── Drag state ───────────────────────────────────────────────

  var drag = {
    active:     false,
    fromNodeId: null,
    cursorX:    0,
    cursorY:    0
  };

  function isDragging() { return drag.active; }

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

  // ─── Commit wire on mouseup over a valid input port ───────────
  // Returns true if a wire was confirmed, false if rejected.

  function tryCommit(toNodeId, toPortName) {
    if (!drag.active || !drag.fromNodeId) return false;
    if (drag.fromNodeId === toNodeId) { cancelDrag(); return false; }

    var toPortType = getPortType(toNodeId, toPortName);
    if (!toPortType) { cancelDrag(); return false; }

    if (wouldCycle(drag.fromNodeId, toNodeId)) { cancelDrag(); return false; }

    // Enforce one wire per input port — replace any existing wire on toPort
    var allWires = graphState.getAllWires();
    for (var wid in allWires) {
      if (allWires.hasOwnProperty(wid) &&
          allWires[wid].toNode === toNodeId &&
          allWires[wid].toPort === toPortName) {
        graphState.removeWire(wid);
        break;
      }
    }

    var wireId = uuidGenerator.generateWireId();
    graphState.addWire({
      id:       wireId,
      fromNode: drag.fromNodeId,
      fromPort: 'output',
      toNode:   toNodeId,
      toPort:   toPortName
    });

    cancelDrag();
    return true;
  }

  // ─── Port type lookup ─────────────────────────────────────────

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
    // Adding fromId→toId creates a cycle if toId can already reach fromId
    return hasDownstreamPath(toId, fromId);
  }

  // ─── Bezier draw ──────────────────────────────────────────────
  // cpOffset is in screen pixels (already scaled by transform.scale)

  function drawBezier(ctx, x1, y1, x2, y2, cpOffset, color, lineWidth, dashed) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, y1 + cpOffset, x2, y2 - cpOffset, x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineWidth;
    if (dashed) ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ─── Wire hit test ────────────────────────────────────────────
  // Samples bezier at 20 steps. Returns wireId if within 6px, else null.

  function hitTestNearest(screenX, screenY, transform) {
    var cpOffset  = 80 * transform.scale;
    var HIT_R_SQ  = 6 * 6;
    var STEPS     = 20;
    var allWires  = graphState.getAllWires();
    var allNodes  = graphState.getAllNodes();

    for (var wid in allWires) {
      if (!allWires.hasOwnProperty(wid)) continue;
      var w        = allWires[wid];
      var fromNode = allNodes[w.fromNode];
      var toNode   = allNodes[w.toNode];
      if (!fromNode || !toNode) continue;

      var fromPos = node.outputPortPos(fromNode, transform);
      var inPorts = node.inputPortPositions(toNode, transform);
      var toPos   = null;
      for (var i = 0; i < inPorts.length; i++) {
        if (inPorts[i].port === w.toPort) { toPos = inPorts[i]; break; }
      }
      if (!toPos) continue;

      var x0 = fromPos.x, y0 = fromPos.y;
      var x1 = fromPos.x, y1 = fromPos.y + cpOffset;
      var x2 = toPos.x,   y2 = toPos.y - cpOffset;
      var x3 = toPos.x,   y3 = toPos.y;

      for (var s = 0; s <= STEPS; s++) {
        var t  = s / STEPS;
        var mt = 1 - t;
        var bx = mt*mt*mt*x0 + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3;
        var by = mt*mt*mt*y0 + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3;
        var dx = screenX - bx;
        var dy = screenY - by;
        if (dx*dx + dy*dy <= HIT_R_SQ) return wid;
      }
    }
    return null;
  }

  // ─── Ghost cascade ────────────────────────────────────────────

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
    if (n.type === 'core/comp') return;  // CompNode never goes ghost

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

  function deleteWire(wireId) {
    var w = graphState.getWire(wireId);
    if (!w) return;
    var portType = getPortType(w.toNode, w.toPort);
    var fromNode = w.fromNode;
    var toNode   = w.toNode;
    graphState.removeWire(wireId);

    if (portType === 'data') {
      graphState.updateNode(fromNode, { state: 'ghost' });
      return;
    }

    evaluateNodeState(fromNode);
    evaluateNodeState(toNode);
  }

  // ─── Draw all confirmed wires + in-progress drag preview ──────

  function drawAll(ctx, transform, selectedWireId) {
    var cpOffset = 80 * transform.scale;
    var allWires = graphState.getAllWires();
    var allNodes = graphState.getAllNodes();

    // Confirmed wires
    for (var wid in allWires) {
      if (!allWires.hasOwnProperty(wid)) continue;
      var w        = allWires[wid];
      var fromNode = allNodes[w.fromNode];
      var toNode   = allNodes[w.toNode];
      if (!fromNode || !toNode) continue;

      var fromPos = node.outputPortPos(fromNode, transform);
      var inPorts = node.inputPortPositions(toNode, transform);
      var toPos   = null;
      for (var i = 0; i < inPorts.length; i++) {
        if (inPorts[i].port === w.toPort) { toPos = inPorts[i]; break; }
      }
      if (!toPos) continue;

      var portType   = getPortType(w.toNode, w.toPort);
      var color      = WIRE_COLOR[portType] || '#888888';
      var dashed     = (portType !== 'layer');
      var lw         = dashed ? 1.5 : 2;
      var isSelected = (wid === selectedWireId);

      if (isSelected) {
        ctx.save();
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.shadowBlur  = 6;
        drawBezier(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, cpOffset, '#ffffff', lw + 1, dashed);
        ctx.restore();
      } else {
        drawBezier(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y, cpOffset, color, lw, dashed);
      }
    }

    // In-progress drag preview
    if (drag.active && drag.fromNodeId) {
      var fromNode = allNodes[drag.fromNodeId];
      if (fromNode) {
        var fromPos = node.outputPortPos(fromNode, transform);
        drawBezier(ctx, fromPos.x, fromPos.y, drag.cursorX, drag.cursorY, cpOffset, '#888888', 1.5, false);
      }
    }
  }

  // ─── Public API ───────────────────────────────────────────────

  return {
    isDragging:      isDragging,
    startDrag:       startDrag,
    moveDrag:        moveDrag,
    cancelDrag:      cancelDrag,
    tryCommit:       tryCommit,
    drawAll:         drawAll,
    getPortType:     getPortType,
    hitTestNearest:  hitTestNearest,
    deleteWire:      deleteWire
  };

}());
