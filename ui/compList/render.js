/**
 * @fileoverview Renders the comp list menu and binds click handlers.
 * Depends on: __compList_dom (escapeHtml, escapeAttr), __compList_logic (onItemClick)
 * Exports: __compList_render.renderComps
 */
// ui/compList/render.js
// DEPENDS ON: ui/compList/dom.js, ui/compList/logic.js
// MUST LOAD BEFORE: ui/compList/index.js

var __compList_render = (function() {

  /**
   * Renders the comp list into the menu element and binds click handlers.
   * @param {HTMLElement} menu The menu container element.
   * @param {Array} comps Array of { name, comment } objects.
   * @param {Function} closeFn Callback to close the dropdown after selection.
   * @param {HTMLElement} triggerLabel The label element to update text on selection.
   */
  function renderComps(menu, comps, closeFn, triggerLabel) {
    var html = '<div class="complist-item" data-name="" data-comment="">All project</div>';
    if (comps && comps.length > 0) {
      for (var i = 0; i < comps.length; i++) {
        var c = comps[i];
        html += '<div class="complist-item" data-name="' + __compList_dom.escapeAttr(c.name) + '" data-comment="' + __compList_dom.escapeAttr(c.comment) + '">' + __compList_dom.escapeHtml(c.name) + '</div>';
      }
    }
    menu.innerHTML = html;
    _bindItems(menu, closeFn, triggerLabel);
  }

  /**
   * Binds click handlers to all menu items.
   * @param {HTMLElement} menu The menu container element.
   * @param {Function} closeFn Callback to close the dropdown.
   * @param {HTMLElement} triggerLabel The label element to update.
   */
  function _bindItems(menu, closeFn, triggerLabel) {
    var items = menu.querySelectorAll('.complist-item');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', function(e) {
        e.stopPropagation();
        var item = e.currentTarget;
        var name = item.dataset.name;
        var comment = item.dataset.comment;
        closeFn();

        if (!name && !comment) {
          __compList_logic.selectAllProject(triggerLabel);
        } else {
          __compList_logic.selectComp(name, comment, triggerLabel);
        }
      });
    }
  }

  return {
    renderComps: renderComps
  };

})();
