/**
 * Three-way merge engine — pure JavaScript, no AE or UI dependencies.
 * Performs a real three-way merge: base → ours, base → theirs → merged result.
 *
 * Uses field-level merge rules for properties, entity-level rules for
 * additions/deletions, and produces a candidate snapshot + structured conflicts.
 * @module vcThreeWayMerge
 * @dependencies vcRepositoryStore, vcConflictFactory, vcSemanticDiff
 */
// versioning/merge/threeWayMerge.js
// DEPENDS ON: versioning/repositoryStore.js,
//             versioning/merge/conflictFactory.js, versioning/merge/mergeBase.js,
//             versioning/diff/semanticDiff.js
// MUST LOAD AFTER: versioning/merge/conflictFactory.js, versioning/merge/mergeBase.js
// MUST LOAD BEFORE: versioning/merge/mergeValidator.js

var vcThreeWayMerge = (function() {

  var cf = vcConflictFactory;

  /**
   * Performs a full three-way merge between source and target branches.
   * @param {string} sourceBranchId — "theirs"
   * @param {string} targetBranchId — "ours" (current)
   * @returns {{ok, code, candidateSnapshot, conflicts, summary}}
   */
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

    // Find merge base
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

    // Handle fast-forward and already-merged cases
    if (baseResult.code === 'target_is_ancestor') {
      return {
        ok: true, code: 'already_merged', candidateSnapshot: oursSnap, conflicts: [],
        summary: { nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0, wiresAdded: 0, wiresRemoved: 0, wiresChanged: 0 }
      };
    }
    if (baseResult.code === 'source_is_ancestor') {
      return {
        ok: true, code: 'fast_forward', candidateSnapshot: theirsSnap, conflicts: [],
        summary: _diffSummary(baseSnap, theirsSnap)
      };
    }

    // Perform actual three-way merge
    var mergedGraph = {
      nodes: {},
      wires: {},
      groups: _mergeGenericCollection(baseSnap.graph.groups, oursSnap.graph.groups, theirsSnap.graph.groups),
      notes: _mergeGenericCollection(baseSnap.graph.notes, oursSnap.graph.notes, theirsSnap.graph.notes),
      metadata: _mergeMetadata(baseSnap.graph.metadata, oursSnap.graph.metadata, theirsSnap.graph.metadata)
    };

    var allConflicts = [];

    // Merge nodes
    var nodeResult = _mergeNodes(
      baseSnap.graph.nodes || {}, oursSnap.graph.nodes || {}, theirsSnap.graph.nodes || {}
    );
    mergedGraph.nodes = nodeResult.nodes;
    allConflicts = allConflicts.concat(nodeResult.conflicts);

    // Merge wires
    var wireResult = _mergeWires(
      baseSnap.graph.wires || {}, oursSnap.graph.wires || {}, theirsSnap.graph.wires || {},
      mergedGraph.nodes
    );
    mergedGraph.wires = wireResult.wires;
    allConflicts = allConflicts.concat(wireResult.conflicts);

    // Build candidate snapshot
    var candidateSnapshot = {
      id: 'SNAP-merge-candidate-' + Date.now(),
      graphSchemaVersion: baseSnap.graphSchemaVersion || 1,
      checksum: '',
      graph: mergedGraph
    };

    // Compute summary from diffs
    var diffSummaryBase = _diffSummary(baseSnap, { graph: mergedGraph });

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

  // ---- Node merge rules ----

  function _mergeNodes(baseNodes, oursNodes, theirsNodes) {
    var result = {};
    var conflicts = [];

    var allIds = _unionKeys(baseNodes, oursNodes, theirsNodes);

    for (var i = 0; i < allIds.length; i++) {
      var nid = allIds[i];
      var inBase = baseNodes.hasOwnProperty(nid);
      var inOurs = oursNodes.hasOwnProperty(nid);
      var inTheirs = theirsNodes.hasOwnProperty(nid);

      if (!inBase) {
        // Added on zero, one, or both sides
        if (inOurs && !inTheirs) {
          // Only in ours — include it
          result[nid] = oursNodes[nid];
        } else if (!inOurs && inTheirs) {
          // Only in theirs — include it
          result[nid] = theirsNodes[nid];
        } else if (inOurs && inTheirs) {
          // Added on both sides — same UUID
          if (oursNodes[nid].type !== theirsNodes[nid].type) {
            // Different types added with same UUID — conflict
            conflicts.push(cf.typeChangeConflict('node', nid, null, oursNodes[nid].type, theirsNodes[nid].type));
            result[nid] = oursNodes[nid]; // default to ours
          } else {
            // Same type — field-level merge
            var addMerge = _mergeFields(baseNodes[nid] || {}, oursNodes[nid], theirsNodes[nid]);
            result[nid] = addMerge.merged;
            for (var ac = 0; ac < addMerge.conflicts.length; ac++) conflicts.push(addMerge.conflicts[ac]);
          }
        }
        // Not in either — shouldn't happen
      } else if (inOurs && !inTheirs) {
        // Deleted on theirs, present in ours
        if (JSON.stringify(oursNodes[nid]) !== JSON.stringify(baseNodes[nid])) {
          // Ours modified it AND theirs deleted it → DELETE_MODIFY
          conflicts.push(cf.deleteModifyConflict('node', nid));
          // Include ours version as default
          result[nid] = oursNodes[nid];
        } else {
          // Ours unchanged, theirs deleted → delete it
          // Don't include in result
        }
      } else if (!inOurs && inTheirs) {
        // Deleted on ours, present in theirs
        if (JSON.stringify(theirsNodes[nid]) !== JSON.stringify(baseNodes[nid])) {
          // Theirs modified it AND ours deleted it → DELETE_MODIFY
          conflicts.push(cf.deleteModifyConflict('node', nid));
          // Include theirs version as default
          result[nid] = theirsNodes[nid];
        } else {
          // Theirs unchanged, ours deleted → delete it
        }
      } else if (!inOurs && !inTheirs) {
        // Deleted on both sides → delete it
      } else {
        // Present in all three — field-level merge
        if (oursNodes[nid].type !== theirsNodes[nid].type) {
          conflicts.push(cf.typeChangeConflict('node', nid, baseNodes[nid].type, oursNodes[nid].type, theirsNodes[nid].type));
          result[nid] = oursNodes[nid]; // default to ours
        } else {
          var fieldMerge = _mergeFields(baseNodes[nid], oursNodes[nid], theirsNodes[nid]);
          result[nid] = fieldMerge.merged;
          for (var fc = 0; fc < fieldMerge.conflicts.length; fc++) conflicts.push(fieldMerge.conflicts[fc]);
        }
      }
    }

    return { nodes: result, conflicts: conflicts };
  }

  // ---- Wire merge rules ----

  function _mergeWires(baseWires, oursWires, theirsWires, mergedNodes) {
    var result = {};
    var conflicts = [];

    var allIds = _unionKeys(baseWires, oursWires, theirsWires);

    for (var i = 0; i < allIds.length; i++) {
      var wid = allIds[i];
      var inBase = baseWires.hasOwnProperty(wid);
      var inOurs = oursWires.hasOwnProperty(wid);
      var inTheirs = theirsWires.hasOwnProperty(wid);

      if (!inBase) {
        if (inOurs && !inTheirs) {
          result[wid] = oursWires[wid];
        } else if (!inOurs && inTheirs) {
          result[wid] = theirsWires[wid];
        } else if (inOurs && inTheirs) {
          // Added on both sides — check if semantically identical
          var oursKey = vcSemanticDiff.wireSemanticKey(oursWires[wid]);
          var theirsKey = vcSemanticDiff.wireSemanticKey(theirsWires[wid]);
          if (oursKey === theirsKey) {
            result[wid] = oursWires[wid];
          } else {
            // Different connections with same UUID → include ours, conflict
            result[wid] = oursWires[wid];
            conflicts.push(cf.wireEndpointConflict(wid, ['semantic'], oursKey, null, theirsKey));
          }
        }
      } else if (inOurs && !inTheirs) {
        if (JSON.stringify(oursWires[wid]) !== JSON.stringify(baseWires[wid])) {
          conflicts.push(cf.deleteModifyConflict('wire', wid));
          result[wid] = oursWires[wid];
        }
        // else: ours unchanged, theirs deleted → delete
      } else if (!inOurs && inTheirs) {
        if (JSON.stringify(theirsWires[wid]) !== JSON.stringify(baseWires[wid])) {
          conflicts.push(cf.deleteModifyConflict('wire', wid));
          result[wid] = theirsWires[wid];
        }
      } else if (!inOurs && !inTheirs) {
        // deleted on both sides
      } else {
        var wireMerge = _mergeFields(baseWires[wid], oursWires[wid], theirsWires[wid]);
        result[wid] = wireMerge.merged;
        for (var wc = 0; wc < wireMerge.conflicts.length; wc++) conflicts.push(wireMerge.conflicts[wc]);
      }
    }

    return { wires: result, conflicts: conflicts };
  }

  // ---- Generic collection merge ----

  function _mergeGenericCollection(baseCol, oursCol, theirsCol) {
    var result = {};
    var allIds = _unionKeys(baseCol || {}, oursCol || {}, theirsCol || {});
    for (var i = 0; i < allIds.length; i++) {
      var gid = allIds[i];
      var inBase = (baseCol || {}).hasOwnProperty(gid);
      var inOurs = (oursCol || {}).hasOwnProperty(gid);
      var inTheirs = (theirsCol || {}).hasOwnProperty(gid);

      if (!inBase && inOurs && !inTheirs) { result[gid] = oursCol[gid]; }
      else if (!inBase && !inOurs && inTheirs) { result[gid] = theirsCol[gid]; }
      else if (!inBase && inOurs && inTheirs) { result[gid] = oursCol[gid]; }
      else if (inBase && inOurs && inTheirs) {
        var m = _mergeFields((baseCol || {})[gid], oursCol[gid], theirsCol[gid]);
        result[gid] = m.merged;
      } else if (inBase && inOurs && !inTheirs) {} // deleted on theirs
      else if (inBase && !inOurs && inTheirs) {} // deleted on ours
    }
    return result;
  }

  // ---- Field-level merge ----

  function _mergeFields(base, ours, theirs) {
    var merged = {};
    var conflicts = [];

    var allKeys = _unionKeys(base, ours, theirs);

    for (var i = 0; i < allKeys.length; i++) {
      var key = allKeys[i];
      var baseVal = base ? base[key] : undefined;
      var oursVal = ours ? ours[key] : undefined;
      var theirsVal = theirs ? theirs[key] : undefined;

      var oursChanged = !_deepEqual(baseVal, oursVal);
      var theirsChanged = !_deepEqual(baseVal, theirsVal);

      if (!oursChanged && !theirsChanged) {
        // Both unchanged — use base value
        if (baseVal !== undefined) merged[key] = baseVal;
      } else if (oursChanged && !theirsChanged) {
        // Only ours changed — use ours
        if (oursVal !== undefined) merged[key] = oursVal;
      } else if (!oursChanged && theirsChanged) {
        // Only theirs changed — use theirs
        if (theirsVal !== undefined) merged[key] = theirsVal;
      } else {
        // Both changed — check if it's a sub-object we can recursively merge
        if (typeof baseVal === 'object' && typeof oursVal === 'object' && typeof theirsVal === 'object' &&
            baseVal !== null && oursVal !== null && theirsVal !== null &&
            !Array.isArray(baseVal) && !Array.isArray(oursVal) && !Array.isArray(theirsVal)) {
          // Recursively merge sub-object (e.g., props)
          var subMerge = _mergeFields(baseVal, oursVal, theirsVal);
          merged[key] = subMerge.merged;
          for (var sc = 0; sc < subMerge.conflicts.length; sc++) {
            var subC = subMerge.conflicts[sc];
            subC.path = [key].concat(subC.path);
            conflicts.push(subC);
          }
        } else if (_deepEqual(oursVal, theirsVal)) {
          // Same change — use it
          if (oursVal !== undefined) merged[key] = oursVal;
        } else {
          // Different changes — conflict
          var isLayout = (key === 'position' || key === 'size' || key === 'collapsed');
          if (isLayout) {
            merged[key] = oursVal;
            conflicts.push(cf.layoutConflict('node', ours.id, [key], oursVal, theirsVal));
          } else if (key === 'note' || key === 'label') {
            merged[key] = oursVal;
            conflicts.push(cf.propertyConflict('node', ours.id, [key], baseVal, oursVal, theirsVal, 'blocking'));
          } else {
            conflicts.push(cf.propertyConflict('node', ours.id, [key], baseVal, oursVal, theirsVal, 'blocking'));
            // Default to ours
            merged[key] = oursVal;
          }
        }
      }
    }

    return { merged: merged, conflicts: conflicts };
  }

  // ---- Metadata merge ----

  function _mergeMetadata(baseMeta, oursMeta, theirsMeta) {
    var m = _mergeGenericCollection({ meta: baseMeta || {} }, { meta: oursMeta || {} }, { meta: theirsMeta || {} });
    return m.meta || {};
  }

  // ---- Helpers ----

  function _unionKeys(a, b, c) {
    var set = {};
    for (var k in a) { if (a.hasOwnProperty(k)) set[k] = true; }
    for (var k2 in b) { if (b.hasOwnProperty(k2)) set[k2] = true; }
    for (var k3 in c) { if (c.hasOwnProperty(k3)) set[k3] = true; }
    var keys = [];
    for (var ks in set) { if (set.hasOwnProperty(ks)) keys.push(ks); }
    keys.sort();
    return keys;
  }

  function _deepEqual(a, b) {
    if (a === b) return true;
    if (a === undefined && b === undefined) return true;
    if (a === undefined || b === undefined) return false;
    if (typeof a !== typeof b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function _diffSummary(fromSnap, toSnap) {
    var diff = vcSemanticDiff.diff(fromSnap, toSnap);
    return diff.summary;
  }

  return {
    merge: merge
  };

})();
