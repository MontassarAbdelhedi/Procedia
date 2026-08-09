/**
 * Property-level conflict factories.
 * @module vcConflictFactoryProperties
 * @dependencies vcConflictFactoryShared
 */
// versioning/merge/conflictFactory/propertyConflicts.js
// DEPENDS ON: versioning/merge/conflictFactory/shared.js
// MUST LOAD BEFORE: versioning/merge/conflictFactory.js

var vcConflictFactoryProperties = (function() {

  var shared = vcConflictFactoryShared;

  /**
   * Creates a property-vs-property conflict.
   */
  function propertyConflict(entityType, entityId, path, baseValue, oursValue, theirsValue, severity) {
    return {
      id: shared._nextId(),
      code: 'PROPERTY_PROPERTY',
      entityType: entityType,
      entityId: entityId,
      path: path,
      baseValue: baseValue,
      oursValue: oursValue,
      theirsValue: theirsValue,
      severity: severity || 'blocking',
      allowedResolutions: ['ours', 'theirs'],
      resolution: null,
      resolvedValue: null
    };
  }

  /**
   * Creates a layout conflict (non-blocking).
   */
  function layoutConflict(entityType, entityId, path, oursValue, theirsValue) {
    return {
      id: shared._nextId(),
      code: 'LAYOUT',
      entityType: entityType,
      entityId: entityId,
      path: path,
      baseValue: null,
      oursValue: oursValue,
      theirsValue: theirsValue,
      severity: 'warning',
      allowedResolutions: ['ours', 'theirs'],
      resolution: 'ours',
      resolvedValue: oursValue
    };
  }

  return {
    propertyConflict: propertyConflict,
    layoutConflict: layoutConflict
  };

})();
