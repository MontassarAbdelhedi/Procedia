// jsx/polling.jsx
// DEPENDS ON: jsx/json.jsx (loaded first in preamble)
// Polls whether alive CompItem nodes still exist in the AE project.

function pollAliveNodes(uuidListJSON) {
  var result = { ok: false, data: null, error: null };
  try {
    var uuids = JSON.parse(uuidListJSON);
    var proj = app.project;

    // Build comment → CompItem map in one pass
    var compMap = {};
    var i;
    for (i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if ((item instanceof CompItem) && item.comment) {
        compMap[item.comment] = item;
      }
    }

    var results = [];
    for (i = 0; i < uuids.length; i++) {
      var uuid = uuids[i];
      var comp = compMap[uuid];
      if (comp) {
        results.push({
          uuid: uuid,
          exists: true,
          properties: {
            name:      comp.name,
            width:     comp.width,
            height:    comp.height,
            duration:  comp.duration,
            frameRate: comp.frameRate
          }
        });
      } else {
        results.push({
          uuid:    uuid,
          exists:  false,
          missing: true
        });
      }
    }

    result.ok   = true;
    result.data = results;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
