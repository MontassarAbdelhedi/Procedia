/**
 * @fileoverview Applies a dynamic effect to a layer. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx, applyActionEffect/findPropByMatchName.jsx
 * Load BEFORE: dispatcher.jsx
 */
// applyActionEffect/applyDynamicEffect.jsx — Apply dynamic effect handler (ES3-safe)

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
    var effects = layer.Effects;
    var effect = effects.addProperty(params.matchName);
    if (params.nodeUUID) {
      effect.name = params.matchName + '__' + params.nodeUUID;
    }
    if (params.props) {
      for (var pk in params.props) {
        if (!params.props.hasOwnProperty(pk)) continue;
        try {
          var prop = _findPropByMatchName(effect, pk);
          if (prop) prop.setValue(params.props[pk]);
        } catch (propErr) {}
      }
    }
    if (!params._moveToBottom) {
      effect.moveToBeginning();
    }
    result.ok = true;
    result.data = { applied: params.matchName };
  } catch (e) { result.error = e.toString(); }
  return result;
}
