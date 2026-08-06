/**
 * @fileoverview Polls the project for which node UUIDs still have live layers. (ES3-safe)
 * REQUIRES: json.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionPark/pollAliveNodes.jsx — Poll alive nodes handler (ES3-safe)

function _handlePollAliveNodes(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var uuidList = JSON.parse(params.uuidListJSON || '[]');
    var present = [];
    var missing = [];
    var proj = app.project;
    var i, ci;
    for (i = 0; i < uuidList.length; i++) {
      var uid = uuidList[i];
      var found = false;
      for (ci = 1; ci <= proj.numItems; ci++) {
        var item = proj.item(ci);
        if (!(item instanceof CompItem)) continue;
        if (item.name.indexOf('DO NOT DELETE') === 0) continue;
        var li;
        for (li = 1; li <= item.numLayers; li++) {
          var layer = item.layer(li);
          if (layer.comment === uid) { found = true; break; }
        }
        if (found) break;
      }
      if (found) { present.push(uid); } else { missing.push(uid); }
    }
    result.ok = true;
    result.data = { present: present, missing: missing };
  } catch (e) { result.error = e.toString(); }
  return result;
}
