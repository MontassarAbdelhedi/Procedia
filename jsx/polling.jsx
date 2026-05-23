// jsx/polling.jsx
// DEPENDS ON: jsx/json.jsx, jsx/utils.jsx
// MUST be evaluated after json.jsx and utils.jsx in the evalBridge preamble

function pollAliveNodes(uuidListJSON) {
    var result = { ok: false, data: null, error: null };
    try {
        var uuidList = JSON.parse(uuidListJSON);
        var pollResults = [];

        for (var i = 0; i < uuidList.length; i++) {
            var entry = uuidList[i];
            var uuid  = entry.uuid;
            var kind  = entry.nodeKind;
            var type  = entry.type;

            // Skip non-AE nodes
            if (kind === 'effector' || kind === 'data') continue;

            var found = false;
            var props = null;

            // CompNode — look up as CompItem
            if (kind === 'affected' && type === 'core/comp') {
                var comp = findCompByUUID(uuid);
                if (comp) {
                    found = true;
                    props = {
                        label:    comp.name,
                        width:    comp.width,
                        height:   comp.height,
                        fps:      comp.frameRate,
                        duration: comp.duration
                    };
                }
            } else {
                // Affected layer node — search all comps (skip Reserved)
                var proj = app.project;
                for (var j = 1; j <= proj.numItems; j++) {
                    var item = proj.item(j);
                    if (!(item instanceof CompItem)) continue;
                    if (item.name.indexOf('DO NOT DELETE') === 0) continue;
                    var layer = findLayerByUUID(item, uuid);
                    if (layer) {
                        found = true;
                        props = { label: layer.name };
                        break;
                    }
                }
            }

            pollResults.push({ uuid: uuid, found: found, props: props });
        }

        result.ok   = true;
        result.data = pollResults;
    } catch (e) {
        result.error = 'pollAliveNodes error: ' + e.toString();
    }
    return JSON.stringify(result);
}
