/**
 * @fileoverview Introspect property walker (ES3-safe).
 * Recursively walks AE effect properties and pushes typed schema
 * entries into the provided schema array. REQUIRES: (none)
 * Load BEFORE: introspect.jsx
 * Exports: _walkProperties
 */
// introspect/walk.jsx — Effect property walker (ES3-safe)

/**
 * Walks all leaf properties under an AE effect group and builds a schema.
 * @param {PropertyGroup} parent - Root effect property group
 * @param {Array} schema - Target array to push schema entries into
 */
function _walkProperties(parent, schema) {
  var wi;
  for (wi = 1; wi <= parent.numProperties; wi++) {
    var prop;
    try {
      prop = parent.property(wi);
    } catch (e) { continue; }
    if (!prop) continue;
    if (prop.numProperties > 0) {
      _walkProperties(prop, schema);
      continue;
    }
    if (typeof prop.setValue !== 'function') continue;
    if (prop.propertyValueType === undefined || prop.propertyValueType === null) continue;

    var pvt = prop.propertyValueType;
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
