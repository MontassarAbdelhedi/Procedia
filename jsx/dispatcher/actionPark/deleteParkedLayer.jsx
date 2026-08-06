/**
 * @fileoverview Deletes a parked layer from the Reserved Comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx (for findReservedComp)
 * Load BEFORE: dispatcher.jsx
 */
// actionPark/deleteParkedLayer.jsx — Delete parked layer handler (ES3-safe)

function _handleDeleteParkedLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var reserved = findReservedComp();
    if (!reserved) {
      result.ok = true;
      result.data = { deleted: false };
      return result;
    }
    var found = false;
    var lj;
    for (lj = reserved.numLayers; lj >= 1; lj--) {
      var L2 = reserved.layer(lj);
      if (L2.name === params.nodeUUID || L2.comment === params.nodeUUID) {
        L2.remove();
        found = true;
      }
    }
    result.ok = true;
    result.data = { deleted: found };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
