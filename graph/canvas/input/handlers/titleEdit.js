/**
 * @fileoverview Inline title editing for canvas nodes + double-click handler.
 * Exposes commit/cancel/exit helpers and onDblClick for the inputHandlers assembly.
 * @dependencies input/state.js, input/utils.js, graph/graphState.js, graph/nodeRegistry.js,
 *               graph/canvas/viewport.js, graph/canvas/renderer/index.js
 * @exports _handlersTitleEdit { commitTitleEdit, cancelTitleEdit, exitTitleEdit, onDblClick }
 */

// graph/canvas/input/handlers/titleEdit.js
// DEPENDS ON: input/state.js, input/utils.js, input/rubberband.js,
//             graph/graphState.js, graph/engine/index.js, graph/canvas/viewport.js,
//             graph/canvas/renderer/index.js
// MUST LOAD BEFORE: input/handlers/mouse.js, input/handlers/keyboard.js,
//                   input/handlers/index.js

var _handlersTitleEdit = (function() {

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
        nodeUUID: nodeId,
        effectMatchName: def.matchName,
        label: newLabel
      });
    }
  }

  function _cancelTitleEdit() {
    if (!_editingNodeId) return;
    _exitTitleEdit();
    renderer.render();
  }

  function _onTitleInputKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      _commitTitleEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      _cancelTitleEdit();
    }
  }

  function _onTitleInputBlur() {
    _commitTitleEdit();
  }

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

  return {
    commitTitleEdit: _commitTitleEdit,
    cancelTitleEdit: _cancelTitleEdit,
    exitTitleEdit:   _exitTitleEdit,
    onDblClick:      onDblClick
  };

})();
