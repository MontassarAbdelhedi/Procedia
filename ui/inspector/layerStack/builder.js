/**
 * @fileoverview Layer stack view model builder. Builds the ordered list of
 * terminal layers for a comp node, resolves upstream affected nodes, and
 * handles initial layer order assignment.
 * Depends on: graphState, nodeRegistry, __ins_ls_resolver (globals).
 * Exports: __ins_ls_builder.buildViewModel
 */
// ui/inspector/layerStack/builder.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, ui/inspector/layerStack/resolver.js
// MUST LOAD BEFORE: ui/inspector/layerStack/order.js

var __ins_ls_builder = (function() {

  /**
   * Builds an array of layer descriptors for a given comp node.
   * Walks all wires to find terminal layer wires (toNode === compId,
   * toPort === 'main_input').
   *
   * Ordering: alive layers are sorted by `wire._layerOrder` ascending
   * (1 = top of AE stack). If a wire lacks `_layerOrder`, it's assigned
   * based on wireMap position: first wire = bottom, last wire = top.
   * Dormant layers follow at the bottom.
   *
   * After AE reorder operations, `_layerOrder` values are recalculated
   * so the panel order stays in sync with AE.
   *
   * @param {string} compId The comp node UUID.
   * @return {Array} Array of layer objects: {nodeId, wireId, label,
   *                 layerUUID, alive, type}
   */
  function buildViewModel(compId) {
    var wires = graphState.getAllWires();

    // Step 1: Collect all terminal wires into comp's main_input
    var compWires = [];
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === compId && w.toPort === 'main_input' && w.type === 'layer') {
        compWires.push(w);
      }
    }

    // Step 2: Assign _layerOrder to any terminal wires that lack it
    var hasAnyOrder = false;
    for (var wi = 0; wi < compWires.length; wi++) {
      if (compWires[wi]._layerOrder !== undefined) { hasAnyOrder = true; break; }
    }
    if (!hasAnyOrder) {
      for (var wi = 0; wi < compWires.length; wi++) {
        compWires[wi]._layerOrder = compWires.length - wi;
      }
    } else {
      for (var wi = 0; wi < compWires.length; wi++) {
        if (compWires[wi]._layerOrder === undefined) {
          for (var wj = 0; wj < compWires.length; wj++) {
            if (compWires[wj]._layerOrder !== undefined) {
              compWires[wj]._layerOrder++;
            }
          }
          compWires[wi]._layerOrder = 1;
        }
      }
    }

    // Step 3: Resolve affected node upstream of each terminal wire,
    //         deduplicate
    var aliveLayers = [];
    var dormantLayers = [];
    var seenAffected = {};

    for (var wi = 0; wi < compWires.length; wi++) {
      var w2 = compWires[wi];
      var affectedNodeId = __ins_ls_resolver.resolveCompLayerAffectedNode(
        w2.fromNode, {});
      if (!affectedNodeId) continue;
      if (seenAffected[affectedNodeId]) continue;
      seenAffected[affectedNodeId] = true;

      var nodeData = graphState.getNode(affectedNodeId);
      if (!nodeData) continue;

      var def = nodeRegistry.getDefinition(nodeData.type);
      var label = 'Layer';
      if (nodeData.props && nodeData.props.label) {
        label = nodeData.props.label;
      } else if (def && def.label) {
        label = def.label;
      }

      var layer = {
        nodeId:     affectedNodeId,
        wireId:     w2.id,
        label:      label,
        layerUUID:  w2._pathLayerUUID || null,
        alive:      !!w2._pathLayerUUID,
        type:       nodeData.type,
        _order:     w2._layerOrder !== undefined ? w2._layerOrder : 999
      };

      if (layer.alive) {
        aliveLayers.push(layer);
      } else {
        dormantLayers.push(layer);
      }
    }

    // Sort alive layers by _order ascending (1 = top of AE stack = first
    // in list)
    aliveLayers.sort(function(a, b) {
      return a._order - b._order;
    });
    return aliveLayers.concat(dormantLayers);
  }

  return {
    buildViewModel: buildViewModel
  };

})();
