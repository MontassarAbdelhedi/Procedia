/**
 * @fileoverview Cloner utility helpers (ES3-safe).
 * AE layer transform setter and JSON state builder for the cloner
 * hidden text layer. REQUIRES: json.jsx
 * Load BEFORE: cloner.jsx
 * Exports: _setLayerTransform, _buildClonerJson
 */
// actionInstances/clonerUtils.jsx — Cloner AE helpers & JSON builder (ES3-safe)

/**
 * Sets position, scale, rotation, and opacity on a layer's transform group.
 * Position defaults to [0,0], scale to [100,100], rotation to 0, opacity to 100.
 * @param {Layer} layer - The AE layer
 * @param {number[]} pos - [x, y]
 * @param {number[]} scl - [sx, sy]
 * @param {number} rot - rotation in degrees
 * @param {number} op - opacity 0–100
 */
function _setLayerTransform(layer, pos, scl, rot, op) {
  if (!layer) return;
  var xform = layer.property('ADBE Transform Group');
  if (!xform) return;

  var positionProp = xform.property('ADBE Position');
  if (positionProp && pos) {
    positionProp.setValue([pos[0] || 0, pos[1] || 0]);
  }

  var scaleProp = xform.property('ADBE Scale');
  if (scaleProp && scl) {
    scaleProp.setValue([scl[0] || 100, scl[1] || 100]);
  }

  var rotationProp = xform.property('ADBE Rotate Z');
  if (rotationProp && typeof rot === 'number') {
    rotationProp.setValue(rot);
  }

  var opacityProp = xform.property('ADBE Opacity');
  if (opacityProp && typeof op === 'number') {
    opacityProp.setValue(Math.max(0, Math.min(100, op)));
  }
}

/**
 * Builds a JSON string for the cloner state stored in the hidden text layer.
 * @param {string} nodeUUID
 * @param {string} mode
 * @param {Object} transformData - { instances: [...] }
 * @param {Object} props - Current property values
 * @return {string} JSON string
 */
function _buildClonerJson(nodeUUID, mode, transformData, props) {
  var obj = {
    nodeUUID: nodeUUID,
    mode: mode,
    count: transformData.instances ? transformData.instances.length : 0,
    instances: transformData.instances || [],
    props: props || {}
  };
  return JSON.stringify(obj);
}
