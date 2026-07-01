/**
 * @fileoverview Barrel loader for split actionKeyframe handlers (ES3-safe).
 * Loads each handler file from actionKeyframe/ in dependency order.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: _handleAddKeyframe, _handleRemoveAllKeyframes, _handleGetKeyframeTimes,
 *          _handleBatchGetKeyframeTimes, _handleRemoveKeyframe, _handleGetCurrentTime,
 *          _handleSetCurrentTime, _handleGetKeyframeData
 */
// actions_keyframe.jsx — Barrel loader for actionKeyframe/*.jsx (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

var _kfDir = $.fileName.replace(/[\/\\][^\/\\]+$/, '') + '/actionKeyframe/';
$.evalFile(_kfDir + 'shared.jsx');
$.evalFile(_kfDir + 'add.jsx');
$.evalFile(_kfDir + 'remove.jsx');
$.evalFile(_kfDir + 'times.jsx');
$.evalFile(_kfDir + 'currentTime.jsx');
$.evalFile(_kfDir + 'data.jsx');
