/**
 * @fileoverview Event handlers for canvas input (mouse, keyboard, wheel).
 * Delegates to drag, pan, and rubber-band state machines.
 * @dependencies input/state.js, input/utils.js, input/rubberband.js,
 *               graph/graphState.js, graph/engine/index.js, graph/canvas/viewport.js,
 *               graph/canvas/renderer/index.js
 * @exports inputHandlers { onMouseDown, onMouseMove, onMouseUp, onWheel, onKeyDown, onKeyUp }
 */

// graph/canvas/input/handlers.js
// DEPENDS ON: input/state.js, input/utils.js, input/rubberband.js,
//             graph/graphState.js, graph/engine/index.js, graph/canvas/viewport.js,
//             graph/canvas/renderer/index.js
// MUST LOAD BEFORE: input/index.js

var inputHandlers = (function() {

  /**
   * Clean up event listeners on the title input and exit editing mode.
   */
  function _exitTitleEdit() {
    if (!_editingNodeId) return;
    var nodeId = _editingNodeId;
    _editingNodeId = null;
    var nodeEl = renderer.getNodeElement(nodeId);
    if (nodeEl) {
      nodeEl.classList.remove('node--editing');
      var input = nodeEl.querySelector('.node-title-input');
      if (input) {
        input.removeEventListener('keydown', _onTitleInputKeydown);
        input.removeEventListener('blur', _onTitleInputBlur);
      }
    }
  }

  /**
   * Commits the current inline title edit, saving the label to the node.
   */
  function _findInputWire(nodeId) {
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (wires.hasOwnProperty(wid) && wires[wid].toNode === nodeId) {
        return wires[wid];
      }
    }
    return null;
  }

  function _findOutputComp(nodeId) {
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (wires.hasOwnProperty(wid) && wires[wid].fromNode === nodeId && wires[wid].type === 'layer') {
        return wires[wid].toNode;
      }
    }
    return null;
  }

  function _findLayerUUID(nodeId, visited) {
    if (!visited) visited = {};
    if (visited[nodeId]) return null;
    visited[nodeId] = true;
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid) || wires[wid].fromNode !== nodeId || wires[wid].type !== 'layer') continue;
      if (wires[wid]._pathLayerUUID !== null) return wires[wid]._pathLayerUUID;
      var found = _findLayerUUID(wires[wid].toNode, visited);
      if (found !== null) return found;
    }
    return null;
  }

  function _renameDispatch(action, params) {
    if (typeof evalBridge === 'undefined') return;
    evalBridge.dispatch({ action: action, params: params }).then(function(res) {
      if (!res.ok) {
        console.warn('[handlers] ' + action + ' failed:', res.error);
      }
    }).catch(function(err) {
      console.warn('[handlers] ' + action + ' error:', err);
    });
  }

  function _commitTitleEdit() {
    if (!_editingNodeId) return;
    var input = document.querySelector('.node--editing .node-title-input');
    if (!input) { _exitTitleEdit(); return; }
    var newLabel = input.value.trim();
    var nodeId = _editingNodeId;
    _exitTitleEdit();
    if (!newLabel) return;
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;
    graphState.updateProp(nodeId, 'label', newLabel);
    if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.schedule) dirtyFlusher.schedule();
    renderer.render();

    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    if (nodeData.type === 'core/comp') {
      _renameDispatch('setCompProperty', {
        nodeUUID: nodeId, key: 'label', value: newLabel
      });
      return;
    }

    if (nodeData.nodeKind === 'data' || nodeData.nodeKind === 'blending') return;

    var hostingCompUUID = (nodeData.hostingComps && nodeData.hostingComps.length > 0)
      ? nodeData.hostingComps[0] : null;
    if (!hostingCompUUID) {
      var compNodeId = _findOutputComp(nodeId);
      if (compNodeId) hostingCompUUID = compNodeId;
    }
    if (!hostingCompUUID) return;

    var layerUUID = _findLayerUUID(nodeId);
    if (!layerUUID) return;

    if (nodeData.nodeKind === 'affected') {
      _renameDispatch('renameNode', {
        hostingCompUUID: hostingCompUUID, nodeUUID: nodeId, layerUUID: layerUUID, label: newLabel
      });
    } else if (nodeData.nodeKind === 'effector' && def.matchName) {
      _renameDispatch('renameEffect', {
        hostingCompUUID: hostingCompUUID,
        layerUUID: layerUUID,
        effectMatchName: def.matchName,
        label: newLabel
      });
    }
  }

  /**
   * Cancels the current inline title edit, restoring the original label.
   */
  function _cancelTitleEdit() {
    if (!_editingNodeId) return;
    _exitTitleEdit();
    renderer.render();
  }

  /**
   * Handles mousedown: initiates drag (node), wire selection, pan, or rubber-band.
   * Manages selection state (ctrl/shift toggle).
   * @param {MouseEvent} e
   */
  function onMouseDown(e) {
    if (_editingNodeId) {
      var clickNodeEl = e.target;
      var boundary = document.getElementById('canvas-nodes');
      while (clickNodeEl && clickNodeEl !== boundary) {
        if (clickNodeEl.classList && clickNodeEl.classList.contains('node')) break;
        clickNodeEl = clickNodeEl.parentElement;
      }
      if (!clickNodeEl || clickNodeEl.getAttribute('data-node-id') !== _editingNodeId) {
        _commitTitleEdit();
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

  /**
   * Handles mousemove: performs active pan, rubber-band resize, or node drag.
   * Updates node positions and re-renders wires / minimap during drag.
   * @param {MouseEvent} e
   */
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

  /**
   * Handles mouseup: finalises pan, rubber-band selection, or node drag.
   * Applies selection changes for rubber-band (ctrl/shift modifiers).
   * @param {MouseEvent} e
   */
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

  var _pendingFocusTimer = null;

  /**
   * Handles click: fires autofocus for comp nodes (only on genuine clicks, not drags).
   * Uses a short delay so it doesn't interfere with double-click title editing.
   * More reliable than mouseup because click only fires when mousedown+target match.
   * @param {MouseEvent} e
   */
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

  /**
   * Handles mouse wheel: zooms in/out centred on the cursor position.
   * @param {WheelEvent} e
   */
  function onWheel(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? 0.9 : 1.1;
    var currentZoom = viewport.getTransform().zoom;
    viewport.setZoom(currentZoom * delta, e.clientX, e.clientY);
    if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
  }

  /**
   * Handles keydown: tracks Space for pan mode, and Delete/Backspace to delete selected nodes.
   * @param {KeyboardEvent} e
   */
  function onKeyDown(e) {
    if (_editingNodeId) {
      if (e.key === 'Enter') {
        e.preventDefault();
        _commitTitleEdit();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        _cancelTitleEdit();
        return;
      }
      return;
    }

    if (e.code === 'Space' && !inputUtils.isEditableTarget(e.target)) {
      _inpSpaceHeld = true;
      e.preventDefault();
      return;
    }

    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (inputUtils.isEditableTarget(e.target)) return;

    if (_selectedWireId) {
      e.preventDefault();
      var wireId = _selectedWireId;
      _selectedWireId = null;
      engine.disconnectWire(wireId);
      if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
      return;
    }

    var sel = graphState.getSelection();
    if (sel.length === 0) return;

    e.preventDefault();
    engine.deleteSelectedNodes();
  }

  /**
   * Handles keydown on the title input during inline editing.
   * Enter commits, Escape cancels.
   */
  function _onTitleInputKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      _commitTitleEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      _cancelTitleEdit();
    }
  }

  /**
   * Handles blur on the title input during inline editing — commits the edit.
   */
  function _onTitleInputBlur() {
    _commitTitleEdit();
  }

  /**
   * Handles double-click: enters inline title editing mode on node headers.
   * @param {MouseEvent} e
   */
  function onDblClick(e) {
    if (e.button !== 0) return;
    if (_pendingFocusTimer) {
      clearTimeout(_pendingFocusTimer);
      _pendingFocusTimer = null;
    }
    if (_editingNodeId) return;

    if (typeof canvasDrag !== 'undefined' && canvasDrag.findWireAt) {
      var hitWire = canvasDrag.findWireAt(e.clientX, e.clientY);
      if (hitWire) {
        e.preventDefault();
        engine.disconnectWire(hitWire.id);
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
        return;
      }
    }

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
    if (!nodeData) return;
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    var headerEl = nodeEl.querySelector('.node-header');
    if (!headerEl || !headerEl.contains(e.target)) return;
    if (e.target.classList && e.target.classList.contains('port-dot')) return;

    e.preventDefault();
    nodeEl.classList.add('node--editing');
    _editingNodeId = nodeId;
    var input = nodeEl.querySelector('.node-title-input');
    if (input) {
      input.value = (nodeData.props && nodeData.props.label) || def.label;
      input.addEventListener('keydown', _onTitleInputKeydown);
      input.addEventListener('blur', _onTitleInputBlur);
      input.focus();
      input.select();
    }
  }

  /**
   * Handles keyup: releases the Space-held flag.
   * @param {KeyboardEvent} e
   */
  function onKeyUp(e) {
    if (e.code === 'Space') _inpSpaceHeld = false;
  }

  return {
    onMouseDown: onMouseDown,
    onMouseMove: onMouseMove,
    onMouseUp:   onMouseUp,
    onClick:     onClick,
    onDblClick:  onDblClick,
    onWheel:     onWheel,
    onKeyDown:   onKeyDown,
    onKeyUp:     onKeyUp
  };

})();
