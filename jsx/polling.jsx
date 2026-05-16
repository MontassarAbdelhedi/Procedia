// jsx/polling.jsx
// DEPENDS ON: jsx/json.jsx
// Commands: pollAliveNodes
// ES3 — var only, named functions, for loops, string concat

// ─── pollAliveNodes ───────────────────────────────────────────────────────────
// Checks whether each UUID in uuidListJSON still exists in the AE project.
// Searches comps first (CompNode), then layers inside all comps (affected nodes).
// Returns an array: [{ uuid, exists, kind, properties }]
//
// kind: 'comp'  → properties has name, width, height, duration, frameRate
// kind: 'layer' → properties has name
// exists: false → node was deleted outside Procedia; panel should show error badge

function pollAliveNodes(uuidListJSON) {
  var result = { ok: false, data: null, error: null };
  try {
    var uuids = JSON.parse(uuidListJSON);
    var proj  = app.project;
    var i, j, k;

    // ── Single pass: build comp map (comment → CompItem) ──────────────────
    var compMap = {};
    for (i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if ((item instanceof CompItem) && item.comment) {
        compMap[item.comment] = item;
      }
    }

    // ── For each UUID: check comp first, then layer scan ──────────────────
    var results = [];
    for (i = 0; i < uuids.length; i++) {
      var uuid = uuids[i];

      // Check comp map.
      if (compMap[uuid]) {
        var comp = compMap[uuid];
        results.push({
          uuid:   uuid,
          exists: true,
          kind:   'comp',
          properties: {
            name:      comp.name,
            width:     comp.width,
            height:    comp.height,
            duration:  comp.duration,
            frameRate: comp.frameRate
          }
        });
        continue;
      }

      // Not a comp — scan layers in all comps (skip reserved comp).
      var foundLayer = false;
      var layerName  = '';
      for (j = 1; j <= proj.numItems; j++) {
        var hostComp = proj.item(j);
        if (!(hostComp instanceof CompItem)) continue;
        if (hostComp.name === '__PROCEDIA_RESERVED__') continue;
        for (k = 1; k <= hostComp.numLayers; k++) {
          var layer = hostComp.layer(k);
          if (layer.comment === uuid) {
            foundLayer = true;
            layerName  = layer.name;
            break;
          }
        }
        if (foundLayer) break;
      }

      if (foundLayer) {
        results.push({
          uuid:   uuid,
          exists: true,
          kind:   'layer',
          properties: { name: layerName }
        });
      } else {
        results.push({
          uuid:   uuid,
          exists: false,
          kind:   null,
          properties: null
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
