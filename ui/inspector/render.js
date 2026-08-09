/**
 * @fileoverview Backward-compatible assembly of inspector render utilities.
 * Delegates to sub-modules: render/param.js, render/group.js, render/actions.js,
 * render/nodeContent.js.
 * Depends on: __ins_render_param, __ins_render_group, __ins_render_actions,
 *             __ins_render_node (globals).
 * Exports: __ins_render.renderLayerActions, .renderFootageActions,
 *          .renderParam, .renderGroup, .renderNodeContent
 */
// ui/inspector/render.js
// DEPENDS ON: ui/inspector/render/param.js, ui/inspector/render/group.js,
//             ui/inspector/render/actions.js, ui/inspector/render/nodeContent.js
// MUST LOAD BEFORE: ui/inspector/index.js

var __ins_render = {
  renderLayerActions:   __ins_render_actions.renderLayerActions,
  renderFootageActions: __ins_render_actions.renderFootageActions,
  renderParam:          __ins_render_param.renderParam,
  renderGroup:          __ins_render_group.renderGroup,
  renderNodeContent:    __ins_render_node.renderNodeContent
};
