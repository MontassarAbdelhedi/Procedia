/**
 * @fileoverview Barrel loader for split applyActionEffect handlers. (ES3-safe)
 * Loads each handler file from applyActionEffect/ in dependency order.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 */
// actionEffect/apply.jsx — Barrel loader for applyActionEffect/*.jsx (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

var _effectDir = $.fileName.replace(/[\/\\][^\/\\]+$/, '').replace(/[\/\\][^\/\\]+$/, '') + '/applyActionEffect/';
$.evalFile(_effectDir + 'findPropByMatchName.jsx');
$.evalFile(_effectDir + 'applyDynamicEffect.jsx');
$.evalFile(_effectDir + 'removeEffect.jsx');
$.evalFile(_effectDir + 'setEffectProperty.jsx');
$.evalFile(_effectDir + 'setEffectEnabled.jsx');
$.evalFile(_effectDir + 'reorderEffect.jsx');
$.evalFile(_effectDir + 'reorderEffectChain.jsx');
$.evalFile(_effectDir + 'renameEffect.jsx');
