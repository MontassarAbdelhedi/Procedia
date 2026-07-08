/**
 * @fileoverview Creates a text layer in the hosting comp. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionLayer/createTextLayer.jsx — Create text layer handler (ES3-safe)

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
    if (params.label) {
      textLayer.name = params.label;
    }
    if (params.position && params.position.length === 2) {
      try { textLayer.position.setValue(params.position); } catch (e) {}
    }
    if (params.rotation !== undefined && params.rotation !== null) {
      try { textLayer.rotation.setValue(params.rotation); } catch (e) {}
    }
    if (params.opacity !== undefined && params.opacity !== null) {
      try { textLayer.opacity.setValue(params.opacity); } catch (e) {}
    }
    if (params.fontSize !== undefined && params.fontSize !== null) {
      try {
        var textDoc = textLayer.text.sourceText.value;
        if (textDoc) {
          textDoc.fontSize = params.fontSize;
          textLayer.text.sourceText.setValue(textDoc);
        }
      } catch (e) {}
    }
    if (params.color && params.color.length >= 3) {
      try {
        var textDoc = textLayer.text.sourceText.value;
        if (textDoc) {
          // ThreeDColor expects [R, G, B] — strip alpha to avoid type mismatch
          textDoc.fillColor = [params.color[0], params.color[1], params.color[2]];
          textLayer.text.sourceText.setValue(textDoc);
        }
      } catch (e) {}
    }
    result.ok = true;
    result.data = { layerName: textLayer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
