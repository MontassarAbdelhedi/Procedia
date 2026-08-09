/**
 * graph/engine/helpers/refreshUI.js
 *
 * Refreshes all UI components: minimap, renderer, wire renderer, inspector,
 * and status bar via the RAF-batched UI update scheduler.
 *
 * Dependencies: none (attaches to window.__procedia_internal.hlp)
 * Load before: graph/engine/helpers/dynamicSchema.js, graph/engine/helpers/index.js
 *
 * Exports: refreshNodeUI
 */
// graph/engine/helpers/refreshUI.js
// MUST LOAD BEFORE: graph/engine/helpers/dynamicSchema.js, graph/engine/helpers/index.js

window.__procedia_internal.hlp = window.__procedia_internal.hlp || {};

window.__procedia_internal.hlp.refreshNodeUI = function() {
  if (window.__procedia_internal._uiScheduler) {
    window.__procedia_internal._uiScheduler.scheduleUIUpdate();
  }
};
