/**
 * @fileoverview Scans all layers in a given composition for import.
 * Returns layer type, transform properties, parent index, blending mode,
 * matte type, source information, and effects.
 * (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleImportScanCompLayers
 */
// actionImport/scanCompLayers.jsx — Import comp layer scanner (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _handleImportScanCompLayers(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    if (!params || !params.compName) {
      result.error = 'importScanCompLayers: compName required';
      return result;
    }
    var compName = String(params.compName);

    // Find comp by name (no UUID yet — this is a non-Procedia project)
    var comp = null;
    var proj = app.project;
    for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof CompItem && item.name === compName) {
        comp = item;
        break;
      }
    }
    if (!comp) {
      result.error = 'importScanCompLayers: comp not found: ' + compName;
      return result;
    }

    // Build blending mode reverse map
    var blendMap = {};
    blendMap[BlendingMode.NORMAL]       = 'NORMAL';
    blendMap[BlendingMode.ADD]          = 'ADD';
    blendMap[BlendingMode.MULTIPLY]     = 'MULTIPLY';
    blendMap[BlendingMode.SCREEN]       = 'SCREEN';
    blendMap[BlendingMode.OVERLAY]      = 'OVERLAY';
    blendMap[BlendingMode.DARKEN]       = 'DARKEN';
    blendMap[BlendingMode.LIGHTEN]      = 'LIGHTEN';
    blendMap[BlendingMode.COLOR_DODGE]  = 'COLOR_DODGE';
    blendMap[BlendingMode.COLOR_BURN]   = 'COLOR_BURN';
    blendMap[BlendingMode.HARD_LIGHT]   = 'HARD_LIGHT';
    blendMap[BlendingMode.SOFT_LIGHT]   = 'SOFT_LIGHT';
    blendMap[BlendingMode.DIFFERENCE]   = 'DIFFERENCE';
    blendMap[BlendingMode.EXCLUSION]    = 'EXCLUSION';
    blendMap[BlendingMode.HUE]          = 'HUE';
    blendMap[BlendingMode.SATURATION]   = 'SATURATION';
    blendMap[BlendingMode.COLOR]        = 'COLOR';
    blendMap[BlendingMode.LUMINOSITY]   = 'LUMINOSITY';

    // Build track matte reverse map
    var matteMap = {};
    matteMap[TrackMatteType.NO_TRACK_MATTE] = 'NONE';
    matteMap[TrackMatteType.ALPHA]          = 'ALPHA';
    matteMap[TrackMatteType.ALPHA_INVERTED] = 'ALPHA_INVERTED';
    matteMap[TrackMatteType.LUMA]           = 'LUMA';
    matteMap[TrackMatteType.LUMA_INVERTED]  = 'LUMA_INVERTED';

    var layers = [];
    for (var li = 1; li <= comp.numLayers; li++) {
      var layer = comp.layer(li);
      if (!layer) continue;

      var entry = {
        index:         li,
        name:          layer.name,
        layerType:     _getLayerType(layer),
        position:      _readPosition(layer),
        scale:         _readScale(layer),
        rotation:      _readRotation(layer),
        opacity:       _readOpacity(layer),
        parentIndex:   _readParentIndex(layer),
        blendingMode:  blendMap[layer.blendingMode] || 'NORMAL',
        trackMatteType: matteMap[layer.trackMatteType] || 'NONE',
        sourceItemName: _readSourceName(layer),
        comment:       layer.comment || '',
        enabled:       layer.enabled,
        effects:       _scanEffects(layer)
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
        entry.lightType = _readLightType(layer);
        entry.intensity = _readPropValue(layer, 'intensity', [100]);
        entry.lightColor = _readLightColor(layer);
        entry.coneAngle = _readPropValue(layer, 'coneAngle', [90]);
        entry.coneFeather = _readPropValue(layer, 'coneFeather', [50]);
        entry.castsShadows = layer.castsShadows;
        entry.shadowDarkness = _readPropValue(layer, 'shadowDarkness', [100]);
        entry.shadowDiffusion = _readPropValue(layer, 'shadowDiffusion', [0]);
      } else if (layer instanceof ShapeLayer) {
        entry.fillColor = _readShapeFillColor(layer);
      }

      // For solid-sourced AVLayers, read color/width/height
      if (entry.layerType === 'solid') {
        entry.solidColor = _readSolidColor(layer);
        entry.solidWidth = layer.source ? layer.source.width : 0;
        entry.solidHeight = layer.source ? layer.source.height : 0;
      }

      layers.push(entry);
    }

    result.ok = true;
    result.data = { compName: compName, layers: layers, numLayers: comp.numLayers };
  } catch (e) {
    result.error = 'importScanCompLayers: ' + e.toString();
  }
  return result;
}

