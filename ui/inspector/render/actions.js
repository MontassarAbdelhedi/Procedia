/**
 * @fileoverview Inspector action renderers. Produces HTML markup for
 * layer order buttons and footage browse/import buttons.
 * Depends on: graphState (global), __ins_render_param (for escapeAttr).
 * Exports: __ins_render_actions.renderLayerActions, .renderFootageActions
 */
// ui/inspector/render/actions.js
// DEPENDS ON: graph/graphState.js, ui/inspector/render/param.js
// MUST LOAD BEFORE: ui/inspector/render/nodeContent.js

var __ins_render_actions = (function() {

  var _esc = __ins_render_param.escapeAttr;

  /**
   * Renders the layer order action buttons (Move Up / Move Down).
   * @param {Object} view The node view model.
   * @return {string} HTML string.
   */
  function renderLayerActions(view) {
    return (
      '<div class="inspector-group">' +
        '<div class="inspector-group-label">Layer Order</div>' +
        '<button class="inspector-layer-btn" data-node-id="' + view.nodeId + '" data-host-uuid="' + view.hostingCompUUID + '" data-direction="up">' +
          '<i class="ti ti-chevron-up"></i> Move Up' +
        '</button>' +
        '<button class="inspector-layer-btn" data-node-id="' + view.nodeId + '" data-host-uuid="' + view.hostingCompUUID + '" data-direction="down">' +
          '<i class="ti ti-chevron-down"></i> Move Down' +
        '</button>' +
      '</div>'
    );
  }

  /**
   * Renders the footage browse/import action button and status.
   * @param {Object} view The node view model.
   * @return {string} HTML string.
   */
  function renderFootageActions(view) {
    var nodeData = graphState.getNode(view.nodeId);
    var hasFootage = nodeData && nodeData.props && nodeData.props.filePath;
    var isError = view.state.indexOf('error') !== -1;
    var statusHtml = hasFootage
      ? '<span class="inspector-filename">' + _esc(nodeData.props.filePath.split('\\').pop().split('/').pop()) + '</span>'
      : '<span class="inspector-filename muted">' + (isError ? 'no file imported \u2014 browse to fix' : 'no file selected') + '</span>';
    return (
      '<div class="inspector-group">' +
        '<div class="inspector-group-label">Footage Import</div>' +
        '<div class="inspector-param-row">' +
          statusHtml +
        '</div>' +
        '<button class="inspector-footage-btn" data-node-id="' + view.nodeId + '">' +
          '<i class="ti ti-folder-open"></i> Browse &amp; Import' +
        '</button>' +
      '</div>'
    );
  }

  return {
    renderLayerActions:   renderLayerActions,
    renderFootageActions: renderFootageActions
  };

})();
