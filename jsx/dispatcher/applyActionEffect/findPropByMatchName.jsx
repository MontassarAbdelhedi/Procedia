/**
 * @fileoverview Finds a property on an AE effect by matchName. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// applyActionEffect/findPropByMatchName.jsx — Property lookup helper (ES3-safe)

function _findPropByMatchName(effect, matchName) {
  var pi;
  for (pi = 1; pi <= effect.numProperties; pi++) {
    var p = effect.property(pi);
    if (p.matchName === matchName) return p;
  }
  return null;
}
