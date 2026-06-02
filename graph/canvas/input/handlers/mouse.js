/**
 * @fileoverview Mouse event handlers for the graph canvas.
 * Handles mousedown (drag, pan, rubber-band start), mousemove, mouseup, and click.
 * @dependencies input/state.js, input/utils.js, input/rubberband.js,
 *               input/handlers/titleEdit.js, graph/graphState.js,
 *               graph/engine/index.js, graph/canvas/viewport.js,
 *               graph/canvas/renderer/index.js
 * @exports _handlersMouse { onMouseDown, onMouseMove, onMouseUp, onClick }
 */

// graph/canvas/input/handlers/mouse.js
// DEPENDS ON: input/state.js, input/utils.js, input/rubberband.js,
//             input/handlers/titleEdit.js, graph/graphState.js,
//             graph/engine/index.js, graph/canvas/viewport.js,
//             graph/canvas/renderer/index.js
// MUST LOAD BEFORE: input/handlers/index.js

var _handlersMouse = (function() {

  function onMouseDown(e) {
    if (_editingNodeId) {
      var clickNodeEl = e.target;
      var boundary = document.getElementById('canvas-nodes');
      while (clickNodeEl && clickNodeEl !== boundary) {
        if (clickNodeEl.classList && clickNodeEl.classList.contains('node')) break;
        clickNodeEl = clickNodeEl.parentElement;
      }
      if (!clickNodeEl || clickNodeEl.getAttribute('data-node-id') !== _editingNodeId) {
        _handlersTitleEdit.commitTitleEdit();
      }
    }

    var target = e.target;
    var nodeEl = null;
    var portEl = null;
    boundary = document.getElementById('canvas-nodes');

    while (target && target !== boundary) {
      if (target.classList && target.classList.contains('port-dot')) { portEl = target; break; }
      if (target.classList && target.classList.contains('node'))     { nodeEl = target; break; }
      target = target.parentElement;
    }

    if (e.button === 1 || (e.button === 0 && _inpSpaceHeld)) {
      e.preventDefault();
      _inpPan.active = true;
      _inpPan.startScreen = { x: e.clientX, y: e.clientY };
      _inpPan.startPan = viewport.getTransform().pan;
      return;
    }

    if (e.button !== 0) return;

    if (portEl) {
      return;
    }

    if (nodeEl) {
      _selectedWireId = null;
      var nodeId = nodeEl.getAttribute('data-node-id');
      if (!nodeId) return;
      var nodeData = graphState.getNode(nodeId);
      if (!nodeData) return;

      if (e.ctrlKey || e.metaKey) {
        graphState.toggleSelection(nodeId);
        renderer.render();
      } else if (e.shiftKey) {
        if (graphState.isSelected(nodeId)) {
          graphState.removeFromSelection(nodeId);
        } else {
          graphState.addToSelection(nodeId);
        }
        renderer.render();
      } else {
        if (!graphState.isSelected(nodeId)) {
          graphState.setSelection(nodeId);
          renderer.render();
        }
      }

      _inpDrag.active = true;
      _inpDrag.nodeId = nodeId;
      _inpDrag.dragStartCanvas = viewport.screenToCanvas(e.clientX, e.clientY);
      _inpDrag.nodeStartPos = { x: nodeData.x, y: nodeData.y };
      _inpDrag.moved = false;
      _inpDrag.selectionStartPositions = {};
      var allSel = graphState.getSelection();
      for (var s = 0; s < allSel.length; s++) {
        var sn = graphState.getNode(allSel[s]);
        if (sn) {
          _inpDrag.selectionStartPositions[allSel[s]] = { x: sn.x, y: sn.y };
        }
      }
      return;
    }

    if (typeof canvasDrag !== 'undefined' && canvasDrag.findWireAt) {
      var hitWire = canvasDrag.findWireAt(e.clientX, e.clientY);
      if (hitWire) {
        _selectedWireId = hitWire.id;
        graphState.clearSelection();
        renderer.render();
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
        return;
      }
    }

    _selectedWireId = null;
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);

    var wp = inputUtils.clientToWrap(e.clientX, e.clientY);
    _inpRubber.active = true;
    _inpRubber.startX = wp.x;
    _inpRubber.startY = wp.y;
    _inpRubber.currentX = wp.x;
    _inpRubber.currentY = wp.y;
    _inpRubber.ctrlKey = e.ctrlKey || e.metaKey;
    _inpRubber.shiftKey = e.shiftKey;
    _inpRubber.el = inputRubberband.createRubberEl();

    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      graphState.clearSelection();
      renderer.render();
    }
  }

  function onMouseMove(e) {
    if (_inpPan.active) {
      var dx = e.clientX - _inpPan.startScreen.x;
      var dy = e.clientY - _inpPan.startScreen.y;
      viewport.setPan(_inpPan.startPan.x + dx, _inpPan.startPan.y + dy);
      return;
    }

    if (_inpRubber.active) {
      var wp = inputUtils.clientToWrap(e.clientX, e.clientY);
      _inpRubber.currentX = wp.x;
      _inpRubber.currentY = wp.y;
      inputRubberband.updateRubberEl();
      return;
    }

    if (!_inpDrag.active) return;

    var currentCanvas = viewport.screenToCanvas(e.clientX, e.clientY);
    var dx = currentCanvas.x - _inpDrag.dragStartCanvas.x;
    var dy = currentCanvas.y - _inpDrag.dragStartCanvas.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      _inpDrag.moved = true;
    }
    var newX = _inpDrag.nodeStartPos.x + dx;
    var newY = _inpDrag.nodeStartPos.y + dy;

    graphState.updateNode(_inpDrag.nodeId, { x: newX, y: newY });

    var selection = graphState.getSelection();
    if (selection.length > 1) {
      for (var i = 0; i < selection.length; i++) {
        if (selection[i] === _inpDrag.nodeId) continue;
        var startPos = _inpDrag.selectionStartPositions[selection[i]];
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

    var el = renderer.getNodeElement(_inpDrag.nodeId);
    if (el) {
      el.style.left = newX + 'px';
      el.style.top  = newY + 'px';
    }
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
  }

  function onMouseUp(e) {
    if (_inpPan.active) {
      _inpPan.active = false;
      return;
    }

    if (_inpRubber.active) {
      var dx = Math.abs(_inpRubber.currentX - _inpRubber.startX);
      var dy = Math.abs(_inpRubber.currentY - _inpRubber.startY);
      if (dx >= INP_MIN_RUBBER || dy >= INP_MIN_RUBBER) {
        var ids = inputRubberband.getNodesInRect(
          _inpRubber.startX, _inpRubber.startY,
          _inpRubber.currentX, _inpRubber.currentY
        );
        if (_inpRubber.ctrlKey) {
          var sel = graphState.getSelection().slice();
          for (var i = 0; i < ids.length; i++) {
            var idx = sel.indexOf(ids[i]);
            if (idx !== -1) { sel.splice(idx, 1); }
            else            { sel.push(ids[i]); }
          }
          graphState.replaceSelection(sel);
        } else if (_inpRubber.shiftKey) {
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
      inputRubberband.destroyRubberEl();
      return;
    }

    if (_inpDrag.active) {
      _inpDrag.active = false;
      _inpDrag.nodeId = null;
      _inpDrag.moved = false;
      _inpDrag.selectionStartPositions = null;
    }
  }

  function onClick(e) {
    if (e.button !== 0) return;
    if (_pendingFocusTimer) {
      clearTimeout(_pendingFocusTimer);
      _pendingFocusTimer = null;
    }
    if (e.target.classList && e.target.classList.contains('port-dot')) return;
    var target = e.target;
    var nodeEl = null;
    var boundary = document.getElementById('canvas-nodes');
    while (target && target !== boundary) {
      if (target.classList && target.classList.contains('node')) { nodeEl = target; break; }
      target = target.parentElement;
    }
    if (!nodeEl) return;
    var nodeId = nodeEl.getAttribute('data-node-id');
    if (!nodeId) return;
    var nodeData = graphState.getNode(nodeId);
    if (nodeData && nodeData.type === 'core/comp' && typeof evalBridge !== 'undefined') {
      _pendingFocusTimer = setTimeout(function() {
        _pendingFocusTimer = null;
        evalBridge.dispatch({
          action: 'focusComp',
          params: { nodeUUID: nodeId }
        }).catch(function(err) {
          console.warn('[handlers] click focusComp failed:', err);
        });
      }, 280);
    }
  }

  return {
    onMouseDown: onMouseDown,
    onMouseMove: onMouseMove,
    onMouseUp:   onMouseUp,
    onClick:     onClick
  };

})();
