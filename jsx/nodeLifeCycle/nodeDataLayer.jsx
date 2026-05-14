// jsx/nodeLifeCycle/nodeDataLayer.jsx
// ES3 - var only, named functions, for loops, string concat
// DEPENDS ON: jsx/json.jsx, jsx/persistence.jsx

// ── DataLayer helpers ──────────────────────────────────────────────────────

// Removes uuid from ghost list → adds to project[hostingCompUUID].nodes.
// For CompNode, creates project[uuid] entry directly.
function updateDataLayerOnAlive(uuid, nodeType, hostingCompUUID, props) {
  var reserved = findReservedComp();
  if (!reserved) return;

  reserved.locked = false;
  var dataLyr = findLayerByName(reserved, '__PROCEDIA_DATA__');
  if (!dataLyr) { reserved.locked = true; return; }

  dataLyr.locked = false;
  var data = JSON.parse(readLayerText(dataLyr));

  // Remove from ghost list
  var newGhost = [];
  for (var g = 0; g < data.ghost.length; g++) {
    if (data.ghost[g].id !== uuid) newGhost.push(data.ghost[g]);
  }
  data.ghost = newGhost;

  if (!data.project) data.project = {};

  if (nodeType === 'core/comp') {
    if (!data.project[uuid]) {
      data.project[uuid] = {
        type: 'core/comp', state: 'alive',
        properties: props, layerOrder: [], nodes: {}
      };
    } else {
      data.project[uuid].state      = 'alive';
      data.project[uuid].properties = props;
    }
  } else {
    if (!data.project[hostingCompUUID]) {
      data.project[hostingCompUUID] = {
        type: 'core/comp', state: 'alive',
        properties: {}, layerOrder: [], nodes: {}
      };
    }
    if (!data.project[hostingCompUUID].nodes) data.project[hostingCompUUID].nodes = {};
    data.project[hostingCompUUID].nodes[uuid] = {
      type: nodeType, state: 'alive',
      properties: props, keyframes: {}
    };
    var order = data.project[hostingCompUUID].layerOrder || [];
    var inOrder = false;
    for (var lo = 0; lo < order.length; lo++) {
      if (order[lo] === uuid) { inOrder = true; break; }
    }
    if (!inOrder) order.push(uuid);
    data.project[hostingCompUUID].layerOrder = order;
  }

  writeLayerText(dataLyr, JSON.stringify(data));
  dataLyr.locked = true;
  reserved.locked = true;
}

// Removes uuid from ALL project comp trees → adds back to ghost list.
// Scanning all comps handles nodes that were alive in multiple comps at once.
function updateDataLayerOnGhost(uuid, hostingCompUUID, keyframes) {
  var reserved = findReservedComp();
  if (!reserved) return;

  reserved.locked = false;
  var dataLyr = findLayerByName(reserved, '__PROCEDIA_DATA__');
  if (!dataLyr) { reserved.locked = true; return; }

  dataLyr.locked = false;
  var data = JSON.parse(readLayerText(dataLyr));

  // Remove from every comp entry that contains this uuid
  var nodeType = 'unknown';
  if (data.project) {
    for (var compKey in data.project) {
      if (!data.project.hasOwnProperty(compKey)) continue;
      var compEntry = data.project[compKey];
      if (compEntry.nodes && compEntry.nodes[uuid]) {
        nodeType = compEntry.nodes[uuid].type || nodeType;
        delete compEntry.nodes[uuid];
        var newOrder = [];
        for (var lo = 0; lo < (compEntry.layerOrder || []).length; lo++) {
          if (compEntry.layerOrder[lo] !== uuid) newOrder.push(compEntry.layerOrder[lo]);
        }
        compEntry.layerOrder = newOrder;
      }
    }
  }

  // Add/update ghost list entry
  var found = false;
  for (var g = 0; g < data.ghost.length; g++) {
    if (data.ghost[g].id === uuid) {
      data.ghost[g].keyframes = keyframes;
      found = true;
      break;
    }
  }
  if (!found) {
    data.ghost.push({ id: uuid, type: nodeType, keyframes: keyframes });
  }

  writeLayerText(dataLyr, JSON.stringify(data));
  dataLyr.locked = true;
  reserved.locked = true;
}
