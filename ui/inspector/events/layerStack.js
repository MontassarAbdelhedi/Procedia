/**
 * @fileoverview Layer stack event handlers for the inspector.
 * Handles clicks, move buttons, drag & drop on layer stack rows.
 * Depends on: graphState, evalBridge, inspector (globals).
 * Attaches to __ins_events.onLayerStackRowClick, .onLayerStackMoveClick,
 * .onLayerStackDragStart, .onLayerStackDragOver, .onLayerStackDragEnd, .onLayerStackDrop.
 */
// ui/inspector/events/layerStack.js
// DEPENDS ON: graph/graphState.js, bridge/evalBridge.js

var __ins_events = __ins_events || {};

(function() {

  /**
   * Handles clicks on layer stack rows - selects the upstream node in the graph.
   * Ignores clicks on move buttons (handled separately).
   * @param {Event} e The click event.
   */
  function _onLayerStackRowClick(e) {
    if (e.target.closest('.ls-move-btn')) return;
    var row = e.target.closest('.inspector-ls-row');
    if (!row) return;
    var nodeId = row.getAttribute('data-layer-node-id');
    if (!nodeId) return;

    if (typeof graphState !== 'undefined' && graphState.setSelection) {
      graphState.setSelection(nodeId);
    }
  }

  /**
   * Handles clicks on layer stack move buttons (up/down/bottom).
   * Recalculates local layer order and refreshes the inspector on response.
   * @param {Event} e The click event.
   */
  function _onLayerStackMoveClick(e) {
    var btn = e.target.closest('.ls-move-btn');
    if (!btn) return;

    var wireId = btn.getAttribute('data-wire-id');
    var direction = btn.getAttribute('data-direction') || 'up';
    if (!wireId) return;

    var group = btn.closest('.ls-group');
    if (!group) return;
    var compId = group.getAttribute('data-ls-comp-id');
    if (!compId) return;

    var wire = graphState.getWire(wireId);
    if (!wire) return;
    var layerUUID = wire._pathLayerUUID;
    if (!layerUUID) return;

    // Optimistic update: recalculate _layerOrder based on direction
    // before dispatching to AE.
    var wires = graphState.getAllWires();
    var compWires = [];
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === compId && w.toPort === 'main_input' && w.type === 'layer') {
        compWires.push(w);
      }
    }
    compWires.sort(function(a, b) {
      return (a._layerOrder || 999) - (b._layerOrder || 999);
    });
    var orderedIds = [];
    for (var i = 0; i < compWires.length; i++) {
      orderedIds.push(compWires[i].id);
    }
    var idx = orderedIds.indexOf(wireId);
    if (idx !== -1) {
      if (direction === 'top') {
        orderedIds.splice(idx, 1);
        orderedIds.unshift(wireId);
      } else if (direction === 'up') {
        if (idx > 0) {
          orderedIds.splice(idx, 1);
          orderedIds.splice(idx - 1, 0, wireId);
        }
      } else if (direction === 'down') {
        if (idx < orderedIds.length - 1) {
          orderedIds.splice(idx, 1);
          orderedIds.splice(idx + 1, 0, wireId);
        }
      } else if (direction === 'bottom') {
        orderedIds.splice(idx, 1);
        orderedIds.push(wireId);
      }
      var order = 1;
      for (var i = 0; i < orderedIds.length; i++) {
        var w2 = wires[orderedIds[i]];
        if (w2 && w2._pathLayerUUID) {
          w2._layerOrder = order;
          order++;
        }
      }
    }

    if (typeof inspector !== 'undefined' && inspector.refresh) {
      inspector.refresh();
    }

    evalBridge.dispatch({
      action: 'setLayerOrder',
      params: { layerUUID: layerUUID, hostingCompUUID: compId, direction: direction }
    }).then(function() {
      if (typeof inspector !== 'undefined' && inspector.refresh) {
        inspector.refresh();
      }
    });
  }

  /**
   * Handles dragstart on layer stack rows.
   * Stores the dragged wire ID in dataTransfer.
   * @param {Event} e The dragstart event.
   */
  function _onLayerStackDragStart(e) {
    var row = e.target.closest('.inspector-ls-row');
    if (!row) { e.preventDefault(); return; }
    var wireId = row.getAttribute('data-wire-id');
    if (!wireId) { e.preventDefault(); return; }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', wireId);

    // Add drag-origin class for visual feedback
    row.classList.add('ls-dragging');
  }

  /**
   * Handles dragover on layer stack rows.
   * Prevents default to allow drop, shows insertion indicator.
   * @param {Event} e The dragover event.
   */
  function _onLayerStackDragOver(e) {
    var row = e.target.closest('.inspector-ls-row');
    if (!row) return;
    if (!row.getAttribute('data-wire-id')) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  /**
   * Handles dragend on layer stack rows.
   * Cleans up visual feedback.
   * @param {Event} e The dragend event.
   */
  function _onLayerStackDragEnd(e) {
    var row = e.target.closest('.inspector-ls-row');
    if (row) {
      row.classList.remove('ls-dragging');
    }
    // Remove any drop indicators
    var groups = document.querySelectorAll('.ls-group .ls-drop-indicator');
    for (var gi = 0; gi < groups.length; gi++) {
      groups[gi].classList.remove('ls-drop-indicator');
    }
  }

  /**
   * Handles drop on layer stack rows.
   * Drop on a row moves the dragged layer before the target in AE.
   * Drop on the container (empty area) moves the dragged layer to the bottom.
   * Recalculates local layer order and refreshes the inspector on response.
   * @param {Event} e The drop event.
   */
  function _onLayerStackDrop(e) {
    e.preventDefault();
    var draggedWireId = e.dataTransfer.getData('text/plain');
    if (!draggedWireId) return;

    var group = e.target.closest('.ls-group');
    if (!group) return;
    var compId = group.getAttribute('data-ls-comp-id');
    if (!compId) return;

    var draggedWire = graphState.getWire(draggedWireId);
    if (!draggedWire || !draggedWire._pathLayerUUID) return;
    var layerUUID = draggedWire._pathLayerUUID;

    var targetRow = e.target.closest('.inspector-ls-row');
    var targetWireId = null;

    if (targetRow) {
      targetWireId = targetRow.getAttribute('data-wire-id');
      if (!targetWireId || targetWireId === draggedWireId) return;
      var targetWire = graphState.getWire(targetWireId);
      if (!targetWire || !targetWire._pathLayerUUID) return;
    }

    // Optimistic update: recalculate _layerOrder based on the new drop position
    // BEFORE dispatching to AE, so the panel reflects the change immediately.
    // We cannot use __ins_layerStack.recalculateLayerOrder here because it
    // reads the stale _layerOrder from _buildViewModel, producing a no-op.
    var wires = graphState.getAllWires();
    var compWires = [];
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === compId && w.toPort === 'main_input' && w.type === 'layer') {
        compWires.push(w);
      }
    }
    compWires.sort(function(a, b) {
      return (a._layerOrder || 999) - (b._layerOrder || 999);
    });
    var orderedIds = [];
    for (var i = 0; i < compWires.length; i++) {
      orderedIds.push(compWires[i].id);
    }
    var draggedIdx = orderedIds.indexOf(draggedWireId);
    if (draggedIdx !== -1) {
      orderedIds.splice(draggedIdx, 1);
      if (targetRow) {
        var targetIdx = orderedIds.indexOf(targetWireId);
        if (targetIdx !== -1) {
          orderedIds.splice(targetIdx, 0, draggedWireId);
        } else {
          orderedIds.push(draggedWireId);
        }
      } else {
        orderedIds.push(draggedWireId);
      }
      var order = 1;
      for (var i = 0; i < orderedIds.length; i++) {
        var wire = wires[orderedIds[i]];
        if (wire && wire._pathLayerUUID) {
          wire._layerOrder = order;
          order++;
        }
      }
    }

    // Refresh panel optimistically
    if (typeof inspector !== 'undefined' && inspector.refresh) {
      inspector.refresh();
    }

    // Dispatch to AE to move the actual layer
    var dispatchPromise;
    if (targetRow) {
      dispatchPromise = evalBridge.dispatch({
        action: 'moveLayerBefore',
        params: {
          hostingCompUUID:  compId,
          layerUUID:        layerUUID,
          targetLayerUUID:  targetWire._pathLayerUUID
        }
      });
    } else {
      dispatchPromise = evalBridge.dispatch({
        action: 'setLayerOrder',
        params: {
          hostingCompUUID: compId,
          layerUUID:       layerUUID,
          direction:       'bottom'
        }
      });
    }

    // On AE response, refresh again to confirm
    if (dispatchPromise) {
      dispatchPromise.then(function() {
        if (typeof inspector !== 'undefined' && inspector.refresh) {
          inspector.refresh();
        }
      }).catch(function() {
        // AE move failed — re-read current order from AE by refreshing
        if (typeof inspector !== 'undefined' && inspector.refresh) {
          inspector.refresh();
        }
      });
    }
  }

  __ins_events.onLayerStackRowClick  = _onLayerStackRowClick;
  __ins_events.onLayerStackMoveClick = _onLayerStackMoveClick;
  __ins_events.onLayerStackDragStart = _onLayerStackDragStart;
  __ins_events.onLayerStackDragOver  = _onLayerStackDragOver;
  __ins_events.onLayerStackDragEnd   = _onLayerStackDragEnd;
  __ins_events.onLayerStackDrop      = _onLayerStackDrop;

})();
