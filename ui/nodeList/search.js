/**
 * @fileoverview Node list search/filter. Wires search input to filter node items.
 * Exports: __nl_search.wireSearch, .applySearch
 */
// ui/nodeList/search.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: ui/nodeList/index.js

var __nl_search = (function() {

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
   * @param {HTMLElement} listEl The list container element.
   * @param {string} query The search query string.
   */
  function applySearch(listEl, query) {
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

  return {
    wireSearch: wireSearch,
    applySearch: applySearch
  };

})();
