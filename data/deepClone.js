/**
 * Fast deep clone for JSON-safe data shapes (objects, arrays, primitives).
 * Avoids the overhead of JSON.parse(JSON.stringify(obj)) which allocates
 * intermediate strings and is O(n) in memory for the serialized form.
 *
 * @param {*} val - Value to deep clone (must be JSON-safe)
 * @returns {*} Deep-cloned copy
 */
// data/deepClone.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/undoManager/state.js, graph/engine/helpers.js, graph/engine/propagate.js

window.__procedia_internal.deepClone = function deepClone(val) {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    var arr = [];
    for (var i = 0; i < val.length; i++) {
      arr.push(deepClone(val[i]));
    }
    return arr;
  }
  var obj = {};
  for (var k in val) {
    if (val.hasOwnProperty(k)) {
      obj[k] = deepClone(val[k]);
    }
  }
  return obj;
};
