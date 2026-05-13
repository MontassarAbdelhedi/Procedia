// renderer.js — owns all draw calls against the 2D context
// deps: canvasViewport, wireRenderer, node, graphState

var canvasRenderer = (function() {

  var GRID_SIZE = 24;
  var afterRenderCallbacks = [];

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
    var nodes      = graphState.getAllNodes();
    var keys       = Object.keys(nodes);
    var selectedId = graphState.getSelection();
    for (var i = 0; i < keys.length; i++) {
      var n = nodes[keys[i]];
      n.selected = (n.id === selectedId);
      node.drawNode(ctx, n, transform, {
        showInputPorts: wireDragState.active && (wireDragState.hoverNodeId === n.id),
        hoveredPort:    (wireDragState.hoverNodeId === n.id) ? wireDragState.hoveredPort : null
      });
    }
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
    ctx.clearRect(0, 0, dims.width, dims.height);
    drawGrid(ctx, transform, dims.width, dims.height);
    drawWires(ctx, transform, state.selectedWireId);
    drawNodes(ctx, transform, state);
    drawZoomLabel(ctx, transform, dims.height);

    for (var i = 0; i < afterRenderCallbacks.length; i++) {
      afterRenderCallbacks[i]();
    }
  }

  return {
    render: render,
    onAfterRender: function(fn) {
      afterRenderCallbacks.push(fn);
    }
  };

}());
