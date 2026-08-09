/**
 * Structural conflict factories — entity existence and type mismatches.
 * @module vcConflictFactoryStructural
 * @dependencies vcConflictFactoryShared
 */
// versioning/merge/conflictFactory/structuralConflicts.js
// DEPENDS ON: versioning/merge/conflictFactory/shared.js
// MUST LOAD BEFORE: versioning/merge/conflictFactory.js

var vcConflictFactoryStructural = (function() {

  var shared = vcConflictFactoryShared;

  /**
   * Creates a delete-vs-modify conflict.
   */
  function deleteModifyConflict(entityType, entityId) {
    return {
      id: shared._nextId(),
      code: 'DELETE_MODIFY',
      entityType: entityType,
      entityId: entityId,
      path: [],
      baseValue: null,
      oursValue: null,
      theirsValue: null,
      severity: 'blocking',
      allowedResolutions: ['ours', 'theirs'],
      resolution: null,
      resolvedValue: null
    };
  }

  /**
   * Creates a type-change conflict.
   */
  function typeChangeConflict(entityType, entityId, baseType, oursType, theirsType) {
    return {
      id: shared._nextId(),
      code: 'TYPE_CHANGE',
      entityType: entityType,
      entityId: entityId,
      path: ['type'],
      baseValue: baseType,
      oursValue: oursType,
      theirsValue: theirsType,
      severity: 'blocking',
      allowedResolutions: ['ours', 'theirs'],
      resolution: null,
      resolvedValue: null
    };
  }

  /**
   * Creates a wire-endpoint conflict.
   */
  function wireEndpointConflict(wireId, path, baseValue, oursValue, theirsValue) {
    return {
      id: shared._nextId(),
      code: 'WIRE_ENDPOINT',
      entityType: 'wire',
      entityId: wireId,
      path: path,
      baseValue: baseValue,
      oursValue: oursValue,
      theirsValue: theirsValue,
      severity: 'blocking',
      allowedResolutions: ['ours', 'theirs'],
      resolution: null,
      resolvedValue: null
    };
  }

  return {
    deleteModifyConflict: deleteModifyConflict,
    typeChangeConflict: typeChangeConflict,
    wireEndpointConflict: wireEndpointConflict
  };

})();
