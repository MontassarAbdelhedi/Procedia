/**
 * @fileoverview Effect introspection handler — discovers property schema for
 * a given effect matchName by applying it to a temp solid in the Reserved Comp.
 * (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 */
// actionEffect/introspect.jsx — Effect introspection handler (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

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

    var schema = [];

    function _walkProperties(parent) {
      var wi;
      for (wi = 1; wi <= parent.numProperties; wi++) {
        var prop;
        try {
          prop = parent.property(wi);
        } catch (e) { continue; }
        if (!prop) continue;
        if (prop.numProperties > 0) {
          _walkProperties(prop);
          continue;
        }
        if (typeof prop.setValue !== 'function') continue;
        if (prop.propertyValueType === undefined || prop.propertyValueType === null) continue;

        var pvt    = prop.propertyValueType;
        var mappedType = 'string';

        if (pvt === PropertyValueType.COLOR)        mappedType = 'color';
        else if (pvt === PropertyValueType.TwoD)    mappedType = 'vector2';
        else if (pvt === PropertyValueType.ThreeD)  mappedType = 'vector3';
        else if (pvt === PropertyValueType.POINT_3) mappedType = 'vector3';
        else if (pvt === PropertyValueType.SCALAR)  mappedType = 'number';
        else if (pvt === PropertyValueType.ANGLE)   mappedType = 'number';
        else if (pvt === PropertyValueType.DISTANCE) mappedType = 'number';
        else if (pvt === PropertyValueType.CHECKBOX) mappedType = 'boolean';
        else if (pvt === PropertyValueType.NO_VALUE) mappedType = 'boolean';
        else if (pvt === PropertyValueType.SELECTION) mappedType = 'enum';
        else if (pvt === PropertyValueType.MASK_INDEX) mappedType = 'enum';
        else if (pvt === PropertyValueType.LAYER_INDEX) mappedType = 'enum';
        else if (typeof prop.value === 'number' && prop.value % 1 === 0 && (prop.value === 0 || prop.value === 1)) {
          mappedType = 'boolean';
        }

        var entry = {
          matchName:    prop.matchName,
          label:        prop.name,
          type:         mappedType,
          defaultValue: prop.value
        };

        if (mappedType === 'enum' && typeof prop.getMenu === 'function') {
          try {
            entry.options = prop.getMenu();
          } catch (menuErr) {}
        }

        schema.push(entry);
      }
    }

    _walkProperties(effect);

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
