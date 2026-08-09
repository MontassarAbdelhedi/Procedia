/**
 * Revision service — higher-level revision operations on top of repositoryStore.
 * Handles version creation, history listing, and working-snapshot-to-head comparison.
 * @module vcRevisionService
 * @dependencies vcRepositoryStore, vcSnapshotSerializer
 */
// versioning/revisionService.js
// DEPENDS ON: versioning/repositoryStore.js,
//             versioning/snapshot/snapshotSerializer.js
// MUST LOAD AFTER: versioning/repositoryStore.js
// MUST LOAD BEFORE: versioning/versionControlService.js

var vcRevisionService = (function() {

  var store = vcRepositoryStore;

  /**
   * Creates a new immutable revision (version) from the current working graph.
   * @param {Object} opts — { message, kind?, branchId? }
   * @returns {{ok: boolean, revisionId: string|null, error: string|null}}
   */
  function createVersion(opts) {
    try {
      var branchId = opts.branchId || store.getRepository().activeBranchId;
      var branch = store.getBranch(branchId);
      if (!branch) return { ok: false, revisionId: null, error: 'Branch not found: ' + branchId };

      // Capture current graph
      var snapshot = vcSnapshotSerializer.captureActiveGraph();
      var snapId = store.storeSnapshot(snapshot);

      // Compare with head snapshot
      var headRev = store.getRevision(branch.headRevisionId);
      if (headRev) {
        var headSnap = store.getSnapshot(headRev.snapshotId);
        if (headSnap && headSnap.checksum === snapshot.checksum) {
          return { ok: false, revisionId: null, error: 'No changes since last version' };
        }
      }

      // Compute change summary
      var summary = _computeSummary(branch.headRevisionId, snapId);

      // Create revision
      var revId = store.createRevision({
        message: opts.message || '',
        snapshotId: snapId,
        parentIds: branch.headRevisionId ? [branch.headRevisionId] : [],
        kind: opts.kind || 'user',
        branchId: branchId,
        summary: summary
      });

      // Advance branch head
      store.updateBranchHead(branchId, revId);
      store.updateBranchWorkingSnapshot(branchId, snapId);
      store.setBranchDirty(branchId, false);

      return { ok: true, revisionId: revId, error: null };
    } catch (e) {
      return { ok: false, revisionId: null, error: e.message || String(e) };
    }
  }

  /**
   * Computes a simple change summary between two snapshots.
   * @param {string} fromRevisionId
   * @param {string} toSnapshotId
   * @returns {Object} summary
   */
  function _computeSummary(fromRevisionId, toSnapshotId) {
    var summary = { nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0, wiresAdded: 0, wiresRemoved: 0, wiresChanged: 0 };
    if (!fromRevisionId) return summary;

    var fromRev = store.getRevision(fromRevisionId);
    if (!fromRev) return summary;

    var fromSnap = store.getSnapshot(fromRev.snapshotId);
    var toSnap = store.getSnapshot(toSnapshotId);
    if (!fromSnap || !toSnap) return summary;

    var summary = { nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0, wiresAdded: 0, wiresRemoved: 0, wiresChanged: 0 };

    var fromNodes = fromSnap.graph.nodes || {};
    var toNodes = toSnap.graph.nodes || {};
    var fromWires = fromSnap.graph.wires || {};
    var toWires = toSnap.graph.wires || {};

    for (var nid in toNodes) {
      if (!toNodes.hasOwnProperty(nid)) continue;
      if (!fromNodes[nid]) {
        summary.nodesAdded++;
      } else if (JSON.stringify(toNodes[nid]) !== JSON.stringify(fromNodes[nid])) {
        summary.nodesChanged++;
      }
    }
    for (var nid2 in fromNodes) {
      if (!fromNodes.hasOwnProperty(nid2)) continue;
      if (!toNodes[nid2]) summary.nodesRemoved++;
    }

    for (var wid in toWires) {
      if (!toWires.hasOwnProperty(wid)) continue;
      if (!fromWires[wid]) {
        summary.wiresAdded++;
      } else if (JSON.stringify(toWires[wid]) !== JSON.stringify(fromWires[wid])) {
        summary.wiresChanged++;
      }
    }
    for (var wid2 in fromWires) {
      if (!fromWires.hasOwnProperty(wid2)) continue;
      if (!toWires[wid2]) summary.wiresRemoved++;
    }

    return summary;
  }

  /**
   * Generates a suggested version message based on changes.
   * @param {string} fromRevisionId
   * @param {string} toSnapshotId
   * @returns {string}
   */
  function generateSuggestedMessage(fromRevisionId, toSnapshotId) {
    // Ensure the snapshot is stored so _computeSummary can find it
    var toSnap = store.getSnapshot(toSnapshotId);
    if (!toSnap) {
      var freshSnap = vcSnapshotSerializer.captureActiveGraph();
      toSnapshotId = store.storeSnapshot(freshSnap);
    }
    var summary = _computeSummary(fromRevisionId, toSnapshotId);
    var parts = [];
    if (summary.nodesAdded > 0) parts.push(summary.nodesAdded + ' node' + (summary.nodesAdded !== 1 ? 's' : '') + ' added');
    if (summary.nodesRemoved > 0) parts.push(summary.nodesRemoved + ' node' + (summary.nodesRemoved !== 1 ? 's' : '') + ' removed');
    if (summary.nodesChanged > 0) parts.push(summary.nodesChanged + ' node' + (summary.nodesChanged !== 1 ? 's' : '') + ' changed');
    if (summary.wiresAdded > 0) parts.push(summary.wiresAdded + ' connection' + (summary.wiresAdded !== 1 ? 's' : '') + ' added');
    if (summary.wiresRemoved > 0) parts.push(summary.wiresRemoved + ' connection' + (summary.wiresRemoved !== 1 ? 's' : '') + ' removed');
    if (summary.wiresChanged > 0) parts.push(summary.wiresChanged + ' connection' + (summary.wiresChanged !== 1 ? 's' : '') + ' changed');

    if (parts.length === 0) return 'No changes';
    return 'Updated ' + parts.join(', ');
  }

  /**
   * Lists revisions, optionally filtered by branch.
   * @param {Object} opts — { branchId?, limit?, offset? }
   * @returns {Array} sorted by creation time, newest first
   */
  function listRevisions(opts) {
    opts = opts || {};
    var allRevs = store.getAllRevisions();
    var branchId = opts.branchId || null;

    var list = [];
    for (var rid in allRevs) {
      if (!allRevs.hasOwnProperty(rid)) continue;
      var rev = allRevs[rid];
      if (branchId && rev.branchIdAtCreation !== branchId) continue;
      list.push(rev);
    }

    list.sort(function(a, b) { return b.createdAt - a.createdAt; });

    if (opts.offset) list = list.slice(opts.offset);
    if (opts.limit) list = list.slice(0, opts.limit);

    return list;
  }

  return {
    createVersion: createVersion,
    listRevisions: listRevisions,
    generateSuggestedMessage: generateSuggestedMessage
  };

})();
