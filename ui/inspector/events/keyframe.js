/**
 * @fileoverview Keyframe icon click handlers for the inspector.
 * Handles diamond toggle (add/remove keyframe) and arrow navigation (prev/next keyframe).
 * Depends on: __ins_events._resolveLayerUUID, graphState, evalBridge, keyframeState, inspector, renderer (globals).
 * Attaches to __ins_events.onKeyframeIconClick.
 */
// ui/inspector/events/keyframe.js
// DEPENDS ON: ui/inspector/events/utils.js, graph/graphState.js, bridge/evalBridge.js, graph/keyframeState.js

var __ins_events = __ins_events || {};

(function() {

  /**
   * Navigates the AE playhead to the previous or next keyframe for a param,
   * then reads the keyframed value from AE and updates local state.
   */
  function _navigateKeyframe(nodeId, paramKey, hostUUID, layerUUID, direction) {
    var time = direction === 'prev'
      ? keyframeState.getPrevKeyframeTime(nodeId, paramKey)
      : keyframeState.getNextKeyframeTime(nodeId, paramKey);
    if (time === null) return;

    evalBridge.dispatch({
      action: 'setCurrentTime',
      params: { hostingCompUUID: hostUUID, time: time }
    }).then(function() {
      keyframeState.setCurrentTime(time);
      return evalBridge.dispatch({
        action: 'batchGetLayerProperties',
        params: {
          entries: [{ hostingCompUUID: hostUUID, layerUUID: layerUUID, keys: [paramKey] }]
        }
      });
    }).then(function(res) {
      if (res.ok && res.data && res.data.properties) {
        var aeValues = res.data.properties[layerUUID];
        if (aeValues && aeValues[paramKey] !== undefined) {
          var node = graphState.getNode(nodeId);
          if (node) { node.props[paramKey] = aeValues[paramKey]; }
        } else {
          console.warn('[inspector] navigateKeyframe: AE value not found for', paramKey, '@ layer', layerUUID);
        }
      } else {
        console.warn('[inspector] navigateKeyframe: batchGetLayerProperties failed:', res);
      }
      if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
      if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
    }).catch(function(err) {
      console.warn('[inspector] navigateKeyframe error:', err);
    });
  }

  /**
   * Handles clicks on keyframe icons in param rows.
   * Left/right arrows navigate playhead to prev/next keyframe.
   * Diamond click toggles keyframe: add if none/off-playhead, remove if on-playhead.
   * @param {Event} e The click event.
   */
  function _onKeyframeIconClick(e) {
    var target = e.target.closest('.kf-icon');
    if (!target) return;

    var nodeId = target.getAttribute('data-node-id');
    var paramKey = target.getAttribute('data-param-key');
    if (!nodeId || !paramKey) return;

    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;

    var hostUUID = nodeData.hostingComps && nodeData.hostingComps.length > 0 ? nodeData.hostingComps[0] : null;
    if (!hostUUID) return;

    var layerUUID = __ins_events._resolveLayerUUID(nodeId);
    if (!layerUUID) {
      console.warn('[inspector] keyframe: no layer UUID found for ' + nodeId);
      return;
    }

    // Arrow navigation
    if (e.target.classList.contains('kf-arrow-left')) {
      _navigateKeyframe(nodeId, paramKey, hostUUID, layerUUID, 'prev');
      return;
    }
    if (e.target.classList.contains('kf-arrow-right')) {
      _navigateKeyframe(nodeId, paramKey, hostUUID, layerUUID, 'next');
      return;
    }

    // Diamond click — merge new time with existing times
    function _updateTimes(res, merging) {
      if (res && res.ok) {
        var t = res.data && res.data.time != null ? res.data.time : null;
        if (t !== null) {
          var existing = merging ? keyframeState.getKeyframeTimes(nodeId, paramKey) : [];
          var merged = existing.slice();
          if (merged.indexOf(t) === -1) { merged.push(t); merged.sort(); }
          keyframeState.setKeyframes(nodeId, paramKey, merged);
        } else {
          keyframeState.setKeyframes(nodeId, paramKey, []);
        }
        if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
        if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
      } else {
        console.warn('[inspector] keyframe action failed:', res && res.error);
      }
    }

    if (typeof keyframeState !== 'undefined' && keyframeState.isParamKeyframed(nodeId, paramKey)) {
      if (keyframeState.isPlayheadOnKeyframe(nodeId, paramKey)) {
        evalBridge.dispatch({
          action: 'removeKeyframe',
          params: { hostingCompUUID: hostUUID, layerUUID: layerUUID, key: paramKey }
        }).then(function(res) {
          if (res && res.ok) {
            keyframeState.clearKeyframes(nodeId, paramKey);
            if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
            if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
          } else {
            console.warn('[inspector] removeKeyframe failed:', res && res.error);
          }
        });
      } else {
        evalBridge.dispatch({
          action: 'addKeyframe',
          params: { hostingCompUUID: hostUUID, layerUUID: layerUUID, key: paramKey, value: nodeData.props[paramKey] }
        }).then(function(res) { _updateTimes(res, true); });
      }
    } else {
      evalBridge.dispatch({
        action: 'addKeyframe',
        params: { hostingCompUUID: hostUUID, layerUUID: layerUUID, key: paramKey, value: nodeData.props[paramKey] }
      }).then(function(res) { _updateTimes(res, false); });
    }
  }

  __ins_events.onKeyframeIconClick = _onKeyframeIconClick;

})();
