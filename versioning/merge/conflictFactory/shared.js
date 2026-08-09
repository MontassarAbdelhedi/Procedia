/**
 * Shared conflict ID counter and generator.
 * Loaded first so all sub-modules can call _nextId().
 * @module vcConflictFactoryShared
 * @dependencies none
 */
// versioning/merge/conflictFactory/shared.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/merge/conflictFactory/propertyConflicts.js,
//                   versioning/merge/conflictFactory/structuralConflicts.js,
//                   versioning/merge/conflictFactory/topologyConflicts.js

var vcConflictFactoryShared = (function() {

  var _conflictCounter = 0;

  function _nextId() {
    _conflictCounter++;
    return 'CONFLICT-' + Date.now() + '-' + _conflictCounter;
  }

  return {
    _nextId: _nextId
  };

})();
