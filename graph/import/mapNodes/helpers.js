/**
 * graph/import/mapNodes/helpers.js
 *
 * Internal helpers for mapping AE project items to Procedia nodes.
 * Also declares the __imp_nodes container, grid-positioning, type-mapping,
 * and known-effect lookup.
 *
 * Dependencies: nodeRegistry, uuidGenerator
 * Load before: graph/import/mapNodes/buildItems.js, graph/import/mapNodes/buildEffects.js
 */

// graph/import/mapNodes/helpers.js
// DEPENDS ON: graph/nodeRegistry.js, data/uuidGenerator.js
// MUST LOAD BEFORE: graph/import/mapNodes/buildItems.js, graph/import/mapNodes/buildEffects.js,
//                   graph/import/mapWires.js, graph/import/builder.js
// FIRST IN LOAD ORDER among mapNodes/ sub-files

var __imp_nodes = {};

(function() {

  function _rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function _gridPos(index, cols) {
    var col = index % cols;
    var row = Math.floor(index / cols);
    return { x: 50 + col * 220, y: 50 + row * 180 };
  }

  function aeTypeToNodeType(aeLayerType) {
    var map = {
      'text':       'layers/text',
      'camera':     'layers/camera',
      'null':       'layers/null',
      'shape':      'layers/shape',
      'adjustment': 'layers/adjustment',
      'solid':      'layers/solid',
      'footage':    'core/footage',
      'precomp':    null
    };
    return map.hasOwnProperty(aeLayerType) ? map[aeLayerType] : null;
  }

  function _nodeKindForType(type) {
    var def = nodeRegistry.getDefinition(type);
    return def ? def.nodeKind : 'affected';
  }

  function _dedicatedForType(type) {
    var def = nodeRegistry.getDefinition(type);
    return def ? def.dedicated : true;
  }

  var KNOWN_EFFECT_MATCHNAMES = {
    'ADBE Fill':             'generate/fill',
    'ADBE Gaussian Blur':    'blur-sharpen/gaussian-blur',
    'ADBE Drop Shadow':      'perspective/drop-shadow'
  };

  (function _buildEffectMapFromMetadata() {
    var meta = (typeof window !== 'undefined') ? window.NODE_METADATA : null;
    if (!meta) return;
    for (var nodeType in meta) {
      if (!meta.hasOwnProperty(nodeType)) continue;
      var entry = meta[nodeType];
      if (!entry || !entry.matchName) continue;
      if (!KNOWN_EFFECT_MATCHNAMES.hasOwnProperty(entry.matchName)) {
        KNOWN_EFFECT_MATCHNAMES[entry.matchName] = nodeType;
      }
    }
  })();

  function isKnownEffect(matchName) {
    return KNOWN_EFFECT_MATCHNAMES.hasOwnProperty(matchName);
  }

  function knownEffectType(matchName) {
    return KNOWN_EFFECT_MATCHNAMES[matchName] || 'effects/unknown';
  }

  function getKnownEffectMatchNames() {
    var keys = [];
    for (var k in KNOWN_EFFECT_MATCHNAMES) {
      if (KNOWN_EFFECT_MATCHNAMES.hasOwnProperty(k)) keys.push(k);
    }
    return keys;
  }

  __imp_nodes._rand = _rand;
  __imp_nodes._gridPos = _gridPos;
  __imp_nodes.aeTypeToNodeType = aeTypeToNodeType;
  __imp_nodes._nodeKindForType = _nodeKindForType;
  __imp_nodes._dedicatedForType = _dedicatedForType;
  __imp_nodes.isKnownEffect = isKnownEffect;
  __imp_nodes.knownEffectType = knownEffectType;
  __imp_nodes.getKnownEffectMatchNames = getKnownEffectMatchNames;

})();
