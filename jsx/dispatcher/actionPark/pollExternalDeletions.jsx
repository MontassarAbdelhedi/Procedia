/**
 * @fileoverview Checks which comp node UUIDs have had their AE CompItem deleted
 * outside of Procedia (e.g. user deleted a comp directly in AE). (ES3-safe)
 * Layer nodes are handled by pollAliveNodes (which matches wire path UUIDs).
 * REQUIRES: json.jsx, utils.jsx (for findCompByUUID)
 * Load BEFORE: dispatcher.jsx
 */
// actionPark/pollExternalDeletions.jsx — Poll external deletions handler (ES3-safe)

function _handlePollExternalDeletions(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var compUUIDs = params.compNodeUUIDs || [];
    var missingCompNodeUUIDs = [];
    var i;

    for (i = 0; i < compUUIDs.length; i++) {
      var comp = findCompByUUID(compUUIDs[i]);
      if (!comp) missingCompNodeUUIDs.push(compUUIDs[i]);
    }

    result.ok = true;
    result.data = {
      missingCompNodeUUIDs: missingCompNodeUUIDs
    };
  } catch (e) { result.error = e.toString(); }
  return result;
}
