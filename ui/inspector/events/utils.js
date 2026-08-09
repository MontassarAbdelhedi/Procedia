/**
 * @fileoverview Utility functions shared across inspector event handlers.
 * Attaches to __ins_events._resolveLayerUUID, __ins_events._findUpstreamLayerNode.
 */
// ui/inspector/events/utils.js
// MUST LOAD BEFORE: ui/inspector/events/paramChange.js, ui/inspector/events/keyframe.js, ui/inspector/events/layerActions.js

var __ins_events = __ins_events || {};

(function() {

  /**
   * Walks upstream wires to find the first layer node connected to this node's mainInput.
   * @param {string} nodeId The effector node UUID.
   * @return {string|null} The upstream layer node UUID, or null.
   */
  function _findUpstreamLayerNode(nodeId) {
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === nodeId && w.toPort === 'main_input') {
        return w.fromNode;
      }
    }
    return null;
  }

  /**
   * Resolves the AE layer UUID for a node by walking downstream wires
   * to find the terminal wire's _pathLayerUUID.
   * @param {string} nodeId The node UUID.
   * @return {string|null} The layer UUID or null.
   */
  function _resolveLayerUUID(nodeId) {
    if (typeof window.__procedia_internal.hlp !== 'undefined' && window.__procedia_internal.hlp.findPathLayerUUID) {
      return window.__procedia_internal.hlp.findPathLayerUUID(nodeId);
    }
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.fromNode === nodeId && w.type === 'layer' && w._pathLayerUUID) {
        return w._pathLayerUUID;
      }
    }
    return null;
  }

  __ins_events._resolveLayerUUID = _resolveLayerUUID;
  __ins_events._findUpstreamLayerNode = _findUpstreamLayerNode;

})();
