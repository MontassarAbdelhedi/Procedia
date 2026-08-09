/**
 * @fileoverview Cloner data-layer finder (ES3-safe).
 * Locates the __PROCEDIA_CL_DATA__ hidden text layer in an internal
 * cloner comp and parses its stored JSON state.
 * REQUIRES: json.jsx
 * Load BEFORE: clonerUpdate.jsx
 * Exports: _findClonerDataLayer
 */
// cloner/findDataLayer.jsx — Cloner data-layer finder & JSON parser (ES3-safe)
// REQUIRES: json.jsx

/**
 * Finds the __PROCEDIA_CL_DATA__ text layer and parses its JSON.
 * @param {CompItem} internComp - The internal cloner comp.
 * @return {Object|null} { jsonLayer: TextLayer, storedData: Object } or null
 */
function _findClonerDataLayer(internComp) {
  var jsonLayer = null;
  for (var jk = 1; jk <= internComp.numLayers; jk++) {
    var JL = internComp.layer(jk);
    if (JL instanceof TextLayer && JL.name === '__PROCEDIA_CL_DATA__') {
      jsonLayer = JL;
      break;
    }
  }
  if (!jsonLayer) return null;

  var jsonText = jsonLayer.property('ADBE Text Properties').property('ADBE Text Document').value;
  var storedData = JSON.parse(jsonText.toString());
  if (!storedData) return null;

  return { jsonLayer: jsonLayer, storedData: storedData };
}
