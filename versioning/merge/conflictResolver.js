/**
 * Conflict resolver — applies user-chosen resolutions to merge conflicts
 * and produces an updated candidate snapshot. Pure JS.
 * @module vcConflictResolver
 * @dependencies vcConflictFactory
 */
// versioning/merge/conflictResolver.js
// DEPENDS ON: (none)
// MUST LOAD AFTER: versioning/merge/conflictFactory.js

var vcConflictResolver = (function() {

  /**
   * Resolves a single conflict by applying the chosen resolution.
   * Modifies the candidate graph in-place.
   * @param {Object} conflict — the conflict to resolve
   * @param {string} resolution — 'ours', 'theirs', or 'custom'
   * @param {*} customValue — optional custom value
   * @param {Object} candidateGraph — the merged graph (mutated in place)
   * @param {Object} oursGraph — our snapshot's graph
   * @param {Object} theirsGraph — their snapshot's graph
   * @returns {{ok: boolean, error: string|null}}
   */
  function resolveConflict(conflict, resolution, customValue, candidateGraph, oursGraph, theirsGraph) {
    if (!conflict) return { ok: false, error: 'No conflict provided' };
    if (!conflict.allowedResolutions || conflict.allowedResolutions.indexOf(resolution) === -1) {
      return { ok: false, error: 'Resolution ' + resolution + ' not allowed for conflict ' + conflict.code };
    }

    conflict.resolution = resolution;

    if (resolution === 'ours') {
      conflict.resolvedValue = conflict.oursValue;
      _applyValue(candidateGraph, oursGraph, conflict);
    } else if (resolution === 'theirs') {
      conflict.resolvedValue = conflict.theirsValue;
      _applyValue(candidateGraph, theirsGraph, conflict);
    } else if (resolution === 'custom') {
      conflict.resolvedValue = customValue;
      if (conflict.entityType && conflict.entityId && conflict.path.length > 0) {
        _setValueAtPath(candidateGraph, conflict.entityType, conflict.entityId, conflict.path, customValue);
      }
    }

    return { ok: true, error: null };
  }

  /**
   * Applies a value from a source graph to the candidate graph.
   */
  function _applyValue(candidateGraph, sourceGraph, conflict) {
    if (!conflict.entityType || !conflict.entityId) return;

    var sourceCollection = null;
    var targetCollection = null;

    if (conflict.entityType === 'node') {
      sourceCollection = sourceGraph ? sourceGraph.nodes : null;
      targetCollection = candidateGraph.nodes;
    } else if (conflict.entityType === 'wire') {
      sourceCollection = sourceGraph ? sourceGraph.wires : null;
      targetCollection = candidateGraph.wires;
    }

    if (!sourceCollection || !targetCollection) return;

    if (conflict.code === 'DELETE_MODIFY') {
      // delete-modify: applying 'ours' keeps the entity, 'theirs' removes it
      if (conflict.resolution === 'theirs') {
        delete targetCollection[conflict.entityId];
      }
      // 'ours' keeps it as-is (already in candidate)
    } else {
      // For entity removal (theirs deleted it), ensure entity exists in candidate
      if (conflict.path.length === 0) {
        // Full entity replacement — copy from source
        if (sourceCollection[conflict.entityId] && conflict.resolution === 'ours') {
          targetCollection[conflict.entityId] = sourceCollection[conflict.entityId];
        }
      } else if (conflict.path.length > 0) {
        // Set specific field
        _setValueAtPath(candidateGraph, conflict.entityType, conflict.entityId, conflict.path, conflict.resolvedValue);
      }
    }
  }

  /**
   * Sets a value deep within a graph entity by path.
   */
  function _setValueAtPath(candidateGraph, entityType, entityId, path, value) {
    var collection = null;
    if (entityType === 'node') collection = candidateGraph.nodes;
    else if (entityType === 'wire') collection = candidateGraph.wires;
    else if (entityType === 'group') collection = candidateGraph.groups;
    else if (entityType === 'note') collection = candidateGraph.notes;
    else return;

    if (!collection[entityId]) return;
    var obj = collection[entityId];
    for (var i = 0; i < path.length - 1; i++) {
      if (!obj[path[i]]) obj[path[i]] = {};
      obj = obj[path[i]];
    }
    obj[path[path.length - 1]] = value;
  }

  /**
   * Resolves multiple conflicts at once.
   * @returns {{ok, errors: string[]}}
   */
  function resolveConflicts(conflicts, resolutions, candidateGraph, oursGraph, theirsGraph) {
    var errors = [];
    var resolutionMap = {};
    for (var ri = 0; ri < resolutions.length; ri++) {
      resolutionMap[resolutions[ri].conflictId] = resolutions[ri];
    }

    for (var ci = 0; ci < conflicts.length; ci++) {
      var c = conflicts[ci];
      var res = resolutionMap[c.id];
      if (res) {
        var result = resolveConflict(c, res.resolution, res.customValue, candidateGraph, oursGraph, theirsGraph);
        if (!result.ok) errors.push('Conflict ' + c.id + ': ' + result.error);
      }
    }

    return { ok: errors.length === 0, errors: errors };
  }

  /**
   * Checks whether there are unresolved blocking conflicts remaining.
   */
  function hasUnresolvedConflicts(conflicts) {
    for (var i = 0; i < conflicts.length; i++) {
      if (conflicts[i].severity === 'blocking' && conflicts[i].resolution === null) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns counts of conflict types.
   */
  function getConflictCounts(conflicts) {
    var counts = { blocking: 0, warning: 0, total: 0 };
    for (var i = 0; i < conflicts.length; i++) {
      counts.total++;
      if (conflicts[i].severity === 'blocking') counts.blocking++;
      else counts.warning++;
    }
    return counts;
  }

  return {
    resolveConflict: resolveConflict,
    resolveConflicts: resolveConflicts,
    hasUnresolvedConflicts: hasUnresolvedConflicts,
    getConflictCounts: getConflictCounts
  };

})();
