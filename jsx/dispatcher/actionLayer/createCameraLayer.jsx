/**
 * @fileoverview Creates a camera layer in the hosting comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/createCameraLayer.jsx — Create camera layer handler (ES3-safe)

function _handleCreateCameraLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) {
      result.error = 'createCameraLayer: host comp not found: ' + params.hostingCompUUID;
      return result;
    }
    var cameraLayer = comp.layers.addCamera(params.label || 'Camera', [comp.width, comp.height]);
    if (params.layerUUID) {
      cameraLayer.comment = params.layerUUID;
    }
    if (params.label) {
      cameraLayer.name = params.label;
    }
    if (params.position && params.position.length === 3) {
      try { cameraLayer.position.setValue(params.position); } catch (e) {}
    }
    if (params.rotation !== undefined && params.rotation !== null) {
      try { cameraLayer.rotation.setValue(params.rotation); } catch (e) {}
    }
    if (params.opacity !== undefined && params.opacity !== null) {
      try { cameraLayer.opacity.setValue(params.opacity); } catch (e) {}
    }
    if (params.zoom !== undefined && params.zoom !== null) {
      try { cameraLayer.zoom.setValue(params.zoom); } catch (e) {}
    }
    if (params.depthOfField !== undefined && params.depthOfField !== null) {
      try { cameraLayer.depthOfField = params.depthOfField; } catch (e) {}
    }
    if (params.focusDistance !== undefined && params.focusDistance !== null) {
      try { cameraLayer.focusDistance.setValue(params.focusDistance); } catch (e) {}
    }
    if (params.aperture !== undefined && params.aperture !== null) {
      try { cameraLayer.aperture.setValue(params.aperture); } catch (e) {}
    }
    if (params.blurLevel !== undefined && params.blurLevel !== null) {
      try { cameraLayer.blurLevel.setValue(params.blurLevel); } catch (e) {}
    }
    result.ok = true;
    result.data = { layerName: cameraLayer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
