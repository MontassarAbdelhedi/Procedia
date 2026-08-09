/**
 * Merge validator — validates a candidate merged graph against structural
 * and topological rules. Pure JS, no AE or UI dependencies.
 * @module vcMergeValidator
 * @dependencies vcMergeLayerCycleDetector, vcMergeDuplicateWireDetector
 */
// versioning/merge/mergeValidator.js
// DEPENDS ON: vcMergeLayerCycleDetector, vcMergeDuplicateWireDetector
// MUST LOAD BEFORE: versioning/merge/threeWayMerge.js

var vcMergeValidator = (function() {

  /**
   * Validates a candidate graph snapshot for structural correctness.
   * @param {Object} candidateSnapshot — the merged snapshot
   * @returns {{ok: boolean, errors: string[]}}
   */
  function validate(candidateSnapshot) {
    var errors = [];

    if (!candidateSnapshot || !candidateSnapshot.graph) {
      errors.push('No graph in candidate snapshot');
      return { ok: false, errors: errors };
    }

    var graph = candidateSnapshot.graph;
    var nodes = graph.nodes || {};
    var wires = graph.wires || {};

    // Validate all wire endpoints exist
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.fromNode && !nodes[w.fromNode]) {
        errors.push('Wire ' + wid + ' references missing fromNode: ' + w.fromNode);
      }
      if (w.toNode && !nodes[w.toNode]) {
        errors.push('Wire ' + wid + ' references missing toNode: ' + w.toNode);
      }
    }

    // Check for layer cycle
    var layerCycles = vcMergeLayerCycleDetector.detect(nodes, wires);
    for (var lci = 0; lci < layerCycles.length; lci++) {
      errors.push('Layer cycle detected: ' + layerCycles[lci]);
    }

    // Check for duplicate semantic wires
    var dupWires = vcMergeDuplicateWireDetector.detect(wires);
    for (var dpi = 0; dpi < dupWires.length; dpi++) {
      errors.push('Duplicate semantic wire: ' + dupWires[dpi]);
    }

    // Check for wires referencing ports that don't exist on nodes
    for (var wid2 in wires) {
      if (!wires.hasOwnProperty(wid2)) continue;
      var w2 = wires[wid2];
      if (w2.fromNode && w2.fromPort) {
        var fromNode = nodes[w2.fromNode];
        if (fromNode && fromNode.ports && !_hasPort(fromNode.ports, w2.fromPort)) {
          errors.push('Wire ' + wid2 + ' fromPort ' + w2.fromPort + ' not found on node ' + w2.fromNode);
        }
      }
      if (w2.toNode && w2.toPort) {
        var toNode = nodes[w2.toNode];
        if (toNode && toNode.ports && !_hasPort(toNode.ports, w2.toPort)) {
          errors.push('Wire ' + wid2 + ' toPort ' + w2.toPort + ' not found on node ' + w2.toNode);
        }
      }
    }

    return { ok: errors.length === 0, errors: errors };
  }

  function _hasPort(ports, portId) {
    for (var i = 0; i < ports.length; i++) {
      if (ports[i].id === portId) return true;
    }
    return false;
  }

  return {
    validate: validate
  };

})();
