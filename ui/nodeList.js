// ui/nodeList.js
// DEPENDS ON: graph/nodeRegistry.js, graph/engine.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: index.js

var nodeList = (function() {

  // Left-bar display label → nodeRegistry type id (only registered types are draggable)
  var LABEL_TO_TYPE = {
    'Text':     'layers/text',
    'Null':     'layers/null',
    'Comp':     'core/comp',
    'Fill':     'effects/fill',
    'Color':    'data/color',
    'Number':   'data/number',
    'Blending': 'utility/blending'
  };

  var _dragLabel = null;
  var _ghostEl = null;

  function _getCategoryColor(label) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      for (var j = 0; j < CATEGORIES[i].nodes.length; j++) {
        if (CATEGORIES[i].nodes[j] === label) return CATEGORIES[i].color;
      }
    }
    return '#888780';
  }

  var CATEGORIES = [
    {
      id: 'layers',
      name: 'Layers',
      color: '#185FA5',
      open: true,
      nodes: ['Text', 'Null']
    },
    {
      id: 'effects',
      name: 'Effects',
      color: '#854F0B',
      open: true,
      nodes: ['Fill']
    },
    {
      id: 'comps',
      name: 'Comps',
      color: '#534AB7',
      open: false,
      nodes: ['Comp']
    },
    {
      id: 'data',
      name: 'Data',
      color: '#2E7D32',
      open: false,
      nodes: ['Color', 'Number']
    },
    {
      id: 'utility',
      name: 'Utility',
      color: '#5F5E5A',
      open: false,
      nodes: ['Blending']
    }
  ];

  var searchInput = null;
  var searchClear = null;
  var listEl = null;

  function init() {
    var el = document.getElementById('left-bar');
    el.innerHTML =
      '<div class="leftbar-search">' +
        '<input type="text" class="leftbar-search-input" id="leftbar-search-input" placeholder="filter nodes…" autocomplete="off" spellcheck="false">' +
        '<button class="leftbar-search-clear" id="leftbar-search-clear">×</button>' +
      '</div>' +
      '<div class="leftbar-list" id="leftbar-list"></div>';

    searchInput = document.getElementById('leftbar-search-input');
    searchClear = document.getElementById('leftbar-search-clear');
    listEl = document.getElementById('leftbar-list');

    renderCategories();
    wireSearch();
    wireCanvasDrop();
  }

  function _resolveDefByLabel(label) {
    var type = LABEL_TO_TYPE[label];
    if (!type) return null;
    return nodeRegistry.getDefinition(type);
  }

  function wireCanvasDrop() {
    var items = listEl.querySelectorAll('.leftbar-node-item');
    for (var i = 0; i < items.length; i++) {
      (function(item) {
        var labelEl = item.querySelector('.leftbar-node-name');
        var label = labelEl ? labelEl.textContent : '';
        var def = _resolveDefByLabel(label);

        if (!def) {
          item.classList.add('leftbar-node-item--disabled');
          item.title = 'Not available yet';
          return;
        }

        item.addEventListener('mousedown', function(e) {
          if (e.button !== 0) return;
          _dragLabel = label;
          item.classList.add('leftbar-node-item--dragging');

          var ghost = document.createElement('div');
          ghost.className = 'node-drag-ghost';
          ghost.innerHTML =
            '<span class="node-drag-ghost-dot" style="background:' + _getCategoryColor(label) + '"></span>' +
            '<span class="node-drag-ghost-label">' + label + '</span>';
          ghost.style.left = (e.clientX + 12) + 'px';
          ghost.style.top = (e.clientY - 8) + 'px';
          document.body.appendChild(ghost);
          _ghostEl = ghost;

          e.preventDefault();
        });
      }(items[i]));
    }

    document.addEventListener('mousemove', function(e) {
      if (!_ghostEl) return;
      _ghostEl.style.left = (e.clientX + 12) + 'px';
      _ghostEl.style.top = (e.clientY - 8) + 'px';
    });

    document.addEventListener('mouseup', function(e) {
      if (_ghostEl) {
        _ghostEl.parentNode.removeChild(_ghostEl);
        _ghostEl = null;
      }
      if (!_dragLabel) return;

      var dragging = listEl.querySelector('.leftbar-node-item--dragging');
      if (dragging) dragging.classList.remove('leftbar-node-item--dragging');

      var label = _dragLabel;
      _dragLabel = null;

      var wrap = document.getElementById('canvas-wrap');
      if (!wrap) return;
      var rect = wrap.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) {
        return;
      }

      var def = _resolveDefByLabel(label);
      if (!def) return;

      var pos = viewport.screenToCanvas(e.clientX, e.clientY);

      // Check for wire-insertion: if drop is on an existing wire, insert node
      if (typeof canvasDrag !== 'undefined' && canvasDrag.findWireAt) {
        var hitWire = canvasDrag.findWireAt(pos.x, pos.y);
        if (hitWire) {
          var insertNode = canvasDrag.insertNodeOnWire(hitWire.id, def, pos.x, pos.y);
          if (insertNode) {
            graphState.setSelection(insertNode.id);
            renderer.render();
            if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
            if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
            if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
          }
          return;
        }
      }

      var node = engine.dropNode(def, pos.x, pos.y);
      if (node) {
        graphState.setSelection(node.id);
        renderer.render();
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
        if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
        if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
      }
    });
  }

  function renderCategories() {
    var html = '';
    for (var i = 0; i < CATEGORIES.length; i++) {
      html += renderCategory(CATEGORIES[i]);
    }
    listEl.innerHTML = html;

    for (var j = 0; j < CATEGORIES.length; j++) {
      wireCategory(CATEGORIES[j]);
    }
  }

  function renderCategory(cat) {
    var catId = 'cat-' + cat.id;
    var itemsHtml = '';
    for (var i = 0; i < cat.nodes.length; i++) {
      itemsHtml +=
        '<div class="leftbar-node-item" data-node="' + cat.nodes[i] + '">' +
          '<div class="leftbar-node-dot" style="background:' + cat.color + '"></div>' +
          '<span class="leftbar-node-name">' + cat.nodes[i] + '</span>' +
        '</div>';
    }

    return (
      '<div class="leftbar-category' + (cat.open ? ' open' : '') + '" id="' + catId + '">' +
        '<div class="leftbar-category-header" id="' + catId + '-header">' +
          '<span class="leftbar-category-name">' + cat.name + '</span>' +
          '<i class="ti ti-chevron-right leftbar-category-chevron"></i>' +
        '</div>' +
        '<div class="leftbar-category-items" id="' + catId + '-items">' +
          itemsHtml +
        '</div>' +
      '</div>'
    );
  }

  function wireCategory(cat) {
    var catId = 'cat-' + cat.id;
    var header = document.getElementById(catId + '-header');
    var catEl = document.getElementById(catId);
    if (!header || !catEl) return;

    header.addEventListener('click', function() {
      toggleCategory(catEl);
    });
  }

  function toggleCategory(catEl) {
    var isOpen = catEl.classList.contains('open');
    if (isOpen) {
      catEl.classList.remove('open');
    } else {
      catEl.classList.add('open');
    }
  }

  function wireSearch() {
    searchInput.addEventListener('input', function() {
      var val = searchInput.value;
      if (val.length > 0) {
        searchClear.classList.add('visible');
      } else {
        searchClear.classList.remove('visible');
      }
      applySearch(val);
    });

    searchClear.addEventListener('click', function() {
      searchInput.value = '';
      searchClear.classList.remove('visible');
      applySearch('');
      searchInput.focus();
    });
  }

  function applySearch(query) {
    var q = query.toLowerCase();
    var catEls = listEl.querySelectorAll('.leftbar-category');

    for (var i = 0; i < catEls.length; i++) {
      var catEl = catEls[i];
      var nodeItems = catEl.querySelectorAll('.leftbar-node-item');
      var anyVisible = false;

      for (var j = 0; j < nodeItems.length; j++) {
        var nameEl = nodeItems[j].querySelector('.leftbar-node-name');
        var name = nameEl ? nameEl.textContent.toLowerCase() : '';

        if (q === '' || name.indexOf(q) !== -1) {
          nodeItems[j].classList.remove('hidden');
          anyVisible = true;
        } else {
          nodeItems[j].classList.add('hidden');
        }
      }

      if (q === '') {
        catEl.style.display = '';
      } else {
        catEl.style.display = (anyVisible || nodeItems.length === 0) ? '' : 'none';
      }
    }
  }

  return { init: init };

})();
