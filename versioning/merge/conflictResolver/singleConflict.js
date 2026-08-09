/**
 * Single-conflict resolution — applies 'ours', 'theirs', or 'custom'
 * resolution to one conflict, mutating the candidate graph in-place.
 * @module vcConflictResolverSingle
 * @dependencies none
 */
// versioning/merge/conflictResolver/singleConflict.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/merge/conflictResolver.js

var vcConflictResolverSingle = (function() {

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
      if (conflict.resolution === 'theirs') {
        delete targetCollection[conflict.entityId];
      }
    } else {
      if (conflict.path.length === 0) {
        if (sourceCollection[conflict.entityId] && conflict.resolution === 'ours') {
          targetCollection[conflict.entityId] = sourceCollection[conflict.entityId];
        }
      } else if (conflict.path.length > 0) {
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

  return {
    resolveConflict: resolveConflict
  };

})();
