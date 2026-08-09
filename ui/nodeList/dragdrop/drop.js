/**
 * @fileoverview Drop handler for node list drag-and-drop. Called by
 * __nl_dragdrop.wireCanvasDrop's mouseup handler when the user releases a
 * dragged node over the canvas. Handles preset nodes, wire-insertion, and
 * normal drop via engine.dropNode.
 * Depends on: __nl_dragdrop, __nl_cat, viewport, canvasDrag, engine, graphState,
 *             presetManager, settings (globals).
 * Exports (extends): __nl_dragdrop._performDrop
 */
// ui/nodeList/dragdrop/drop.js
// DEPENDS ON: ui/nodeList/dragdrop/dragdrop.js,
//             ui/nodeList/dragdrop/mergeWarning.js,
//             ui/nodeList/categories.js,
//             graph/engine/index.js,
//             graph/canvas/viewport.js,
//             graph/graphState/index.js,
//             canvasDrag, wireRenderer
// MUST LOAD AFTER: ui/nodeList/dragdrop/dragdrop.js,
//                  ui/nodeList/dragdrop/mergeWarning.js
// MUST LOAD BEFORE: ui/nodeList/index.js
// THIRD IN LOAD ORDER among dragdrop/ sub-files

(function() {

  __nl_dragdrop._performDrop = function(label, clientX, clientY) {
    var def = __nl_cat.resolveDefByLabel(label);
    if (!def) return;

    // Preset nodes: drop via presetManager instead of engine.dropNode
    if (def._isPreset && typeof presetManager !== 'undefined') {
      var pos = viewport.screenToCanvas(clientX, clientY);
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

    var pos = viewport.screenToCanvas(clientX, clientY);
    if (typeof settings !== 'undefined' && settings.get('snapToGrid')) {
      pos.x = viewport.snapToGrid(pos.x);
      pos.y = viewport.snapToGrid(pos.y);
    }

    // Wire-insertion drop: insert node inline on a wire
    if (typeof canvasDrag !== 'undefined' && canvasDrag.findWireAt && canvasDrag.canInsertOnWire) {
      var hitWire = canvasDrag.findWireAt(clientX, clientY);
      if (hitWire && canvasDrag.canInsertOnWire(hitWire.id, def)) {
        var insertNode = canvasDrag.insertNodeOnWire(hitWire.id, def, pos.x, pos.y);
        if (insertNode) {
          if (def.type === 'utility/merge' || def.type === 'utility/multimerge') {
            __nl_dragdrop._maybeWarnMerge();
          }
          graphState.setSelection(insertNode.id);
          window.__procedia_internal.refreshUI({ minimap: false });
        }
        return;
      }
    }

    // Normal drop: create node via engine
    var node = engine.dropNode(def, pos.x, pos.y);
    if (node) {
      if (def.type === 'utility/merge' || def.type === 'utility/multimerge') {
        __nl_dragdrop._maybeWarnMerge();
      }
      graphState.setSelection(node.id);
      window.__procedia_internal.refreshUI({ minimap: false });
    }
  };

})();
