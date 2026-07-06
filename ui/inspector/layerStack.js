/**
 * @fileoverview Layer stack view model + renderer for the inspector.
 * Builds a list of terminal layers (wires into a comp's main_input) and
 * renders them as an ordered stack with state indicators and move controls.
 * Depends on: graphState, nodeRegistry (globals).
 * Exports: __ins_layerStack.buildViewModel, .render, .buildCompEmptyState
 */
// ui/inspector/layerStack.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: ui/inspector/index.js

var __ins_layerStack = (function() {

  function _escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  /**
   * Builds an array of layer descriptors for a given comp node.
   * Walks all wires to find terminal layer wires (toNode === compId, toPort === 'main_input').
   *
   * Ordering: alive layers are sorted by `wire._layerOrder` ascending (1 = top of AE stack).
   * If a wire lacks `_layerOrder`, it's assigned based on wireMap position:
   * first wire = bottom, last wire = top. Dormant layers follow at the bottom.
   *
   * After AE reorder operations, `_layerOrder` values are recalculated so the panel
   * order stays in sync with AE.
   *
   * @param {string} compId The comp node UUID.
   * @return {Array} Array of layer objects: {nodeId, wireId, label, layerUUID, alive, type}
   */
  function _buildViewModel(compId) {
    var aliveLayers = [];
    var dormantLayers = [];
    var wires = graphState.getAllWires();
    var wireList = [];
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === compId && w.toPort === 'main_input' && w.type === 'layer') {
        wireList.push(w);
      }
    }

    // Assign _layerOrder to any wires that lack it (initial assignment)
    // wireMap iteration order: first wire = bottom of AE stack = highest order
    // last wire = top of AE stack = lowest order (1)
    var hasAnyOrder = false;
    for (var wi = 0; wi < wireList.length; wi++) {
      if (wireList[wi]._layerOrder !== undefined) { hasAnyOrder = true; break; }
    }
    if (!hasAnyOrder) {
      for (var wi = 0; wi < wireList.length; wi++) {
        // wire at index 0 is oldest (bottom of stack), assign highest order
        wireList[wi]._layerOrder = wireList.length - wi;
      }
    }

    for (var wi = 0; wi < wireList.length; wi++) {
      var w = wireList[wi];
      var nodeId = w.fromNode;
      var nodeData = graphState.getNode(nodeId);
      var def = nodeData ? nodeRegistry.getDefinition(nodeData.type) : null;
      var label = 'Layer';
      if (nodeData && nodeData.props && nodeData.props.label) {
        label = nodeData.props.label;
      } else if (def && def.label) {
        label = def.label;
      }
      var layer = {
        nodeId:    nodeId,
        wireId:    w.id,
        label:     label,
        layerUUID: w._pathLayerUUID || null,
        alive:     !!w._pathLayerUUID,
        type:      nodeData ? nodeData.type : 'unknown',
        _order:    w._layerOrder !== undefined ? w._layerOrder : 999
      };
      if (layer.alive) {
        aliveLayers.push(layer);
      } else {
        dormantLayers.push(layer);
      }
    }

    // Sort alive layers by _order ascending (1 = top of AE stack = first in list)
    aliveLayers.sort(function(a, b) {
      return a._order - b._order;
    });
    return aliveLayers.concat(dormantLayers);
  }

  /**
   * Renders a single layer row.
   * @param {Object} layer Layer descriptor from _buildViewModel.
   * @param {number} index 1-based display index.
   * @return {string} HTML string.
   */
  function _renderRow(layer, index) {
    var stateClass = layer.alive ? 'ls-alive' : 'ls-dormant';
    var moveBtns = '';
    if (layer.alive) {
      moveBtns =
        '<button class="ls-move-btn" data-wire-id="' + layer.wireId + '" data-direction="up" title="Move up"><i class="ti ti-chevron-up"></i></button>' +
        '<button class="ls-move-btn" data-wire-id="' + layer.wireId + '" data-direction="down" title="Move down"><i class="ti ti-chevron-down"></i></button>';
    }
    return (
      '<div class="inspector-ls-row ' + stateClass + '" draggable="' + layer.alive + '" data-layer-node-id="' + layer.nodeId + '" data-wire-id="' + layer.wireId + '">' +
        '<span class="ls-index">' + (index + 1) + '</span>' +
        '<span class="ls-label">' + _escapeHtml(layer.label) + '</span>' +
        '<span class="ls-type">' + _escapeHtml(layer.type.replace(/^.*\//, '')) + '</span>' +
        '<span class="ls-state-dot"></span>' +
        moveBtns +
      '</div>'
    );
  }

  /**
   * Renders the full layer stack group for inclusion in the inspector.
   * @param {string} compId The comp node UUID.
   * @param {Array} layers Array from buildViewModel.
   * @return {string} HTML string.
   */
  function _render(compId, layers) {
    var rowsHtml = '';
    for (var i = 0; i < layers.length; i++) {
      rowsHtml += _renderRow(layers[i], i);
    }
    if (!rowsHtml) {
      rowsHtml = '<div class="ls-empty">no layers</div>';
    }
    return (
      '<div class="inspector-group ls-group" data-ls-comp-id="' + compId + '">' +
        '<div class="inspector-group-label">Layer Stack <span class="ls-count">' + layers.length + '</span></div>' +
        rowsHtml +
      '</div>'
    );
  }

  /**
   * Builds complete empty-state HTML for when the user is "inside" a comp
   * but no node is selected. Shows a comp header + layer stack.
   * @param {string} compId The comp node UUID.
   * @return {string} HTML string, or empty if comp not found.
   */
  function buildCompEmptyState(compId) {
    var compData = graphState.getNode(compId);
    if (!compData) return '';
    var layers = _buildViewModel(compId);
    var compName = (compData.props && compData.props.label) || 'Comp';
    return (
      '<div class="inspector-header">' +
        '<div class="inspector-node-name">Comp: ' + _escapeHtml(compName) + '</div>' +
        '<div class="inspector-state-badge">' +
          '<div class="inspector-state-dot"></div>' +
          '<span class="inspector-state-text">\u00b7 affected</span>' +
        '</div>' +
      '</div>' +
      _render(compId, layers)
    );
  }

  /**
   * Recalculates _layerOrder for all terminal wires of a comp to match
   * the current display order (top to bottom = AE layer 1 to N).
   * Called after reorder operations to keep the panel in sync with AE.
   * Mutates wire objects directly (avoids rebuildTempGraph side effects).
   * @param {string} compId The comp node UUID.
   */
  function recalculateLayerOrder(compId) {
    var layers = _buildViewModel(compId);
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
    buildViewModel:     _buildViewModel,
    render:             _render,
    buildCompEmptyState: buildCompEmptyState,
    recalculateLayerOrder: recalculateLayerOrder
  };

})();
