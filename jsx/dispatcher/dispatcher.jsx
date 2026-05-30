// dispatcher.jsx — Routes evalScript commands to action handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx (must be loaded before this file in the preamble)
//
// Entry point: dispatch(jsonStr) — called by evalBridge via csInterface.evalScript()
// dispatchBatch(jsonStr) — calls multiple commands in sequence
// To add a new action: add a named handler function + register it in _handlers.

function _cmdParams(cmd) {
  return (cmd && cmd.params) ? cmd.params : {};
}

function _handleCreateComp(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    if (!params.nodeUUID) {
      result.error = 'createComp: nodeUUID required';
      return result;
    }
    var folder = findOrCreateProcediaFolder();
    var label = params.label ? String(params.label) : 'Comp';
    var w = params.width || 1920;
    var h = params.height || 1080;
    var duration = params.duration || 10;
    var fps = params.frameRate || 30;
    var comp = app.project.items.addComp(label, w, h, 1, duration, fps);
    comp.comment = params.nodeUUID;
    comp.parentFolder = folder;
    result.ok = true;
    result.data = { name: comp.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleDeleteComp(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.nodeUUID);
    if (!comp) {
      result.error = 'deleteComp: comp not found: ' + params.nodeUUID;
      return result;
    }
    comp.remove();
    result.ok = true;
    result.data = { deleted: params.nodeUUID };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleCreateTextLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) {
      result.error = 'createTextLayer: host comp not found: ' + params.hostingCompUUID;
      return result;
    }
    var textLayer = comp.layers.addText(params.content || 'Text');
    if (params.layerUUID) {
      textLayer.comment = params.layerUUID;
    }
    if (params.position && params.position.length === 2) {
      textLayer.position.setValue(params.position);
    }
    if (params.rotation !== undefined && params.rotation !== null) {
      textLayer.rotation.setValue(params.rotation);
    }
    if (params.opacity !== undefined && params.opacity !== null) {
      textLayer.opacity.setValue(params.opacity);
    }
    if (params.fontSize !== undefined && params.fontSize !== null) {
      var textDoc = textLayer.text.sourceText.value;
      if (textDoc) {
        textDoc.fontSize = params.fontSize;
        textLayer.text.sourceText.setValue(textDoc);
      }
    }
    if (params.color && params.color.length >= 3 && params.label) {
      textLayer.name = params.label;
    }
    result.ok = true;
    result.data = { layerName: textLayer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleCreateNullLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) {
      result.error = 'createNullLayer: host comp not found: ' + params.hostingCompUUID;
      return result;
    }
    var nullLayer = comp.layers.addNull();
    if (params.layerUUID) {
      nullLayer.comment = params.layerUUID;
    }
    result.ok = true;
    result.data = { layerName: nullLayer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleClearLayerParent(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var nodeUUID = params.nodeUUID;
    var cleared = false;
    var proj = app.project;
    var ci;
    for (ci = 1; ci <= proj.numItems; ci++) {
      var item = proj.item(ci);
      if (!(item instanceof CompItem)) continue;
      var li;
      for (li = 1; li <= item.numLayers; li++) {
        var layer = item.layer(li);
        if (layer.comment === nodeUUID) {
          layer.parent = null;
          cleared = true;
          break;
        }
      }
      if (cleared) break;
    }
    if (!cleared) {
      result.error = 'clearLayerParent: layer not found: ' + nodeUUID;
      return result;
    }
    result.ok = true;
    result.data = { cleared: nodeUUID };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function findOrCreateReservedComp() {
  var reserved = findReservedComp();
  if (reserved) return reserved;
  var folder = findOrCreateProcediaFolder();
  var comp = app.project.items.addComp('DO NOT DELETE - Procedia Reserved', 1920, 1080, 1, 10, 30);
  comp.parentFolder = folder;
  return comp;
}

function _handleParkLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var hostComp = findCompByUUID(params.hostingCompUUID);
    if (!hostComp) {
      result.error = 'parkLayer: host comp not found: ' + params.hostingCompUUID;
      return result;
    }
    var layer = null;
    var li;
    if (params.layerUUID) {
      layer = findLayerByUUID(hostComp, params.layerUUID);
    }
    if (!layer && params.nodeUUID) {
      layer = findLayerByUUID(hostComp, params.nodeUUID);
    }
    if (!layer) {
      for (li = 1; li <= hostComp.numLayers; li++) {
        var L = hostComp.layer(li);
        if (params.nodeUUID && L.comment === params.nodeUUID) {
          layer = L;
          break;
        }
        if (params.layerUUID && L.comment === params.layerUUID) {
          layer = L;
          break;
        }
      }
    }
    if (!layer) {
      result.error = 'parkLayer: layer not found in host comp';
      return result;
    }
    var reserved = findOrCreateReservedComp();
    layer.copyToComp(reserved);
    layer.remove();
    result.ok = true;
    result.data = { parked: true };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleDeleteParkedLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var reserved = findReservedComp();
    if (!reserved) {
      result.ok = true;
      result.data = { deleted: false };
      return result;
    }
    var layer = findLayerByUUID(reserved, params.nodeUUID);
    if (!layer) {
      var lj;
      for (lj = 1; lj <= reserved.numLayers; lj++) {
        var L2 = reserved.layer(lj);
        if (L2.comment === params.nodeUUID) {
          layer = L2;
          break;
        }
      }
    }
    if (layer) layer.remove();
    result.ok = true;
    result.data = { deleted: !!layer };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _pluginRootFolder() {
  var scriptFile = new File($.fileName);
  return scriptFile.parent.parent.parent;
}

function _handleReadSchemaCache(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var cacheFile = new File(_pluginRootFolder().fsName + '/data/effectSchemaCache.json');
    if (!cacheFile.exists) {
      result.ok = true;
      result.data = { aeVersion: '', schemas: {} };
      return result;
    }
    cacheFile.open('r');
    var raw = cacheFile.read();
    cacheFile.close();
    result.ok = true;
    result.data = JSON.parse(raw);
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleWriteSchemaCache(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var cacheFile = new File(_pluginRootFolder().fsName + '/data/effectSchemaCache.json');
    cacheFile.open('w');
    cacheFile.write(JSON.stringify(params.cache));
    cacheFile.close();
    result.ok = true;
    result.data = { written: true };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleGetAEVersion(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    result.ok = true;
    result.data = { version: app.version };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

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

function _handleCreateAdjustmentLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createAdjustmentLayer: host comp not found'; return result; }
    var layer = comp.layers.addShape();
    layer.adjustmentLayer = true;
    if (params.layerUUID) layer.comment = params.layerUUID;
    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleCreateShapeLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'createShapeLayer: host comp not found'; return result; }
    var layer = comp.layers.addShape();
    if (params.layerUUID) layer.comment = params.layerUUID;
    if (params.label) layer.name = params.label;
    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleAddCompAsLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'addCompAsLayer: host comp not found'; return result; }
    var precomp = findCompByUUID(params.nodeUUID);
    if (!precomp) { result.error = 'addCompAsLayer: pre-comp not found'; return result; }
    var layer = comp.layers.add(precomp);
    if (params.layerUUID) layer.comment = params.layerUUID;
    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleUnparkLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var reserved = findReservedComp();
    if (!reserved) { result.error = 'unparkLayer: reserved comp not found'; return result; }
    var hostComp = findCompByUUID(params.hostingCompUUID);
    if (!hostComp) { result.error = 'unparkLayer: host comp not found'; return result; }
    var layer = findLayerByUUID(reserved, params.nodeUUID);
    if (!layer) {
      var lj;
      for (lj = 1; lj <= reserved.numLayers; lj++) {
        var L = reserved.layer(lj);
        if (L.comment === params.nodeUUID) { layer = L; break; }
      }
    }
    if (!layer) { result.error = 'unparkLayer: layer not found in reserved comp'; return result; }
    layer.copyToComp(hostComp);
    layer.remove();
    if (params.layerUUID) {
      var hostLayer = findLayerByUUID(hostComp, params.nodeUUID);
      if (hostLayer) hostLayer.comment = params.layerUUID;
    }
    result.ok = true;
    result.data = { unparked: true };
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleDeletePathLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'deletePathLayer: host comp not found'; return result; }
    var layer = null;
    if (params.layerUUID) layer = findLayerByUUID(comp, params.layerUUID);
    if (!layer && params.nodeUUID) layer = findLayerByUUID(comp, params.nodeUUID);
    if (!layer) {
      var li;
      for (li = 1; li <= comp.numLayers; li++) {
        var L = comp.layer(li);
        if (params.layerUUID && L.comment === params.layerUUID) { layer = L; break; }
        if (params.nodeUUID && L.comment === params.nodeUUID) { layer = L; break; }
      }
    }
    if (layer) layer.remove();
    result.ok = true;
    result.data = { deleted: !!layer };
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleSetLayerProperty(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLayerProperty: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    if (!layerUUID) { result.error = 'setLayerProperty: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setLayerProperty: layer not found'; return result; }
    layer.property(params.key).setValue(params.value);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleSetCompProperty(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.nodeUUID);
    if (!comp) { result.error = 'setCompProperty: comp not found'; return result; }
    if (params.key === 'width')         comp.width = params.value;
    else if (params.key === 'height')   comp.height = params.value;
    else if (params.key === 'frameRate') comp.frameRate = params.value;
    else if (params.key === 'duration')  comp.duration = params.value;
    else if (params.key === 'bgColor')   comp.bgColor = params.value;
    else if (params.key === 'label')     comp.name = String(params.value);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleSetLayerParent(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLayerParent: host comp not found'; return result; }
    var childLayer = findLayerByUUID(comp, params.childNodeUUID);
    if (!childLayer) { result.error = 'setLayerParent: child layer not found'; return result; }
    if (params.parentNodeUUID) {
      var parentLayer = findLayerByUUID(comp, params.parentNodeUUID);
      if (!parentLayer) { result.error = 'setLayerParent: parent layer not found'; return result; }
      childLayer.parent = parentLayer;
    } else {
      childLayer.parent = null;
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleSetLayerOrder(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLayerOrder: host comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.layerUUID);
    if (!layer) { result.error = 'setLayerOrder: layer not found'; return result; }
    var dir = params.direction || 'top';
    if (dir === 'top') {
      layer.moveToBeginning();
    } else if (dir === 'up') {
      if (layer.index > 1) layer.moveBefore(comp.layer(layer.index - 1));
    } else if (dir === 'down') {
      if (layer.index < comp.numLayers) layer.moveAfter(comp.layer(layer.index + 1));
    }
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleRenameNode(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'renameNode: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.nodeUUID;
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'renameNode: layer not found'; return result; }
    layer.name = String(params.label);
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleFocusComp(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.nodeUUID);
    if (!comp) { result.error = 'focusComp: comp not found'; return result; }
    app.project.activeItem = comp;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

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

function _handleRestampLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'restampLayer: host comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.oldUUID);
    if (!layer) { result.error = 'restampLayer: layer not found'; return result; }
    layer.comment = params.newUUID;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handlePollAliveNodes(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var uuidList = JSON.parse(params.uuidListJSON || '[]');
    var present = [];
    var missing = [];
    var proj = app.project;
    var i, ci;
    for (i = 0; i < uuidList.length; i++) {
      var uid = uuidList[i];
      var found = false;
      for (ci = 1; ci <= proj.numItems; ci++) {
        var item = proj.item(ci);
        if (!(item instanceof CompItem)) continue;
        var li;
        for (li = 1; li <= item.numLayers; li++) {
          var layer = item.layer(li);
          if (layer.comment === uid) { found = true; break; }
        }
        if (found) break;
      }
      if (found) { present.push(uid); } else { missing.push(uid); }
    }
    result.ok = true;
    result.data = { present: present, missing: missing };
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleSetBlendingMode(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setBlendingMode: host comp not found'; return result; }
    var layerUUID = params.layerUUID || params.layerNodeUUID;
    if (!layerUUID) { result.error = 'setBlendingMode: layerUUID required'; return result; }
    var layer = findLayerByUUID(comp, layerUUID);
    if (!layer) { result.error = 'setBlendingMode: layer not found'; return result; }
    var BLEND_MAP = {
      'NORMAL':       BlendingMode.NORMAL,
      'ADD':          BlendingMode.ADD,
      'MULTIPLY':     BlendingMode.MULTIPLY,
      'SCREEN':       BlendingMode.SCREEN,
      'OVERLAY':      BlendingMode.OVERLAY,
      'DARKEN':       BlendingMode.DARKEN,
      'LIGHTEN':      BlendingMode.LIGHTEN,
      'COLOR_DODGE':  BlendingMode.COLOR_DODGE,
      'COLOR_BURN':   BlendingMode.COLOR_BURN,
      'HARD_LIGHT':   BlendingMode.HARD_LIGHT,
      'SOFT_LIGHT':   BlendingMode.SOFT_LIGHT,
      'DIFFERENCE':   BlendingMode.DIFFERENCE,
      'EXCLUSION':    BlendingMode.EXCLUSION,
      'HUE':          BlendingMode.HUE,
      'SATURATION':   BlendingMode.SATURATION,
      'COLOR':        BlendingMode.COLOR,
      'LUMINOSITY':   BlendingMode.LUMINOSITY
    };
    var mode = BLEND_MAP[params.mode];
    if (mode !== undefined) layer.blendingMode = mode;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleSetLumaMatte(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setLumaMatte: host comp not found'; return result; }
    var topLayer = findLayerByUUID(comp, params.topLayerUUID);
    if (!topLayer) { result.error = 'setLumaMatte: top layer not found'; return result; }
    var matteLayer = findLayerByUUID(comp, params.matteLayerUUID);
    if (!matteLayer) { result.error = 'setLumaMatte: matte layer not found'; return result; }
    matteLayer.moveAfter(topLayer);
    var trackMatte = topLayer.trackMatteType;
    topLayer.trackMatteType = TrackMatteType.LUMA;
    if (params.invert) topLayer.trackMatteType = TrackMatteType.LUMA_INVERTED;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleSetAlphaMatte(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'setAlphaMatte: host comp not found'; return result; }
    var topLayer = findLayerByUUID(comp, params.topLayerUUID);
    if (!topLayer) { result.error = 'setAlphaMatte: top layer not found'; return result; }
    var matteLayer = findLayerByUUID(comp, params.matteLayerUUID);
    if (!matteLayer) { result.error = 'setAlphaMatte: matte layer not found'; return result; }
    matteLayer.moveAfter(topLayer);
    topLayer.trackMatteType = params.invert ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleClearMatte(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'clearMatte: host comp not found'; return result; }
    var topLayerUUID = params.topLayerUUID || params.layerUUID;
    if (!topLayerUUID) { result.error = 'clearMatte: topLayerUUID required'; return result; }
    var topLayer = findLayerByUUID(comp, topLayerUUID);
    if (!topLayer) { result.error = 'clearMatte: top layer not found'; return result; }
    topLayer.trackMatteType = TrackMatteType.NO_TRACK_MATTE;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleReadGraph(cmd) {
  if (typeof PERSISTENCE === 'undefined' || !PERSISTENCE.readGraph) {
    return { ok: false, data: null, error: 'PERSISTENCE module not loaded' };
  }
  return PERSISTENCE.readGraph();
}

function _handleWriteGraph(cmd) {
  if (typeof PERSISTENCE === 'undefined' || !PERSISTENCE.writeGraph) {
    return { ok: false, data: null, error: 'PERSISTENCE module not loaded' };
  }
  var params = (cmd && cmd.params) ? cmd.params : null;
  if (!params) return { ok: false, data: null, error: 'writeGraph: params required' };
  return PERSISTENCE.writeGraph(params);
}

function _handleEnsureReservedComp(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findOrCreateReservedComp();
    result.ok = true;
    result.data = { compName: comp.name };
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleGeneric(cmd) {
  return {
    ok: false,
    data: null,
    error: 'No handler for action: ' + (cmd && cmd.action ? cmd.action : 'unknown')
  };
}

var _handlers = {
  'createComp':           _handleCreateComp,
  'deleteComp':           _handleDeleteComp,
  'createTextLayer':      _handleCreateTextLayer,
  'createNullLayer':      _handleCreateNullLayer,
  'createAdjustmentLayer': _handleCreateAdjustmentLayer,
  'createShapeLayer':     _handleCreateShapeLayer,
  'addCompAsLayer':       _handleAddCompAsLayer,
  'clearLayerParent':     _handleClearLayerParent,
  'parkLayer':            _handleParkLayer,
  'unparkLayer':          _handleUnparkLayer,
  'deleteParkedLayer':    _handleDeleteParkedLayer,
  'deletePathLayer':      _handleDeletePathLayer,
  'setLayerProperty':     _handleSetLayerProperty,
  'setCompProperty':      _handleSetCompProperty,
  'setLayerParent':       _handleSetLayerParent,
  'setLayerOrder':        _handleSetLayerOrder,
  'renameNode':           _handleRenameNode,
  'focusComp':            _handleFocusComp,
  'applyDynamicEffect':   _handleApplyDynamicEffect,
  'removeEffect':         _handleRemoveEffect,
  'setEffectProperty':    _handleSetEffectProperty,
  'restampLayer':         _handleRestampLayer,
  'pollAliveNodes':       _handlePollAliveNodes,
  'setBlendingMode':      _handleSetBlendingMode,
  'setLumaMatte':         _handleSetLumaMatte,
  'setAlphaMatte':        _handleSetAlphaMatte,
  'clearMatte':           _handleClearMatte,
  'readSchemaCache':      _handleReadSchemaCache,
  'writeSchemaCache':     _handleWriteSchemaCache,
  'getAEVersion':         _handleGetAEVersion,
  'introspectEffect':     _handleIntrospectEffect,
  'readGraph':            _handleReadGraph,
  'writeGraph':           _handleWriteGraph,
  'ensureReservedComp':   _handleEnsureReservedComp
};

// Public entry point called by evalBridge.
function dispatch(jsonStr) {
  var result = { ok: false, data: null, error: null };
  try {
    var cmd = JSON.parse(jsonStr);
    result = _route(cmd);
  } catch (e) {
    result.error = 'Dispatcher error: ' + e.toString();
  }
  return JSON.stringify(result);
}

// Public batch entry point — executes multiple commands sequentially
function dispatchBatch(jsonStr) {
  var result = { ok: false, data: null, error: null };
  try {
    var commands = JSON.parse(jsonStr);
    if (!commands || typeof commands.length !== 'number') {
      result.error = 'dispatchBatch: expected array of commands';
      return JSON.stringify(result);
    }
    var results = [];
    var i;
    for (i = 0; i < commands.length; i++) {
      var res = _route(commands[i]);
      results.push(res);
      if (!res.ok) {
        result.error = 'Command ' + i + ' failed: ' + res.error;
        return JSON.stringify(result);
      }
    }
    result.ok = true;
    result.data = results;
  } catch (e) {
    result.error = 'dispatchBatch error: ' + e.toString();
  }
  return JSON.stringify(result);
}

// Routes a parsed command object to the correct handler.
function _route(cmd) {
  if (!cmd || typeof cmd.action !== 'string') {
    return { ok: false, data: null, error: 'Invalid command: missing action' };
  }

  var handler = _handlers[cmd.action];
  if (!handler) {
    return _handleGeneric(cmd);
  }
  try {
    return handler(cmd);
  } catch (e) {
    return { ok: false, data: null, error: 'Handler error for ' + cmd.action + ': ' + e.toString() };
  }
}
