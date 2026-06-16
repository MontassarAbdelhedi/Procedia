/**
 * @fileoverview Read functions for importing AE project structure — reads
 * layers, comps, and footage items into plain JSON-safe objects. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx, actionImport/helpers.jsx
 * Load BEFORE: dispatcher.jsx, actionImport/handler.jsx
 */
// actionImport/read.jsx — AE project structure readers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, actionImport/helpers.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

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
