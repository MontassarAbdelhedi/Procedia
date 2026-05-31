/**
 * @fileoverview Effect-related action handlers (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: _handleApplyDynamicEffect, _handleRemoveEffect, _handleSetEffectProperty, _handleIntrospectEffect
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
    var effects = layer.Effects;
    var ei;
    for (ei = 1; ei <= effects.numProperties; ei++) {
      var fx = effects.property(ei);
      if (fx.matchName === params.matchName) {
        fx.remove();
        break;
      }
    }
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
    var effects = layer.Effects;
    var ei;
    for (ei = 1; ei <= effects.numProperties; ei++) {
      var fx = effects.property(ei);
      if (fx.matchName === params.effectMatchName) {
        var prop = fx.property(params.propMatchName);
        if (prop && typeof prop.setValue === 'function') prop.setValue(params.value);
        break;
      }
    }
    result.ok = true;
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
