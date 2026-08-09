/**
 * @fileoverview Parameter wiring checker. Determines whether a node parameter
 * is receiving a value from an incoming wire.
 * Depends on: graphState (global).
 * Exports: __ins_vm_wire.isParamWired
 */
// ui/inspector/viewModel/wiring.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: ui/inspector/viewModel/builder.js, ui/inspector/viewModel.js

var __ins_vm_wire = (function() {

  /**
   * Checks whether a node parameter is connected to a wire.
   * @param {string} nodeId The node ID.
   * @param {string} paramKey The parameter key.
   * @return {boolean} True if wired.
   */
  function isParamWired(nodeId, paramKey) {
    var nodeData = graphState.getNode(nodeId);
    if (nodeData && nodeData._cloneMasterId) return true;
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      var wire = wires[wireId];
      if (wire.toNode !== nodeId) continue;
      if (wire.boundParam === paramKey || wire.toPort === paramKey) return true;
    }
    return false;
  }

  return {
    isParamWired: isParamWired
  };

})();
