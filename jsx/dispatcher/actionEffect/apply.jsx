/**
 * @fileoverview Effect lifecycle handlers: apply, remove, set property,
 * rename, and enable/disable. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 */
// actionEffect/apply.jsx — Effect CRUD handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _findPropByMatchName(effect, matchName) {
  var pi;
  for (pi = 1; pi <= effect.numProperties; pi++) {
    var p = effect.property(pi);
    if (p.matchName === matchName) return p;
  }
  return null;
}

function _handleApplyDynamicEffect(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'applyDynamicEffect: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'applyDynamicEffect: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'applyDynamicEffect: layer not found'; return result; }
    var effect = layer.Effects.addProperty(params.matchName);
    if (params.nodeUUID) {
      effect.name = params.matchName + '__' + params.nodeUUID;
    }
    if (params.props) {
      for (var pk in params.props) {
        if (!params.props.hasOwnProperty(pk)) continue;
        try {
          var prop = _findPropByMatchName(effect, pk);
          if (prop) prop.setValue(params.props[pk]);
        } catch (propErr) {}
      }
    }
    result.ok = true;
    result.data = { applied: params.matchName };
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleRemoveEffect(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'removeEffect: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'removeEffect: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'removeEffect: layer not found'; return result; }
    var targetEffectName = params.matchName + '__' + params.nodeUUID;
    var effects = layer.Effects;
    var ei;
    var fx;
    var found = false;
    for (ei = 1; ei <= effects.numProperties; ei++) {
      fx = effects.property(ei);
      if (fx.name === targetEffectName) {
        found = true;
        break;
      }
    }
    if (!found) {
      for (ei = 1; ei <= effects.numProperties; ei++) {
        fx = effects.property(ei);
        if (fx.matchName === params.matchName) {
          found = true;
          break;
        }
      }
    }
    if (found) fx.remove();
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleSetEffectProperty(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setEffectProperty: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'setEffectProperty: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setEffectProperty: layer not found'; return result; }
    var targetEffectName = params.effectMatchName + '__' + params.nodeUUID;
    var effects = layer.Effects;
    var ei;
    var fx;
    var found = false;
    for (ei = 1; ei <= effects.numProperties; ei++) {
      fx = effects.property(ei);
      if (fx.name === targetEffectName) {
        found = true;
        break;
      }
    }
    if (!found) {
      for (ei = 1; ei <= effects.numProperties; ei++) {
        fx = effects.property(ei);
        if (fx.matchName === params.effectMatchName) {
          found = true;
          break;
        }
      }
    }
    if (found) {
      var prop = _findPropByMatchName(fx, params.propMatchName);
      if (prop && typeof prop.setValue === 'function') prop.setValue(params.value);
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleSetEffectEnabled(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setEffectEnabled: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'setEffectEnabled: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setEffectEnabled: layer not found'; return result; }
    var targetEffectName = params.matchName + '__' + params.nodeUUID;
    var effects = layer.Effects;
    var ei;
    var fx;
    var found = false;
    for (ei = 1; ei <= effects.numProperties; ei++) {
      fx = effects.property(ei);
      if (fx.name === targetEffectName) {
        fx.enabled = (params.enabled !== false);
        found = true;
        break;
      }
    }
    if (!found) {
      for (ei = 1; ei <= effects.numProperties; ei++) {
        fx = effects.property(ei);
        if (fx.matchName === params.matchName) {
          fx.enabled = (params.enabled !== false);
          found = true;
          break;
        }
      }
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleRenameEffect(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'renameEffect: host comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.layerUUID);
    if (!layer) { result.error = 'renameEffect: layer not found'; return result; }
    var targetEffectName = params.effectMatchName + '__' + params.nodeUUID;
    var effects = layer.Effects;
    var ei;
    var fx;
    var found = false;
    for (ei = 1; ei <= effects.numProperties; ei++) {
      fx = effects.property(ei);
      if (fx.name === targetEffectName) {
        found = true;
        break;
      }
    }
    if (!found && params.nodeUUID) {
      for (ei = 1; ei <= effects.numProperties; ei++) {
        fx = effects.property(ei);
        if (fx.matchName === params.effectMatchName) {
          found = true;
          break;
        }
      }
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
