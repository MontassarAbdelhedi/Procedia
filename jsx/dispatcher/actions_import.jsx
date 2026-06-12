/**
 * @fileoverview Import action handler — enumerates the entire AE project
 * and returns its structure as JSON (comps, layers, effects, footage).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (function becomes global for _handlers map)
 * Exports: _handleImportProject
 */

var _import_uuid_counter = 0;

function _import_uuid(prefix) {
  _import_uuid_counter++;
  var ts = '';
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (var ci = 0; ci < 6; ci++) {
    ts += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + '-' + ts + '-' + String(_import_uuid_counter);
}

function _readTransformProp(layer, matchName, def) {
  try {
    var prop = layer.property(matchName);
    if (prop) return prop.value;
  } catch (e) {}
  return def;
}

function _readTransform(layer) {
  return {
    position:    _readTransformProp(layer, 'ADBE Position', [0, 0]),
    scale:       _readTransformProp(layer, 'ADBE Scale', [100, 100]),
    rotation:    _readTransformProp(layer, 'ADBE Rotate Z', 0),
    opacity:     _readTransformProp(layer, 'ADBE Opacity', 100),
    anchorPoint: _readTransformProp(layer, 'ADBE Anchor Point', [0, 0])
  };
}

function _readEffectProps(effect, arr) {
  for (var pi = 1; pi <= effect.numProperties; pi++) {
    var prop = effect.property(pi);
    try {
      var ptype = prop.propertyType;
      if (ptype === PropertyType.INDEXED_GROUP || ptype === PropertyType.NAMED_GROUP) {
        _readEffectProps(prop, arr);
      } else if (typeof prop.value !== 'undefined') {
        arr.push({ matchName: prop.matchName, value: prop.value });
      }
    } catch (e) {}
  }
}

function _readEffects(layer) {
  var result = [];
  try {
    var effectsGroup = layer.property('ADBE Effect Parade');
    if (!effectsGroup) return result;
    for (var ei = 1; ei <= effectsGroup.numProperties; ei++) {
      var effect = effectsGroup.property(ei);
      var props = [];
      _readEffectProps(effect, props);
      result.push({
        matchName: effect.matchName,
        name:      effect.name,
        index:     ei,
        properties: props
      });
    }
  } catch (e) {}
  return result;
}

function _layerType(layer) {
  if (layer instanceof TextLayer)       return 'text';
  if (layer instanceof ShapeLayer)      return 'shape';
  if (layer instanceof CameraLayer)     return 'camera';
  if (layer instanceof LightLayer)      return 'light';
  if (!(layer instanceof AVLayer))      return 'unknown';
  if (layer.nullLayer)                  return 'null';
  if (layer.adjustmentLayer)            return 'adjustment';
  if (layer.source instanceof CompItem) return 'precomp';
  if (layer.source instanceof FootageItem) {
    var ms = layer.source.mainSource;
    if (ms instanceof SolidSource) return 'solid';
    return 'footage';
  }
  return 'unknown';
}

function _readLayer(layer) {
  var uuid = _import_uuid('PROC');
  layer.comment = uuid;
  var type = _layerType(layer);
  var parentUUID = null;
  if (layer.parent) {
    parentUUID = layer.parent.comment;
    if (!parentUUID || parentUUID.indexOf('PROC-') !== 0) {
      parentUUID = _import_uuid('PROC');
      layer.parent.comment = parentUUID;
    }
  }
  var trackMatteType = null;
  try {
    if (layer.hasTrackMatte) {
      trackMatteType = String(layer.trackMatteType);
    }
  } catch (e) {}
  var trackMatteLayerUUID = null;
  if (layer.trackMatteLayer) {
    trackMatteLayerUUID = layer.trackMatteLayer.comment;
    if (!trackMatteLayerUUID || trackMatteLayerUUID.indexOf('PROC-') !== 0) {
      trackMatteLayerUUID = _import_uuid('PROC');
      layer.trackMatteLayer.comment = trackMatteLayerUUID;
    }
  }
  var blendingMode = 'NORMAL';
  try { blendingMode = String(layer.blendingMode); } catch (e) {}
  var sourceInfo = null;
  if (type === 'precomp' && layer.source instanceof CompItem) {
    var ref = layer.source.comment || '';
    if (ref.indexOf('PROC-') !== 0) ref = '';
    sourceInfo = { type: 'precomp', ref: ref };
  } else if (type === 'solid' && layer.source instanceof FootageItem) {
    var solidColor = [1, 1, 1];
    try {
      var ms = layer.source.mainSource;
      if (ms instanceof SolidSource) solidColor = ms.color;
    } catch (e) {}
    var ref = layer.source.comment || '';
    if (ref.indexOf('PROC-') !== 0) ref = '';
    sourceInfo = { type: 'solid', color: solidColor, ref: ref };
  } else if (type === 'footage' && layer.source instanceof FootageItem) {
    var filePath = '';
    try {
      var fs = layer.source.mainSource;
      if (fs instanceof FileSource && fs.file) filePath = fs.file.fsName;
    } catch (e) {}
    var ref = layer.source.comment || '';
    if (ref.indexOf('PROC-') !== 0) ref = '';
    sourceInfo = {
      type: 'footage',
      file: filePath,
      ref:  ref
    };
  }
  return {
    uuid:               uuid,
    index:              layer.index,
    name:               layer.name,
    type:               type,
    inPoint:            layer.inPoint,
    outPoint:           layer.outPoint,
    startTime:          layer.startTime,
    stretch:            layer.stretch,
    enabled:            layer.enabled,
    shy:                layer.shy,
    solo:               layer.solo,
    locked:             layer.locked,
    blendingMode:       blendingMode,
    parentUUID:         parentUUID,
    hasTrackMatte:      layer.hasTrackMatte,
    trackMatteType:     trackMatteType,
    trackMatteLayerUUID: trackMatteLayerUUID,
    transform:          _readTransform(layer),
    effects:            _readEffects(layer),
    source:             sourceInfo
  };
}

function _readComp(comp) {
  var compUUID = _import_uuid('PROC');
  comp.comment = compUUID;
  var layers = [];
  for (var li = 1; li <= comp.numLayers; li++) {
    try {
      layers.push(_readLayer(comp.layer(li)));
    } catch (e) {}
  }
  return {
    uuid:       compUUID,
    name:       comp.name,
    width:      comp.width,
    height:     comp.height,
    frameRate:  comp.frameRate,
    duration:   comp.duration,
    pixelAspect: comp.pixelAspect,
    bgColor:    comp.bgColor,
    layers:     layers,
    numLayers:  comp.numLayers
  };
}

function _readFootage(item) {
  var uuid = _import_uuid('PROC');
  item.comment = uuid;
  var filePath = '';
  var type = 'unknown';
  var width = item.width;
  var height = item.height;
  var duration = item.duration;
  var solidColor = null;
  try {
    var ms = item.mainSource;
    if (ms instanceof FileSource) {
      type = 'file';
      if (ms.file) filePath = ms.file.fsName;
    } else if (ms instanceof SolidSource) {
      type = 'solid';
      solidColor = ms.color;
    } else if (ms instanceof PlaceholderSource) {
      type = 'placeholder';
    }
  } catch (e) {}
  return {
    uuid:        uuid,
    name:        item.name,
    type:        type,
    file:        filePath,
    width:       width,
    height:      height,
    duration:    duration,
    solidColor:  solidColor,
    footageMissing: item.footageMissing
  };
}

function _readFootageItems() {
  var result = [];
  for (var fi = 1; fi <= app.project.numItems; fi++) {
    try {
      var item = app.project.item(fi);
      if (item instanceof FootageItem) {
        result.push(_readFootage(item));
      }
    } catch (e) {}
  }
  return result;
}

function _handleImportProject(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var comps = [];
    var i;
    for (i = 1; i <= app.project.numItems; i++) {
      try {
        var item = app.project.item(i);
        if (item instanceof CompItem) {
          if (item.name.indexOf('DO NOT DELETE') === 0) continue;
          comps.push(_readComp(item));
        }
      } catch (e) {}
    }
    var footage = _readFootageItems();
    result.ok = true;
    result.data = {
      comps:   comps,
      footage: footage
    };
  } catch (e) {
    result.error = 'importProject: ' + e.toString();
  }
  return result;
}
