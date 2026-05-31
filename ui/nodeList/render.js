/**
 * @fileoverview Node list HTML rendering. Creates category groups and item markup.
 * Depends on: __nl_cat (global).
 * Exports: __nl_render.renderCategories, .renderCategory, .wireCategory, .toggleCategory
 */
// ui/nodeList/render.js
// DEPENDS ON: ui/nodeList/categories.js
// MUST LOAD BEFORE: ui/nodeList/index.js

var __nl_render = (function() {

  /**
   * Renders all categories into the list element and wires toggle events.
   * @param {HTMLElement} listEl The container element for the category list.
   */
  function renderCategories(listEl) {
    var cats = __nl_cat.CATEGORIES;
    var html = '';
    for (var i = 0; i < cats.length; i++) {
      html += renderCategory(cats[i]);
    }
    listEl.innerHTML = html;

    for (var j = 0; j < cats.length; j++) {
      wireCategory(cats[j]);
    }
  }

  /**
   * Renders a single category with its node items.
   * @param {Object} cat The category object.
   * @return {string} HTML string.
   */
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

  /**
   * Wires a click event to toggle the category open/closed.
   * @param {Object} cat The category object.
   */
  function wireCategory(cat) {
    var catId = 'cat-' + cat.id;
    var header = document.getElementById(catId + '-header');
    var catEl = document.getElementById(catId);
    if (!header || !catEl) return;

    header.addEventListener('click', function() {
      toggleCategory(catEl);
    });
  }

  /**
   * Toggles the 'open' class on a category element.
   * @param {HTMLElement} catEl The category DOM element.
   */
  function toggleCategory(catEl) {
    var isOpen = catEl.classList.contains('open');
    if (isOpen) {
      catEl.classList.remove('open');
    } else {
      catEl.classList.add('open');
    }
  }

  return {
    renderCategories: renderCategories,
    renderCategory: renderCategory,
    wireCategory: wireCategory,
    toggleCategory: toggleCategory
  };

})();
