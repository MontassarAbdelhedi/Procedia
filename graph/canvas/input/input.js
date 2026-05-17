// graph/canvas/input/input.js
// DEPENDS ON: graph/graphState/lifecycle.js, graph/nodes/nodeGeometry.js, graph/nodes/nodeHitTest.js,
//             graph/Wire/wire.js, graph/Wire/wireRenderer.js, graph/canvas/viewport.js,
//             graph/canvas/renderer.js, graph/canvas/input/labelEditor.js
// MUST LOAD BEFORE: graph/canvas/index.js

var canvasInput = (function() {

  // Pan state
  var isPanning  = false;
  var panLastX   = 0;
  var panLastY   = 0;
  var spaceDown  = false;

  // Single node move state
  var isMovingNode = false;
  var movingNodeId = null;
  var moveLastX    = 0;
  var moveLastY    = 0;

  // Group drag state
  var isGroupDragging  = false;
  var groupDragOffsets = {};

  // Wire drag state
  var wireDragActive  = false;
  var hoverNodeId     = null;
  var hoveredPort     = null;
  var selectedWireId  = null;

  // Marquee + pending selection state
  var marquee = {
    active:         false,
    startScreenX:   0,
    startScreenY:   0,
    currentScreenX: 0,
    currentScreenY: 0
  };
  var pendingSelectionIds = new Set();
  var mousedownOnEmpty    = false;

  function getWireDragState() {
    return {
      active:              wireDragActive,
      hoverNodeId:         hoverNodeId,
      hoveredPort:         hoveredPort,
      selectedWireId:      selectedWireId,
      marquee:             marquee,
      pendingSelectionIds: pendingSelectionIds
    };
  }

  function render() {
    canvasRenderer.render(getWireDragState());
  }

  // ─── Header / body hit tests ──────────────────────────────────────────────────

  function hitTestNodeHeader(nodeData, transform, screenX, screenY) {
    var sx = nodeData.position.x * transform.scale + transform.offsetX;
    var sy = nodeData.position.y * transform.scale + transform.offsetY;
    var sw = nodeGeometry.NODE_WIDTH * transform.scale;
    var hh = 30 * transform.scale;
    return screenX >= sx && screenX <= sx + sw &&
           screenY >= sy && screenY <= sy + hh;
  }

  function hitTestNodeBody(nodeData, transform, screenX, screenY) {
    var sx = nodeData.position.x * transform.scale + transform.offsetX;
    var sy = nodeData.position.y * transform.scale + transform.offsetY;
    var sw = nodeGeometry.NODE_WIDTH  * transform.scale;
    var sh = nodeGeometry.NODE_HEIGHT * transform.scale;
    var hh = 30 * transform.scale;
    return screenX >= sx && screenX <= sx + sw &&
           screenY >= sy + hh && screenY <= sy + sh;
  }

  function hitTestNodes(screenX, screenY) {
    var transform = canvasViewport.getTransform();
    var nodes = graphState.getAllNodes();
    var keys  = Object.keys(nodes);
    for (var i = keys.length - 1; i >= 0; i--) {
      if (nodeHitTest.hitTest(nodes[keys[i]], transform, screenX, screenY)) {
        return nodes[keys[i]];
      }
    }
    return null;
  }

  // ─── mousedown ────────────────────────────────────────────────────────────────

  function onMouseDown(e) {
    var el          = canvasViewport.getEl();
    var isMiddle    = e.button === 1;
    var isSpaceLeft = spaceDown && e.button === 0;
    mousedownOnEmpty = false;

    if (isMiddle || isSpaceLeft) {
      if (marquee.active) {
        marquee.active      = false;
        pendingSelectionIds = new Set();
      }
      isPanning = true;
      panLastX  = e.clientX;
      panLastY  = e.clientY;
      el.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    if (e.button === 0) {
      var rect      = el.getBoundingClientRect();
      var screenX   = e.clientX - rect.left;
      var screenY   = e.clientY - rect.top;
      var transform = canvasViewport.getTransform();

      // Priority 1: output port → wire drag
      var allNodes = graphState.getAllNodes();
      var nodeKeys = Object.keys(allNodes);
      for (var k = nodeKeys.length - 1; k >= 0; k--) {
        if (nodeHitTest.hitTestOutputPort(allNodes[nodeKeys[k]], transform, screenX, screenY)) {
          var _srcNode  = allNodes[nodeKeys[k]];
          var _srcDef   = nodeRegistry.getByType(_srcNode.type);
          var _portType = null;
          if (_srcDef && _srcDef.outputs && _srcDef.outputs.length > 0) {
            _portType = _srcDef.outputs[0].type || null;
          }
          wire.startDrag(_srcNode.id, screenX, screenY, _portType);
          wireDragActive = true;
          render();
          e.preventDefault();
          return;
        }
      }

      // Priority 2: wire body hit
      var wireHit = wireRenderer.hitTestNearest(screenX, screenY, transform);
      if (wireHit) {
        selectedWireId = wireHit;
        graphState.clearSelection();
        render();
        e.preventDefault();
        return;
      }

      // Priority 3: node hit
      var hit = hitTestNodes(screenX, screenY);
      if (hit) {
        selectedWireId = null;

        if (e.shiftKey) {
          // Shift+click → toggle in/out of selection (no drag)
          if (graphState.selectedNodeIds.has(hit.id)) {
            graphState.removeFromSelection(hit.id);
          } else {
            graphState.addToSelection(hit.id);
          }

        } else if (graphState.selectedNodeIds.has(hit.id)) {
          // Already selected, no shift → group drag
          var cursorWorld  = canvasViewport.screenToWorld(screenX, screenY);
          groupDragOffsets = {};
          graphState.selectedNodeIds.forEach(function(id) {
            var node = graphState.getNode(id);
            if (node) {
              groupDragOffsets[id] = {
                dx: node.position.x - cursorWorld.x,
                dy: node.position.y - cursorWorld.y
              };
            }
          });
          isGroupDragging = true;
          el.style.cursor = 'move';

        } else {
          // No modifier, not selected → replace selection + single drag
          graphState.setSelection([hit.id]);
          isMovingNode = true;
          movingNodeId = hit.id;
          moveLastX    = e.clientX;
          moveLastY    = e.clientY;
          el.style.cursor = 'move';
        }

      } else {
        // Empty canvas → prepare marquee (do not clear selection yet)
        selectedWireId         = null;
        marquee.startScreenX   = screenX;
        marquee.startScreenY   = screenY;
        marquee.currentScreenX = screenX;
        marquee.currentScreenY = screenY;
        marquee.active         = false;
        mousedownOnEmpty       = true;
      }

      e.preventDefault();
    }
  }

  // ─── mousemove ────────────────────────────────────────────────────────────────

  function onMouseMove(e) {
    var el      = canvasViewport.getEl();
    var rect    = el.getBoundingClientRect();
    var screenX = e.clientX - rect.left;
    var screenY = e.clientY - rect.top;

    if (isPanning) {
      if (typeof nodePicker !== 'undefined' && nodePicker.isOpen()) {
        nodePicker.close();
        wire.cancelDrag();
      }
      var panDx = e.clientX - panLastX;
      var panDy = e.clientY - panLastY;
      panLastX  = e.clientX;
      panLastY  = e.clientY;
      var t = canvasViewport.getTransform();
      canvasViewport.setTransformOffset(t.offsetX + panDx, t.offsetY + panDy);
      render();
      return;
    }

    if (isGroupDragging) {
      var cursorWorld = canvasViewport.screenToWorld(screenX, screenY);
      var dragIds     = Object.keys(groupDragOffsets);
      for (var gi = 0; gi < dragIds.length; gi++) {
        var gid    = dragIds[gi];
        var offset = groupDragOffsets[gid];
        graphState.setNodePosition(gid,
          cursorWorld.x + offset.dx,
          cursorWorld.y + offset.dy
        );
      }
      render();
      return;
    }

    if (isMovingNode && movingNodeId) {
      var moveDx    = e.clientX - moveLastX;
      var moveDy    = e.clientY - moveLastY;
      moveLastX     = e.clientX;
      moveLastY     = e.clientY;
      var moveScale = canvasViewport.getTransform().scale;
      var mNode     = graphState.getNode(movingNodeId);
      if (mNode) {
        graphState.setNodePosition(
          movingNodeId,
          mNode.position.x + moveDx / moveScale,
          mNode.position.y + moveDy / moveScale
        );
      }
      return;
    }

    if (mousedownOnEmpty) {
      var marqueeDx = screenX - marquee.startScreenX;
      var marqueeDy = screenY - marquee.startScreenY;
      if (!marquee.active && Math.sqrt(marqueeDx * marqueeDx + marqueeDy * marqueeDy) > 4) {
        marquee.active = true;
      }
      if (marquee.active) {
        marquee.currentScreenX = screenX;
        marquee.currentScreenY = screenY;

        var worldStart   = canvasViewport.screenToWorld(marquee.startScreenX,   marquee.startScreenY);
        var worldCurrent = canvasViewport.screenToWorld(marquee.currentScreenX, marquee.currentScreenY);

        var rectLeft   = Math.min(worldStart.x, worldCurrent.x);
        var rectRight  = Math.max(worldStart.x, worldCurrent.x);
        var rectTop    = Math.min(worldStart.y, worldCurrent.y);
        var rectBottom = Math.max(worldStart.y, worldCurrent.y);

        pendingSelectionIds = new Set();
        var hitNodes = graphState.getAllNodes();
        var hitKeys  = Object.keys(hitNodes);
        for (var ki = 0; ki < hitKeys.length; ki++) {
          var hNode      = hitNodes[hitKeys[ki]];
          var nodeRight  = hNode.position.x + nodeGeometry.NODE_WIDTH;
          var nodeBottom = hNode.position.y + nodeGeometry.NODE_HEIGHT;
          var intersects = !(nodeRight        < rectLeft  ||
                             hNode.position.x > rectRight ||
                             nodeBottom        < rectTop   ||
                             hNode.position.y  > rectBottom);
          if (intersects) pendingSelectionIds.add(hNode.id);
        }
        render();
      }
    }

    if (wireDragActive) {
      var transform = canvasViewport.getTransform();
      var wdNodes   = graphState.getAllNodes();
      var wdKeys    = Object.keys(wdNodes);

      hoverNodeId = null;
      hoveredPort = null;
      var snapX   = screenX;
      var snapY   = screenY;

      for (var k = 0; k < wdKeys.length; k++) {
        var n       = wdNodes[wdKeys[k]];
        var portHit = nodeHitTest.hitTestInputPort(n, transform, screenX, screenY);
        if (portHit) {
          hoverNodeId = n.id;
          hoveredPort = portHit.port;
          snapX       = portHit.x;
          snapY       = portHit.y;
          break;
        }
      }

      wire.moveDrag(snapX, snapY);
      render();
    }
  }

  // ─── mouseup ──────────────────────────────────────────────────────────────────

  function onMouseUp(e) {
    var el = canvasViewport.getEl();

    if (isPanning) {
      isPanning = false;
      el.style.cursor = spaceDown ? 'grab' : 'default';
    }

    if (wireDragActive) {
      if (hoveredPort && hoverNodeId) {
        wire.tryCommit(hoverNodeId, hoveredPort);
        wireDragActive = false;
        hoverNodeId    = null;
        hoveredPort    = null;
        render();
      } else {
        // Miss on empty canvas — fire event; nodePicker takes ownership of drag resolution.
        wire.onCanvasMiss(e.clientX, e.clientY);
        wireDragActive = false;
        hoverNodeId    = null;
        hoveredPort    = null;
        render();
      }
      return;
    }

    if (isGroupDragging) {
      isGroupDragging  = false;
      groupDragOffsets = {};
      el.style.cursor  = 'default';
      return;
    }

    if (isMovingNode) {
      isMovingNode = false;
      movingNodeId = null;
      el.style.cursor = 'default';
    }

    if (mousedownOnEmpty) {
      mousedownOnEmpty = false;
      if (marquee.active) {
        // Commit pending → add to existing selection (additive marquee)
        pendingSelectionIds.forEach(function(id) {
          graphState.addToSelection(id);
        });
        pendingSelectionIds = new Set();
        marquee.active      = false;
      } else {
        // Click on empty canvas with no drag → clear selection
        graphState.clearSelection();
      }
      render();
    }
  }

  // ─── wheel / dblclick / keyboard ─────────────────────────────────────────────

  function onWheel(e) {
    e.preventDefault();
    if (typeof nodePicker !== 'undefined' && nodePicker.isOpen()) {
      nodePicker.close();
      wire.cancelDrag();
    }
    var el      = canvasViewport.getEl();
    var rect    = el.getBoundingClientRect();
    var screenX = e.clientX - rect.left;
    var screenY = e.clientY - rect.top;
    var changed = canvasViewport.zoomAt(screenX, screenY, e.deltaY);
    if (changed) render();
  }

  function onDblClick(e) {
    if (e.button !== 0) return;
    var el        = canvasViewport.getEl();
    var rect      = el.getBoundingClientRect();
    var screenX   = e.clientX - rect.left;
    var screenY   = e.clientY - rect.top;
    var transform = canvasViewport.getTransform();

    var wireHit = wireRenderer.hitTestNearest(screenX, screenY, transform);
    if (wireHit) {
      wire.deleteWire(wireHit);
      selectedWireId = null;
      render();
      e.preventDefault();
      return;
    }

    // Node header double-click → inline label edit (all node types)
    // Comp node body double-click → focus comp in AE
    var allNodes = graphState.getAllNodes();
    var nodeKeys = Object.keys(allNodes);
    for (var k = nodeKeys.length - 1; k >= 0; k--) {
      var n = allNodes[nodeKeys[k]];
      if (hitTestNodeHeader(n, transform, screenX, screenY)) {
        startLabelEdit(n.id);
        e.preventDefault();
        return;
      }
      if ((n.type === 'CompNode' || n.type === 'core/comp') && hitTestNodeBody(n, transform, screenX, screenY)) {
        if (typeof callFocusCompInAE === 'function') callFocusCompInAE(n.id);
        e.preventDefault();
        return;
      }
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

  // ─── Init ─────────────────────────────────────────────────────────────────────

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

  // ─── Public API ───────────────────────────────────────────────────────────────

  return {
    init:   init,
    render: render,
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
    },
    getSelectedWire:    function() { return selectedWireId; },
    clearWireSelection: function() {
      selectedWireId = null;
      render();
    },
    getMarquee:          function() { return marquee; },
    getPendingSelection: function() { return pendingSelectionIds; }
  };

}());
