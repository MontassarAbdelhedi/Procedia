/**
 * @fileoverview Node list sidebar UI module. Renders the left sidebar with
 * categorized node types, search filtering, and drag-to-canvas support.
 * Depends on: nodeRegistry, engine, viewport, __nl_cat, __nl_render, __nl_search, __nl_dragdrop.
 * Exports: nodeList.init
 */
// ui/nodeList/index.js
// DEPENDS ON: graph/nodeRegistry.js, graph/engine/index.js, graph/canvas/viewport.js,
//             ui/nodeList/categories.js, ui/nodeList/render.js,
//             ui/nodeList/search.js, ui/nodeList/dragdrop.js
// MUST LOAD BEFORE: index.js

var nodeList = (function() {

  var searchInput = null;
  var searchClear = null;
  var listEl = null;

  /**
   * Builds the left-bar DOM with search input and categorized node list.
   */
  function init() {
    var el = document.getElementById('left-bar');
    el.innerHTML =
      '<div class="leftbar-search">' +
        '<input type="text" class="leftbar-search-input" id="leftbar-search-input" placeholder="search nodes" autocomplete="off" spellcheck="false">' +
        '<button class="leftbar-search-clear" id="leftbar-search-clear">\u00d7</button>' +
      '</div>' +
      '<div class="leftbar-list" id="leftbar-list"></div>';

    searchInput = document.getElementById('leftbar-search-input');
    searchClear = document.getElementById('leftbar-search-clear');
    listEl = document.getElementById('leftbar-list');

    __nl_render.renderCategories(listEl);
    __nl_search.wireSearch(searchInput, searchClear, listEl);
    __nl_dragdrop.wireCanvasDrop(listEl);
  }

  return { init: init };

})();
