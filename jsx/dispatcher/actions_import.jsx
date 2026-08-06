/**
 * @fileoverview Barrel loader for import scan handlers. (ES3-safe)
 * Loads each handler file from actionImport/ in dependency order.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actions_import.jsx — Barrel loader for actionImport/*.jsx (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

var _importDir = $.fileName.replace(/[\/\\][^\/\\]+$/, '') + '/actionImport/';
$.evalFile(_importDir + 'scanComps.jsx');
$.evalFile(_importDir + 'scanFootage.jsx');
$.evalFile(_importDir + 'scanCompLayers/layerType.jsx');
$.evalFile(_importDir + 'scanCompLayers/readProps.jsx');
$.evalFile(_importDir + 'scanCompLayers/scanEffects.jsx');
$.evalFile(_importDir + 'scanCompLayers/maps.jsx');
$.evalFile(_importDir + 'scanCompLayers/buildEntry.jsx');
$.evalFile(_importDir + 'scanCompLayers.jsx');
$.evalFile(_importDir + 'stampUUIDs.jsx');
