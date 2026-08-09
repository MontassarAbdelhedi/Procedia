/**
 * @fileoverview Sidebar toggle handle DOM creation and style management.
 * Creates edge handle elements for left/right sidebars and provides
 * methods to show, hide, and update chevron icon direction.
 * Depends on: (none)
 * Exports: _sidebarHandles
 */
// ui/sidebarToggle/handles.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: ui/sidebarToggle/events.js, ui/sidebarToggle/index.js

var _sidebarHandles = (function() {

  var leftHandle = null;
  var rightHandle = null;

  /**
   * Creates left and right sidebar handle elements and appends them to the edge zones.
   */
  function create() {
    leftHandle = document.createElement('div');
    leftHandle.className = 'sidebar-handle sidebar-handle--left';
    leftHandle.innerHTML = '<i class="ti ti-chevron-left"></i>';
    document.getElementById('edge-zone-left').appendChild(leftHandle);

    rightHandle = document.createElement('div');
    rightHandle.className = 'sidebar-handle sidebar-handle--right';
    rightHandle.innerHTML = '<i class="ti ti-chevron-right"></i>';
    document.getElementById('edge-zone-right').appendChild(rightHandle);
  }

  /**
   * Adds the 'visible' class to a handle element.
   * @param {HTMLElement} handle The handle element.
   */
  function show(handle) {
    if (!handle) return;
    handle.classList.add('visible');
  }

  /**
   * Removes the 'visible' class from a handle element.
   * @param {HTMLElement} handle The handle element.
   */
  function hide(handle) {
    if (!handle) return;
    handle.classList.remove('visible');
  }

  /**
   * Updates the left handle chevron icon direction based on sidebar state.
   * @param {boolean} isOpen Whether the left sidebar is open.
   */
  function updateLeftIcon(isOpen) {
    var icon = leftHandle.querySelector('i');
    if (!icon) return;
    icon.className = isOpen ? 'ti ti-chevron-left' : 'ti ti-chevron-right';
  }

  /**
   * Updates the right handle chevron icon direction based on sidebar state.
   * @param {boolean} isOpen Whether the right sidebar is open.
   */
  function updateRightIcon(isOpen) {
    var icon = rightHandle.querySelector('i');
    if (!icon) return;
    icon.className = isOpen ? 'ti ti-chevron-right' : 'ti ti-chevron-left';
  }

  return {
    create: create,
    show: show,
    hide: hide,
    updateLeftIcon: updateLeftIcon,
    updateRightIcon: updateRightIcon,
    getLeft: function() { return leftHandle; },
    getRight: function() { return rightHandle; }
  };

})();
