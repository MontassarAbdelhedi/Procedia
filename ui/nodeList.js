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
