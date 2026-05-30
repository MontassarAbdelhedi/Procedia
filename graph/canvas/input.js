// graph/canvas/input.js
// DEPENDS ON: graph/graphState.js, graph/engine.js, graph/canvas/viewport.js, graph/canvas/renderer.js
// MUST LOAD BEFORE: index.js

var canvasInput = (function() {

  var _dragState = {
    active:          false,
    nodeId:          null,
    dragStartCanvas: null,
    nodeStartPos:    null
  };

  var _panState = {
    active:      false,
    startScreen: null,
    startPan:    null
  };

  var _spaceHeld = false;

  function _onMouseDown(e) {
    var target = e.target;
    var nodeEl = null;
    var portEl = null;
    var boundary = document.getElementById('canvas-nodes');

    // Walk up from click target to find .node or .port-dot
    while (target && target !== boundary) {
      if (target.classList && target.classList.contains('port-dot')) { portEl = target; break; }
      if (target.classList && target.classList.contains('node'))     { nodeEl = target; break; }
      target = target.parentElement;
    }

    // Middle mouse or space+left → pan
    if (e.button === 1 || (e.button === 0 && _spaceHeld)) {
      e.preventDefault();
      _panState.active = true;
      _panState.startScreen = { x: e.clientX, y: e.clientY };
      _panState.startPan = viewport.getTransform().pan;
      return;
    }

    if (e.button !== 0) return;

    if (portEl) {
      // Port click handled in TASK-10 — skip drag
      return;
    }

    if (nodeEl) {
      var nodeId = nodeEl.getAttribute('data-node-id');
      if (!nodeId) return;
      var nodeData = graphState.getNode(nodeId);
      if (!nodeData) return;

      _dragState.active = true;
      _dragState.nodeId = nodeId;
      _dragState.dragStartCanvas = viewport.screenToCanvas(e.clientX, e.clientY);
      _dragState.nodeStartPos = { x: nodeData.x, y: nodeData.y };

      graphState.setSelection(nodeId);
      renderer.updateNode(nodeId);
      return;
    }

    // Canvas background — deselect
    graphState.setSelection(null);
    renderer.render();
  }

  function _onMouseMove(e) {
    if (_panState.active) {
      var dx = e.clientX - _panState.startScreen.x;
      var dy = e.clientY - _panState.startScreen.y;
      viewport.setPan(_panState.startPan.x + dx, _panState.startPan.y + dy);
      return;
    }

    if (!_dragState.active) return;

    var currentCanvas = viewport.screenToCanvas(e.clientX, e.clientY);
    var dx = currentCanvas.x - _dragState.dragStartCanvas.x;
    var dy = currentCanvas.y - _dragState.dragStartCanvas.y;
    var newX = _dragState.nodeStartPos.x + dx;
    var newY = _dragState.nodeStartPos.y + dy;

    graphState.updateNode(_dragState.nodeId, { x: newX, y: newY });

    // Update DOM directly — do not call renderer.render() on every mousemove
    var el = renderer.getNodeElement(_dragState.nodeId);
    if (el) {
      el.style.left = newX + 'px';
      el.style.top  = newY + 'px';
    }
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
  }

  function _onMouseUp(e) {
    if (_panState.active) {
      _panState.active = false;
      return;
    }
    if (_dragState.active) {
      _dragState.active = false;
      _dragState.nodeId = null;
    }
  }

  function _onWheel(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? 0.9 : 1.1;
    var currentZoom = viewport.getTransform().zoom;
    viewport.setZoom(currentZoom * delta, e.clientX, e.clientY);
    if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
  }

  function _isEditableTarget(target) {
    if (!target || !target.tagName) return false;
    var tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  }

  function _onKeyDown(e) {
    if (e.code === 'Space' && !_isEditableTarget(e.target)) {
      _spaceHeld = true;
      e.preventDefault();
      return;
    }

    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (_isEditableTarget(e.target)) return;

    var selection = graphState.getSelection();
    if (!selection) return;

    e.preventDefault();
    engine.deleteNode(selection);
  }

  function _onKeyUp(e) {
    if (e.code === 'Space') _spaceHeld = false;
  }

  function init() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;

    wrap.addEventListener('mousedown', _onMouseDown);
    wrap.addEventListener('mousemove', _onMouseMove);
    wrap.addEventListener('mouseup',   _onMouseUp);
    wrap.addEventListener('wheel',     _onWheel, { passive: false });

    document.addEventListener('keydown', _onKeyDown);
    document.addEventListener('keyup',   _onKeyUp);
  }

  return { init: init };

})();
