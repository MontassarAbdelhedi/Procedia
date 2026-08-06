/**
 * @fileoverview Barrel loader for split actionComp handlers. (ES3-safe)
 * Loads each handler file from actionComp/ in dependency order.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 */
// actions_comp.jsx — Barrel loader for actionComp/*.jsx (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

var _compDir = $.fileName.replace(/[\/\\][^\/\\]+$/, '') + '/actionComp/';
$.evalFile(_compDir + 'reservedComp.jsx');
$.evalFile(_compDir + 'compLifecycle.jsx');
$.evalFile(_compDir + 'compProject.jsx');
