/**
 * @fileoverview Layer stack order recalculation. Recalculates _layerOrder
 * for all terminal wires of a comp to match the current display order.
 * Depends on: __ins_ls_builder, graphState (globals).
 * Exports: __ins_ls_order.recalculateLayerOrder
 */
// ui/inspector/layerStack/order.js
// DEPENDS ON: ui/inspector/layerStack/builder.js, graph/graphState.js
// MUST LOAD BEFORE: ui/inspector/layerStack/render.js

var __ins_ls_order = (function() {

  /**
   * Recalculates _layerOrder for all terminal wires of a comp to match
   * the current display order (top to bottom = AE layer 1 to N).
   * Called after reorder operations to keep the panel in sync with AE.
   * Mutates wire objects directly (avoids rebuildTempGraph side effects).
   * @param {string} compId The comp node UUID.
   */
  function recalculateLayerOrder(compId) {
    var layers = __ins_ls_builder.buildViewModel(compId);
    var wires = graphState.getAllWires();
    // Assign _layerOrder ascending (1 = top)
    var order = 1;
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].alive && wires[layers[i].wireId]) {
        wires[layers[i].wireId]._layerOrder = order;
        order++;
      }
    }
  }

  return {
    recalculateLayerOrder: recalculateLayerOrder
  };

})();
