/**
 * @fileoverview Inspector param change/input/keydown event handlers.
 * Delegates change/input events on inspector param inputs to the engine.
 * Depends on: __ins_events._evalMathExpr, __ins_events._resolveLayerUUID, engine, graphState, evalBridge, __ins_vm_fmt, keyframeState, inspector, dirtyFlusher (globals).
 * Attaches to __ins_events.onInspectorChange, .onInspectorInput, .onInspectorKeydown.
 */
// ui/inspector/events/paramChange.js
// DEPENDS ON: ui/inspector/events/mathEval.js, ui/inspector/events/utils.js, graph/graphState.js, graph/engine/index.js, bridge/evalBridge.js

var __ins_events = __ins_events || {};

(function() {

  /**
   * Reads the target input, parses the value, and applies it via engine.setNodeProperty().
   * Auto-keyframes if the param is keyframed (dispatch without time = AE comp.time).
   * @param {HTMLElement} target The input element.
   */
  function _applyChange(target) {
    var nodeId = target.getAttribute('data-node-id');
    var key    = target.getAttribute('data-param-key');
    var type   = target.getAttribute('data-param-type');
    if (!nodeId || !key) return false;

    var raw = target.type === 'checkbox' ? target.checked : target.value;
    var didMath = false;
    if (typeof raw === 'string') {
      if (type === 'number') {
        var evaled = __ins_events._evalMathExpr(raw);
        if (evaled !== null) {
          raw = evaled;
          target.value = String(evaled);
          didMath = true;
        }
      } else if (type === 'vector2' || type === 'vector3') {
        var parts = raw.split(',');
        var out = [];
        var changed = false;
        for (var vi = 0; vi < parts.length; vi++) {
          var p = parts[vi].trim();
          var ev = __ins_events._evalMathExpr(p);
          if (ev !== null) {
            out.push(ev);
            changed = true;
          } else {
            out.push(parseFloat(p) || 0);
          }
        }
        if (changed) {
          raw = out.join(', ');
          target.value = raw;
          didMath = true;
        }
      }
    }
    engine.setNodeProperty(nodeId, key, __ins_vm_fmt.parseInputValue({ type: type, key: key }, raw));

    // auto-keyframe when a keyframed param is changed at a non-keyframe frame
    if (typeof keyframeState !== 'undefined' && keyframeState.isParamKeyframed(nodeId, key)) {
      var nodeData = graphState.getNode(nodeId);
      if (nodeData) {
        var hostUUID = nodeData.hostingComps && nodeData.hostingComps.length > 0 ? nodeData.hostingComps[0] : null;
        if (hostUUID) {
          var layerUUID = __ins_events._resolveLayerUUID(nodeId);
          if (layerUUID) {
            evalBridge.dispatch({
              action: 'addKeyframe',
              params: { hostingCompUUID: hostUUID, layerUUID: layerUUID, key: key, value: nodeData.props[key] }
            }).then(function(res) {
              if (res && res.ok) {
                var t = res.data && res.data.time != null ? res.data.time : null;
                if (t !== null) {
                  var existing = keyframeState.getKeyframeTimes(nodeId, key);
                  var merged = existing.slice();
                  if (merged.indexOf(t) === -1) { merged.push(t); merged.sort(); }
                  keyframeState.setKeyframes(nodeId, key, merged);
                }
              }
            });
          }
        }
      }
    }
    return didMath;
  }

  /**
   * Handles the 'change' event on inspector param inputs (checkbox, select,
   * and text input blur/Enter). Refreshes the inspector to re-evaluate
   * conditional enable/disable states. Auto-keyframes if param is keyframed.
   * @param {Event} e The change event.
   */
  function _onInspectorChange(e) {
    var target = e.target;
    if (!target || !target.classList || !target.classList.contains('inspector-param-input')) return;
    var didMath = _applyChange(target);
    if (typeof inspector !== 'undefined' && inspector.refresh) {
      if (didMath) {
        inspector.refresh(true);
      } else {
        inspector.refresh();
      }
    }
  }

  /**
   * Handles the 'input' event on inspector param inputs (text input keystrokes).
   * Updates the prop without a full DOM refresh so the input does not lose focus.
   * @param {Event} e The input event.
   */
  function _onInspectorInput(e) {
    var target = e.target;
    if (!target || !target.classList) return;
    if (!target.classList.contains('inspector-param-input')) return;
    if (target.type === 'checkbox') return;

    var nodeId = target.getAttribute('data-node-id');
    var key    = target.getAttribute('data-param-key');
    var type   = target.getAttribute('data-param-type');
    if (!nodeId || !key) return;

    var raw = target.value;
    // Skip live-update when typing a math expression (e.g. "600/2" or "600/2, 400")
    // to avoid sending partial values (6, 60, 600) to AE on each keystroke.
    if (typeof raw === 'string' && (type === 'number' || type === 'vector2' || type === 'vector3')) {
      var isExpr = false;
      var vals = raw.split(',');
      for (var vi = 0; vi < vals.length; vi++) {
        var v = vals[vi].trim();
        if (/[+\-*/%^]/.test(v) && !/^-?\d*\.?\d*$/.test(v)) { isExpr = true; break; }
      }
      if (isExpr) return;
    }
    graphState.updateProp(nodeId, key, __ins_vm_fmt.parseInputValue({ type: type, key: key }, raw));
    if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.schedule) dirtyFlusher.schedule();
  }

  /**
   * Handles keydown on inspector inputs. Triggers change handling on Enter
   * for text inputs, since CEP may not fire the 'change' event on Enter.
   * @param {Event} e The keydown event.
   */
  function _onInspectorKeydown(e) {
    if (e.key !== 'Enter') return;
    var target = e.target;
    if (!target || !target.classList || !target.classList.contains('inspector-param-input')) return;
    if (target.type === 'checkbox' || target.type === 'select-one') return;
    // Trigger the same behavior as a change event (evaluate, refresh)
    var didMath = _applyChange(target);
    if (typeof inspector !== 'undefined' && inspector.refresh) {
      inspector.refresh(didMath || undefined);
    }
  }

  __ins_events.onInspectorChange = _onInspectorChange;
  __ins_events.onInspectorInput  = _onInspectorInput;
  __ins_events.onInspectorKeydown = _onInspectorKeydown;

})();
