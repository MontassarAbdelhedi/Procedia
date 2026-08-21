/**
 * @fileoverview Node list drag-and-drop — main entry. Declares the __nl_dragdrop
 * namespace, holds shared drag state, and wires mousedown/mousemove/mouseup for
 * dragging node items from the sidebar onto the canvas.
 * Depends on: __nl_cat, engine, viewport, canvasDrag, wireRenderer, graphState (globals)
 *             and __nl_dragdrop sub-modules (mergeWarning, drop).
 * Exports: __nl_dragdrop.wireCanvasDrop
 */
// ui/nodeList/dragdrop/dragdrop.js
// DEPENDS ON: ui/nodeList/dragdrop/mergeWarning.js, ui/nodeList/dragdrop/drop.js,
//             ui/nodeList/categories.js, graph/engine/index.js, graph/canvas/viewport.js,
//             canvasDrag, wireRenderer, graphState
// MUST LOAD BEFORE: ui/nodeList/index.js
// FIRST IN LOAD ORDER among dragdrop/ sub-files

var __nl_dragdrop = {};

(function() {

  var _dragLabel = null;
  var _ghostEl = null;
  var _previewWireId = null;
  var _onDocMouseMove = null;
  var _onDocMouseUp = null;

  /**
   * Wires mousedown/mousemove/mouseup for drag-from-list onto the canvas.
   * @param {HTMLElement} listEl The list container element.
   */
  function wireCanvasDrop(listEl) {
    if (typeof _onDocMouseMove === 'function') {
      document.removeEventListener('mousemove', _onDocMouseMove);
    }
    if (typeof _onDocMouseUp === 'function') {
      document.removeEventListener('mouseup', _onDocMouseUp);
    }

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
          var ghostDot = document.createElement('span');
          ghostDot.className = 'node-drag-ghost-dot';
          ghostDot.style.background = __nl_cat.getCategoryColor(label);
          var ghostLabel = document.createElement('span');
          ghostLabel.className = 'node-drag-ghost-label';
          ghostLabel.textContent = label;
          ghost.appendChild(ghostDot);
          ghost.appendChild(ghostLabel);
          ghost.style.left = (e.clientX + 12) + 'px';
          ghost.style.top = (e.clientY - 8) + 'px';
          document.body.appendChild(ghost);
          _ghostEl = ghost;

          e.preventDefault();
        });
      }(items[i]));
    }

    _onDocMouseMove = function(e) {
      if (!_ghostEl) return;
      _ghostEl.style.left = (e.clientX + 12) + 'px';
      _ghostEl.style.top = (e.clientY - 8) + 'px';

      if (typeof canvasDrag !== 'undefined' && canvasDrag.findWireAt && _dragLabel) {
        var hitWire = canvasDrag.findWireAt(e.clientX, e.clientY);
        var def = __nl_cat.resolveDefByLabel(_dragLabel);
        if (hitWire && def && canvasDrag.canInsertOnWire(hitWire.id, def)) {
          if (_previewWireId !== hitWire.id) {
            _previewWireId = hitWire.id;
          }
          canvasDrag.setWirePreview(hitWire.id, e.clientX, e.clientY);
          if (typeof wireRenderer !== 'undefined' && wireRenderer.renderSplitPreview) {
            wireRenderer.renderSplitPreview(canvasDrag.getWirePreview());
          }
        } else {
          if (_previewWireId !== null) {
            _previewWireId = null;
            canvasDrag.clearWirePreview();
            if (typeof wireRenderer !== 'undefined' && wireRenderer.render) {
              wireRenderer.render(null);
            }
          }
        }
      }
    };
    document.addEventListener('mousemove', _onDocMouseMove);

    _onDocMouseUp = function(e) {
      if (_ghostEl) {
        _ghostEl.parentNode.removeChild(_ghostEl);
        _ghostEl = null;
      }
      if (_previewWireId !== null) {
        _previewWireId = null;
        if (typeof canvasDrag !== 'undefined' && canvasDrag.clearWirePreview) {
          canvasDrag.clearWirePreview();
        }
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) {
          wireRenderer.render(null);
        }
      }
      if (!_dragLabel) return;

      var dragging = document.querySelector('.leftbar-node-item--dragging');
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

      __nl_dragdrop._performDrop(label, e.clientX, e.clientY);
    };
    document.addEventListener('mouseup', _onDocMouseUp);
  }

  __nl_dragdrop.wireCanvasDrop = wireCanvasDrop;

})();
