/**
 * Semantic diff engine — pure JavaScript module with no UI, DOM, graph-state,
 * bridge, or AE dependencies. Operates on two canonical graph snapshots
 * and returns structured changes.
 * @module vcSemanticDiff
 * @dependencies versioning/diff/semanticDiffUtils.js, versioning/diff/diffCollection.js, versioning/diff/diffObjects.js, versioning/diff/buildSummary.js
 */
// versioning/diff/semanticDiff.js
// DEPENDS ON: versioning/diff/semanticDiffUtils.js, versioning/diff/diffCollection.js, versioning/diff/diffObjects.js, versioning/diff/buildSummary.js
// MUST LOAD BEFORE: versioning/diff/nodeDiff.js, versioning/diff/wireDiff.js

var vcSemanticDiff = vcSemanticDiff || {};

vcSemanticDiff.diff = function(fromSnapshot, toSnapshot) {
  if (!fromSnapshot || !toSnapshot || !fromSnapshot.graph || !toSnapshot.graph) {
    var result = {
      fromSnapshotId: fromSnapshot ? fromSnapshot.id : null,
      toSnapshotId: toSnapshot ? toSnapshot.id : null,
      nodes: { added: [], removed: [], modified: [] },
      wires: { added: [], removed: [], modified: [] },
      groups: { added: [], removed: [], modified: [] },
      notes: { added: [], removed: [], modified: [] },
      metadata: [],
      summary: { nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0, wiresAdded: 0, wiresRemoved: 0, wiresChanged: 0,
        groupsAdded: 0, groupsRemoved: 0, groupsChanged: 0, notesAdded: 0, notesRemoved: 0, notesChanged: 0,
        metadataChanges: 0, totalChanges: 0 }
    };
    return result;
  }

  var fromGraph = fromSnapshot.graph;
  var toGraph = toSnapshot.graph;

  var result = {
    fromSnapshotId: fromSnapshot.id,
    toSnapshotId: toSnapshot.id,
    nodes: vcSemanticDiff._diffCollection(fromGraph.nodes || {}, toGraph.nodes || {}, vcSemanticDiff._diffNode),
    wires: vcSemanticDiff._diffCollection(fromGraph.wires || {}, toGraph.wires || {}, vcSemanticDiff._diffWire),
    groups: vcSemanticDiff._diffCollection(fromGraph.groups || {}, toGraph.groups || {}, vcSemanticDiff._diffGeneric),
    notes: vcSemanticDiff._diffCollection(fromGraph.notes || {}, toGraph.notes || {}, vcSemanticDiff._diffGeneric),
    metadata: vcSemanticDiff._diffMetadata(fromGraph.metadata || {}, toGraph.metadata || {}),
    summary: {}
  };

  result.summary = vcSemanticDiff._buildSummary(result);
  return result;
};

vcSemanticDiff.wireSemanticKey = function(wire) {
  return [wire.type, wire.fromNode, wire.fromPort, wire.toNode, wire.toPort, wire.boundParam || ''].join('|');
};
