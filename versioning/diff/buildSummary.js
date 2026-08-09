/**
 * Builds a change summary and provides metadata diff helper.
 * @module vcSemanticDiff
 * @dependencies versioning/diff/diffObjects.js
 */
// versioning/diff/buildSummary.js
// DEPENDS ON: versioning/diff/diffObjects.js
// MUST LOAD BEFORE: versioning/diff/semanticDiff.js

var vcSemanticDiff = vcSemanticDiff || {};

vcSemanticDiff._diffMetadata = function(fromMeta, toMeta) {
  return vcSemanticDiff._diffObjects(fromMeta, toMeta, []);
};

vcSemanticDiff._buildSummary = function(diff) {
  return {
    nodesAdded: diff.nodes.added.length,
    nodesRemoved: diff.nodes.removed.length,
    nodesChanged: diff.nodes.modified.length,
    wiresAdded: diff.wires.added.length,
    wiresRemoved: diff.wires.removed.length,
    wiresChanged: diff.wires.modified.length,
    groupsAdded: diff.groups.added.length,
    groupsRemoved: diff.groups.removed.length,
    groupsChanged: diff.groups.modified.length,
    notesAdded: diff.notes.added.length,
    notesRemoved: diff.notes.removed.length,
    notesChanged: diff.notes.modified.length,
    metadataChanges: diff.metadata.length,
    totalChanges: diff.nodes.added.length + diff.nodes.removed.length + diff.nodes.modified.length +
      diff.wires.added.length + diff.wires.removed.length + diff.wires.modified.length +
      diff.groups.added.length + diff.groups.removed.length + diff.groups.modified.length +
      diff.notes.added.length + diff.notes.removed.length + diff.notes.modified.length +
      diff.metadata.length
  };
};
