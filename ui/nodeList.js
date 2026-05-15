// ui/nodeList.js
// DEPENDS ON: graph/nodes/nodeRegistry.js
// MUST LOAD BEFORE: index.js

// ─── Build node list DOM ──────────────────────────────────────────

function buildNodeList() {
  var container = document.getElementById('node-categories');
  if (!container) return;
  container.innerHTML = '';

  var cats = nodeRegistry.getCategories();

  for (var i = 0; i < cats.length; i++) {
    var cat   = cats[i];
    var color = nodeRegistry.getCategoryColor(cat);
    var defs  = nodeRegistry.getByCategory(cat);

    // Deduplicate: 'core/comp' alias shares def object with 'CompNode'
    var seen     = {};
    var unique   = [];
    for (var d = 0; d < defs.length; d++) {
      if (!seen[defs[d].type]) {
        seen[defs[d].type] = true;
        unique.push(defs[d]);
      }
    }
    if (unique.length === 0) continue;

    var catEl = document.createElement('div');
    catEl.className    = 'category';
    catEl.dataset.cat  = cat;

    var header = document.createElement('div');
    header.className   = 'category-header';
    header.innerHTML   =
      '<span class="category-chevron">&#9660;</span>' +
      '<span class="category-label">' + cat + '</span>';
    header.style.borderLeftColor = color;

    var body = document.createElement('div');
    body.className = 'category-body';

    for (var j = 0; j < unique.length; j++) {
      var def  = unique[j];
      var item = document.createElement('div');
      item.className             = 'node-item';
      item.dataset.type          = def.type;
      item.dataset.searchLabel   = (def.label || def.type).toLowerCase();
      item.style.borderLeftColor = color;
      item.textContent           = def.label || def.type;
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

// ─── Search filter ────────────────────────────────────────────────

function applySearch(query) {
  var term       = query.toLowerCase().trim();
  var categories = document.querySelectorAll('.category');

  for (var i = 0; i < categories.length; i++) {
    var cat      = categories[i];
    var items    = cat.querySelectorAll('.node-item');
    var anyVisible = false;

    for (var j = 0; j < items.length; j++) {
      var label = items[j].dataset.searchLabel || '';
      if (term === '' || label.indexOf(term) !== -1) {
        items[j].classList.remove('hidden');
        anyVisible = true;
      } else {
        items[j].classList.add('hidden');
      }
    }

    if (term !== '' && !anyVisible) {
      cat.style.display = 'none';
    } else {
      cat.style.display = '';
      if (term !== '') cat.classList.remove('collapsed');
    }
  }
}

function initSearch() {
  var input    = document.getElementById('node-search');
  var clearBtn = document.getElementById('node-search-clear');
  if (!input || !clearBtn) return;

  function syncClearBtn() {
    if (input.value.length > 0) clearBtn.classList.add('visible');
    else                        clearBtn.classList.remove('visible');
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
    if (e.key === 'Escape') clearSearch();
  });

  clearBtn.addEventListener('click', clearSearch);
}
