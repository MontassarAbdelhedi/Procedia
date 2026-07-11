/**
 * @fileoverview Sets the Hide Shy Layers toggle on a composition. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/setCompHideShyLayers.jsx — Set comp hideShyLayers handler (ES3-safe)

function _handleSetCompHideShyLayers(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setCompHideShyLayers: host comp not found'; return result; }
    comp.hideShyLayers = (params.hideShyLayers === true);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}