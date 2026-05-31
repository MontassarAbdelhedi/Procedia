/**
 * @fileoverview Sidebar toggle UI module. Creates edge handles to collapse/expand
 * the left and right sidebars on hover.
 * Exports: sidebarToggle.init, .collapseLeft, .expandLeft, .collapseRight, .expandRight
 */
// ui/sidebarToggle.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: index.js

var sidebarToggle = (function() {

  var leftBarOpen = true;
  var rightBarOpen = true;
  var leftHandle = null;
  var rightHandle = null;
  var canvasWrap = null;

  /**
   * Creates the sidebar toggle handles and wires mouse events.
   */
  function init() {
    canvasWrap = document.getElementById('canvas-wrap');

    leftHandle = document.createElement('div');
    leftHandle.className = 'sidebar-handle sidebar-handle--left';
    leftHandle.innerHTML = '<i class="ti ti-chevron-left"></i>';
    document.getElementById('edge-zone-left').appendChild(leftHandle);

    rightHandle = document.createElement('div');
    rightHandle.className = 'sidebar-handle sidebar-handle--right';
    rightHandle.innerHTML = '<i class="ti ti-chevron-right"></i>';
    document.getElementById('edge-zone-right').appendChild(rightHandle);

    canvasWrap.addEventListener('mousemove', onCanvasMouseMove);
    canvasWrap.addEventListener('mouseleave', onCanvasMouseLeave);

    leftHandle.addEventListener('click', function(e) {
      e.stopPropagation();
      if (leftBarOpen) {
        collapseLeft();
      } else {
        expandLeft();
      }
    });

    rightHandle.addEventListener('click', function(e) {
      e.stopPropagation();
      if (rightBarOpen) {
        collapseRight();
      } else {
        expandRight();
      }
    });
  }

  /**
   * Shows/hides sidebar handles based on mouse proximity to canvas edges.
   * @param {MouseEvent} e The mousemove event.
   */
  function onCanvasMouseMove(e) {
    var rect = canvasWrap.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var w = rect.width;

    if (x < 20) {
      showHandle(leftHandle);
    } else {
      hideHandle(leftHandle);
    }

    if (x > w - 20) {
      showHandle(rightHandle);
    } else {
      hideHandle(rightHandle);
    }
  }

  /**
   * Hides both sidebar handles when the mouse leaves the canvas.
   */
  function onCanvasMouseLeave() {
    hideHandle(leftHandle);
    hideHandle(rightHandle);
  }

  /**
   * Adds the 'visible' class to a handle element.
   * @param {HTMLElement} handle The handle element.
   */
  function showHandle(handle) {
    handle.classList.add('visible');
  }

  /**
   * Removes the 'visible' class from a handle element.
   * @param {HTMLElement} handle The handle element.
   */
  function hideHandle(handle) {
    handle.classList.remove('visible');
  }

  /**
   * Collapses the left sidebar.
   */
  function collapseLeft() {
    document.getElementById('left-bar').classList.add('collapsed');
    leftBarOpen = false;
    updateLeftHandleIcon();
  }

  /**
   * Expands the left sidebar.
   */
  function expandLeft() {
    document.getElementById('left-bar').classList.remove('collapsed');
    leftBarOpen = true;
    updateLeftHandleIcon();
  }

  /**
   * Collapses the right sidebar.
   */
  function collapseRight() {
    document.getElementById('right-bar').classList.add('collapsed');
    rightBarOpen = false;
    updateRightHandleIcon();
  }

  /**
   * Expands the right sidebar.
   */
  function expandRight() {
    document.getElementById('right-bar').classList.remove('collapsed');
    rightBarOpen = true;
    updateRightHandleIcon();
  }

  /**
   * Updates the left handle chevron icon direction.
   */
  function updateLeftHandleIcon() {
    var icon = leftHandle.querySelector('i');
    if (!icon) return;
    icon.className = leftBarOpen ? 'ti ti-chevron-left' : 'ti ti-chevron-right';
  }

  /**
   * Updates the right handle chevron icon direction.
   */
  function updateRightHandleIcon() {
    var icon = rightHandle.querySelector('i');
    if (!icon) return;
    icon.className = rightBarOpen ? 'ti ti-chevron-right' : 'ti ti-chevron-left';
  }

  return {
    init: init,
    collapseLeft: collapseLeft,
    expandLeft: expandLeft,
    collapseRight: collapseRight,
    expandRight: expandRight
  };

})();
