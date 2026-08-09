/**
 * @fileoverview Sidebar toggle UI module. Manages collapse/expand state for left
 * and right sidebars, wires click handlers on edge handles, and coordinates
 * the handle DOM (_sidebarHandles) with hover events (_sidebarEvents).
 * Depends on: _sidebarHandles, _sidebarEvents (globals)
 * Exports: sidebarToggle.init, .collapseLeft, .expandLeft, .collapseRight, .expandRight
 */
// ui/sidebarToggle/index.js
// DEPENDS ON: ui/sidebarToggle/handles.js, ui/sidebarToggle/events.js
// MUST LOAD BEFORE: index.js

var sidebarToggle = (function() {

  var leftBarOpen = true;
  var rightBarOpen = true;

  /**
   * Creates sidebar toggle handles, wires hover events, and binds click handlers.
   */
  function init() {
    if (typeof _sidebarHandles === 'undefined' || typeof _sidebarEvents === 'undefined') return;

    _sidebarHandles.create();

    var canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasWrap) return;

    _sidebarEvents.setup(canvasWrap,
      function() { return leftBarOpen; },
      function() { return rightBarOpen; }
    );

    var leftHandle = _sidebarHandles.getLeft();
    var rightHandle = _sidebarHandles.getRight();

    if (leftHandle) {
      leftHandle.addEventListener('click', function(e) {
        e.stopPropagation();
        if (leftBarOpen) {
          collapseLeft();
        } else {
          expandLeft();
        }
      });
    }

    if (rightHandle) {
      rightHandle.addEventListener('click', function(e) {
        e.stopPropagation();
        if (rightBarOpen) {
          collapseRight();
        } else {
          expandRight();
        }
      });
    }
  }

  /**
   * Collapses the left sidebar.
   */
  function collapseLeft() {
    document.getElementById('left-bar').classList.add('collapsed');
    leftBarOpen = false;
    _sidebarHandles.show(_sidebarHandles.getLeft());
    _sidebarHandles.updateLeftIcon(false);
  }

  /**
   * Expands the left sidebar.
   */
  function expandLeft() {
    document.getElementById('left-bar').classList.remove('collapsed');
    leftBarOpen = true;
    _sidebarHandles.hide(_sidebarHandles.getLeft());
    _sidebarHandles.updateLeftIcon(true);
  }

  /**
   * Collapses the right sidebar.
   */
  function collapseRight() {
    document.getElementById('right-bar').classList.add('collapsed');
    rightBarOpen = false;
    _sidebarHandles.show(_sidebarHandles.getRight());
    _sidebarHandles.updateRightIcon(false);
  }

  /**
   * Expands the right sidebar.
   */
  function expandRight() {
    document.getElementById('right-bar').classList.remove('collapsed');
    rightBarOpen = true;
    _sidebarHandles.hide(_sidebarHandles.getRight());
    _sidebarHandles.updateRightIcon(true);
  }

  return {
    init: init,
    collapseLeft: collapseLeft,
    expandLeft: expandLeft,
    collapseRight: collapseRight,
    expandRight: expandRight
  };

})();
