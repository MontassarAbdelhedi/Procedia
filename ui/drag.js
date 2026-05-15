// ui/drag.js
// DEPENDS ON: graph/graphState.js, graph/nodes/nodeRegistry.js, graph/canvas/viewport.js,
//             graph/nodes/node.js, data/uuidGenerator.js
// MUST LOAD BEFORE: index.js

function initDrag() {
  var preview      = document.getElementById('drag-preview');
  var canvasColumn = document.getElementById('canvas-column');
  if (!preview || !canvasColumn) return;

  var activeDef  = null; // nodeRegistry definition while dragging

  // ─── Mousedown on a node-item in the list ────────────────────

  document.getElementById('node-categories').addEventListener('mousedown', function(e) {
    var item = e.target;
    while (item && !item.classList.contains('node-item')) {
      item = item.parentElement;
    }
    if (!item) return;

    var nodeType = item.dataset.type;
    if (!nodeType) return;

    var def = nodeRegistry.getByType(nodeType);
    if (!def) return;

    activeDef = def;

    preview.textContent        = def.label || nodeType;
    preview.style.borderColor  = nodeRegistry.getCategoryColor(def.category);
    preview.style.display      = 'block';
    preview.style.left         = (e.clientX + 10) + 'px';
    preview.style.top          = (e.clientY - 14) + 'px';

    e.preventDefault();
  });

  // ─── Move preview ghost ───────────────────────────────────────

  document.addEventListener('mousemove', function(e) {
    if (!activeDef) return;
    preview.style.left = (e.clientX + 10) + 'px';
    preview.style.top  = (e.clientY - 14) + 'px';
  });

  // ─── Drop ─────────────────────────────────────────────────────

  document.addEventListener('mouseup', function(e) {
    if (!activeDef) return;

    var def   = activeDef;
    activeDef = null;
    preview.style.display = 'none';

    var rect = canvasColumn.getBoundingClientRect();
    var insideCanvas = (
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top  && e.clientY <= rect.bottom
    );
    if (!insideCanvas) return;

    var screenX  = e.clientX - rect.left;
    var screenY  = e.clientY - rect.top;
    var worldPos = canvas.screenToWorld(screenX, screenY);

    // Centre node on cursor
    var wx = worldPos.x - node.NODE_WIDTH  / 2;
    var wy = worldPos.y - node.NODE_HEIGHT / 2;

    graphState.onDrop(def.type, wx, wy);
  });
}
