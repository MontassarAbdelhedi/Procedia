/**
 * @fileoverview Mask query handler — returns mask names for a given layer.
 * (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 */
// actions_masks.jsx — Mask query handler (ES3-safe)

function _handleGetMasksForLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'getMasksForLayer: comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.layerUUID);
    if (!layer) { result.error = 'getMasksForLayer: layer not found'; return result; }

    var masks = [];
    if (layer.masks && layer.masks.numProperties > 0) {
      for (var mi = 1; mi <= layer.masks.numProperties; mi++) {
        var mask = layer.masks.property(mi);
        masks.push(mask.name);
      }
    }
    result.ok = true;
    result.data = { masks: masks };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
