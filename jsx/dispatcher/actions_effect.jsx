/**
 * @fileoverview Effect-related action handlers (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: _handleApplyDynamicEffect, _handleRemoveEffect, _handleSetEffectProperty, _handleRenameEffect, _handleIntrospectEffect
 */
// actions_effect.jsx — Effect-related action handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

/**
 * Applies an effect to a layer by matchName and sets its property values.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, matchName, props.
 * @return {Object} Result with .ok, .data (applied), .error.
 */
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
          var prop = effect.property(pk);
          if (prop) prop.setValue(params.props[pk]);
        } catch (propErr) {}
      }
    }
    result.ok = true;
    result.data = { applied: params.matchName };
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Removes the first effect matching matchName from a layer.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, matchName.
 * @return {Object} Result with .ok, .error.
 */
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

/**
 * Sets a single property value on an effect matching effectMatchName on a layer.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, effectMatchName, propMatchName, value.
 * @return {Object} Result with .ok, .error.
 */
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
      var prop = fx.property(params.propMatchName);
      if (prop && typeof prop.setValue === 'function') prop.setValue(params.value);
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Renames an effect on a layer by matchName.
 * @param {Object} cmd Command with params: hostingCompUUID, layerUUID, effectMatchName, label.
 * @return {Object} Result with .ok, .error.
 */
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

/**
 * Checks which effect nodes still have their AE effect existing on the host layer.
 * Layers are identified by layer.comment matching layerNodeUUID (the path wire UUID).
 * Effects are identified by matchName on the layer's Effects collection.
 * @param {Object} cmd Command with params: entries (array of {nodeUUID, hostingCompUUID, layerNodeUUID, matchName}).
 * @return {Object} Result with .ok, .data (missingEffectNodeUUIDs), .error.
 */
function _handlePollAliveEffects(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var entries = params.entries || [];
    var missingEffectNodeUUIDs = [];
    var i;

    for (i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var comp = findCompByUUID(entry.hostingCompUUID);
      if (!comp) {
        missingEffectNodeUUIDs.push(entry.nodeUUID);
        continue;
      }
      var layer = findLayerByUUID(comp, entry.layerNodeUUID);
      if (!layer) {
        missingEffectNodeUUIDs.push(entry.nodeUUID);
        continue;
      }
      var targetEffectName = entry.matchName + '__' + entry.nodeUUID;
      var found = false;
      var ei;
      var fx;
      for (ei = 1; ei <= layer.Effects.numProperties; ei++) {
        fx = layer.Effects.property(ei);
        if (fx.name === targetEffectName) {
          found = true;
          break;
        }
      }
      if (!found) {
        for (ei = 1; ei <= layer.Effects.numProperties; ei++) {
          fx = layer.Effects.property(ei);
          if (fx.matchName === entry.matchName) {
            found = true;
            break;
          }
        }
      }
      if (!found) missingEffectNodeUUIDs.push(entry.nodeUUID);
    }

    result.ok = true;
    result.data = { missingEffectNodeUUIDs: missingEffectNodeUUIDs };
  } catch (e) { result.error = e.toString(); }
  return result;
}

/**
 * Introspects an effect by matchName on a temp layer to discover its property schema.
 * @param {Object} cmd Command with params: matchName.
 * @return {Object} Result with .ok, .data (matchName, properties), .error.
 */
function _handleIntrospectEffect(cmd) {
  var result = { ok: false, data: null, error: null };
  var tempLayer = null;
  try {
    var params = _cmdParams(cmd);
    if (!params.matchName) {
      result.error = 'introspectEffect: matchName required';
      return result;
    }

    var reservedComp = findReservedComp();
    if (!reservedComp) {
      result.error = 'Reserved Comp not found — cannot introspect';
      return result;
    }

    tempLayer = reservedComp.layers.addSolid([0, 0, 0], '__PROCEDIA_INTROSPECT_TEMP__', 100, 100, 1);
    tempLayer.enabled = false;

    var effect = null;
    try {
      effect = tempLayer.Effects.addProperty(params.matchName);
    } catch (addErr) {
      tempLayer.remove();
      result.error = 'Effect not found in AE: ' + params.matchName;
      return result;
    }

    var ALLOWED_TYPES = [
      PropertyValueType.COLOR,
      PropertyValueType.TwoD,
      PropertyValueType.ThreeD,
      PropertyValueType.SCALAR,
      PropertyValueType.ANGLE,
      PropertyValueType.NO_VALUE
    ];

    var schema = [];
    var pi;
    for (pi = 1; pi <= effect.numProperties; pi++) {
      var prop = effect.property(pi);
      var pvt  = prop.propertyValueType;
      var allowed = false;
      var ki;
      for (ki = 0; ki < ALLOWED_TYPES.length; ki++) {
        if (pvt === ALLOWED_TYPES[ki]) { allowed = true; break; }
      }
      if (!allowed) continue;
      if (typeof prop.setValue !== 'function') continue;

      var mappedType = null;
      if (pvt === PropertyValueType.COLOR)    mappedType = 'color';
      if (pvt === PropertyValueType.TwoD)     mappedType = 'vector2';
      if (pvt === PropertyValueType.ThreeD)   mappedType = 'vector3';
      if (pvt === PropertyValueType.SCALAR)   mappedType = 'number';
      if (pvt === PropertyValueType.ANGLE)    mappedType = 'number';
      if (pvt === PropertyValueType.NO_VALUE) mappedType = 'boolean';

      schema.push({
        matchName:    prop.matchName,
        label:        prop.name,
        type:         mappedType,
        defaultValue: prop.value
      });
    }

    effect.remove();
    tempLayer.remove();
    tempLayer = null;

    result.ok = true;
    result.data = { matchName: params.matchName, properties: schema };
  } catch (e) {
    if (tempLayer) {
      try { tempLayer.remove(); } catch (ignoreErr) {}
    }
    result.error = e.toString();
  }
  return result;
}
