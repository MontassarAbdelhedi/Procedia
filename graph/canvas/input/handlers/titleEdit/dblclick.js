/**
 * @fileoverview onDblClick handler + inline title-input event helpers.
 * @dependencies input/state.js, input/utils.js, graph/graphState.js, graph/nodeRegistry.js,
 *               graph/canvas/viewport.js, graph/canvas/renderer/index.js,
 *               graph/canvas/drag/helpers.js, graph/canvas/drag/hitTest.js,
 *               graph/canvas/drag/insert.js, graph/canvas/drag/preview.js,
 *               graph/engine/index.js, graph/comment/commentManager.js
 */

// graph/canvas/input/handlers/titleEdit/dblclick.js
// DEPENDS ON: input/state.js, input/utils.js, graph/graphState.js, graph/nodeRegistry.js,
//             graph/canvas/viewport.js, graph/canvas/renderer/index.js,
//             graph/canvas/drag/helpers.js, graph/canvas/drag/hitTest.js,
//             graph/canvas/drag/insert.js, graph/canvas/drag/preview.js,
//             graph/engine/index.js, graph/comment/commentManager.js
// MUST LOAD AFTER: input/handlers/titleEdit/helpers.js, input/handlers/titleEdit/exit.js,
//                  input/handlers/titleEdit/commit.js, input/handlers/titleEdit/cancel.js
// MUST LOAD BEFORE: input/handlers/index.js

(function() {

  _handlersTitleEdit._onTitleInputKeydown = function _onTitleInputKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      _handlersTitleEdit.commitTitleEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      _handlersTitleEdit.cancelTitleEdit();
    }
  };

  _handlersTitleEdit._onTitleInputBlur = function _onTitleInputBlur() {
    _handlersTitleEdit.commitTitleEdit();
  };

  _handlersTitleEdit.onDblClick = function onDblClick(e) {
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
        _hoveredWireId = null;
        if (typeof wireRenderer !== 'undefined') {
          wireRenderer._hideInsertBtn();
          if (wireRenderer.render) wireRenderer.render(null);
        }
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
    if (!nodeEl) {
      if (typeof commentManager !== 'undefined') {
        var dblComment = commentManager.findByElement(e.target);
        if (!dblComment) {
          e.preventDefault();
          var canvasPos = viewport.screenToCanvas(e.clientX, e.clientY);
          commentManager.create(canvasPos.x, canvasPos.y);
        }
      }
      return;
    }
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
    if (!input) {
      input = document.createElement('input');
      input.className = 'node-title-input';
      input.type = 'text';
      headerEl.appendChild(input);
    }
    input.value = (nodeData.props && nodeData.props.label) || def.label;
    input.addEventListener('keydown', _handlersTitleEdit._onTitleInputKeydown);
    input.addEventListener('blur', _handlersTitleEdit._onTitleInputBlur);
    input.focus();
    input.select();
  };

})();
