/**
 * Three-way merge engine hub — delegates to sub-modules and exposes
 * the public merge API. Pure JS, no AE or UI dependencies.
 * @module vcThreeWayMerge
 * @dependencies vcThreeWayMergeHelpers, vcThreeWayMergeFieldMerge,
 *               vcThreeWayMergeCollection, vcThreeWayMergeNodeMerge,
 *               vcThreeWayMergeWireMerge, vcRepositoryStore, vcMergeBase,
 *               vcConflictFactory
 */
// versioning/merge/threeWayMerge.js
// DEPENDS ON: versioning/merge/threeWayMerge/helpers.js,
//             versioning/merge/threeWayMerge/fieldMerge.js,
//             versioning/merge/threeWayMerge/collectionMerge.js,
//             versioning/merge/threeWayMerge/nodeMerge.js,
//             versioning/merge/threeWayMerge/wireMerge.js,
//             versioning/repositoryStore.js, versioning/merge/mergeBase.js,
//             versioning/merge/conflictFactory.js

var vcThreeWayMerge = (function() {

  var helpers = vcThreeWayMergeHelpers;
  var coll = vcThreeWayMergeCollection;
  var nodeMerge = vcThreeWayMergeNodeMerge;
  var wireMerge = vcThreeWayMergeWireMerge;
  var cf = vcConflictFactory;

  function merge(sourceBranchId, targetBranchId) {
    var store = vcRepositoryStore;
    var sourceBranch = store.getBranch(sourceBranchId);
    var targetBranch = store.getBranch(targetBranchId);
    if (!sourceBranch) return { ok: false, code: 'source_branch_not_found', candidateSnapshot: null, conflicts: [], summary: null };
    if (!targetBranch) return { ok: false, code: 'target_branch_not_found', candidateSnapshot: null, conflicts: [], summary: null };

    var sourceHeadId = sourceBranch.headRevisionId;
    var targetHeadId = targetBranch.headRevisionId;
    if (!sourceHeadId) return { ok: false, code: 'source_branch_no_head', candidateSnapshot: null, conflicts: [], summary: null };
    if (!targetHeadId) return { ok: false, code: 'target_branch_no_head', candidateSnapshot: null, conflicts: [], summary: null };

    var baseResult = vcMergeBase.findMergeBase(sourceHeadId, targetHeadId);
    if (!baseResult.ok) {
      return { ok: false, code: baseResult.code || 'merge_base_failed', candidateSnapshot: null, conflicts: [], summary: null };
    }

    var baseRev = store.getRevision(baseResult.mergeBaseId);
    var sourceRev = store.getRevision(sourceHeadId);
    var targetRev = store.getRevision(targetHeadId);

    var baseSnap = store.getSnapshot(baseRev.snapshotId);
    var oursSnap = store.getSnapshot(targetRev.snapshotId);
    var theirsSnap = store.getSnapshot(sourceRev.snapshotId);

    if (!baseSnap || !oursSnap || !theirsSnap) {
      return { ok: false, code: 'snapshot_not_found', candidateSnapshot: null, conflicts: [], summary: null };
    }

    if (baseResult.code === 'target_is_ancestor') {
      return {
        ok: true, code: 'already_merged', candidateSnapshot: oursSnap, conflicts: [],
        summary: { nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0, wiresAdded: 0, wiresRemoved: 0, wiresChanged: 0 }
      };
    }
    if (baseResult.code === 'source_is_ancestor') {
      return {
        ok: true, code: 'fast_forward', candidateSnapshot: theirsSnap, conflicts: [],
        summary: helpers._diffSummary(baseSnap, theirsSnap)
      };
    }

    var mergedGraph = {
      nodes: {},
      wires: {},
      groups: coll._mergeGenericCollection(baseSnap.graph.groups, oursSnap.graph.groups, theirsSnap.graph.groups),
      notes: coll._mergeGenericCollection(baseSnap.graph.notes, oursSnap.graph.notes, theirsSnap.graph.notes),
      metadata: coll._mergeMetadata(baseSnap.graph.metadata, oursSnap.graph.metadata, theirsSnap.graph.metadata)
    };

    var allConflicts = [];

    var nodeResult = nodeMerge._mergeNodes(
      baseSnap.graph.nodes || {}, oursSnap.graph.nodes || {}, theirsSnap.graph.nodes || {}
    );
    mergedGraph.nodes = nodeResult.nodes;
    allConflicts = allConflicts.concat(nodeResult.conflicts);

    var wireResult = wireMerge._mergeWires(
      baseSnap.graph.wires || {}, oursSnap.graph.wires || {}, theirsSnap.graph.wires || {},
      mergedGraph.nodes
    );
    mergedGraph.wires = wireResult.wires;
    allConflicts = allConflicts.concat(wireResult.conflicts);

    var candidateSnapshot = {
      id: 'SNAP-merge-candidate-' + Date.now(),
      graphSchemaVersion: baseSnap.graphSchemaVersion || 1,
      checksum: '',
      graph: mergedGraph
    };

    var diffSummaryBase = helpers._diffSummary(baseSnap, { graph: mergedGraph });

    return {
      ok: true,
      code: 'merge',
      candidateSnapshot: candidateSnapshot,
      conflicts: allConflicts,
      summary: diffSummaryBase,
      baseSnapshotId: baseSnap.id,
      oursSnapshotId: oursSnap.id,
      theirsSnapshotId: theirsSnap.id
    };
  }

  return {
    merge: merge
  };

})();
