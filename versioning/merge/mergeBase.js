/**
 * Merge-base selection — finds the best common ancestor of two revisions
 * in the repository's revision DAG. Pure JS, no AE or UI dependencies.
 * @module vcMergeBase
 * @dependencies vcRepositoryStore
 */
// versioning/merge/mergeBase.js
// DEPENDS ON: versioning/repositoryStore.js
// MUST LOAD BEFORE: versioning/merge/threeWayMerge.js

var vcMergeBase = (function() {

  /**
   * Finds the best common ancestor of two revisions.
   * Returns the common ancestor with greatest generation and shortest combined distance.
   * @param {string} sourceRevId
   * @param {string} targetRevId
   * @returns {{ok: boolean, mergeBaseId: string|null, code: string|null, distanceSource: number, distanceTarget: number}}
   */
  function findMergeBase(sourceRevId, targetRevId) {
    var store = vcRepositoryStore;
    if (sourceRevId === targetRevId) {
      return { ok: true, mergeBaseId: sourceRevId, code: 'identical', distanceSource: 0, distanceTarget: 0 };
    }

    // Collect ancestors from source with distances
    var sourceAncestors = _collectAncestors(sourceRevId, 0);

    // Collect ancestors from target with distances
    var targetAncestors = _collectAncestors(targetRevId, 0);

    // Target is ancestor of source — already merged
    if (sourceAncestors[targetRevId] !== undefined) {
      return { ok: true, mergeBaseId: targetRevId, code: 'target_is_ancestor', distanceSource: sourceAncestors[targetRevId], distanceTarget: 0 };
    }

    // Source is ancestor of target — fast-forward
    if (targetAncestors[sourceRevId] !== undefined) {
      return { ok: true, mergeBaseId: sourceRevId, code: 'source_is_ancestor', distanceSource: 0, distanceTarget: targetAncestors[sourceRevId] };
    }

    // Find common ancestors
    var commonIds = [];
    for (var sid in sourceAncestors) {
      if (sourceAncestors.hasOwnProperty(sid) && targetAncestors.hasOwnProperty(sid)) {
        commonIds.push(sid);
      }
    }

    if (commonIds.length === 0) {
      return { ok: false, mergeBaseId: null, code: 'no_common_ancestor', distanceSource: -1, distanceTarget: -1 };
    }

    if (commonIds.length === 1) {
      return {
        ok: true,
        mergeBaseId: commonIds[0],
        code: null,
        distanceSource: sourceAncestors[commonIds[0]],
        distanceTarget: targetAncestors[commonIds[0]]
      };
    }

    // Select best: greatest generation, shortest combined distance
    var best = null;
    var bestGen = -1;
    var bestDist = Infinity;

    for (var ci = 0; ci < commonIds.length; ci++) {
      var cid = commonIds[ci];
      var rev = store.getRevision(cid);
      if (!rev) continue;
      var gen = rev.generation;
      var dist = sourceAncestors[cid] + targetAncestors[cid];

      if (gen > bestGen || (gen === bestGen && dist < bestDist)) {
        best = cid;
        bestGen = gen;
        bestDist = dist;
      }
    }

    // Detect ambiguous merge base
    var ambiguous = false;
    for (var cj = 0; cj < commonIds.length; cj++) {
      var cid2 = commonIds[cj];
      if (cid2 === best) continue;
      var rev2 = store.getRevision(cid2);
      if (!rev2) continue;
      if (rev2.generation === bestGen && (sourceAncestors[cid2] + targetAncestors[cid2]) === bestDist) {
        ambiguous = true;
        break;
      }
    }

    if (ambiguous) {
      return { ok: false, mergeBaseId: best, code: 'ambiguous_merge_base', distanceSource: sourceAncestors[best], distanceTarget: targetAncestors[best] };
    }

    return {
      ok: true,
      mergeBaseId: best,
      code: null,
      distanceSource: sourceAncestors[best],
      distanceTarget: targetAncestors[best]
    };
  }

  /**
   * Collects all ancestor revision IDs with their distance from the starting revision.
   * BFS traversal of the DAG.
   * @param {string} startRevId
   * @param {number} maxDepth — safety limit, default 200
   * @returns {Object<string, number>} ancestor ID → distance
   */
  function _collectAncestors(startRevId, maxDepth) {
    maxDepth = maxDepth || 200;
    var store = vcRepositoryStore;
    var visited = {};
    var queue = [{ id: startRevId, dist: 0 }];
    visited[startRevId] = 0;

    while (queue.length > 0) {
      var current = queue.shift();
      if (current.dist >= maxDepth) continue;

      var rev = store.getRevision(current.id);
      if (!rev) continue;

      for (var pi = 0; pi < rev.parentIds.length; pi++) {
        var parentId = rev.parentIds[pi];
        if (visited[parentId] === undefined) {
          visited[parentId] = current.dist + 1;
          queue.push({ id: parentId, dist: current.dist + 1 });
        }
      }
    }

    return visited;
  }

  return {
    findMergeBase: findMergeBase
  };

})();
