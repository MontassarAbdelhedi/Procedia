/**
 * @fileoverview Effect introspection handler — discovers property schema for
 * a given effect matchName by applying it to a temp solid in the Reserved Comp.
 * Delegates skip-browse lookup to introspect/constants.jsx and property
 * walking to introspect/walk.jsx. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx, introspect/constants.jsx, introspect/walk.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 */
// actionEffect/introspect.jsx — Effect introspection handler (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, introspect/constants.jsx, introspect/walk.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _handleIntrospectEffect(cmd) {
  var result = { ok: false, data: null, error: null };
  var tempLayer = null;
  var savedDialogs = null;
  try {
    var params = _cmdParams(cmd);
    if (!params.matchName) {
      result.error = 'introspectEffect: matchName required';
      return result;
    }

    if (_INTROSPECT_SKIP_BROWSE[params.matchName]) {
      result.error = 'Skipped: ' + params.matchName + ' opens a browse modal';
      return result;
    }

    savedDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;

    var reservedComp = findReservedComp();
    if (!reservedComp) {
      app.displayDialogs = savedDialogs;
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
      app.displayDialogs = savedDialogs;
      result.error = 'Effect not found in AE: ' + params.matchName;
      return result;
    }

    var schema = [];
    _walkProperties(effect, schema);

    effect.remove();
    tempLayer.remove();
    tempLayer = null;

    if (savedDialogs !== null) app.displayDialogs = savedDialogs;

    result.ok = true;
    result.data = { matchName: params.matchName, properties: schema };
  } catch (e) {
    if (tempLayer) {
      try { tempLayer.remove(); } catch (ignoreErr) {}
    }
    if (savedDialogs !== null) app.displayDialogs = savedDialogs;
    result.error = e.toString();
  }
  return result;
}
