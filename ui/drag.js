// ─── Drag from node list to canvas ───────────────────────────────────────────

var dragState = {
  active: false,
  nodeType: null,   // e.g. 'TextNode'
  nodeLabel: null,  // e.g. 'Text'
  strokeColor: null
};

function initDrag() {
  var preview = document.getElementById('drag-preview');
  var canvasColumn = document.getElementById('canvas-column');

  // Map node list item labels to node type names in the registry
  var LABEL_TO_TYPE = {
    'comp':          'core/comp',
    'solid':         'SolidNode',
    'null':          'NullNode',
    'adjustment':    'AdjustmentNode',
    'footage':       'FootageNode',
    'text':          'TextNode',
    'shape':         'ShapeNode',
    'mask':          'MaskNode',
    'effect':        'EffectNode',
    'graphposition': 'GraphPositionNode',
    'graphrotation': 'GraphRotationNode',
    'graphscale':    'GraphScaleNode',
    'isparent':      'IsParentNode'
  };

  document.getElementById('node-categories').addEventListener('mousedown', function(e) {
    var item = e.target;
    while (item && !item.classList.contains('node-item')) {
      item = item.parentElement;
    }
    if (!item) return;

    var rawName = (item.dataset.name || '').toLowerCase();
    var nodeType = LABEL_TO_TYPE[rawName];
    if (!nodeType) return;

    var def = nodeRegistry.getByType(nodeType);
    if (!def) return;

    dragState.active      = true;
    dragState.nodeType    = nodeType;
    dragState.nodeLabel   = def.label;
    dragState.strokeColor = nodeRegistry.getCategoryColor(def.category);

    preview.textContent   = def.label;
    preview.style.borderColor = dragState.strokeColor;
    preview.style.display = 'block';
    preview.style.left    = (e.clientX + 10) + 'px';
    preview.style.top     = (e.clientY - 14) + 'px';

    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!dragState.active) return;
    preview.style.left = (e.clientX + 10) + 'px';
    preview.style.top  = (e.clientY - 14) + 'px';
  });

  document.addEventListener('mouseup', function(e) {
    if (!dragState.active) return;

    preview.style.display = 'none';
    dragState.active = false;

    // Check if drop landed inside the canvas column
    var rect = canvasColumn.getBoundingClientRect();
    var insideCanvas = (
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top  && e.clientY <= rect.bottom
    );

    if (!insideCanvas) return;

    // Convert screen position to canvas-relative screen position, then to world
    var screenX = e.clientX - rect.left;
    var screenY = e.clientY - rect.top;
    var worldPos = canvas.screenToWorld(screenX, screenY);

    var def      = nodeRegistry.getByType(dragState.nodeType);
    var id       = uuidGenerator.generateNodeId();
    var nodeType = dragState.nodeType;
    var pos      = { x: worldPos.x - node.NODE_WIDTH / 2, y: worldPos.y - node.NODE_HEIGHT / 2 };
    var props    = buildDefaultProperties(def);

    // CompNode is always alive immediately — it IS the AE comp, no wiring needed.
    // All other nodes start as ghost and become alive when wired to a comp.
    var initialState = (nodeType === 'core/comp') ? 'alive' : 'ghost';

    graphState.addNode({
      id:         id,
      type:       nodeType,
      state:      initialState,
      position:   pos,
      properties: props
    });

    if (csInterface) {
      if (nodeType === 'core/comp') {
        // CompNode: skip ghost, call makeNodeAlive directly.
        // onNodeStateChange will NOT fire (state set via addNode, not updateNode).
        callMakeNodeAlive(id);
      } else {
        // Ghost nodes: persist entry to dataLayer, await wiring to go alive.
        ensureProcediaReady()
          .then(function() {
            return evalBridge.evalScript(
              'writeGhostEntry(' + JSON.stringify(id) + ', ' + JSON.stringify(nodeType) + ')'
            );
          })
          .then(function(res) {
            if (!res.ok) {
              console.error('[Procedia] writeGhostEntry failed:', res.error);
            }
          })
          .catch(function(err) {
            console.error('[Procedia] AE persistence failed:', err.message);
          });
      }
    }
  });
}

function buildDefaultProperties(def) {
  var props = {};
  if (!def || !def.params) return props;
  for (var i = 0; i < def.params.length; i++) {
    props[def.params[i].key] = def.params[i].default;
  }
  return props;
}
