/**
 * Duplicate wire detector — finds semantically duplicate wires.
 * Pure JS, no AE or UI dependencies.
 * @module vcMergeDuplicateWireDetector
 * @dependencies none
 */
// versioning/merge/duplicateWireDetector.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/merge/mergeValidator.js

var vcMergeDuplicateWireDetector = (function() {

  /**
   * @param {Object} wires — map of wireId → wire
   * @returns {string[]} duplicate descriptions, empty if none
   */
  function detect(wires) {
    var keys = {};
    var duplicates = [];

    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      var key = [w.type, w.fromNode, w.fromPort, w.toNode, w.toPort, w.boundParam || ''].join('|');
      if (keys[key]) {
        duplicates.push(key + ' (wires: ' + keys[key] + ', ' + wid + ')');
      } else {
        keys[key] = wid;
      }
    }

    return duplicates;
  }

  return {
    detect: detect
  };

})();
