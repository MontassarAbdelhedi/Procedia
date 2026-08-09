/**
 * @fileoverview Top-level inspector content renderer. Assembles the full
 * inspector panel HTML for a node: header, layer actions, layer stack,
 * footage actions, and parameter groups.
 * Depends on: __ins_render_param, __ins_render_group, __ins_render_actions,
 *             __ins_layerStack (global).
 * Exports: __ins_render_node.renderNodeContent
 */
// ui/inspector/render/nodeContent.js
// DEPENDS ON: ui/inspector/render/param.js, ui/inspector/render/group.js,
//             ui/inspector/render/actions.js, ui/inspector/layerStack.js
// MUST LOAD BEFORE: ui/inspector/render.js

var __ins_render_node = (function() {

  /**
   * Renders the complete inspector content for a node.
   * @param {Object} view The view model from __ins_vm_builder.buildViewModel().
   * @return {string} HTML string.
   */
  function renderNodeContent(view) {
    if (view.loading) {
      return (
        '<div class="inspector-header">' +
          '<div class="inspector-node-name">' + view.name + '</div>' +
          '<div class="inspector-state-badge">' +
            '<div class="inspector-state-dot"></div>' +
            '<span class="inspector-state-text">' + view.state + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="inspector-group">' +
          '<div class="inspector-param-row">' +
            '<span class="inspector-param-label">Schema</span>' +
            '<span class="inspector-param-value">Loading\u2026</span>' +
          '</div>' +
        '</div>'
      );
    }

    var layerActionsHtml = '';
    if (view.nodeType === 'core/comp' && view.state.indexOf('alive') !== -1 && view.hostingCompUUID) {
      layerActionsHtml = __ins_render_actions.renderLayerActions(view);
    }

    var layerStackHtml = '';
    if (view.nodeType === 'core/comp' && view.state.indexOf('alive') !== -1) {
      var ls = __ins_layerStack.buildViewModel(view.nodeId);
      layerStackHtml = __ins_layerStack.render(view.nodeId, ls);
    }

    var footageActionsHtml = '';
    if (view.nodeType === 'core/footage') {
      footageActionsHtml = __ins_render_actions.renderFootageActions(view);
    }

    var groupsHtml = '';
    for (var i = 0; i < view.groups.length; i++) {
      groupsHtml += __ins_render_group.renderGroup(view.nodeId, view.groups[i]);
    }

    return (
      '<div class="inspector-header">' +
        '<div class="inspector-node-name">' + view.name + '</div>' +
        '<div class="inspector-state-badge">' +
          '<div class="inspector-state-dot' + (view.state.indexOf('error') !== -1 ? ' error' : '') + '"></div>' +
          '<span class="inspector-state-text">' + view.state + '</span>' +
        '</div>' +
      '</div>' +
      layerActionsHtml +
      layerStackHtml +
      footageActionsHtml +
      groupsHtml
    );
  }

  return {
    renderNodeContent: renderNodeContent
  };

})();
