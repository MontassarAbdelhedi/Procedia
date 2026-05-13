// input.js — translates raw DOM events into graph mutations
// deps: canvasViewport, canvasRenderer, wire, wireRenderer, node, graphState

var canvasInput = (function() {

  // Pan state
  var isPanning  = false;
  var panLastX   = 0;
  var panLastY   = 0;
  var spaceDown  = false;

  // Node move state
  var isMovingNode = false;
  var movingNodeId = null;
  var moveLastX    = 0;
  var moveLastY    = 0;

  // Wire drag state
  var wireDragActive  = false;
  var hoverNodeId     = null;
  var hoveredPort     = null;
  var selectedWireId  = null;

  function getWireDragState() {
    return {
      active:         wireDragActive,
      hoverNodeId:    hoverNodeId,
      hoveredPort:    hoveredPort,
      selectedWireId: selectedWireId
    };
  }

  function render() {
    canvasRenderer.render(getWireDragState());
  }

  function hitTestNodes(screenX, screenY) {
    var transform = canvasViewport.getTransform();
    var nodes = graphState.getAllNodes();
    var keys = Object.keys(nodes);
    for (var i = keys.length - 1; i >= 0; i--) {
      if (node.hitTest(nodes[keys[i]], transform, screenX, screenY)) {
        return nodes[keys[i]];
      }
    }
    return null;
  }

  function onMouseDown(e) {
    var el = canvasViewport.getEl();
    var isMiddle    = e.button === 1;
    var isSpaceLeft = spaceDown && e.button === 0;

    if (isMiddle || isSpaceLeft) {
      isPanning = true;
      panLastX  = e.clientX;
      panLastY  = e.clientY;
      el.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    if (e.button === 0) {
      var rect    = el.getBoundingClientRect();
      var screenX = e.clientX - rect.left;
      var screenY = e.clientY - rect.top;
      var transform = canvasViewport.getTransform();

      var allNodes = graphState.getAllNodes();
      var nodeKeys = Object.keys(allNodes);
      for (var k = nodeKeys.length - 1; k >= 0; k--) {
        if (node.hitTestOutputPort(allNodes[nodeKeys[k]], transform, screenX, screenY)) {
          wire.startDrag(allNodes[nodeKeys[k]].id, screenX, screenY);
          wireDragActive = true;
          render();
          e.preventDefault();
          return;
        }
      }

      var wireHit = wireRenderer.hitTestNearest(screenX, screenY, transform);
      if (wireHit) {
        selectedWireId = wireHit;
        graphState.setSelection(null);
        render();
        e.preventDefault();
        return;
      }

      var hit = hitTestNodes(screenX, screenY);
      if (hit) {
        selectedWireId  = null;
        graphState.setSelection(hit.id);
        isMovingNode = true;
        movingNodeId = hit.id;
        moveLastX    = e.clientX;
        moveLastY    = e.clientY;
        el.style.cursor = 'move';
      } else {
        selectedWireId = null;
        graphState.setSelection(null);
      }
      e.preventDefault();
    }
  }

  function onMouseMove(e) {
    var el      = canvasViewport.getEl();
    var rect    = el.getBoundingClientRect();
    var screenX = e.clientX - rect.left;
    var screenY = e.clientY - rect.top;

    if (isPanning) {
      var dx = e.clientX - panLastX;
      var dy = e.clientY - panLastY;
      panLastX = e.clientX;
      panLastY = e.clientY;
      var t = canvasViewport.getTransform();
      canvasViewport.setTransformOffset(t.offsetX + dx, t.offsetY + dy);
      render();
      return;
    }

    if (isMovingNode && movingNodeId) {
      var dx = e.clientX - moveLastX;
      var dy = e.clientY - moveLastY;
      moveLastX = e.clientX;
      moveLastY = e.clientY;
      var scale = canvasViewport.getTransform().scale;
      var n = graphState.getNode(movingNodeId);
      if (n) {
        graphState.updateNode(movingNodeId, {
          position: {
            x: n.position.x + dx / scale,
            y: n.position.y + dy / scale
          }
        });
      }
      return;
    }

    if (wireDragActive) {
      var transform = canvasViewport.getTransform();
      var allNodes  = graphState.getAllNodes();
      var nodeKeys  = Object.keys(allNodes);

      hoverNodeId = null;
      hoveredPort = null;
      var snapX = screenX;
      var snapY = screenY;

      // Check every node's input ports — snap even when cursor is outside the node body
      for (var k = 0; k < nodeKeys.length; k++) {
        var n = allNodes[nodeKeys[k]];
        var portHit = node.hitTestInputPort(n, transform, screenX, screenY);
        if (portHit) {
          hoverNodeId = n.id;
          hoveredPort = portHit.port;
          snapX = portHit.x;
          snapY = portHit.y;
          break;
        }
      }

      wire.moveDrag(snapX, snapY);
      render();
    }
  }

  function onMouseUp(e) {
    var el = canvasViewport.getEl();

    if (isPanning) {
      isPanning = false;
      el.style.cursor = spaceDown ? 'grab' : 'default';
    }

    if (wireDragActive) {
      if (hoveredPort && hoverNodeId) {
        wire.tryCommit(hoverNodeId, hoveredPort);
      } else {
        wire.cancelDrag();
      }
      wireDragActive = false;
      hoverNodeId    = null;
      hoveredPort    = null;
      render();
      return;
    }

    if (isMovingNode) {
      isMovingNode = false;
      movingNodeId = null;
      el.style.cursor = 'default';
    }
  }

  function onWheel(e) {
    e.preventDefault();
    var el   = canvasViewport.getEl();
    var rect = el.getBoundingClientRect();
    var screenX = e.clientX - rect.left;
    var screenY = e.clientY - rect.top;
    var changed = canvasViewport.zoomAt(screenX, screenY, e.deltaY);
    if (changed) render();
  }

  function onDblClick(e) {
    if (e.button !== 0) return;
    var el      = canvasViewport.getEl();
    var rect    = el.getBoundingClientRect();
    var screenX = e.clientX - rect.left;
    var screenY = e.clientY - rect.top;
    var transform = canvasViewport.getTransform();

    var wireHit = wireRenderer.hitTestNearest(screenX, screenY, transform);
    if (wireHit) {
      wire.deleteWire(wireHit);
      selectedWireId = null;
      render();
      e.preventDefault();
    }
  }

  function onKeyDown(e) {
    var el = canvasViewport.getEl();
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      spaceDown = true;
      if (!isPanning) el.style.cursor = 'grab';
    }
  }

  function onKeyUp(e) {
    var el = canvasViewport.getEl();
    if (e.code === 'Space') {
      spaceDown = false;
      if (!isPanning) el.style.cursor = 'default';
    }
  }

  function init() {
    var el = canvasViewport.getEl();

    el.addEventListener('mousedown',   onMouseDown);
    el.addEventListener('mousemove',   onMouseMove);
    el.addEventListener('mouseup',     onMouseUp);
    el.addEventListener('mouseleave',  onMouseUp);
    el.addEventListener('dblclick',    onDblClick);
    el.addEventListener('wheel',       onWheel, { passive: false });
    el.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
  }

  return {
    init: init,
    setWireDrag: function(active) {
      wireDragActive = active;
      if (!active) {
        hoverNodeId = null;
        hoveredPort = null;
      }
      render();
    },
    getHoveredPort: function() {
      return hoveredPort ? { nodeId: hoverNodeId, port: hoveredPort } : null;
    }
  };

}());
