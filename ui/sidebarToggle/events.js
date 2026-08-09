/**
 * @fileoverview Sidebar toggle mouse hover events. Tracks cursor position
 * over the canvas and shows/hides edge handles based on proximity to canvas edges.
 * Depends on: _sidebarHandles (global)
 * Exports: _sidebarEvents
 */
// ui/sidebarToggle/events.js
// DEPENDS ON: ui/sidebarToggle/handles.js
// MUST LOAD BEFORE: ui/sidebarToggle/index.js

var _sidebarEvents = (function() {

  /**
   * Wires mousemove and mouseleave listeners on the canvas wrap element
   * to show/hide sidebar handles based on cursor proximity to edges.
   * @param {HTMLElement} canvasWrap The canvas-wrap element.
   * @param {function(): boolean} isLeftOpenFn Callback returning whether left sidebar is open.
   * @param {function(): boolean} isRightOpenFn Callback returning whether right sidebar is open.
   */
  function setup(canvasWrap, isLeftOpenFn, isRightOpenFn) {
    if (!canvasWrap) return;

    var leftHandle = _sidebarHandles.getLeft();
    var rightHandle = _sidebarHandles.getRight();

    canvasWrap.addEventListener('mousemove', function(e) {
      var rect = canvasWrap.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var w = rect.width;

      if (x < 20) {
        _sidebarHandles.show(leftHandle);
      } else if (isLeftOpenFn()) {
        _sidebarHandles.hide(leftHandle);
      }

      if (x > w - 20) {
        _sidebarHandles.show(rightHandle);
      } else if (isRightOpenFn()) {
        _sidebarHandles.hide(rightHandle);
      }
    });

    canvasWrap.addEventListener('mouseleave', function() {
      if (isLeftOpenFn()) _sidebarHandles.hide(leftHandle);
      if (isRightOpenFn()) _sidebarHandles.hide(rightHandle);
    });
  }

  return {
    setup: setup
  };

})();
