// ui/sidebarToggle.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: index.js

var sidebarToggle = (function() {

  var leftBarOpen = true;
  var rightBarOpen = true;
  var leftHandle = null;
  var rightHandle = null;
  var canvasWrap = null;

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

  function onCanvasMouseLeave() {
    hideHandle(leftHandle);
    hideHandle(rightHandle);
  }

  function showHandle(handle) {
    handle.classList.add('visible');
  }

  function hideHandle(handle) {
    handle.classList.remove('visible');
  }

  function collapseLeft() {
    document.getElementById('left-bar').classList.add('collapsed');
    leftBarOpen = false;
    updateLeftHandleIcon();
  }

  function expandLeft() {
    document.getElementById('left-bar').classList.remove('collapsed');
    leftBarOpen = true;
    updateLeftHandleIcon();
  }

  function collapseRight() {
    document.getElementById('right-bar').classList.add('collapsed');
    rightBarOpen = false;
    updateRightHandleIcon();
  }

  function expandRight() {
    document.getElementById('right-bar').classList.remove('collapsed');
    rightBarOpen = true;
    updateRightHandleIcon();
  }

  function updateLeftHandleIcon() {
    var icon = leftHandle.querySelector('i');
    if (!icon) return;
    icon.className = leftBarOpen ? 'ti ti-chevron-left' : 'ti ti-chevron-right';
  }

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
