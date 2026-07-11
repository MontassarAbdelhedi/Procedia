/**
 * @fileoverview Inspector event handlers. Delegates change/input events on
 * inspector param inputs to the engine, and handles recovery/layer action clicks.
 * Depends on: engine, graphState, evalBridge, __ins_vm, inspector, wireRenderer, statusBar (globals).
 * Exports: __ins_events.onInspectorChange, .onInspectorInput, .onLayerActionClick
 */
// ui/inspector/events.js
// DEPENDS ON: graph/graphState.js, graph/engine/index.js, bridge/evalBridge.js
// MUST LOAD BEFORE: ui/inspector/index.js

var __ins_events = (function() {

  /**
   * Tokenizes and evaluates a math expression using recursive descent.
   * Supports: +, -, *, /, %, ^, parentheses, decimals, unary minus.
   * @param {string} str The math expression string.
   * @return {number|null} The evaluated result, or null if invalid.
   */
  function _evalMathExpr(str) {
    if (typeof str !== 'string') return null;
    var s = str.trim().replace(/\s/g, '');
    if (s === '') return null;
    if (!/^[\d+\-*/().,%^]+$/.test(s)) return null;
    if (!/[+\-*/%^]/.test(s)) return null;

    // Tokenize
    var tokens = [];
    var i = 0;
    while (i < s.length) {
      var ch = s[i];
      if (ch >= '0' && ch <= '9') {
        var num = '';
        while (i < s.length && ((s[i] >= '0' && s[i] <= '9') || s[i] === '.')) {
          num += s[i];
          i++;
        }
        tokens.push({ t: 'num', v: parseFloat(num) });
      } else if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '^') {
        tokens.push({ t: 'op', v: ch });
        i++;
      } else if (ch === '(' || ch === ')') {
        tokens.push({ t: ch === '(' ? 'lp' : 'rp', v: ch });
        i++;
      } else {
        return null;
      }
    }

    // Handle unary minus: convert '-num' or '(-num' patterns
    var j = 0;
    while (j < tokens.length) {
      if (tokens[j].t === 'op' && tokens[j].v === '-') {
        var prev = j > 0 ? tokens[j-1] : null;
        if (!prev || prev.t === 'lp' || (prev.t === 'op' && prev.v !== ')')) {
          tokens[j].unary = true;
        }
      }
      j++;
    }

    var pos = 0;
    function peek() { return pos < tokens.length ? tokens[pos] : null; }
    function consume() { return pos < tokens.length ? tokens[pos++] : null; }

    function parseExpr() {
      var left = parseTerm();
      while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
        var op = consume().v;
        var right = parseTerm();
        if (right === null) return null;
        left = op === '+' ? left + right : left - right;
      }
      return left;
    }

    function parseTerm() {
      var left = parseFactor();
      while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/' || peek().v === '%')) {
        var op = consume().v;
        var right = parseFactor();
        if (right === null) return null;
        if (op === '*') left = left * right;
        else if (op === '/') left = right !== 0 ? left / right : 0;
        else left = left % right;
      }
      return left;
    }

    function parseFactor() {
      if (!peek()) return null;
      if (peek().t === 'num') {
        var tok = consume();
        // Handle ^ (right-associative)
        if (peek() && peek().t === 'op' && peek().v === '^') {
          consume();
          var exp = parseFactor();
          if (exp === null) return null;
          return Math.pow(tok.v, exp);
        }
        return tok.v;
      }
      if (peek().t === 'lp') {
        consume(); // '('
        var val = parseExpr();
        if (!peek() || peek().t !== 'rp') return null;
        consume(); // ')'
        // Handle ^ after parenthesized expression
        if (peek() && peek().t === 'op' && peek().v === '^') {
          consume();
          var exp2 = parseFactor();
          if (exp2 === null) return null;
          return Math.pow(val, exp2);
        }
        return val;
      }
      if (peek().t === 'op' && peek().unary) {
        consume(); // '-'
        var operand = parseFactor();
        if (operand === null) return null;
        return -operand;
      }
      return null;
    }

    var result = parseExpr();
    if (result === null || pos !== tokens.length) return null;
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return result;
  }

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
        var evaled = _evalMathExpr(raw);
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
          var ev = _evalMathExpr(p);
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
    engine.setNodeProperty(nodeId, key, __ins_vm.parseInputValue({ type: type, key: key }, raw));

    // auto-keyframe when a keyframed param is changed at a non-keyframe frame
    if (typeof keyframeState !== 'undefined' && keyframeState.isParamKeyframed(nodeId, key)) {
      var nodeData = graphState.getNode(nodeId);
      if (nodeData) {
        var hostUUID = nodeData.hostingComps && nodeData.hostingComps.length > 0 ? nodeData.hostingComps[0] : null;
        if (hostUUID) {
          var layerUUID = _resolveLayerUUID(nodeId);
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
    graphState.updateProp(nodeId, key, __ins_vm.parseInputValue({ type: type, key: key }, raw));
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

  /**
   * Handles clicks on layer order buttons (Move Up / Move Down).
   * @param {Event} e The click event.
   */
  function _onLayerActionClick(e) {
    var btn = e.target;
    if (!btn || !btn.classList || !btn.classList.contains('inspector-layer-btn')) return;

    var nodeId = btn.getAttribute('data-node-id');
    var hostUUID = btn.getAttribute('data-host-uuid');
    var direction = btn.getAttribute('data-direction') || 'top';
    if (!nodeId || !hostUUID) return;

    evalBridge.dispatch({
      action: 'setLayerOrder',
      params: { layerUUID: nodeId, hostingCompUUID: hostUUID, direction: direction }
    });
  }

  /**
   * Handles clicks on the color picker trigger button.
   * Opens the custom color picker popover.
   * @param {Event} e The click event.
   */
  /**
   * Walks upstream wires to find the first layer node connected to this node's mainInput.
   * @param {string} nodeId The effector node UUID.
   * @return {string|null} The upstream layer node UUID, or null.
   */
  function _findUpstreamLayerNode(nodeId) {
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.toNode === nodeId && w.toPort === 'main_input') {
        return w.fromNode;
      }
    }
    return null;
  }

  /**
   * Fetches mask names from AE for a given Fill node and updates the node data.
   * Called when a Fill node is shown in the inspector.
   * @param {string} nodeId - Fill node UUID
   * @param {string} hostCompUUID - Hosting comp UUID
   */
  function _fetchFillMasks(nodeId, hostCompUUID) {
    if (!nodeId || !hostCompUUID) return;
    var upstreamId = _findUpstreamLayerNode(nodeId);
    if (!upstreamId) return;

    // The upstream node's layer UUID may be stored in its props or we need to
    // resolve it from the wire path. Use the upstream node ID as the layer UUID
    // since the engine stores it that way.
    evalBridge.dispatch({
      action: 'getMasksForLayer',
      params: { hostingCompUUID: hostCompUUID, layerUUID: upstreamId }
    }).then(function(res) {
      if (res.ok && res.data && res.data.masks) {
        var nodeData = graphState.getNode(nodeId);
        if (nodeData) {
          nodeData._maskNames = res.data.masks;
          if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
        }
      }
    }).catch(function(err) {
      console.warn('[inspector] getMasksForLayer failed:', err);
    });
  }

  function _onColorTriggerClick(e) {
    var btn = e.target.closest('.cp-trigger');
    if (!btn) return;

    var nodeId = btn.getAttribute('data-node-id');
    var key = btn.getAttribute('data-param-key');
    if (!nodeId || !key) return;

    var nodeData = graphState.getNode(nodeId);
    if (!nodeData || !Array.isArray(nodeData.props[key])) return;

    __ins_colorPicker.open(btn, nodeId, key, nodeData.props[key].slice());
  }

  /**
   * Handles clicks on the footage browse/import button.
   * Opens a file dialog via ExtendScript and imports the selected footage.
   * @param {Event} e The click event.
   */
  /**
   * Resolves the AE layer UUID for a node by walking downstream wires
   * to find the terminal wire's _pathLayerUUID.
   * @param {string} nodeId The node UUID.
   * @return {string|null} The layer UUID or null.
   */
  function _resolveLayerUUID(nodeId) {
    if (typeof window.__procedia_internal.hlp !== 'undefined' && window.__procedia_internal.hlp.findPathLayerUUID) {
      return window.__procedia_internal.hlp.findPathLayerUUID(nodeId);
    }
    var wires = graphState.getAllWires();
    for (var wid in wires) {
      if (!wires.hasOwnProperty(wid)) continue;
      var w = wires[wid];
      if (w.fromNode === nodeId && w.type === 'layer' && w._pathLayerUUID) {
        return w._pathLayerUUID;
      }
    }
    return null;
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

    var layerUUID = _resolveLayerUUID(nodeId);
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

  function _onFootageBrowseClick(e) {
    var btn = e.target;
    if (!btn || !btn.classList || !btn.classList.contains('inspector-footage-btn')) return;
    if (btn.classList.contains('loading')) return;

    var nodeId = btn.getAttribute('data-node-id');
    if (!nodeId) return;

    btn.classList.add('loading');
    btn.innerHTML = '<i class="ti ti-loader"></i> Importing\u2026';

    evalBridge.dispatch({
      action: 'browseAndImportFootage',
      params: { nodeUUID: nodeId }
    }).then(function(res) {
      btn.classList.remove('loading');
      if (res.ok && res.data && !res.data.cancelled) {
        var nodeData = graphState.getNode(nodeId);
        if (nodeData) {
          nodeData.props.filePath = res.data.filePath;
          nodeData.props.label = res.data.itemName;

          var wires = graphState.getAllWires();
          var hostingCompUUID = null;
          var layerUUID = null;
          for (var wId in wires) {
            if (!wires.hasOwnProperty(wId)) continue;
            var w = wires[wId];
            if (w.fromNode === nodeId && w.type === 'layer' && w._pathLayerUUID) {
              layerUUID = w._pathLayerUUID;
              hostingCompUUID = w.toNode;
              break;
            }
          }

          if (hostingCompUUID && layerUUID) {
            evalBridge.dispatch({
              action: 'createFootageLayer',
              params: {
                nodeUUID: nodeId,
                hostingCompUUID: hostingCompUUID,
                layerUUID: layerUUID,
                label: nodeData.props.label
              }
            }).then(function(createRes) {
              if (createRes.ok) {
                graphState.updateNode(nodeId, { props: nodeData.props, state: 'alive', hasParkedLayer: false });
                if (typeof pollerNotifier !== 'undefined' && pollerNotifier.clearNotified) {
                  pollerNotifier.clearNotified(nodeId);
                }
              } else {
                console.error('[inspector] createFootageLayer failed:', createRes.error);
                graphState.updateNode(nodeId, { props: nodeData.props, state: 'error' });
              }
              window.__procedia_internal.refreshUI({ minimap: false });
            });
          } else {
            graphState.updateNode(nodeId, { props: nodeData.props, state: 'alive' });
            window.__procedia_internal.refreshUI({ wireRenderer: false, minimap: false });
          }
        }
        return;
      }
      if (res.ok && res.data && res.data.cancelled) {
        btn.innerHTML = '<i class="ti ti-folder-open"></i> Browse &amp; Import';
      }
      renderer.render();
      if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
    });
  }

  /**
   * Handles clicks on layer stack rows - selects the upstream node in the graph.
   * Ignores clicks on move buttons (handled separately).
   * @param {Event} e The click event.
   */
  function _onLayerStackRowClick(e) {
    if (e.target.closest('.ls-move-btn')) return;
    var row = e.target.closest('.inspector-ls-row');
    if (!row) return;
    var nodeId = row.getAttribute('data-layer-node-id');
    if (!nodeId) return;

    if (typeof graphState !== 'undefined' && graphState.setSelection) {
      graphState.setSelection(nodeId);
    }
  }

  /**
   * Handles clicks on layer stack move buttons (up/down/bottom).
   * Recalculates local layer order and refreshes the inspector on response.
   * @param {Event} e The click event.
   */
  function _onLayerStackMoveClick(e) {
    var btn = e.target.closest('.ls-move-btn');
    if (!btn) return;

    var wireId = btn.getAttribute('data-wire-id');
    var direction = btn.getAttribute('data-direction') || 'up';
    if (!wireId) return;

    var group = btn.closest('.ls-group');
    if (!group) return;
    var compId = group.getAttribute('data-ls-comp-id');
    if (!compId) return;

    var wire = graphState.getWire(wireId);
    if (!wire) return;
    var layerUUID = wire._pathLayerUUID;
    if (!layerUUID) return;

    evalBridge.dispatch({
      action: 'setLayerOrder',
      params: { layerUUID: layerUUID, hostingCompUUID: compId, direction: direction }
    }).then(function() {
      if (typeof __ins_layerStack !== 'undefined' && __ins_layerStack.recalculateLayerOrder) {
        __ins_layerStack.recalculateLayerOrder(compId);
      }
      if (typeof inspector !== 'undefined' && inspector.refresh) {
        inspector.refresh();
      }
    });
  }

  /**
   * Handles dragstart on layer stack rows.
   * Stores the dragged wire ID in dataTransfer.
   * @param {Event} e The dragstart event.
   */
  function _onLayerStackDragStart(e) {
    var row = e.target.closest('.inspector-ls-row');
    if (!row) { e.preventDefault(); return; }
    var wireId = row.getAttribute('data-wire-id');
    if (!wireId) { e.preventDefault(); return; }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', wireId);

    // Add drag-origin class for visual feedback
    row.classList.add('ls-dragging');
  }

  /**
   * Handles dragover on layer stack rows.
   * Prevents default to allow drop, shows insertion indicator.
   * @param {Event} e The dragover event.
   */
  function _onLayerStackDragOver(e) {
    var row = e.target.closest('.inspector-ls-row');
    if (!row) return;
    if (!row.getAttribute('data-wire-id')) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  /**
   * Handles dragend on layer stack rows.
   * Cleans up visual feedback.
   * @param {Event} e The dragend event.
   */
  function _onLayerStackDragEnd(e) {
    var row = e.target.closest('.inspector-ls-row');
    if (row) {
      row.classList.remove('ls-dragging');
    }
    // Remove any drop indicators
    var groups = document.querySelectorAll('.ls-group .ls-drop-indicator');
    for (var gi = 0; gi < groups.length; gi++) {
      groups[gi].classList.remove('ls-drop-indicator');
    }
  }

  /**
   * Handles drop on layer stack rows.
   * Drop on a row moves the dragged layer before the target in AE.
   * Drop on the container (empty area) moves the dragged layer to the bottom.
   * Recalculates local layer order and refreshes the inspector on response.
   * @param {Event} e The drop event.
   */
  function _onLayerStackDrop(e) {
    e.preventDefault();
    var draggedWireId = e.dataTransfer.getData('text/plain');
    if (!draggedWireId) return;

    var group = e.target.closest('.ls-group');
    if (!group) return;
    var compId = group.getAttribute('data-ls-comp-id');
    if (!compId) return;

    var draggedWire = graphState.getWire(draggedWireId);
    if (!draggedWire || !draggedWire._pathLayerUUID) return;
    var layerUUID = draggedWire._pathLayerUUID;

    var targetRow = e.target.closest('.inspector-ls-row');

    var dispatchPromise;

    if (targetRow) {
      var targetWireId = targetRow.getAttribute('data-wire-id');
      if (!targetWireId || targetWireId === draggedWireId) return;
      var targetWire = graphState.getWire(targetWireId);
      if (!targetWire || !targetWire._pathLayerUUID) return;

      dispatchPromise = evalBridge.dispatch({
        action: 'moveLayerBefore',
        params: {
          hostingCompUUID:  compId,
          layerUUID:        layerUUID,
          targetLayerUUID:  targetWire._pathLayerUUID
        }
      });
    } else {
      // Drop on empty area — move to bottom of stack
      dispatchPromise = evalBridge.dispatch({
        action: 'setLayerOrder',
        params: {
          hostingCompUUID: compId,
          layerUUID:       layerUUID,
          direction:       'bottom'
        }
      });
    }

    if (dispatchPromise) {
      dispatchPromise.then(function() {
        if (typeof __ins_layerStack !== 'undefined' && __ins_layerStack.recalculateLayerOrder) {
          __ins_layerStack.recalculateLayerOrder(compId);
        }
        if (typeof inspector !== 'undefined' && inspector.refresh) {
          inspector.refresh();
        }
      });
    }
  }

  return {
    onInspectorChange:      _onInspectorChange,
    onInspectorInput:       _onInspectorInput,
    onInspectorKeydown:     _onInspectorKeydown,
    onLayerActionClick:     _onLayerActionClick,
    onKeyframeIconClick:    _onKeyframeIconClick,
    onColorTriggerClick:    _onColorTriggerClick,
    onFootageBrowseClick:   _onFootageBrowseClick,
    onLayerStackRowClick:   _onLayerStackRowClick,
    onLayerStackMoveClick:  _onLayerStackMoveClick,
    onLayerStackDragStart:  _onLayerStackDragStart,
    onLayerStackDragOver:   _onLayerStackDragOver,
    onLayerStackDragEnd:    _onLayerStackDragEnd,
    onLayerStackDrop:       _onLayerStackDrop,
    _fetchFillMasks:        _fetchFillMasks
  };

})();
