// jsx/nodeLifeCycle/nodeKeyframes.jsx
// ES3 - var only, named functions, for loops, string concat
// DEPENDS ON: jsx/json.jsx, jsx/persistence.jsx

// ── Keyframe helpers ───────────────────────────────────────────────────────

// Serialise the keyframes of a single AE property into a plain array.
// Supports number values and array values (Position, Scale, etc.).
// TextDocument and other complex types are skipped gracefully.
function readPropKeyframes(prop) {
  var kfs = [];
  for (var k = 1; k <= prop.numKeys; k++) {
    var val = prop.keyValue(k);
    var serialized;
    if (val instanceof Array) {
      var arr = [];
      for (var ai = 0; ai < val.length; ai++) arr.push(val[ai]);
      serialized = arr;
    } else if (typeof val === 'number') {
      serialized = val;
    } else {
      continue; // skip TextDocument, MarkerValue, etc.
    }
    kfs.push({ time: prop.keyTime(k), value: serialized });
  }
  return kfs;
}

// Walk the ADBE Transform Group and collect any properties that have keyframes.
function readLayerKeyframes(layer) {
  var keyframes = {};
  var transform = layer.property('ADBE Transform Group');
  if (!transform) return keyframes;

  var tProps = [
    'ADBE Anchor Point',
    'ADBE Position',
    'ADBE Scale',
    'ADBE Rotate Z',
    'ADBE Opacity'
  ];
  for (var ti = 0; ti < tProps.length; ti++) {
    var prop = null;
    try { prop = transform.property(tProps[ti]); } catch (e) {}
    if (prop && prop.numKeys > 0) {
      var kfs = readPropKeyframes(prop);
      if (kfs.length > 0) {
        keyframes['ADBE Transform Group/' + tProps[ti]] = kfs;
      }
    }
  }
  return keyframes;
}

// Read the keyframes stored on a ghost entry in dataLayer (written by makeNodeGhost).
// Returns the keyframes object, or null if the ghost entry has none.
function readGhostKeyframes(uuid) {
  var reserved = findReservedComp();
  if (!reserved) return null;
  var dataLyr = findLayerByName(reserved, '__PROCEDIA_DATA__');
  if (!dataLyr) return null;
  var data = JSON.parse(readLayerText(dataLyr));
  for (var g = 0; g < data.ghost.length; g++) {
    if (data.ghost[g].id === uuid) {
      return data.ghost[g].keyframes || null;
    }
  }
  return null;
}

// Apply a keyframes object (from readLayerKeyframes) back onto a freshly-created layer.
function applyLayerKeyframes(layer, keyframes) {
  for (var path in keyframes) {
    if (!keyframes.hasOwnProperty(path)) continue;
    var parts = path.split('/');
    if (parts.length !== 2) continue;
    var group = null;
    try { group = layer.property(parts[0]); } catch (e) {}
    if (!group) continue;
    var prop = null;
    try { prop = group.property(parts[1]); } catch (e) {}
    if (!prop) continue;
    var kfs = keyframes[path];
    for (var k = 0; k < kfs.length; k++) {
      try { prop.setValueAtTime(kfs[k].time, kfs[k].value); } catch (ke) {}
    }
  }
}
