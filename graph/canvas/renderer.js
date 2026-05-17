// graph/canvas/renderer.js
// DEPENDS ON: graph/graphState/store.js, graph/nodes/nodeRenderer.js, graph/Wire/wireRenderer.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: graph/canvas/index.js

var canvasRenderer = (function() {

  var GRID_SIZE = 24;
  var afterRenderCallbacks = [];
  var loopRunning = false;

  function drawGrid(ctx, transform, width, height) {
    var spacing = GRID_SIZE * transform.scale;
    var startX = ((transform.offsetX % spacing) + spacing) % spacing;
    var startY = ((transform.offsetY % spacing) + spacing) % spacing;

    ctx.fillStyle = '#2a2a2a';
    for (var x = startX; x < width; x += spacing) {
      for (var y = startY; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawWires(ctx, transform, selectedWireId) {
    wireRenderer.drawAll(ctx, transform, selectedWireId);
  }

  function drawNodes(ctx, transform, wireDragState) {
    var nodes               = graphState.getAllNodes();
    var keys                = Object.keys(nodes);
    var pendingSelectionIds = wireDragState.pendingSelectionIds || null;
    for (var i = 0; i < keys.length; i++) {
      var n = nodes[keys[i]];
      n.selected = graphState.selectedNodeIds.has(n.id);
      nodeRenderer.drawNode(ctx, n, transform, {
        showInputPorts: wireDragState.active && (wireDragState.hoverNodeId === n.id),
        hoveredPort:    (wireDragState.hoverNodeId === n.id) ? wireDragState.hoveredPort : null,
        pending:        !n.selected && pendingSelectionIds !== null && pendingSelectionIds.has(n.id)
      });
    }
  }

  function drawMarquee(ctx, marquee) {
    if (!marquee || !marquee.active) return;

    var x      = Math.min(marquee.startScreenX, marquee.currentScreenX);
    var y      = Math.min(marquee.startScreenY, marquee.currentScreenY);
    var width  = Math.abs(marquee.currentScreenX - marquee.startScreenX);
    var height = Math.abs(marquee.currentScreenY - marquee.startScreenY);

    ctx.save();
    ctx.resetTransform();

    ctx.fillStyle = 'rgba(100, 160, 255, 0.08)';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = 'rgba(100, 160, 255, 0.55)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x, y, width, height);

    ctx.restore();
  }

  function drawZoomLabel(ctx, transform, height) {
    var label = Math.round(transform.scale * 100) + '%';
    ctx.font = '11px monospace';
    ctx.fillStyle = '#555555';
    ctx.fillText(label, 10, height - 10);
  }

  function render(wireDragState) {
    var ctx       = canvasViewport.getCtx();
    var transform = canvasViewport.getTransform();
    var dims      = canvasViewport.getDimensions();
    if (!ctx) return;

    var state = wireDragState || { active: false, hoverNodeId: null, hoveredPort: null, selectedWireId: null };

    // When called from the render loop (no wireDragState passed), pull live marquee
    // and pending state from canvasInput so they survive between mousemove events.
    if (state.marquee === undefined && typeof canvasInput !== 'undefined') {
      state.marquee             = canvasInput.getMarquee();
      state.pendingSelectionIds = canvasInput.getPendingSelection();
    }

    ctx.clearRect(0, 0, dims.width, dims.height);
    drawGrid(ctx, transform, dims.width, dims.height);

    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.error) continue;
      w.dashOffset = (w.dashOffset || 0) - wireRenderer.WIRE_DASH_SPEED;
      w.dashOffset = w.dashOffset % wireRenderer.WIRE_DASH_CYCLE;
    }

    drawWires(ctx, transform, state.selectedWireId);
    drawNodes(ctx, transform, state);
    drawMarquee(ctx, state.marquee);
    drawZoomLabel(ctx, transform, dims.height);

    for (var i = 0; i < afterRenderCallbacks.length; i++) {
      afterRenderCallbacks[i]();
    }
  }

  function startRenderLoop() {
    if (loopRunning) return;
    loopRunning = true;
    function loop() {
      render(null);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  return {
    render:           render,
    startRenderLoop:  startRenderLoop,
    onAfterRender:    function(fn) { afterRenderCallbacks.push(fn); }
  };

}());
