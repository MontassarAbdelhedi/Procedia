// graph/canvas/input/labelEditor.js
// DEPENDS ON: graph/graphState/store.js, graph/canvas/viewport.js, graph/nodes/nodeGeometry.js,
//             graph/nodes/nodeRegistry.js
// MUST LOAD BEFORE: graph/canvas/input/input.js
// NOTE: commit() calls canvasInput.render() at runtime — canvasInput is defined in input.js

function startLabelEdit(uuid) {
  var n = graphState.getNode(uuid);
  if (!n) return;
  var transform  = canvasViewport.getTransform();
  var def        = nodeRegistry.getByType(n.type);
  var current    = n.label || (def ? def.label : n.type);

  var sx = n.position.x * transform.scale + transform.offsetX;
  var sy = n.position.y * transform.scale + transform.offsetY;
  var sw = nodeGeometry.NODE_WIDTH * transform.scale;

  var el   = canvasViewport.getEl();
  var rect = el.getBoundingClientRect();

  var inp = document.createElement('input');
  inp.type  = 'text';
  inp.value = current;
  inp.style.cssText = [
    'position:fixed',
    'left:'   + (rect.left + sx + 20 * transform.scale) + 'px',
    'top:'    + (rect.top  + sy + 10 * transform.scale) + 'px',
    'width:'  + (sw - 30 * transform.scale) + 'px',
    'height:' + (18 * transform.scale) + 'px',
    'background:#1a1a1a',
    'color:#cccccc',
    'border:1px solid #5b8dd9',
    'border-radius:2px',
    'font:'   + Math.max(8, Math.round(11 * transform.scale)) + 'px monospace',
    'padding:0 4px',
    'outline:none',
    'z-index:9999'
  ].join(';');

  document.body.appendChild(inp);
  inp.focus();
  inp.select();

  var committed = false;

  function commit() {
    if (committed) return;
    committed = true;
    document.removeEventListener('mousedown', onOutsideMouseDown, true);
    if (document.body.contains(inp)) document.body.removeChild(inp);
    var newLabel = inp.value.trim();
    if (newLabel && newLabel !== current) {
      graphState.updateNode(uuid, { label: newLabel });
      if (typeof callRenameNode === 'function') callRenameNode(uuid, newLabel);
    }
    canvasInput.render();
  }

  function onOutsideMouseDown(e) {
    if (e.target !== inp) commit();
  }
  document.addEventListener('mousedown', onOutsideMouseDown, true);

  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') {
      committed = true;
      document.removeEventListener('mousedown', onOutsideMouseDown, true);
      if (document.body.contains(inp)) document.body.removeChild(inp);
    }
    e.stopPropagation();
  });
  inp.addEventListener('blur', commit);
}
