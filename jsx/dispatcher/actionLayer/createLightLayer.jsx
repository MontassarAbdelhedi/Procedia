function _handleCreateLightLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) {
      result.error = 'createLightLayer: host comp not found: ' + params.hostingCompUUID;
      return result;
    }
    var lightLayer = comp.layers.addLight(params.label || 'Light', [comp.width / 2, comp.height / 2]);
    if (params.lightType) {
      var lightTypeMap = { point: 1, spot: 2, parallel: 3, ambient: 4 };
      try { lightLayer.lightType = lightTypeMap[params.lightType] || 1; } catch (e) {}
    }
    if (params.layerUUID) {
      lightLayer.comment = params.layerUUID;
    }
    if (params.label) {
      lightLayer.name = params.label;
    }
    if (params.intensity !== undefined && params.intensity !== null) {
      try { lightLayer.intensity.setValue(params.intensity); } catch (e) {}
    }
    if (params.color !== undefined && params.color !== null) {
      try { lightLayer.color.setValue(params.color); } catch (e) {}
    }
    if (params.coneAngle !== undefined && params.coneAngle !== null) {
      try { lightLayer.coneAngle.setValue(params.coneAngle); } catch (e) {}
    }
    if (params.coneFeather !== undefined && params.coneFeather !== null) {
      try { lightLayer.coneFeather.setValue(params.coneFeather); } catch (e) {}
    }
    if (params.castsShadows !== undefined && params.castsShadows !== null) {
      try { lightLayer.castsShadows = params.castsShadows; } catch (e) {}
    }
    if (params.shadowDarkness !== undefined && params.shadowDarkness !== null) {
      try { lightLayer.shadowDarkness.setValue(params.shadowDarkness); } catch (e) {}
    }
    if (params.shadowDiffusion !== undefined && params.shadowDiffusion !== null) {
      try { lightLayer.shadowDiffusion.setValue(params.shadowDiffusion); } catch (e) {}
    }
    if (params.position && params.position.length === 3) {
      try { lightLayer.position.setValue(params.position); } catch (e) {}
    }
    if (params.rotation !== undefined && params.rotation !== null) {
      try { lightLayer.rotation.setValue(params.rotation); } catch (e) {}
    }
    if (params.opacity !== undefined && params.opacity !== null) {
      try { lightLayer.opacity.setValue(params.opacity); } catch (e) {}
    }
    result.ok = true;
    result.data = { layerName: lightLayer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
