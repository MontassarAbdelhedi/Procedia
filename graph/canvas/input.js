// graph/canvas/input.js
// DEPENDS ON: graph/graphState.js, graph/engine.js, graph/canvas/viewport.js, graph/canvas/renderer.js
// MUST LOAD BEFORE: index.js

var canvasInput = (function() {

  var _dragState = {
    active:          false,
    nodeId:          null,
    dragStartCanvas: null,
    nodeStartPos:    null,
    moved:           false
  };

  var _panState = {
    active:      false,
    startScreen: null,
    startPan:    null
  };

  var _rubberBand = {
    active:          false,
    startX:          0,
    startY:          0,
    currentX:        0,
    currentY:        0,
    el:              null,
    ctrlKey:         false,
    shiftKey:        false,
    _highlights:     []
  };

  var _spaceHeld = false;

  var MIN_RUBBER = 5;

  function _wrapOffset() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return { left: 0, top: 0 };
    var r = wrap.getBoundingClientRect();
    return { left: r.left, top: r.top };
  }

  function _clientToWrap(clientX, clientY) {
    var off = _wrapOffset();
    return { x: clientX - off.left, y: clientY - off.top };
  }

  function _createRubberEl() {
    var wrap = document.getElementById('canvas-wrap');
    var el = document.createElement('div');
    el.className = 'rubber-band';
    wrap.appendChild(el);
    return el;
  }

  function _destroyRubberEl() {
    for (var i = 0; i < _rubberBand._highlights.length; i++) {
      var el = renderer.getNodeElement(_rubberBand._highlights[i]);
      if (el) el.classList.remove('rubber-hover');
    }
    _rubberBand._highlights = [];
    if (_rubberBand.el && _rubberBand.el.parentNode) {
      _rubberBand.el.parentNode.removeChild(_rubberBand.el);
    }
    _rubberBand.el = null;
    _rubberBand.active = false;
  }

  function _updateRubberHighlights() {
    var r = _rubberBand;
    var ids = _getNodesInRect(r.startX, r.startY, r.currentX, r.currentY);
    var old = r._highlights;
    // Remove class from nodes no longer in rect
    for (var i = 0; i < old.length; i++) {
      if (ids.indexOf(old[i]) === -1) {
        var el = renderer.getNodeElement(old[i]);
        if (el) el.classList.remove('rubber-hover');
      }
    }
    // Add class to newly covered nodes
    for (var j = 0; j < ids.length; j++) {
      if (old.indexOf(ids[j]) === -1) {
        var el2 = renderer.getNodeElement(ids[j]);
        if (el2) el2.classList.add('rubber-hover');
      }
    }
    r._highlights = ids;
  }

  function _updateRubberEl() {
    var r = _rubberBand;
    var x = Math.min(r.startX, r.currentX);
    var y = Math.min(r.startY, r.currentY);
    var w = Math.abs(r.currentX - r.startX);
    var h = Math.abs(r.currentY - r.startY);
    r.el.style.left   = x + 'px';
    r.el.style.top    = y + 'px';
    r.el.style.width  = w + 'px';
    r.el.style.height = h + 'px';
    _updateRubberHighlights();
  }

  function _getNodesInRect(wx1, wy1, wx2, wy2) {
    // wx1/wy1 etc are wrap-relative; convert to viewport-relative for getBoundingClientRect
    var off = _wrapOffset();
    var minX = Math.min(wx1, wx2) + off.left;
    var minY = Math.min(wy1, wy2) + off.top;
    var maxX = Math.max(wx1, wx2) + off.left;
    var maxY = Math.max(wy1, wy2) + off.top;

    var nodes = graphState.getAllNodes();
    var result = [];
    for (var id in nodes) {
      if (!nodes.hasOwnProperty(id)) continue;
      var el = renderer.getNodeElement(id);
      if (!el) continue;
      var rect = el.getBoundingClientRect();
      if (rect.left < maxX && rect.right > minX &&
          rect.top  < maxY && rect.bottom > minY) {
        result.push(id);
      }
    }
    return result;
  }

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
      return;
    }

    if (nodeEl) {
      var nodeId = nodeEl.getAttribute('data-node-id');
      if (!nodeId) return;
      var nodeData = graphState.getNode(nodeId);
      if (!nodeData) return;

      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Click: toggle
        graphState.toggleSelection(nodeId);
        renderer.render();
      } else if (e.shiftKey) {
        // Shift+Click: add to selection (if already selected, remove)
        if (graphState.isSelected(nodeId)) {
          graphState.removeFromSelection(nodeId);
        } else {
          graphState.addToSelection(nodeId);
        }
        renderer.render();
      } else {
        // Plain click: if already selected, keep multi-select; else select only this
        if (!graphState.isSelected(nodeId)) {
          graphState.setSelection(nodeId);
          renderer.render();
        }
      }

      // Start node drag regardless of modifier
      _dragState.active = true;
      _dragState.nodeId = nodeId;
      _dragState.dragStartCanvas = viewport.screenToCanvas(e.clientX, e.clientY);
      _dragState.nodeStartPos = { x: nodeData.x, y: nodeData.y };
      _dragState.moved = false;
      // Save start positions for all selected nodes
      _dragState.selectionStartPositions = {};
      var allSel = graphState.getSelection();
      for (var s = 0; s < allSel.length; s++) {
        var sn = graphState.getNode(allSel[s]);
        if (sn) {
          _dragState.selectionStartPositions[allSel[s]] = { x: sn.x, y: sn.y };
        }
      }
      return;
    }

    // Canvas background — start rubber band
    var wp = _clientToWrap(e.clientX, e.clientY);
    _rubberBand.active = true;
    _rubberBand.startX = wp.x;
    _rubberBand.startY = wp.y;
    _rubberBand.currentX = wp.x;
    _rubberBand.currentY = wp.y;
    _rubberBand.ctrlKey = e.ctrlKey || e.metaKey;
    _rubberBand.shiftKey = e.shiftKey;
    _rubberBand.el = _createRubberEl();

    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      graphState.clearSelection();
      renderer.render();
    }
  }

  function _onMouseMove(e) {
    if (_panState.active) {
      var dx = e.clientX - _panState.startScreen.x;
      var dy = e.clientY - _panState.startScreen.y;
      viewport.setPan(_panState.startPan.x + dx, _panState.startPan.y + dy);
      return;
    }

    if (_rubberBand.active) {
      var wp = _clientToWrap(e.clientX, e.clientY);
      _rubberBand.currentX = wp.x;
      _rubberBand.currentY = wp.y;
      _updateRubberEl();
      return;
    }

    if (!_dragState.active) return;

    var currentCanvas = viewport.screenToCanvas(e.clientX, e.clientY);
    var dx = currentCanvas.x - _dragState.dragStartCanvas.x;
    var dy = currentCanvas.y - _dragState.dragStartCanvas.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      _dragState.moved = true;
    }
    var newX = _dragState.nodeStartPos.x + dx;
    var newY = _dragState.nodeStartPos.y + dy;

    graphState.updateNode(_dragState.nodeId, { x: newX, y: newY });

    // Move all selected nodes together using saved start positions
    var selection = graphState.getSelection();
    if (selection.length > 1) {
      for (var i = 0; i < selection.length; i++) {
        if (selection[i] === _dragState.nodeId) continue;
        var startPos = _dragState.selectionStartPositions[selection[i]];
        if (!startPos) continue;
        var newSelX = startPos.x + dx;
        var newSelY = startPos.y + dy;
        graphState.updateNode(selection[i], { x: newSelX, y: newSelY });
        var selEl = renderer.getNodeElement(selection[i]);
        if (selEl) {
          selEl.style.left = newSelX + 'px';
          selEl.style.top  = newSelY + 'px';
        }
      }
    }

    // Update DOM directly
    var el = renderer.getNodeElement(_dragState.nodeId);
    if (el) {
      el.style.left = newX + 'px';
      el.style.top  = newY + 'px';
    }
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
  }

  function _onMouseUp(e) {
    if (_panState.active) {
      _panState.active = false;
      return;
    }

    if (_rubberBand.active) {
      var dx = Math.abs(_rubberBand.currentX - _rubberBand.startX);
      var dy = Math.abs(_rubberBand.currentY - _rubberBand.startY);
      if (dx >= MIN_RUBBER || dy >= MIN_RUBBER) {
        var ids = _getNodesInRect(
          _rubberBand.startX, _rubberBand.startY,
          _rubberBand.currentX, _rubberBand.currentY
        );
        if (_rubberBand.ctrlKey || _rubberBand.metaKey) {
          // Ctrl+drag: toggle each node in rect
          var sel = graphState.getSelection().slice();
          for (var i = 0; i < ids.length; i++) {
            var idx = sel.indexOf(ids[i]);
            if (idx !== -1) { sel.splice(idx, 1); }
            else            { sel.push(ids[i]); }
          }
          graphState.replaceSelection(sel);
        } else if (_rubberBand.shiftKey) {
          // Shift+drag: add to selection
          var sel2 = graphState.getSelection().slice();
          for (var j = 0; j < ids.length; j++) {
            if (sel2.indexOf(ids[j]) === -1) sel2.push(ids[j]);
          }
          graphState.replaceSelection(sel2);
        } else {
          graphState.replaceSelection(ids);
        }
        renderer.render();
      }
      _destroyRubberEl();
      return;
    }

    if (_dragState.active) {
      _dragState.active = false;
      _dragState.nodeId = null;
      _dragState.moved = false;
      _dragState.selectionStartPositions = null;
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

    var sel = graphState.getSelection();
    if (sel.length === 0) return;

    e.preventDefault();
    engine.deleteSelectedNodes();
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