// --- Helper functions ---

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

function _readPosition(layer) {
  try {
    var v = layer.position.value;
    if (v.length >= 3) return [v[0], v[1], v[2]];
    return [v[0], v[1]];
  } catch (e) { return [0, 0]; }
}

function _readScale(layer) {
  try {
    var v = layer.scale.value;
    return [v[0], v[1]];
  } catch (e) { return [100, 100]; }
}

function _readRotation(layer) {
  try { return layer.rotation.value; }
  catch (e) { return 0; }
}

function _readOpacity(layer) {
  try { return layer.opacity.value; }
  catch (e) { return 100; }
}

function _readParentIndex(layer) {
  try {
    if (layer.parent === null) return 0;
    return layer.parent.index;
  } catch (e) { return 0; }
}

function _readSourceName(layer) {
  try {
    if (layer.source) return layer.source.name;
  } catch (e) {}
  return '';
}

function _readPropValue(layer, propName, defaultVal) {
  try {
    if (layer[propName] === undefined) return defaultVal;
    var v = layer[propName].value;
    if (v instanceof Array) {
      var arr = [];
      for (var ai = 0; ai < v.length; ai++) arr.push(v[ai]);
      return arr;
    }
    return v;
  } catch (e) { return defaultVal; }
}

function _readTextContent(layer) {
  try {
    var td = layer.text.sourceText.value;
    return td.text;
  } catch (e) { return ''; }
}

function _readFontSize(layer) {
  try {
    var td = layer.text.sourceText.value;
    return td.fontSize;
  } catch (e) { return 72; }
}

function _readTextColor(layer) {
  try {
    var td = layer.text.sourceText.value;
    var fc = td.fillColor;
    return [fc[0], fc[1], fc[2], 1];
  } catch (e) { return [1, 1, 1, 1]; }
}

function _readLightType(layer) {
  try { return layer.lightType.toString(); }
  catch (e) { return 'point'; }
}

function _readLightColor(layer) {
  try {
    var c = layer.color.value;
    return [c[0], c[1], c[2], 1];
  } catch (e) { return [1, 1, 1, 1]; }
}

function _readShapeFillColor(layer) {
  try {
    var contents = layer.property('ADBE Root Vectors Group');
    if (!contents) return [1, 1, 1, 1];
    var fill = contents.property('ADBE Vector Graphic - Fill');
    if (!fill) return [1, 1, 1, 1];
    var c = fill.property('ADBE Vector Fill Color').value;
    return [c[0], c[1], c[2], 1];
  } catch (e) { return [1, 1, 1, 1]; }
}

function _readSolidColor(layer) {
  try {
    if (layer.source && layer.source.mainSource instanceof SolidSource) {
      var sc = layer.source.mainSource.color;
      return [sc[0], sc[1], sc[2], 1];
    }
  } catch (e) {}
  return [0.5, 0.5, 0.5, 1];
}

function _scanEffects(layer) {
  var effects = [];
  try {
    if (!layer.Effects || layer.Effects.numProperties === 0) return effects;
    for (var ei = 1; ei <= layer.Effects.numProperties; ei++) {
      var effect = layer.Effects.property(ei);
      if (!effect || !effect.matchName) continue;

      var effEntry = {
        matchName: effect.matchName,
        name:      effect.name,
        enabled:   effect.enabled !== false,
        properties: {}
      };

      // Read all leaf properties of this effect
      _walkEffectProperties(effect, effEntry.properties);

      effects.push(effEntry);
    }
  } catch (e) {}
  return effects;
}

function _walkEffectProperties(parent, propsObj) {
  try {
    for (var pi = 1; pi <= parent.numProperties; pi++) {
      var prop = parent.property(pi);
      if (!prop) continue;
      if (prop.numProperties > 0) {
        // Group — recurse
        _walkEffectProperties(prop, propsObj);
        continue;
      }
      if (typeof prop.setValue !== 'function') continue;
      if (prop.propertyValueType === undefined || prop.propertyValueType === null) continue;

      var key = prop.matchName;
      if (!key) key = prop.name;
      if (!key) continue;

      try {
        var val = prop.value;
        if (val instanceof Array) {
          var arr = [];
          for (var ai = 0; ai < val.length; ai++) arr.push(val[ai]);
          propsObj[key] = arr;
        } else {
          propsObj[key] = val;
        }
      } catch (e) {}
    }
  } catch (e) {}
}
