/**
 * @fileoverview Layer stack HTML renderer. Renders the layer stack UI
 * with state indicators, move controls, and comp empty state.
 * Depends on: __ins_ls_builder, graphState (globals).
 * Exports: __ins_ls_render.render, .buildCompEmptyState
 */
// ui/inspector/layerStack/render.js
// DEPENDS ON: ui/inspector/layerStack/order.js, ui/inspector/layerStack/builder.js, graph/graphState.js
// MUST LOAD BEFORE: ui/inspector/layerStack/index.js

var __ins_ls_render = (function() {

  function _escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
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
    var layers = __ins_ls_builder.buildViewModel(compId);
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

  return {
    render:              _render,
    buildCompEmptyState: buildCompEmptyState
  };

})();
