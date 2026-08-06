/**
 * @fileoverview Cloner clone-population phase (ES3-safe).
 * Computes clone transforms and creates clone layers inside the internal comp.
 * REQUIRES: clonerTransforms.jsx, clonerUtils.jsx
 * Load BEFORE: cloner.jsx
 * Exports: _populateClonerClones
 */
// cloner/populateClones.jsx — Cloner clone population (ES3-safe)
// REQUIRES: clonerTransforms.jsx, clonerUtils.jsx

/**
 * Computes transforms, creates clone layers, moves source to bottom.
 * @param {CompItem} internComp
 * @param {Layer|null} internSrcLayer
 * @param {string} mode
 * @param {Object} props
 * @return {Object} { transformData, cloneUUIDs }
 */
function _populateClonerClones(internComp, internSrcLayer, mode, props) {
  var transformData = _computeClonerTransforms(mode, props);

  var cloneUUIDs = [];
  var i;
  for (i = 0; i < transformData.instances.length; i++) {
    var clonedLayer = null;
    if (internSrcLayer) {
      internSrcLayer.copyToComp(internComp);
      clonedLayer = internComp.layer(1);
    } else {
      // Fallback: duplicating from first layer in comp
      var firstLayer = internComp.layer(1);
      firstLayer.duplicate();
      clonedLayer = internComp.layer(1);
    }
    if (clonedLayer) {
      clonedLayer.enabled = true;
      clonedLayer.comment = 'CLONER-' + i;

      var t = transformData.instances[i];
      _setLayerTransform(clonedLayer, t.p, t.s, t.r, t.o);
      cloneUUIDs.push(clonedLayer.comment);
    }
  }

  // Keep source layer invisible at the bottom
  if (internSrcLayer) {
    internSrcLayer.moveToEnd();
    internSrcLayer.enabled = false;
  }

  return { transformData: transformData, cloneUUIDs: cloneUUIDs };
}
