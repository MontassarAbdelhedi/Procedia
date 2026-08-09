/**
 * Snapshot serializer — captures the active Procedia graph into an immutable,
 * canonical, validated snapshot. Reads only through graphState public APIs.
 * @module vcSnapshotSerializer
 * @dependencies vcSnapshotSchema, vcCanonicalizer, vcChecksum
 */
// versioning/snapshot/snapshotSerializer.js
// DEPENDS ON: data/deepClone.js, versioning/snapshot/snapshotSchema.js,
//             versioning/snapshot/snapshotCanonicalizer.js,
//             versioning/snapshot/snapshotChecksum.js,
//             graph/graphState.js
// MUST LOAD AFTER: versioning/snapshot/snapshotSchema.js,
//                  versioning/snapshot/snapshotCanonicalizer.js,
//                  versioning/snapshot/snapshotChecksum.js
// MUST LOAD BEFORE: versioning/repositoryStore.js

var vcSnapshotSerializer = (function() {
  var deepClone = window.__procedia_internal.deepClone;

  function _cloneNode(node) {
    var clone = deepClone(node);
    vcSnapshotSchema.stripNodeRuntimeFields(clone);
    return clone;
  }

  function _cloneWire(wire) {
    var clone = deepClone(wire);
    vcSnapshotSchema.stripWireRuntimeFields(clone);
    return clone;
  }

  /**
   * Captures the complete active graph as a snapshot graph object.
   * Reads only through graphState public APIs.
   * @returns {Object} graph snapshot with nodes, wires, groups, notes, metadata
   */
  function captureGraph() {
    var allNodes = graphState.getAllNodes();
    var allWires = graphState.getAllWires();

    var nodes = {};
    for (var nodeId in allNodes) {
      if (allNodes.hasOwnProperty(nodeId)) {
        nodes[nodeId] = _cloneNode(allNodes[nodeId]);
      }
    }

    var wires = {};
    for (var wireId in allWires) {
      if (allWires.hasOwnProperty(wireId)) {
        wires[wireId] = _cloneWire(allWires[wireId]);
      }
    }

    return {
      nodes: nodes,
      wires: wires,
      groups: {},
      notes: {},
      metadata: {
        graphSchemaVersion: vcSnapshotSchema.CURRENT_GRAPH_SCHEMA_VERSION
      }
    };
  }

  /**
   * Captures and canonicalizes the active graph into a full snapshot object.
   * @returns {Object} { id, graphSchemaVersion, checksum, graph }
   */
  function captureActiveGraph() {
    var rawGraph = captureGraph();
    var canonicalGraph = vcCanonicalizer.canonicalizeGraph(rawGraph);
    var csum = vcChecksum.checksum(canonicalGraph);
    var snapshotId = 'SNAP-' + csum;

    return {
      id: snapshotId,
      graphSchemaVersion: vcSnapshotSchema.CURRENT_GRAPH_SCHEMA_VERSION,
      checksum: csum,
      graph: canonicalGraph
    };
  }

  /**
   * Validates a snapshot object against the schema.
   * @param {Object} snapshot
   * @returns {{ok: boolean, errors: string[]}}
   */
  function validate(snapshot) {
    return vcSnapshotSchema.validateSnapshot(snapshot);
  }

  /**
   * Computes the checksum of an existing snapshot's graph.
   * Used for re-verification and migration.
   * @param {Object} snapshot
   * @returns {string} checksum
   */
  function computeChecksum(snapshot) {
    if (!snapshot || !snapshot.graph) return '';
    var canonicalGraph = vcCanonicalizer.canonicalizeGraph(snapshot.graph);
    return vcChecksum.checksum(canonicalGraph);
  }

  return {
    captureActiveGraph: captureActiveGraph,
    captureGraph: captureGraph,
    validate: validate,
    computeChecksum: computeChecksum
  };

})();
