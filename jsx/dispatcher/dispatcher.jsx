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

function _handleGeneric(cmd) {
  return {
    ok: false,
    data: null,
    error: 'No handler for action: ' + (cmd && cmd.action ? cmd.action : 'unknown')
  };
}

var _handlers = {
  'createComp':         _handleCreateComp,
  'deleteComp':         _handleDeleteComp,
  'createTextLayer':    _handleCreateTextLayer,
  'createNullLayer':    _handleCreateNullLayer,
  'clearLayerParent':   _handleClearLayerParent,
  'parkLayer':          _handleParkLayer,
  'deleteParkedLayer':  _handleDeleteParkedLayer,
  'readSchemaCache':    _handleReadSchemaCache,
  'writeSchemaCache':   _handleWriteSchemaCache,
  'getAEVersion':       _handleGetAEVersion,
  'introspectEffect':   _handleIntrospectEffect
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
