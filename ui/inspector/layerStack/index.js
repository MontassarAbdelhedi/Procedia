/**
 * @fileoverview Layer stack barrel module. Re-exports the layer stack
 * builder, order, and renderer under the __ins_layerStack namespace for
 * backward compatibility.
 * Depends on: __ins_ls_builder, __ins_ls_order, __ins_ls_render (globals).
 * Exports: __ins_layerStack.buildViewModel, .render, .buildCompEmptyState,
 *          .recalculateLayerOrder
 */
// ui/inspector/layerStack/index.js
// DEPENDS ON: ui/inspector/layerStack/order.js, ui/inspector/layerStack/builder.js,
//             ui/inspector/layerStack/render.js
// MUST LOAD BEFORE: ui/inspector/index.js

var __ins_layerStack = {
  buildViewModel:        __ins_ls_builder.buildViewModel,
  render:                __ins_ls_render.render,
  buildCompEmptyState:   __ins_ls_render.buildCompEmptyState,
  recalculateLayerOrder: __ins_ls_order.recalculateLayerOrder
};
