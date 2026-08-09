/**
 * @fileoverview Cloner delta-update phase (ES3-safe).
 * Handles count changes (add/remove clone layers) and applies
 * only changed transform properties to surviving clones.
 * REQUIRES: clonerUtils.jsx
 * Load BEFORE: clonerUpdate.jsx
 * Exports: _applyClonerDelta
 */
// cloner/applyDelta.jsx — Cloner delta update (ES3-safe)
// REQUIRES: clonerUtils.jsx

/**
 * Adjusts clone count and applies per-instance transform deltas.
 * @param {CompItem} internComp - The internal cloner comp.
 * @param {Object} newTransformData - { instances: Array<{p, s, r, o}> }
 * @param {Object[]} oldInstances - Previous transform instances from stored JSON.
 * @return {Object} { updated: number, changed: number }
 */
function _applyClonerDelta(internComp, newTransformData, oldInstances) {
  var newInstances = newTransformData.instances || [];
  var changed = 0;

  // 1. Count decreased — remove excess clone layers
  if (newInstances.length < oldInstances.length) {
    for (var xk = internComp.numLayers; xk >= 1; xk--) {
      var XL = internComp.layer(xk);
      if (XL.comment.indexOf('CLONER-') === 0) {
        var cIdx = parseInt(XL.comment.split('-')[1], 10);
        if (isNaN(cIdx) || cIdx >= newInstances.length) {
          XL.remove();
        }
      }
    }
  }

  // 2. Count increased — create additional clone layers
  if (newInstances.length > oldInstances.length) {
    var pSrcLayer = null;
    for (var pk = 1; pk <= internComp.numLayers; pk++) {
      var PL = internComp.layer(pk);
      if (PL.enabled === false && PL.name !== '__PROCEDIA_CL_DATA__') {
        pSrcLayer = PL;
        break;
      }
    }
    if (pSrcLayer) {
      for (var ei = oldInstances.length; ei < newInstances.length; ei++) {
        var eClone = pSrcLayer.duplicate();
        eClone.enabled = true;
        eClone.comment = 'CLONER-' + ei;
        var et = newInstances[ei];
        _setLayerTransform(eClone, et.p, et.s, et.r, et.o);
      }
    }
  }

  // 3. Apply delta transforms to surviving clones
  var di;
  for (di = 0; di < newInstances.length; di++) {
    if (di >= oldInstances.length) break;
    var nt = newInstances[di];
    var ot = oldInstances[di];
    if (nt.p[0] !== ot.p[0] || nt.p[1] !== ot.p[1] ||
        nt.s[0] !== ot.s[0] || nt.s[1] !== ot.s[1] ||
        nt.r !== ot.r || nt.o !== ot.o) {
      for (var ck = 1; ck <= internComp.numLayers; ck++) {
        var CL = internComp.layer(ck);
        if (CL.comment === 'CLONER-' + di) {
          _setLayerTransform(CL, nt.p, nt.s, nt.r, nt.o);
          changed++;
          break;
        }
      }
    }
  }

  return { updated: newInstances.length, changed: changed };
}
