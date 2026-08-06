/**
 * @fileoverview Builds a single layer entry object during import scanning.
 * Reads all standard + type-specific properties from an AE layer and
 * packages them into an entry suitable for the import mapper.
 * (ES3-safe) REQUIRES: scanCompLayers/layerType.jsx, readProps.jsx, scanEffects.jsx
 * Load BEFORE: scanCompLayers.jsx
 * Exports: _buildLayerEntry
 */
// scanCompLayers/buildEntry.jsx — Import layer entry builder (ES3-safe)
// REQUIRES: layerType.jsx, readProps.jsx, scanEffects.jsx

function _buildLayerEntry(layer, li, blendMap, matteMap) {
  var entry = {
    index:          li,
    name:           layer.name,
    layerType:      _getLayerType(layer),
    position:       _readPosition(layer),
    scale:          _readScale(layer),
    rotation:       _readRotation(layer),
    opacity:        _readOpacity(layer),
    parentIndex:    _readParentIndex(layer),
    blendingMode:   blendMap[layer.blendingMode] || 'NORMAL',
    trackMatteType: matteMap[layer.trackMatteType] || 'NONE',
    sourceItemName: _readSourceName(layer),
    comment:        layer.comment || '',
    enabled:        layer.enabled,
    effects:        _scanEffects(layer)
  };

  // Layer-type-specific properties
  if (layer instanceof TextLayer) {
    entry.textContent = _readTextContent(layer);
    entry.fontSize    = _readFontSize(layer);
    entry.textColor   = _readTextColor(layer);
  } else if (layer instanceof CameraLayer) {
    entry.zoom          = _readPropValue(layer, 'zoom', [960]);
    entry.depthOfField  = layer.depthOfField;
    entry.focusDistance = _readPropValue(layer, 'focusDistance', [200]);
    entry.aperture      = _readPropValue(layer, 'aperture', [5]);
    entry.blurLevel     = _readPropValue(layer, 'blurLevel', [100]);
  } else if (layer instanceof LightLayer) {
    entry.lightType      = _readLightType(layer);
    entry.intensity      = _readPropValue(layer, 'intensity', [100]);
    entry.lightColor     = _readLightColor(layer);
    entry.coneAngle      = _readPropValue(layer, 'coneAngle', [90]);
    entry.coneFeather    = _readPropValue(layer, 'coneFeather', [50]);
    entry.castsShadows   = layer.castsShadows;
    entry.shadowDarkness  = _readPropValue(layer, 'shadowDarkness', [100]);
    entry.shadowDiffusion = _readPropValue(layer, 'shadowDiffusion', [0]);
  } else if (layer instanceof ShapeLayer) {
    entry.fillColor = _readShapeFillColor(layer);
  }

  // For solid-sourced AVLayers, read color/width/height
  if (entry.layerType === 'solid') {
    entry.solidColor  = _readSolidColor(layer);
    entry.solidWidth  = layer.source ? layer.source.width : 0;
    entry.solidHeight = layer.source ? layer.source.height : 0;
  }

  return entry;
}
