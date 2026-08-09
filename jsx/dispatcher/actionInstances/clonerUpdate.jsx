/**
 * @fileoverview Cloner update orchestrator (ES3-safe).
 * Validates input, resolves the internal comp and data layer, then
 * delegates to either a full rebuild (mode changes) or a delta update.
 * REQUIRES: json.jsx, clonerTransforms.jsx, clonerUtils.jsx,
 *           cloner/findDataLayer.jsx, cloner/rebuildClones.jsx,
 *           cloner/applyDelta.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleUpdateCloner
 */
// actionInstances/clonerUpdate.jsx — Cloner update orchestrator (ES3-safe)
// REQUIRES: json.jsx, clonerTransforms.jsx, clonerUtils.jsx,
//           cloner/findDataLayer.jsx, cloner/rebuildClones.jsx,
//           cloner/applyDelta.jsx

/**
 * Updates clone transforms from property changes.
 * Mode change triggers a full rebuild; all other properties use deltas.
 * @param {Object} cmd Command with params: nodeUUID, key, value, mode, props.
 * @return {Object} Result with .ok, .data, .error.
 */
function _handleUpdateCloner(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    if (!params.nodeUUID) { result.error = 'updateCloner: nodeUUID required'; return result; }

    var internComp = findCompByUUID(params.nodeUUID);
    if (!internComp) { result.error = 'updateCloner: internal comp not found'; return result; }

    var dataInfo = _findClonerDataLayer(internComp);
    if (!dataInfo) { result.error = 'updateCloner: JSON data not found'; return result; }

    var key = params.key;
    var value = params.value;
    var mode = params.mode || 'Linear';
    var props = params.props || {};

    var newTransformData = _computeClonerTransforms(mode, props);

    if (key === 'mode') {
      var cloneCount = _rebuildClonerClones(internComp, newTransformData);

      var newJson = _buildClonerJson(params.nodeUUID, mode, newTransformData, props);
      dataInfo.jsonLayer.property('ADBE Text Properties').property('ADBE Text Document').setValue(newJson);

      result.ok = true;
      result.data = { rebuilt: true, cloneCount: cloneCount };
      return result;
    }

    var oldInstances = dataInfo.storedData.instances || [];
    var deltaResult = _applyClonerDelta(internComp, newTransformData, oldInstances);

    var updatedJson = _buildClonerJson(params.nodeUUID, mode, newTransformData, props);
    dataInfo.jsonLayer.property('ADBE Text Properties').property('ADBE Text Document').setValue(updatedJson);

    result.ok = true;
    result.data = { updated: deltaResult.updated, changed: deltaResult.changed };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
