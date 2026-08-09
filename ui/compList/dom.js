/**
 * @fileoverview DOM construction and cleanup for the comp list dropdown.
 * Depends on: (none — pure DOM, no AE or graph deps)
 * Exports: __compList_dom.createDropdown, __compList_dom.bindOutsideClick,
 *          __compList_dom.escapeHtml, __compList_dom.escapeAttr
 */
// ui/compList/dom.js
// MUST LOAD BEFORE: ui/compList/index.js

var __compList_dom = (function() {

  /**
   * Creates the dropdown DOM inside the given parent element.
   * @param {HTMLElement} parentEl The container (canvas-wrap).
   * @return {{ dropdown: HTMLElement, menu: HTMLElement, triggerLabel: HTMLElement, trigger: HTMLElement }}
   */
  function createDropdown(parentEl) {
    var dropdown = document.createElement('div');
    dropdown.id = 'complist-dropdown';

    dropdown.innerHTML =
      '<div class="complist-trigger">' +
        '<span class="complist-label">All project</span>' +
        '<span class="complist-arrow">&#9660;</span>' +
      '</div>' +
      '<div class="complist-menu"></div>';

    var menu = dropdown.querySelector('.complist-menu');
    var triggerLabel = dropdown.querySelector('.complist-label');
    var trigger = dropdown.querySelector('.complist-trigger');

    parentEl.appendChild(dropdown);

    return { dropdown: dropdown, menu: menu, triggerLabel: triggerLabel, trigger: trigger };
  }

  /**
   * Binds a document-level click handler to close the dropdown on outside clicks.
   * @param {HTMLElement} dropdown The dropdown element.
   * @param {Function} onClose Callback to close the dropdown.
   * @return {Function} Cleanup function that unbinds the listener.
   */
  function bindOutsideClick(dropdown, onClose) {
    function handler(e) {
      if (dropdown && !dropdown.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('click', handler);
    return function cleanup() {
      document.removeEventListener('click', handler);
    };
  }

  /**
   * Escapes a string for safe HTML insertion.
   * @param {string} str The string to escape.
   * @return {string} HTML-escaped string.
   */
  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  /**
   * Escapes a string for safe HTML attribute insertion.
   * @param {string} str The string to escape.
   * @return {string} Attribute-safe string.
   */
  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    createDropdown: createDropdown,
    bindOutsideClick: bindOutsideClick,
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr
  };

})();
