/**
 * @fileoverview Color picker trigger click handler for the inspector.
 * Opens the custom color picker popover when the trigger button is clicked.
 * Depends on: graphState, __ins_colorPicker (globals).
 * Attaches to __ins_events.onColorTriggerClick.
 */
// ui/inspector/events/colorPicker.js
// DEPENDS ON: graph/graphState.js

var __ins_events = __ins_events || {};

(function() {

  /**
   * Handles clicks on the color picker trigger button.
   * Opens the custom color picker popover.
   * @param {Event} e The click event.
   */
  function _onColorTriggerClick(e) {
    var btn = e.target.closest('.cp-trigger');
    if (!btn) return;

    var nodeId = btn.getAttribute('data-node-id');
    var key = btn.getAttribute('data-param-key');
    if (!nodeId || !key) return;

    var nodeData = graphState.getNode(nodeId);
    if (!nodeData || !Array.isArray(nodeData.props[key])) return;

    __ins_colorPicker.open(btn, nodeId, key, nodeData.props[key].slice());
  }

  __ins_events.onColorTriggerClick = _onColorTriggerClick;

})();
