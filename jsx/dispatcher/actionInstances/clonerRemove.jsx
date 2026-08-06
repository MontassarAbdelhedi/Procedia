/**
 * @fileoverview Cloner remove handler (ES3-safe).
 * Removes the pre-comp layer, recovers the source, deletes the internal comp.
 * REQUIRES: json.jsx, utils.jsx, actions_comp.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleRemoveCloner
 */
// actionInstances/clonerRemove.jsx — Cloner remove handler (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, actions_comp.jsx

/**
 * Removes the pre-comp layer, recovers the source, deletes the internal comp.
 * @param {Object} cmd Command with params: nodeUUID, hostingCompUUID, layerNodeUUID.
 * @return {Object} Result with .ok, .data, .error.
 */
function _handleRemoveCloner(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    if (!params.nodeUUID)        { result.error = 'removeCloner: nodeUUID required'; return result; }
    if (!params.hostingCompUUID) { result.error = 'removeCloner: hostingCompUUID required'; return result; }
    if (!params.layerNodeUUID)   { result.error = 'removeCloner: layerNodeUUID required'; return result; }

    var hostComp = findCompByUUID(params.hostingCompUUID);
    if (!hostComp) { result.error = 'removeCloner: host comp not found'; return result; }

    // Find pre-comp layer by terminal wire UUID stamp
    var precompLayer = findLayerByUUID(hostComp, params.layerNodeUUID);
    var precompIndex = 0;
    if (precompLayer) {
      for (var pi = 1; pi <= hostComp.numLayers; pi++) {
        if (hostComp.layer(pi).comment === params.layerNodeUUID) { precompIndex = pi; break; }
      }
      precompLayer.remove();
    }

    // Find internal comp
    var internComp = findCompByUUID(params.nodeUUID);
    if (!internComp) { result.error = 'removeCloner: internal comp not found'; return result; }

    // Find and re-enable source layer (it's disabled at the bottom)
    var srcLayer = null;
    for (var ik = 1; ik <= internComp.numLayers; ik++) {
      var IL = internComp.layer(ik);
      if (IL.enabled === false && IL.comment.indexOf('CLONER-') !== 0) {
        srcLayer = IL;
        break;
      }
    }
    if (!srcLayer) {
      // Fallback: try first disabled layer at end
      for (var ik2 = internComp.numLayers; ik2 >= 1; ik2--) {
        var IL2 = internComp.layer(ik2);
        if (IL2.enabled === false && IL2.name !== '__PROCEDIA_CL_DATA__') {
          srcLayer = IL2;
          break;
        }
      }
    }

    if (srcLayer) {
      srcLayer.enabled = true;
      // Move back to host comp
      srcLayer.copyToComp(hostComp);
      var restoredLayer = null;
      for (var hk = 1; hk <= hostComp.numLayers; hk++) {
        var HL = hostComp.layer(hk);
        if (HL.comment === '' || HL.comment === '') {
          var sameName = false;
          for (var ck = 1; ck <= internComp.numLayers; ck++) {
            if (internComp.layer(ck).name === HL.name && HL.comment === '') {
              sameName = true;
              break;
            }
          }
          if (sameName) {
            HL.comment = params.layerNodeUUID;
            restoredLayer = HL;
            break;
          }
        }
      }
      // Fallback: just find by matching the source layer's original comment
      if (!restoredLayer) {
        for (var hk2 = 1; hk2 <= hostComp.numLayers; hk2++) {
          var HL2 = hostComp.layer(hk2);
          if (HL2.name === srcLayer.name && HL2.comment === '') {
            HL2.comment = params.layerNodeUUID;
            restoredLayer = HL2;
            break;
          }
        }
      }
    }

    // Delete internal comp
    internComp.remove();

    result.ok = true;
    result.data = { removed: true };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
