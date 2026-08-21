/**
 * @fileoverview Node picker HTML rendering. Produces the list markup for the popup.
 * Exports: __np_render.renderList, .updateList, .scrollIntoView
 */
// ui/nodePicker/render.js
// DEPENDS ON: (none - pure rendering)
// MUST LOAD BEFORE: ui/nodePicker/index.js

var __np_render = (function() {

  function _escape(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Renders the list of node items with selection highlighting.
   * @param {Array} nodes Array of node definitions.
   * @param {number} selIndex The selected index.
   * @return {string} HTML string.
   */
  function renderList(nodes, selIndex) {
    if (!nodes || nodes.length === 0) {
      return '<div class="nodepicker-item nodepicker-empty">No compatible nodes</div>';
    }
    var groups = {};
    var order = [];
    for (var i = 0; i < nodes.length; i++) {
      nodes[i]._flatIndex = i;
      var cat = nodes[i].category || 'Other';
      if (!groups[cat]) {
        groups[cat] = [];
        order.push(cat);
      }
      groups[cat].push(nodes[i]);
    }
    var html = '';
    for (var g = 0; g < order.length; g++) {
      var catName = order[g];
      var items = groups[catName];
      html += '<div class="nodepicker-category">' + _escape(catName) + '</div>';
      for (var j = 0; j < items.length; j++) {
        html +=
          '<div class="nodepicker-item' + (items[j]._flatIndex === selIndex ? ' selected' : '') + '" data-type="' + _escape(items[j].type) + '">' +
            '<span class="nodepicker-item-label">' + _escape(items[j].label || items[j].type) + '</span>' +
          '</div>';
      }
    }
    return html;
  }

  /**
   * Updates the rendered list inside the overlay with current filter results.
   * @param {HTMLElement} overlay The picker overlay element.
   * @param {Array} filtered The filtered node definitions.
   * @param {number} selIndex The selected index.
   */
  function updateList(overlay, filtered, selIndex) {
    var list = overlay && overlay.querySelector('.nodepicker-list');
    if (!list) return;
    list.innerHTML = renderList(filtered, selIndex);
    scrollIntoView(overlay);
  }

  /**
   * Scrolls the selected item into view within the list.
   * @param {HTMLElement} overlay The picker overlay element.
   */
  function scrollIntoView(overlay) {
    var list = overlay && overlay.querySelector('.nodepicker-list');
    if (!list) return;
    var sel = list.querySelector('.nodepicker-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  return {
    renderList:    renderList,
    updateList:    updateList,
    scrollIntoView: scrollIntoView
  };

})();
