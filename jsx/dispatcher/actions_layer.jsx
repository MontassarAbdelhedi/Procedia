/**
 * @fileoverview Barrel loader for split actionLayer handlers. (ES3-safe)
 * Loads each handler file from actionLayer/ in dependency order.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actions_layer.jsx — Barrel loader for actionLayer/*.jsx (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

var _layerDir = $.fileName.replace(/[\/\\][^\/\\]+$/, '') + '/actionLayer/';
$.evalFile(_layerDir + 'createTextLayer.jsx');
$.evalFile(_layerDir + 'createCameraLayer.jsx');
$.evalFile(_layerDir + 'createLightLayer.jsx');
$.evalFile(_layerDir + 'createNullLayer.jsx');
$.evalFile(_layerDir + 'createAdjustmentLayer.jsx');
$.evalFile(_layerDir + 'createShapeLayer.jsx');
$.evalFile(_layerDir + 'createSolidLayer.jsx');
$.evalFile(_layerDir + 'createRectangleLayer.jsx');
$.evalFile(_layerDir + 'createEllipseLayer.jsx');
$.evalFile(_layerDir + 'createStarLayer.jsx');
$.evalFile(_layerDir + 'createSquircleLayer.jsx');
$.evalFile(_layerDir + 'createGearLayer.jsx');
$.evalFile(_layerDir + 'createWaveLayer.jsx');
$.evalFile(_layerDir + 'createFlowerLayer.jsx');
$.evalFile(_layerDir + 'createPolygonLayer.jsx');
$.evalFile(_layerDir + 'addCompAsLayer.jsx');
$.evalFile(_layerDir + 'deletePathLayer.jsx');
$.evalFile(_layerDir + 'renameNode.jsx');
$.evalFile(_layerDir + 'setLayerEnabled.jsx');
$.evalFile(_layerDir + 'setLayerShy.jsx');
$.evalFile(_layerDir + 'setCompHideShyLayers.jsx');
$.evalFile(_layerDir + 'restampLayer.jsx');
