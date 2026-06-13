/**
 * @fileoverview Node list search/filter. Wires search input to filter node items.
 * Exports: __nl_search.wireSearch, .applySearch
 */
// ui/nodeList/search.js
// DEPENDS ON: ui/nodeList/categories.js (__nl_cat)
// MUST LOAD BEFORE: ui/nodeList/index.js

var __nl_search = (function() {

  var defaultOpenState = null;

  function getDefaultOpenState() {
    if (!defaultOpenState) {
      defaultOpenState = {};
      var cats = __nl_cat.CATEGORIES;
      for (var c = 0; c < cats.length; c++) {
        defaultOpenState['cat-' + cats[c].id] = cats[c].open;
      }
    }
    return defaultOpenState;
  }

  /**
   * Wires input and click events for search and clear.
   * @param {HTMLElement} searchInput The search input element.
   * @param {HTMLElement} searchClear The clear button element.
   * @param {HTMLElement} listEl The list container element.
   */
  function wireSearch(searchInput, searchClear, listEl) {
    searchInput.addEventListener('input', function() {
      var val = searchInput.value;
      if (val.length > 0) {
        searchClear.classList.add('visible');
      } else {
        searchClear.classList.remove('visible');
      }
      applySearch(listEl, val);
    });

    searchClear.addEventListener('click', function() {
      searchInput.value = '';
      searchClear.classList.remove('visible');
      applySearch(listEl, '');
      searchInput.focus();
    });
  }

  /**
   * Filters node items by query and hides/shows categories accordingly.
   * When a query is active, categories with matches are auto-opened.
   * When cleared, categories return to their default open/closed state.
   * @param {HTMLElement} listEl The list container element.
   * @param {string} query The search query string.
   */
  function applySearch(listEl, query) {
    var q = query.toLowerCase();
    var catEls = listEl.querySelectorAll('.leftbar-category');
    var defaults = getDefaultOpenState();

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
        if (defaults[catEl.id]) {
          catEl.classList.add('open');
        } else {
          catEl.classList.remove('open');
        }
      } else {
        catEl.style.display = (anyVisible || nodeItems.length === 0) ? '' : 'none';
        if (anyVisible) {
          catEl.classList.add('open');
        } else {
          catEl.classList.remove('open');
        }
      }
    }
  }

  return {
    wireSearch: wireSearch,
    applySearch: applySearch
  };

})();
