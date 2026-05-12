var csInterface = null;
try {
  csInterface = new CSInterface();
} catch (e) {
  console.warn('[Procedia] CSInterface not available — running outside AE');
}

// ─── JSX loader ──────────────────────────────────────────────────────────────

function loadJSX(fileName) {
  if (!csInterface) return;
  var extPath  = csInterface.getSystemPath(SystemPath.EXTENSION);
  var fullPath = extPath + '/jsx/' + fileName;
  // $.evalFile expects forward slashes on all platforms
  csInterface.evalScript('$.evalFile("' + fullPath.replace(/\\/g, '/') + '")');
}

// ─── Reserved-comp init guard ─────────────────────────────────────────────────

var procediaReady = false;

function ensureProcediaReady() {
  if (procediaReady || !csInterface) {
    return Promise.resolve();
  }
  return evalBridge.evalScript('initReservedComp()').then(function(res) {
    if (res.ok) {
      procediaReady = true;
    } else {
      console.error('[Procedia] initReservedComp failed:', res.error);
    }
  }).catch(function(err) {
    console.error('[Procedia] initReservedComp bridge error:', err.message);
  });
}

// ─── Node list data ──────────────────────────────────────────────────────────
// Mirrors the category/node definitions that nodeRegistry.js will own in Task 2.2.
// This list drives the visual node panel only — no logic attached yet.

var NODE_CATEGORIES = [
  {
    id: 'containers',
    label: 'Containers',
    color: '#5b8dd9',
    nodes: ['Comp', 'Solid', 'Null', 'Adjustment', 'Footage']
  },
  {
    id: 'layers',
    label: 'Layers',
    color: '#7ec98f',
    nodes: ['Text', 'Shape', 'Mask']
  },
  {
    id: 'effects',
    label: 'Effects',
    color: '#d4a04a',
    nodes: ['Effect']
  },
  {
    id: 'graph',
    label: 'Graph',
    color: '#b07ed4',
    nodes: ['GraphPosition', 'GraphRotation', 'GraphScale']
  },
  {
    id: 'special',
    label: 'Special',
    color: '#d46e6e',
    nodes: ['IsParent']
  }
];

// ─── Build node list DOM ─────────────────────────────────────────────────────

function buildNodeList() {
  var container = document.getElementById('node-categories');
  container.innerHTML = '';

  for (var i = 0; i < NODE_CATEGORIES.length; i++) {
    var cat = NODE_CATEGORIES[i];

    var catEl = document.createElement('div');
    catEl.className = 'category';
    catEl.dataset.id = cat.id;

    // Header
    var header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML =
      '<span class="category-chevron">&#9660;</span>' +
      '<span class="category-label">' + cat.label + '</span>';

    // Body
    var body = document.createElement('div');
    body.className = 'category-body';

    for (var j = 0; j < cat.nodes.length; j++) {
      var item = document.createElement('div');
      item.className = 'node-item';
      item.dataset.name = cat.nodes[j].toLowerCase();
      item.style.borderLeftColor = cat.color;
      item.textContent = cat.nodes[j];
      body.appendChild(item);
    }

    catEl.appendChild(header);
    catEl.appendChild(body);
    container.appendChild(catEl);

    // Collapse toggle
    (function(el) {
      el.querySelector('.category-header').addEventListener('click', function() {
        el.classList.toggle('collapsed');
      });
    }(catEl));
  }
}

// ─── Search filter ───────────────────────────────────────────────────────────

function applySearch(query) {
  var term = query.toLowerCase().trim();
  var categories = document.querySelectorAll('.category');

  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    var items = cat.querySelectorAll('.node-item');
    var anyVisible = false;

    for (var j = 0; j < items.length; j++) {
      var name = items[j].dataset.name || '';
      if (term === '' || name.indexOf(term) !== -1) {
        items[j].classList.remove('hidden');
        anyVisible = true;
      } else {
        items[j].classList.add('hidden');
      }
    }

    // Keep header visible if any child matches; hide entire category only when
    // a search is active and nothing matches
    if (term !== '' && !anyVisible) {
      cat.style.display = 'none';
    } else {
      cat.style.display = '';
      // Auto-expand collapsed categories when a search is active
      if (term !== '') {
        cat.classList.remove('collapsed');
      }
    }
  }
}

function initSearch() {
  var input = document.getElementById('node-search');
  var clearBtn = document.getElementById('node-search-clear');

  function syncClearBtn() {
    if (input.value.length > 0) {
      clearBtn.classList.add('visible');
    } else {
      clearBtn.classList.remove('visible');
    }
  }

  function clearSearch() {
    input.value = '';
    applySearch('');
    syncClearBtn();
    input.focus();
  }

  input.addEventListener('input', function() {
    applySearch(input.value);
    syncClearBtn();
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      clearSearch();
    }
  });

  clearBtn.addEventListener('click', clearSearch);
}

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

    ensureProcediaReady().then(function() {
      graphState.addNode({
        id:         id,
        type:       nodeType,
        state:      'ghost',
        position:   pos,
        properties: props
      });
    });
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

// ─── Keyboard: delete selected node ──────────────────────────────────────────

function initKeyboard() {
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    // Don't fire when user is typing in a text input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    var uuid = graphState.getSelection();
    if (!uuid) return;

    var n = graphState.getNode(uuid);
    if (n && n.state === 'alive') {
      console.warn('[Procedia] Deleting alive node ' + uuid + ' — AE cleanup pending (Phase 4)');
    }

    graphState.removeNode(uuid);
  });
}

// ─── Init ────────────────────────────────────────────────────────────────────

try { loadJSX('init.jsx'); }     catch(e) { console.error('[Procedia] loadJSX failed:', e); }
try { buildNodeList(); }        catch(e) { console.error('[Procedia] buildNodeList failed:', e); }
try { initSearch(); }           catch(e) { console.error('[Procedia] initSearch failed:', e); }
try { canvas.init(); }          catch(e) { console.error('[Procedia] canvas.init failed:', e); }
try { minimap.init(); }         catch(e) { console.error('[Procedia] minimap.init failed:', e); }
try { notificationBar.init(); } catch(e) { console.error('[Procedia] notificationBar.init failed:', e); }
try { inspector.init(); }       catch(e) { console.error('[Procedia] inspector.init failed:', e); }
try { initDrag(); }             catch(e) { console.error('[Procedia] initDrag failed:', e); }
try { initKeyboard(); }         catch(e) { console.error('[Procedia] initKeyboard failed:', e); }
