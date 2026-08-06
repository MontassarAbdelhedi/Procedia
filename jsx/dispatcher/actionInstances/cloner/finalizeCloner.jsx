/**
 * @fileoverview Cloner finalization phase (ES3-safe).
 * Writes the JSON state text layer and adds the internal comp as a
 * pre-comp layer in the host comp. REQUIRES: clonerUtils.jsx
 * Load BEFORE: cloner.jsx
 * Exports: _finalizeCloner
 */
// cloner/finalizeCloner.jsx — Cloner finalization (ES3-safe)
// REQUIRES: clonerUtils.jsx

/**
 * Writes JSON state layer and adds pre-comp to host at original position.
 * @param {CompItem} hostComp
 * @param {CompItem} internComp
 * @param {string} nodeUUID
 * @param {string} layerNodeUUID
 * @param {number} srcIndex
 * @param {string} mode
 * @param {Object} transformData
 * @param {Object} props
 */
function _finalizeCloner(hostComp, internComp, nodeUUID, layerNodeUUID, srcIndex, mode, transformData, props) {
  // Write JSON state into a hidden text layer
  var jsonStr = _buildClonerJson(nodeUUID, mode, transformData, props);
  var textLayer = internComp.layers.addText('__PROCEDIA_CL_DATA__');
  textLayer.property('ADBE Text Properties').property('ADBE Text Document').setValue(jsonStr);
  textLayer.enabled = false;
  textLayer.guideLayer = true;

  // Add internal comp as pre-comp layer in host comp at original position
  var precompLayer = hostComp.layers.add(internComp);
  if (precompLayer) {
    precompLayer.comment = layerNodeUUID;
    var targetIdx = srcIndex > 0 ? hostComp.numLayers - srcIndex + 1 : 1;
    if (targetIdx > 0 && targetIdx <= hostComp.numLayers) {
      precompLayer.moveToBeginning();
    }
  }
}
