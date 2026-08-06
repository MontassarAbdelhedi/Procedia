/**
 * @fileoverview Layer type classifier for import scanning (ES3-safe).
 * Determines the semantic layer type (text, camera, light, shape,
 * adjustment, null, comp, solid, footage, audio, av, unknown) from
 * an AE Layer object. REQUIRES: (none)
 * Load BEFORE: scanCompLayers.jsx
 * Exports: _getLayerType
 */
// scanCompLayers/layerType.jsx — Import layer type classifier (ES3-safe)

function _getLayerType(layer) {
  if (layer instanceof TextLayer)     return 'text';
  if (layer instanceof CameraLayer)   return 'camera';
  if (layer instanceof LightLayer)    return 'light';
  if (layer instanceof ShapeLayer)    return 'shape';
  if (!(layer instanceof AVLayer)) {
    if (layer.name.indexOf('Audio') !== -1) return 'audio';
    return 'unknown';
  }
  if (layer.adjustmentLayer)          return 'adjustment';
  if (layer.nullLayer)                return 'null';
  var src = layer.source;
  if (src instanceof CompItem)        return 'comp';
  if (src instanceof FootageItem) {
    if (src.mainSource instanceof SolidSource) return 'solid';
    return 'footage';
  }
  return 'av';
}
