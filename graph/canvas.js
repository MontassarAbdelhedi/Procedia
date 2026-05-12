var canvas = (function() {

  var el = null;
  var ctx = null;

  // Canvas dimensions (pixels, matches el.width / el.height)
  var width = 0;
  var height = 0;

  // World transform
  var offsetX = 0;
  var offsetY = 0;
  var scale = 1.0;
  var MIN_SCALE = 0.2;
  var MAX_SCALE = 4.0;

  // Pan state
  var isPanning = false;
  var panLastX = 0;
  var panLastY = 0;
  var spaceDown = false;

  // Node move state
  var isMovingNode = false;
  var movingNodeId = null;
  var moveLastX = 0;
  var moveLastY = 0;

  // Wire drag state (populated by wire.js in Task 3.3)
  var wireDragActive = false;
  var hoverNodeId    = null;
  var hoveredPort    = null;

  // Dot grid world-space interval
  var GRID_SIZE = 24;

  // After-render callbacks (minimap registers here)
  var afterRenderCallbacks = [];

  // ─── Render ──────────────────────────────────────────────────

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    drawNodes();
    drawZoomLabel();

    for (var i = 0; i < afterRenderCallbacks.length; i++) {
      afterRenderCallbacks[i]();
    }
  }

  function drawNodes() {
    var transform  = { offsetX: offsetX, offsetY: offsetY, scale: scale };
    var nodes      = graphState.getAllNodes();
    var keys       = Object.keys(nodes);
    var selectedId = graphState.getSelection();
    for (var i = 0; i < keys.length; i++) {
      var n = nodes[keys[i]];
      n.selected = (n.id === selectedId);
      node.drawNode(ctx, n, transform, {
        showInputPorts: wireDragActive && (hoverNodeId === n.id),
        hoveredPort:    (hoverNodeId === n.id) ? hoveredPort : null
      });
    }
  }

  function drawGrid() {
    var spacing = GRID_SIZE * scale;
    // First dot position in screen space, always positive
    var startX = ((offsetX % spacing) + spacing) % spacing;
    var startY = ((offsetY % spacing) + spacing) % spacing;

    ctx.fillStyle = '#2a2a2a';
    for (var x = startX; x < width; x += spacing) {
      for (var y = startY; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawZoomLabel() {
    var label = Math.round(scale * 100) + '%';
    ctx.font = '11px monospace';
    ctx.fillStyle = '#555555';
    ctx.fillText(label, 10, height - 10);
  }

  // ─── Coordinate helpers ───────────────────────────────────────

  function screenToWorld(sx, sy) {
    return {
      x: (sx - offsetX) / scale,
      y: (sy - offsetY) / scale
    };
  }

  function worldToScreen(wx, wy) {
    return {
      x: wx * scale + offsetX,
      y: wy * scale + offsetY
    };
  }

  // ─── Zoom toward a screen point ───────────────────────────────

  function zoomAt(screenX, screenY, direction) {
    // direction > 0 → zoom out, < 0 → zoom in
    var factor = direction > 0 ? 0.9 : 1.1;
    var newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    if (newScale === scale) return;

    var ratio = newScale / scale;
    offsetX = screenX - ratio * (screenX - offsetX);
    offsetY = screenY - ratio * (screenY - offsetY);
    scale = newScale;

    render();
  }

  // ─── Resize ───────────────────────────────────────────────────

  function setupResize() {
    var column = document.getElementById('canvas-column');
    var observer = new ResizeObserver(function(entries) {
      var rect = entries[0].contentRect;
      width = rect.width;
      height = rect.height;
      el.width = width;
      el.height = height;
      render();
    });
    observer.observe(column);
  }

  // ─── Mouse events ─────────────────────────────────────────────

  function hitTestNodes(screenX, screenY) {
    var transform = { offsetX: offsetX, offsetY: offsetY, scale: scale };
    var nodes = graphState.getAllNodes();
    var keys = Object.keys(nodes);
    // Test in reverse so topmost-drawn node is hit first
    for (var i = keys.length - 1; i >= 0; i--) {
      if (node.hitTest(nodes[keys[i]], transform, screenX, screenY)) {
        return nodes[keys[i]];
      }
    }
    return null;
  }

  function onMouseDown(e) {
    var isMiddle = e.button === 1;
    var isSpaceLeft = spaceDown && e.button === 0;

    if (isMiddle || isSpaceLeft) {
      isPanning = true;
      panLastX = e.clientX;
      panLastY = e.clientY;
      el.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    if (e.button === 0) {
      var rect = el.getBoundingClientRect();
      var screenX = e.clientX - rect.left;
      var screenY = e.clientY - rect.top;
      var hit = hitTestNodes(screenX, screenY);

      if (hit) {
        graphState.setSelection(hit.id);
        isMovingNode = true;
        movingNodeId = hit.id;
        moveLastX = e.clientX;
        moveLastY = e.clientY;
        el.style.cursor = 'move';
      } else {
        graphState.setSelection(null);
      }
      e.preventDefault();
    }
  }

  function onMouseMove(e) {
    var rect    = el.getBoundingClientRect();
    var screenX = e.clientX - rect.left;
    var screenY = e.clientY - rect.top;

    if (isPanning) {
      var dx = e.clientX - panLastX;
      var dy = e.clientY - panLastY;
      panLastX = e.clientX;
      panLastY = e.clientY;
      offsetX += dx;
      offsetY += dy;
      render();
      return;
    }

    if (isMovingNode && movingNodeId) {
      var dx = e.clientX - moveLastX;
      var dy = e.clientY - moveLastY;
      moveLastX = e.clientX;
      moveLastY = e.clientY;

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

    // Track hovered node (needed for port display during wire drag)
    if (wireDragActive) {
      var transform = { offsetX: offsetX, offsetY: offsetY, scale: scale };
      var hit = hitTestNodes(screenX, screenY);
      var newHoverId = hit ? hit.id : null;
      var newHoverPort = null;
      if (hit) {
        var portHit = node.hitTestInputPort(hit, transform, screenX, screenY);
        newHoverPort = portHit ? portHit.port : null;
      }
      if (newHoverId !== hoverNodeId || newHoverPort !== hoveredPort) {
        hoverNodeId  = newHoverId;
        hoveredPort  = newHoverPort;
        render();
      }
    }
  }

  function onMouseUp(e) {
    if (isPanning) {
      isPanning = false;
      el.style.cursor = spaceDown ? 'grab' : 'default';
    }
    if (isMovingNode) {
      isMovingNode = false;
      movingNodeId = null;
      el.style.cursor = 'default';
    }
  }

  function onWheel(e) {
    e.preventDefault();
    var rect = el.getBoundingClientRect();
    var screenX = e.clientX - rect.left;
    var screenY = e.clientY - rect.top;
    zoomAt(screenX, screenY, e.deltaY);
  }

  // ─── Keyboard events ──────────────────────────────────────────

  function onKeyDown(e) {
    if (e.code === 'Space' && !e.repeat) {
      // Prevent AE or browser from scrolling the panel
      e.preventDefault();
      spaceDown = true;
      if (!isPanning) el.style.cursor = 'grab';
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      spaceDown = false;
      if (!isPanning) el.style.cursor = 'default';
    }
  }

  // ─── Init ─────────────────────────────────────────────────────

  function init() {
    el = document.getElementById('main-canvas');
    ctx = el.getContext('2d');

    setupResize();

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mouseleave', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    el.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Re-render whenever graph state changes
    graphState.onChange(function() { render(); });

  }

  // ─── Public API ───────────────────────────────────────────────

  return {
    init: init,
    render: render,
    screenToWorld: screenToWorld,
    worldToScreen: worldToScreen,
    getTransform: function() {
      return { offsetX: offsetX, offsetY: offsetY, scale: scale };
    },
    getDimensions: function() {
      return { width: width, height: height };
    },
    setTransformOffset: function(x, y) {
      offsetX = x;
      offsetY = y;
      render();
    },
    onAfterRender: function(fn) {
      afterRenderCallbacks.push(fn);
    },
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
