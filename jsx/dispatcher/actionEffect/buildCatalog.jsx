/**
 * @fileoverview Effect catalog-building actions.
 * enumerateAllEffects walks AE's app.effects enumeration and returns the
 * catalog; buildFullEffectCatalog writes it to data/effectsCatalog.json
 * (developer utility). (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 */
// actionEffect/buildCatalog.jsx — Effect catalog building actions (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _handleEnumerateAllEffects(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var list = [];
    var count = app.effects.length;
    for (var i = 0; i < count; i++) {
      var fx = app.effects[i];
      list.push({
        matchName:  fx.matchName,
        displayName: fx.displayName,
        category:   fx.category,
        version:    fx.version
      });
    }
    result.ok = true;
    result.data = { effects: list, count: count };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleBuildFullEffectCatalog(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var list = [];
    var count = app.effects.length;
    for (var i = 0; i < count; i++) {
      var fx = app.effects[i];
      list.push({
        matchName:  fx.matchName,
        displayName: fx.displayName,
        category:   fx.category,
        version:    fx.version
      });
    }
    var catalog = { aeVersion: app.version, effects: list };
    var catalogFile = new File(_pluginRootFolder().fsName + '/data/effectsCatalog.json');
    catalogFile.open('w');
    catalogFile.write(JSON.stringify(catalog));
    catalogFile.close();
    result.ok = true;
    result.data = { written: catalogFile.fsName, count: count };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
