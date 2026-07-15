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
  var _previewWireId = null;
  var _mergeProjectId = null;

  function _maybeWarnMerge() {
    if (typeof notificationBar === 'undefined') return;
    if (_mergeProjectId === null) {
      _mergeProjectId = evalBridge.dispatch({ action: 'getProjectIdentifier' })
        .then(function(res) { return res.ok ? res.data.projectId : 'unknown'; })
        .catch(function() { return 'unknown'; });
    }
    Promise.resolve(_mergeProjectId).then(function(projectId) {
      var key = 'procedia_merge_warned_' + projectId;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
      notificationBar.push({
        severity: 'warning',
        message: 'Using the Merge node will make this project always require Procedia to run.',
        duration: 8000
      });
    });
  }

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
    });

    document.addEventListener('mouseup', function(e) {
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

      // Preset nodes: drop via presetManager instead of engine.dropNode
      if (def._isPreset && typeof presetManager !== 'undefined') {
        var pos = viewport.screenToCanvas(e.clientX, e.clientY);
        if (typeof settings !== 'undefined' && settings.get('snapToGrid')) {
          pos.x = viewport.snapToGrid(pos.x);
          pos.y = viewport.snapToGrid(pos.y);
        }
        var result = presetManager.dropPreset(def._presetName, pos.x, pos.y);
        if (result && result.nodeIds && result.nodeIds.length > 0) {
          window.__procedia_internal.refreshUI({ minimap: false });
        }
        return;
      }

      var pos = viewport.screenToCanvas(e.clientX, e.clientY);
      if (typeof settings !== 'undefined' && settings.get('snapToGrid')) {
        pos.x = viewport.snapToGrid(pos.x);
        pos.y = viewport.snapToGrid(pos.y);
      }

      if (typeof canvasDrag !== 'undefined' && canvasDrag.findWireAt && canvasDrag.canInsertOnWire) {
        var hitWire = canvasDrag.findWireAt(e.clientX, e.clientY);
        if (hitWire && canvasDrag.canInsertOnWire(hitWire.id, def)) {
          var insertNode = canvasDrag.insertNodeOnWire(hitWire.id, def, pos.x, pos.y);
          if (insertNode) {
            if (def.type === 'utility/merge' || def.type === 'utility/multimerge') _maybeWarnMerge();
            graphState.setSelection(insertNode.id);
            window.__procedia_internal.refreshUI({ minimap: false });
          }
          return;
        }
      }

      var node = engine.dropNode(def, pos.x, pos.y);
      if (node) {
        if (def.type === 'utility/merge' || def.type === 'utility/multimerge') _maybeWarnMerge();
        graphState.setSelection(node.id);
        window.__procedia_internal.refreshUI({ minimap: false });
      }
    });
  }

  return {
    wireCanvasDrop: wireCanvasDrop
  };

})();
