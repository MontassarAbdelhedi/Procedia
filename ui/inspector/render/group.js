/**
 * @fileoverview Parameter group renderer. Produces HTML markup for a section
 * of inspector parameters grouped under a label.
 * Depends on: __ins_render_param (for renderParam).
 * Exports: __ins_render_group.renderGroup
 */
// ui/inspector/render/group.js
// DEPENDS ON: ui/inspector/render/param.js
// MUST LOAD BEFORE: ui/inspector/render/nodeContent.js

var __ins_render_group = (function() {

  /**
   * Renders a group of parameters with a group label.
   * @param {string} nodeId The node ID.
   * @param {Object} group The group descriptor with .label and .params.
   * @return {string} HTML string.
   */
  function renderGroup(nodeId, group) {
    var paramsHtml = '';
    for (var i = 0; i < group.params.length; i++) {
      paramsHtml += __ins_render_param.renderParam(nodeId, group.params[i]);
    }
    return (
      '<div class="inspector-group">' +
        '<div class="inspector-group-label">' + group.label + '</div>' +
        paramsHtml +
      '</div>'
    );
  }

  return {
    renderGroup: renderGroup
  };

})();
