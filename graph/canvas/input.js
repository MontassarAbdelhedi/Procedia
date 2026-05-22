// graph/canvas/input.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js, graph/canvas/renderer.js
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
    // Middle mouse or space+left drag = pan (takes priority)
    if (e.button === 1 || (e.button === 0 && _spaceHeld)) {
      _panState.active      = true;
      _panState.startScreen = { x: e.clientX, y: e.clientY };
      _panState.startPan    = viewport.getTransform().pan;
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return;

    // Walk up DOM to find .node-card or .port
    var target = e.target;
    var nodeEl = null;
    var portEl = null;

    while (target && target !== document.getElementById('canvas-viewport')) {
      if (target.classList && target.classList.contains('port'))      { portEl = target; break; }
      if (target.classList && target.classList.contains('node-card')) { nodeEl = target; break; }
      target = target.parentElement;
    }

    if (portEl) {
      var portNodeId = portEl.getAttribute('data-node-id');
      var portPortId = portEl.getAttribute('data-port-id');
      if (portNodeId && portPortId) {
        wireInteraction.onPortMouseDown(portNodeId, portPortId, e);
      }
      return; // don't start node drag
    }

    if (nodeEl) {
      var nodeId   = nodeEl.getAttribute('data-node-id');
      if (!nodeId) return;
      var nodeData = graphState.getNode(nodeId);
      if (!nodeData) return;

      _dragState.active          = true;
      _dragState.nodeId          = nodeId;
      _dragState.dragStartCanvas = viewport.screenToCanvas(e.clientX, e.clientY);
      _dragState.nodeStartPos    = { x: nodeData.x, y: nodeData.y };

      graphState.setSelection(nodeId);
      renderer.updateNode(nodeId);
      return;
    }

    // Canvas background click — deselect
    graphState.setSelection(null);
    renderer.render();
  }

  function _onMouseMove(e) {
    if (_panState.active) {
      var pdx = e.clientX - _panState.startScreen.x;
      var pdy = e.clientY - _panState.startScreen.y;
      viewport.setPan(_panState.startPan.x + pdx, _panState.startPan.y + pdy);
      return;
    }

    if (!_dragState.active) return;

    var current = viewport.screenToCanvas(e.clientX, e.clientY);
    var dx = current.x - _dragState.dragStartCanvas.x;
    var dy = current.y - _dragState.dragStartCanvas.y;
    var newX = _dragState.nodeStartPos.x + dx;
    var newY = _dragState.nodeStartPos.y + dy;

    graphState.updateNode(_dragState.nodeId, { x: newX, y: newY });

    // Update DOM directly during drag — do NOT call renderer.render()
    var el = renderer.getNodeElement(_dragState.nodeId);
    if (el) {
      el.style.left = newX + 'px';
      el.style.top  = newY + 'px';
    }
  }

  function _onMouseUp(e) {
    _dragState.active          = false;
    _dragState.nodeId          = null;
    _dragState.dragStartCanvas = null;
    _dragState.nodeStartPos    = null;
    _panState.active           = false;
  }

  function _onWheel(e) {
    e.preventDefault();
    var wrap = document.getElementById('canvas-wrap');
    var rect = wrap.getBoundingClientRect();
    var localX = e.clientX - rect.left;
    var localY = e.clientY - rect.top;
    var delta = e.deltaY > 0 ? 0.9 : 1.1;
    viewport.setZoom(viewport.getTransform().zoom * delta, localX, localY);
  }

  function init() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    wrap.addEventListener('mousedown', _onMouseDown);
    wrap.addEventListener('mousemove', _onMouseMove);
    wrap.addEventListener('mouseup',   _onMouseUp);
    wrap.addEventListener('wheel',     _onWheel, { passive: false });
    document.addEventListener('keydown', function(e) { if (e.code === 'Space') _spaceHeld = true;  });
    document.addEventListener('keyup',   function(e) { if (e.code === 'Space') _spaceHeld = false; });
  }

  return { init: init };

})();
