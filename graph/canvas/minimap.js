var minimap = (function() {

  var el = null;
  var ctx = null;

  // Fixed minimap canvas size (matches CSS)
  var MM_W = 160;
  var MM_H = 100;

  // Fixed world bounds the minimap represents. Expands in Phase 2+ when nodes
  // are tracked. Origin (0,0) is the center of this space.
  var WORLD_W = 4000;
  var WORLD_H = 2500;

  var isDragging = false;

  // ─── Coordinate helpers ───────────────────────────────────────

  // World position → minimap pixel
  function worldToMM(wx, wy) {
    return {
      x: (wx / WORLD_W + 0.5) * MM_W,
      y: (wy / WORLD_H + 0.5) * MM_H
    };
  }

  // Minimap pixel → world position
  function mmToWorld(mx, my) {
    return {
      x: (mx / MM_W - 0.5) * WORLD_W,
      y: (my / MM_H - 0.5) * WORLD_H
    };
  }

  // ─── Render ──────────────────────────────────────────────────

  function render() {
    if (!ctx) return;

    ctx.clearRect(0, 0, MM_W, MM_H);
    ctx.fillStyle = 'rgba(17, 17, 17, 0.85)';
    ctx.fillRect(0, 0, MM_W, MM_H);

    drawNodeDots();
    drawViewportRect();
  }

  function drawNodeDots() {
    var nodes = graphState.getAllNodes();
    var keys = Object.keys(nodes);
    for (var i = 0; i < keys.length; i++) {
      var n = nodes[keys[i]];
      var def = nodeRegistry.getByType(n.type);
      var color = nodeRegistry.getCategoryColor(def ? def.category : null);
      if (n.state === 'ghost') color = '#3a3a3a';

      var mmPos = worldToMM(n.position.x, n.position.y);
      ctx.beginPath();
      ctx.arc(mmPos.x, mmPos.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  function drawViewportRect() {
    var t = canvas.getTransform();
    var d = canvas.getDimensions();
    if (d.width === 0 || d.height === 0) return;

    // Viewport corners in world space
    var tlWorld = canvas.screenToWorld(0, 0);
    var brWorld = canvas.screenToWorld(d.width, d.height);

    // Clamp to world bounds so the rect never draws outside minimap
    var x1 = Math.max(0, Math.min(MM_W, worldToMM(tlWorld.x, tlWorld.y).x));
    var y1 = Math.max(0, Math.min(MM_H, worldToMM(tlWorld.x, tlWorld.y).y));
    var x2 = Math.max(0, Math.min(MM_W, worldToMM(brWorld.x, brWorld.y).x));
    var y2 = Math.max(0, Math.min(MM_H, worldToMM(brWorld.x, brWorld.y).y));

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  }

  // ─── Click / drag to pan ──────────────────────────────────────

  function panCanvasTo(mx, my) {
    var worldPos = mmToWorld(mx, my);
    var d = canvas.getDimensions();
    var t = canvas.getTransform();

    // Center the canvas on this world point
    var newOffsetX = d.width / 2 - worldPos.x * t.scale;
    var newOffsetY = d.height / 2 - worldPos.y * t.scale;
    canvas.setTransformOffset(newOffsetX, newOffsetY);
  }

  function getLocalPos(e) {
    var rect = el.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function onMouseDown(e) {
    e.stopPropagation();
    isDragging = true;
    var pos = getLocalPos(e);
    panCanvasTo(pos.x, pos.y);
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    e.stopPropagation();
    var pos = getLocalPos(e);
    panCanvasTo(pos.x, pos.y);
  }

  function onMouseUp(e) {
    isDragging = false;
  }

  // ─── Init ─────────────────────────────────────────────────────

  function init() {
    el = document.getElementById('minimap-canvas');
    el.width = MM_W;
    el.height = MM_H;
    ctx = el.getContext('2d');

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mouseleave', function() { isDragging = false; });

    // Prevent minimap wheel/spacebar events from reaching the main canvas
    el.addEventListener('wheel', function(e) { e.stopPropagation(); });

    canvas.onAfterRender(render);
  }

  // ─── Public API ───────────────────────────────────────────────

  return {
    init: init,
    render: render
  };

}());
