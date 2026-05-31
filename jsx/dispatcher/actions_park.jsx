/**
 * @fileoverview Park/unpark/poll action handlers (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx, actions_comp.jsx (for findOrCreateReservedComp)
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: _handleParkLayer, _handleUnparkLayer, _handleDeleteParkedLayer, _handlePollAliveNodes
 */
// actions_park.jsx — Park/unpark/poll action handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, actions_comp.jsx (for findOrCreateReservedComp)
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

/**
 * Moves a layer from its host comp into the Reserved Comp (parks it).
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, nodeUUID.
 * @return {Object} Result with .ok, .data (parked), .error.
 */
function _handleParkLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var hostComp = findCompByUUID(params.hostingCompUUID);
    if (!hostComp) {
      result.error = 'parkLayer: host comp not found: ' + params.hostingCompUUID;
      return result;
    }
    var layer = null;
    var li;
    if (params.layerUUID) {
      layer = findLayerByUUID(hostComp, params.layerUUID);
    }
    if (!layer && params.nodeUUID) {
      layer = findLayerByUUID(hostComp, params.nodeUUID);
    }
    if (!layer) {
      for (li = 1; li <= hostComp.numLayers; li++) {
        var L = hostComp.layer(li);
        if (params.nodeUUID && L.comment === params.nodeUUID) {
          layer = L;
          break;
        }
        if (params.layerUUID && L.comment === params.layerUUID) {
          layer = L;
          break;
        }
      }
    }
    if (!layer) {
      result.error = 'parkLayer: layer not found in host comp';
      return result;
    }
    var reserved = findOrCreateReservedComp();
    var savedComment = layer.comment;
    layer.copyToComp(reserved);
    var lk;
    for (lk = 1; lk <= reserved.numLayers; lk++) {
      var RL = reserved.layer(lk);
      if (RL.comment === savedComment) { RL.comment = params.nodeUUID; break; }
    }
    layer.remove();
    result.ok = true;
    result.data = { parked: true };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Restores a parked layer from the Reserved Comp back to its host comp.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, nodeUUID.
 * @return {Object} Result with .ok, .data (unparked), .error.
 */
function _handleUnparkLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var reserved = findReservedComp();
    if (!reserved) { result.error = 'unparkLayer: reserved comp not found'; return result; }
    var hostComp = findCompByUUID(params.hostingCompUUID);
    if (!hostComp) { result.error = 'unparkLayer: host comp not found'; return result; }
    var layer = null;
    if (params.layerUUID) {
      layer = findLayerByUUID(reserved, params.layerUUID);
    }
    if (!layer && params.nodeUUID) {
      layer = findLayerByUUID(reserved, params.nodeUUID);
    }
    if (!layer) {
      var lj;
      for (lj = 1; lj <= reserved.numLayers; lj++) {
        var L = reserved.layer(lj);
        if (params.layerUUID && L.comment === params.layerUUID) { layer = L; break; }
        if (params.nodeUUID && L.comment === params.nodeUUID) { layer = L; break; }
      }
    }
    if (!layer) { result.error = 'unparkLayer: layer not found in reserved comp'; return result; }
    layer.copyToComp(hostComp);
    layer.remove();
    if (params.layerUUID) {
      var hostLayer = findLayerByUUID(hostComp, params.nodeUUID);
      if (!hostLayer) hostLayer = findLayerByUUID(hostComp, params.layerUUID);
      if (hostLayer) hostLayer.comment = params.layerUUID;
    }
    result.ok = true;
    result.data = { unparked: true };
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Deletes a parked layer from the Reserved Comp.
 * @param {Object} cmd Command with params: nodeUUID.
 * @return {Object} Result with .ok, .data (deleted), .error.
 */
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
    var layer = findLayerByUUID(reserved, params.nodeUUID);
    if (!layer) {
      var lj;
      for (lj = 1; lj <= reserved.numLayers; lj++) {
        var L2 = reserved.layer(lj);
        if (L2.comment === params.nodeUUID) {
          layer = L2;
          break;
        }
      }
    }
    if (layer) layer.remove();
    result.ok = true;
    result.data = { deleted: !!layer };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Polls the project for which node UUIDs still have live layers.
 * @param {Object} cmd Command with params: uuidListJSON.
 * @return {Object} Result with .ok, .data (present, missing), .error.
 */
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
