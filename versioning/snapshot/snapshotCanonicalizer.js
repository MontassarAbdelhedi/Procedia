/**
 * Snapshot canonicalizer — produces deterministic, sort-stable graph snapshots.
 * Recursively sorts object keys lexically and sorts unordered arrays.
 * Ensures identical graphs produce identical serialized output regardless of
 * insertion order.
 * @module vcCanonicalizer
 * @dependencies none
 */
// versioning/snapshot/snapshotCanonicalizer.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/snapshot/snapshotSerializer.js

var vcCanonicalizer = (function() {

  /**
   * Recursively sorts all object keys lexically.
   * Preserves array order (arrays are assumed ordered).
   * @param {*} value
   * @returns {*} canonized value
   */
  function canonicalize(value) {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      var arr = [];
      for (var i = 0; i < value.length; i++) {
        arr.push(canonicalize(value[i]));
      }
      return arr;
    }
    var keys = [];
    for (var k in value) {
      if (value.hasOwnProperty(k)) {
        keys.push(k);
      }
    }
    keys.sort();
    var obj = {};
    for (var ki = 0; ki < keys.length; ki++) {
      var key = keys[ki];
      obj[key] = canonicalize(value[key]);
    }
    return obj;
  }

  /**
   * Canonicalizes a full snapshots graph object:
   * - Nodes map sorted by node UUID
   * - Wires map sorted by wire UUID
   * - Groups/notes sorted by UUID
   * - All nested objects key-sorted
   * @param {Object} graph
   * @returns {Object} sorted graph object
   */
  function canonicalizeGraph(graph) {
    if (!graph) return graph;

    var result = {};

    if (graph.nodes) {
      var sortedNodes = {};
      var nodeIds = [];
      for (var nid in graph.nodes) {
        if (graph.nodes.hasOwnProperty(nid)) nodeIds.push(nid);
      }
      nodeIds.sort();
      for (var ni = 0; ni < nodeIds.length; ni++) {
        sortedNodes[nodeIds[ni]] = canonicalize(graph.nodes[nodeIds[ni]]);
      }
      result.nodes = sortedNodes;
    }

    if (graph.wires) {
      var sortedWires = {};
      var wireIds = [];
      for (var wid in graph.wires) {
        if (graph.wires.hasOwnProperty(wid)) wireIds.push(wid);
      }
      wireIds.sort();
      for (var wi = 0; wi < wireIds.length; wi++) {
        sortedWires[wireIds[wi]] = canonicalize(graph.wires[wireIds[wi]]);
      }
      result.wires = sortedWires;
    }

    if (graph.groups) {
      var sortedGroups = {};
      var groupIds = [];
      for (var gid in graph.groups) {
        if (graph.groups.hasOwnProperty(gid)) groupIds.push(gid);
      }
      groupIds.sort();
      for (var gi = 0; gi < groupIds.length; gi++) {
        sortedGroups[groupIds[gi]] = canonicalize(graph.groups[groupIds[gi]]);
      }
      result.groups = sortedGroups;
    }

    if (graph.notes) {
      var sortedNotes = {};
      var noteIds = [];
      for (var nid2 in graph.notes) {
        if (graph.notes.hasOwnProperty(nid2)) noteIds.push(nid2);
      }
      noteIds.sort();
      for (var nni = 0; nni < noteIds.length; nni++) {
        sortedNotes[noteIds[nni]] = canonicalize(graph.notes[noteIds[nni]]);
      }
      result.notes = sortedNotes;
    }

    if (graph.metadata) {
      result.metadata = canonicalize(graph.metadata);
    }

    return result;
  }

  return {
    canonicalize: canonicalize,
    canonicalizeGraph: canonicalizeGraph
  };

})();
