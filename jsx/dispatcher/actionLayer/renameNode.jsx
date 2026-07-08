/**
 * @fileoverview Renames a layer's display name in the hosting comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/renameNode.jsx — Rename node handler (ES3-safe)

function _handleRenameNode(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'renameNode: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'renameNode: layer not found'; return result; }
    layer.name = String(params.label);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
