/**
 * @fileoverview Cloner full-rebuild phase (ES3-safe).
 * Removes all existing CLONER- layers, finds the disabled source,
 * and creates fresh clone layers from the new transform data.
 * REQUIRES: clonerUtils.jsx
 * Load BEFORE: clonerUpdate.jsx
 * Exports: _rebuildClonerClones
 */
// cloner/rebuildClones.jsx — Cloner full rebuild (ES3-safe)
// REQUIRES: clonerUtils.jsx

/**
 * Tear-down old clone layers and create new ones from transform data.
 * @param {CompItem} internComp - The internal cloner comp.
 * @param {Object} newTransformData - { instances: Array<{p, s, r, o}> }
 * @return {number} Total clone count created.
 */
function _rebuildClonerClones(internComp, newTransformData) {
  // 1. Remove old clones (layers with CLONER- comment)
  for (var rk = internComp.numLayers; rk >= 1; rk--) {
    var RL = internComp.layer(rk);
    if (RL.comment.indexOf('CLONER-') === 0) {
      RL.remove();
    }
  }

  // 2. Find source layer (disabled, not the data layer)
  var srcLayer = null;
  for (var sk = 1; sk <= internComp.numLayers; sk++) {
    var SL = internComp.layer(sk);
    if (SL.enabled === false && SL.name !== '__PROCEDIA_CL_DATA__') {
      srcLayer = SL;
      break;
    }
  }

  // 3. Create new clones
  var ai;
  for (ai = 0; ai < newTransformData.instances.length; ai++) {
    var clone = srcLayer.duplicate();
    clone.enabled = true;
    clone.comment = 'CLONER-' + ai;
    var at = newTransformData.instances[ai];
    _setLayerTransform(clone, at.p, at.s, at.r, at.o);
  }

  return newTransformData.instances.length;
}
