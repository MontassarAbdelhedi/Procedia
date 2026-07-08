/**
 * @fileoverview Keyframe state management module.
 * Tracks which params have keyframes, keyframe times, and current playhead time.
 * Data stored in graphState's internal state under _keyframes.
 * Depends on: graphState (global).
 * Exports: keyframeState
 */
// graph/keyframeState.js
// DEPENDS ON: graph/graphState
// MUST LOAD BEFORE: ui/inspector/viewModel.js, graph/canvas/renderer/helpers.js

var keyframeState = (function() {

  var TIME_TOLERANCE = 0.01;

  function _ensureState() {
    var gs = window.__gs || window.graphState;
    if (!gs._keyframes) gs._keyframes = {};
    return gs._keyframes;
  }

  function _ensureParam(nodeId, paramKey) {
    var store = _ensureState();
    if (!store[nodeId]) store[nodeId] = {};
    if (!store[nodeId][paramKey]) store[nodeId][paramKey] = { keyframed: false, times: [] };
    return store[nodeId][paramKey];
  }

  function _getCurrentTime() {
    var gs = window.__gs || window.graphState;
    return gs._playheadTime || 0;
  }

  function hasKeyframes(nodeId, paramKey) {
    var store = _ensureState();
    if (!store[nodeId] || !store[nodeId][paramKey]) return false;
    return store[nodeId][paramKey].keyframed === true;
  }

  function isPlayheadOnKeyframe(nodeId, paramKey) {
    if (!hasKeyframes(nodeId, paramKey)) return false;
    var current = _getCurrentTime();
    var entry = _ensureParam(nodeId, paramKey);
    for (var i = 0; i < entry.times.length; i++) {
      if (Math.abs(entry.times[i] - current) < TIME_TOLERANCE) return true;
    }
    return false;
  }

  function setKeyframes(nodeId, paramKey, times) {
    if (!Array.isArray(times)) return;
    var entry = _ensureParam(nodeId, paramKey);
    entry.keyframed = true;
    entry.times = times.slice();
  }

  function clearKeyframes(nodeId, paramKey) {
    var store = _ensureState();
    if (store[nodeId]) {
      delete store[nodeId][paramKey];
      var hasAny = false;
      for (var k in store[nodeId]) {
        if (store[nodeId].hasOwnProperty(k)) { hasAny = true; break; }
      }
      if (!hasAny) delete store[nodeId];
    }
  }

  function getNextKeyframeTime(nodeId, paramKey) {
    if (!hasKeyframes(nodeId, paramKey)) return null;
    var current = _getCurrentTime();
    var entry = _ensureParam(nodeId, paramKey);
    var next = null;
    for (var i = 0; i < entry.times.length; i++) {
      if (entry.times[i] > current + TIME_TOLERANCE) {
        if (next === null || entry.times[i] < next) next = entry.times[i];
      }
    }
    return next;
  }

  function getPrevKeyframeTime(nodeId, paramKey) {
    if (!hasKeyframes(nodeId, paramKey)) return null;
    var current = _getCurrentTime();
    var entry = _ensureParam(nodeId, paramKey);
    var prev = null;
    for (var i = 0; i < entry.times.length; i++) {
      if (entry.times[i] < current - TIME_TOLERANCE) {
        if (prev === null || entry.times[i] > prev) prev = entry.times[i];
      }
    }
    return prev;
  }

  function getAllKeyframedParams(nodeId) {
    var store = _ensureState();
    var params = [];
    if (!store[nodeId]) return params;
    for (var key in store[nodeId]) {
      if (store[nodeId].hasOwnProperty(key) && store[nodeId][key].keyframed) {
        params.push(key);
      }
    }
    return params;
  }

  function setCurrentTime(time) {
    var gs = window.__gs || window.graphState;
    gs._playheadTime = typeof time === 'number' ? time : 0;
  }

  function getCurrentTime() {
    return _getCurrentTime();
  }

  function getKeyframeState(nodeId, paramKey) {
    if (!hasKeyframes(nodeId, paramKey)) return 'inactive';
    if (isPlayheadOnKeyframe(nodeId, paramKey)) return 'highlight';
    return 'active';
  }

  function getKeyframeTimes(nodeId, paramKey) {
    var store = _ensureState();
    if (!store[nodeId] || !store[nodeId][paramKey]) return [];
    return store[nodeId][paramKey].times.slice();
  }

  return {
    hasKeyframes:           hasKeyframes,
    isParamKeyframed:       hasKeyframes,
    isPlayheadOnKeyframe:   isPlayheadOnKeyframe,
    setKeyframes:           setKeyframes,
    clearKeyframes:         clearKeyframes,
    getNextKeyframeTime:    getNextKeyframeTime,
    getPrevKeyframeTime:    getPrevKeyframeTime,
    getAllKeyframedParams:  getAllKeyframedParams,
    setCurrentTime:         setCurrentTime,
    getCurrentTime:         getCurrentTime,
    getKeyframeState:       getKeyframeState,
    getKeyframeTimes:       getKeyframeTimes
  };

})();
