/**
 * @fileoverview Node picker event handlers. Manages clicks and keyboard
 * navigation (arrow keys, Enter, Escape) within the picker popup.
 * Depends on: __np_render, __np_filter (globals).
 * Exports: __np_events.onOverlayClick, .onKeyDown
 */
// ui/nodePicker/events.js
// DEPENDS ON: ui/nodePicker/render.js, ui/nodePicker/filter.js
// MUST LOAD BEFORE: ui/nodePicker/index.js

var __np_events = (function() {

  /**
   * Handles clicks on the overlay: dismiss if clicking outside, or select a node item.
   * @param {MouseEvent} e The click event.
   * @param {Function} closeFn The close callback.
   */
  function onOverlayClick(e, closeFn) {
    if (e.target.classList.contains('nodepicker-overlay')) {
      closeFn(null);
      return;
    }
    var item = e.target;
    while (item && !item.classList.contains('nodepicker-item')) {
      item = item.parentElement;
    }
    if (!item || item.classList.contains('nodepicker-empty')) return;
    var type = item.getAttribute('data-type');
    if (type) closeFn(type);
  }

  /**
   * Handles keyboard navigation within the picker (Escape, ArrowDown, ArrowUp, Enter).
   * @param {KeyboardEvent} e The keydown event.
   * @param {Object} state The picker state object.
   * @param {Function} closeFn The close callback.
   */
  function onKeyDown(e, state, closeFn) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeFn(null);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (state.filtered.length === 0) return;
      state.selIndex = (state.selIndex + 1) % state.filtered.length;
      __np_render.updateList(state.overlay, state.filtered, state.selIndex);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (state.filtered.length === 0) return;
      state.selIndex = (state.selIndex - 1 + state.filtered.length) % state.filtered.length;
      __np_render.updateList(state.overlay, state.filtered, state.selIndex);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      var def = __np_filter.selectedDef(state.filtered, state.selIndex);
      if (def) closeFn(def.type);
      return;
    }
  }

  return {
    onOverlayClick: onOverlayClick,
    onKeyDown:      onKeyDown
  };

})();
