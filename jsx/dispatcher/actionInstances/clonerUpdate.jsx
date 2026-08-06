/**
 * @fileoverview Cloner update handler (ES3-safe).
 * Updates clone transforms from property changes using delta updates,
 * with full rebuild on mode changes. REQUIRES: json.jsx, clonerTransforms.jsx, clonerUtils.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleUpdateCloner
 */
// actionInstances/clonerUpdate.jsx — Cloner update handler (ES3-safe)
// REQUIRES: json.jsx, clonerTransforms.jsx, clonerUtils.jsx

/**
 * Updates clone transforms from property changes. Reads stored JSON,
 * recomputes transforms, and applies only deltas — no full rebuild.
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

    // Read stored JSON from text layer
    var jsonLayer = null;
    for (var jk = 1; jk <= internComp.numLayers; jk++) {
      var JL = internComp.layer(jk);
      if (JL instanceof TextLayer && JL.name === '__PROCEDIA_CL_DATA__') {
        jsonLayer = JL;
        break;
      }
    }
    if (!jsonLayer) { result.error = 'updateCloner: JSON text layer not found'; return result; }

    var jsonText = jsonLayer.property('ADBE Text Properties').property('ADBE Text Document').value;
    var storedData = JSON.parse(jsonText.toString());
    if (!storedData) { result.error = 'updateCloner: failed to parse JSON'; return result; }

    var key = params.key;
    var value = params.value;
    var mode = params.mode || 'Linear';
    var props = params.props || {};

    var needsRebuild = false;

    if (key === 'mode') {
      needsRebuild = true;
    }

    if (needsRebuild) {
      // Full rebuild: remove old clone layers, create new ones
      var newTransformData = _computeClonerTransforms(mode, props);

      // Remove old clones (layers with CLONER- comment)
      for (var rk = internComp.numLayers; rk >= 1; rk--) {
        var RL = internComp.layer(rk);
        if (RL.comment.indexOf('CLONER-') === 0) {
          RL.remove();
        }
      }

      // Find source layer (disabled, at bottom)
      var srcLayer = null;
      for (var sk = 1; sk <= internComp.numLayers; sk++) {
        var SL = internComp.layer(sk);
        if (SL.enabled === false && SL.name !== '__PROCEDIA_CL_DATA__') {
          srcLayer = SL;
          break;
        }
      }

      // Create new clones
      var ai;
      for (ai = 0; ai < newTransformData.instances.length; ai++) {
        var clone = srcLayer.duplicate();
        clone.enabled = true;
        clone.comment = 'CLONER-' + ai;
        var at = newTransformData.instances[ai];
        _setLayerTransform(clone, at.p, at.s, at.r, at.o);
      }

      // Update JSON
      var newJson = _buildClonerJson(params.nodeUUID, mode, newTransformData, props);
      jsonLayer.property('ADBE Text Properties').property('ADBE Text Document').setValue(newJson);

      result.ok = true;
      result.data = { rebuilt: true, cloneCount: newTransformData.instances.length };
      return result;
    }

    // Non-mode change: recompute and apply deltas
    var newTransformData = _computeClonerTransforms(mode, props);
    var oldInstances = storedData.instances || [];
    var newInstances = newTransformData.instances || [];
    var changed = 0;

    // Handle count changes
    if (newInstances.length < oldInstances.length) {
      // Remove excess clone layers
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

    if (newInstances.length > oldInstances.length) {
      // Add new clone layers
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

    // Apply delta transforms to existing clones
    var di;
    for (di = 0; di < newInstances.length; di++) {
      if (di >= oldInstances.length) break;
      var nt = newInstances[di];
      var ot = oldInstances[di];
      if (nt.p[0] !== ot.p[0] || nt.p[1] !== ot.p[1] ||
          nt.s[0] !== ot.s[0] || nt.s[1] !== ot.s[1] ||
          nt.r !== ot.r || nt.o !== ot.o) {
        // Find the clone layer
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

    // Update JSON
    var updatedJson = _buildClonerJson(params.nodeUUID, mode, newTransformData, props);
    jsonLayer.property('ADBE Text Properties').property('ADBE Text Document').setValue(updatedJson);

    result.ok = true;
    result.data = { updated: newInstances.length, changed: changed };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
