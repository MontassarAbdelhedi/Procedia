/**
 * @fileoverview onMouseDown handler — handles drag, pan, rubber-band start,
 * node selection, wire selection, title-edit commit, and comment selection.
 * Also declares the _handlersMouse container.
 * @dependencies input/state.js, input/utils.js, input/rubberband.js,
 *               input/handlers/titleEdit/helpers.js, input/handlers/titleEdit/exit.js,
 *               input/handlers/titleEdit/commit.js, input/handlers/titleEdit/cancel.js,
 *               input/handlers/titleEdit/dblclick.js,
 *               graph/graphState.js,
 *               graph/engine/index.js, graph/canvas/viewport.js,
 *               graph/canvas/renderer/index.js, graph/canvas/drag/helpers.js,
 *               graph/canvas/drag/hitTest.js, graph/canvas/drag/insert.js,
 *               graph/canvas/drag/preview.js, graph/comment/commentManager.js
 */

// graph/canvas/input/handlers/mouse/mousedown.js
// DEPENDS ON: input/state.js, input/utils.js, input/rubberband.js,
//             input/handlers/titleEdit/helpers.js, input/handlers/titleEdit/exit.js,
//             input/handlers/titleEdit/commit.js, input/handlers/titleEdit/cancel.js,
//             input/handlers/titleEdit/dblclick.js,
//             graph/graphState.js,
//             graph/engine/index.js, graph/canvas/viewport.js,
//             graph/canvas/renderer/index.js, graph/canvas/drag/helpers.js,
//             graph/canvas/drag/hitTest.js, graph/canvas/drag/insert.js,
//             graph/canvas/drag/preview.js, graph/comment/commentManager.js
// MUST LOAD BEFORE: input/handlers/index.js
// FIRST IN LOAD ORDER among mouse/ sub-files

var _handlersMouse = {};

(function() {

  _handlersMouse.onMouseDown = function onMouseDown(e) {
    _hoveredWireId = null;
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

    if (typeof commentManager !== 'undefined') {
      var commentEl = commentManager.findByElement(e.target);
      if (commentEl) {
        var commentId = commentEl.getAttribute('data-comment-id');
        if (commentId && e.target.tagName !== 'TEXTAREA' && !e.target.closest('[data-action]')) {
          commentManager.select(commentId);
        }
        graphState.clearSelection();
        renderer.render();
        return;
      }
      commentManager.deselect();
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
  };

})();
