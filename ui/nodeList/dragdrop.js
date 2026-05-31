/**
 * @fileoverview Node list drag-and-drop. Enables dragging node items from the
 * sidebar onto the canvas to create new nodes.
 * Depends on: __nl_cat, engine, viewport, canvasDrag, graphState, renderer,
 *             wireRenderer, inspector, statusBar (globals).
 * Exports: __nl_dragdrop.wireCanvasDrop
 */
// ui/nodeList/dragdrop.js
// DEPENDS ON: ui/nodeList/categories.js, graph/engine/index.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: ui/nodeList/index.js

var __nl_dragdrop = (function() {

  var _dragLabel = null;
  var _ghostEl = null;

  /**
   * Wires mousedown/mousemove/mouseup for drag-from-list onto the canvas.
   * @param {HTMLElement} listEl The list container element.
   */
  function wireCanvasDrop(listEl) {
    var items = listEl.querySelectorAll('.leftbar-node-item');
    for (var i = 0; i < items.length; i++) {
      (function(item) {
        var labelEl = item.querySelector('.leftbar-node-name');
        var label = labelEl ? labelEl.textContent : '';
        var def = __nl_cat.resolveDefByLabel(label);

        if (!def) {
          item.classList.add('leftbar-node-item--disabled');
          item.title = 'Not available yet';
          return;
        }

        item.addEventListener('mousedown', function(e) {
          if (e.button !== 0) return;
          _dragLabel = label;
          item.classList.add('leftbar-node-item--dragging');

          var ghost = document.createElement('div');
          ghost.className = 'node-drag-ghost';
          ghost.innerHTML =
            '<span class="node-drag-ghost-dot" style="background:' + __nl_cat.getCategoryColor(label) + '"></span>' +
            '<span class="node-drag-ghost-label">' + label + '</span>';
          ghost.style.left = (e.clientX + 12) + 'px';
          ghost.style.top = (e.clientY - 8) + 'px';
          document.body.appendChild(ghost);
          _ghostEl = ghost;

          e.preventDefault();
        });
      }(items[i]));
    }

    document.addEventListener('mousemove', function(e) {
      if (!_ghostEl) return;
      _ghostEl.style.left = (e.clientX + 12) + 'px';
      _ghostEl.style.top = (e.clientY - 8) + 'px';
    });

    document.addEventListener('mouseup', function(e) {
      if (_ghostEl) {
        _ghostEl.parentNode.removeChild(_ghostEl);
        _ghostEl = null;
      }
      if (!_dragLabel) return;

      var dragging = listEl.querySelector('.leftbar-node-item--dragging');
      if (dragging) dragging.classList.remove('leftbar-node-item--dragging');

      var label = _dragLabel;
      _dragLabel = null;

      var wrap = document.getElementById('canvas-wrap');
      if (!wrap) return;
      var rect = wrap.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) {
        return;
      }

      var def = __nl_cat.resolveDefByLabel(label);
      if (!def) return;

      var pos = viewport.screenToCanvas(e.clientX, e.clientY);

      if (typeof canvasDrag !== 'undefined' && canvasDrag.findWireAt) {
        var hitWire = canvasDrag.findWireAt(pos.x, pos.y);
        if (hitWire) {
          var insertNode = canvasDrag.insertNodeOnWire(hitWire.id, def, pos.x, pos.y);
          if (insertNode) {
            graphState.setSelection(insertNode.id);
            renderer.render();
            if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
            if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
            if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
          }
          return;
        }
      }

      var node = engine.dropNode(def, pos.x, pos.y);
      if (node) {
        graphState.setSelection(node.id);
        renderer.render();
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
        if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
        if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
      }
    });
  }

  return {
    wireCanvasDrop: wireCanvasDrop
  };

})();
