// ui/inspector.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/engine.js
// MUST LOAD BEFORE: index.js

var inspector = (function() {

  var _contentEl = null;

  function init() {
    var el = document.getElementById('right-bar');
    el.innerHTML =
      '<div class="inspector-empty visible" id="inspector-empty">' +
        '<i class="ti ti-cursor-text inspector-empty-icon"></i>' +
        '<span class="inspector-empty-text">select a node</span>' +
      '</div>' +
      '<div class="inspector-content" id="inspector-content"></div>';

    _contentEl = document.getElementById('inspector-content');
    if (_contentEl) {
      _contentEl.addEventListener('change', _onInspectorChange);
      _contentEl.addEventListener('input', _onInspectorInput);
      _contentEl.addEventListener('click', _onRecoverClick);
      _contentEl.addEventListener('click', _onLayerActionClick);
    }

    refresh();
  }

  function _isParamWired(nodeId, paramKey) {
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      var wire = wires[wireId];
      if (wire.toNode !== nodeId) continue;
      if (wire.boundParam === paramKey || wire.toPort === paramKey) return true;
    }
    return false;
  }

  function _stateLabel(nodeData, def) {
    var parts = [nodeData.state || 'ghost'];
    if (def && def.nodeKind) parts.push(def.nodeKind);
    return parts.join(' · ');
  }

  function _paramList(nodeData, def) {
    if (def.params === 'dynamic') {
      if (!nodeData.dynamicSchema || !nodeData.dynamicSchema.properties) return null;
      var dyn = [];
      var props = nodeData.dynamicSchema.properties;
      for (var i = 0; i < props.length; i++) {
        dyn.push({
          key:   props[i].matchName,
          label: props[i].label || props[i].matchName,
          type:  props[i].type
        });
      }
      return dyn;
    }
    if (!def.params || !def.params.length) return [];
    var list = [];
    for (var j = 0; j < def.params.length; j++) {
      list.push(def.params[j]);
    }
    return list;
  }

  function _formatValueForInput(param, value) {
    if (value === undefined || value === null) {
      if (param.default !== undefined) return String(param.default);
      return '';
    }
    if (param.type === 'color' && Array.isArray(value)) {
      return value.join(', ');
    }
    if ((param.type === 'vector2' || param.type === 'vector3') && Array.isArray(value)) {
      return value.join(', ');
    }
    if (param.type === 'boolean') return value ? 'true' : 'false';
    return String(value);
  }

  function _parseInputValue(param, raw) {
    if (param.type === 'number') return parseFloat(raw);
    if (param.type === 'boolean') return raw === 'true' || raw === true;
    if (param.type === 'color' || param.type === 'vector2' || param.type === 'vector3') {
      var parts = String(raw).split(',');
      var out = [];
      for (var i = 0; i < parts.length; i++) {
        var n = parseFloat(parts[i]);
        out.push(isNaN(n) ? 0 : n);
      }
      return out;
    }
    return raw;
  }

  function _buildViewModel(nodeData, def) {
    var params = _paramList(nodeData, def);
    if (params === null) {
      return {
        loading: true,
        name:    def.label || nodeData.type,
        state:   _stateLabel(nodeData, def),
        groups:  []
      };
    }

    var rows = [];
    for (var i = 0; i < params.length; i++) {
      var param = params[i];
      var key = param.key;
      rows.push({
        key:     key,
        label:   param.label || key,
        type:    param.type,
        value:   nodeData.props[key],
        wired:   _isParamWired(nodeData.id, key),
        display: _formatValueForInput(param, nodeData.props[key])
      });
    }

    return {
      loading:          false,
      nodeId:           nodeData.id,
      name:             def.label || nodeData.type,
      state:            _stateLabel(nodeData, def),
      nodeType:         nodeData.type,
      hostingCompUUID:  nodeData.hostingComps && nodeData.hostingComps.length > 0 ? nodeData.hostingComps[0] : null,
      groups:           [{ label: 'Properties', params: rows }]
    };
  }

  function showEmpty() {
    var emptyEl = document.getElementById('inspector-empty');
    var contentEl = document.getElementById('inspector-content');
    if (emptyEl) emptyEl.classList.add('visible');
    if (contentEl) {
      contentEl.classList.remove('visible');
      contentEl.innerHTML = '';
    }
  }

  function showNode(view) {
    var emptyEl = document.getElementById('inspector-empty');
    var contentEl = document.getElementById('inspector-content');
    if (!emptyEl || !contentEl) return;

    emptyEl.classList.remove('visible');
    contentEl.classList.add('visible');
    contentEl.innerHTML = renderNodeContent(view);
  }

  function _onRecoverClick(e) {
    var btn = e.target;
    if (!btn || !btn.classList || !btn.classList.contains('inspector-recover-btn')) return;

    var nodeId = btn.getAttribute('data-node-id');
    var action = btn.getAttribute('data-action');
    if (!nodeId || !action) return;

    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;

    if (action === 'recreate') {
      if (typeof engine !== 'undefined' && engine.recreateNode) {
        engine.recreateNode(nodeId);
      }
      renderer.render();
      if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
      if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
      if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    } else if (action === 'remove') {
      var graphData = { nodes: graphState.getAllNodes(), wires: graphState.getAllWires() };
      evalBridge.dispatch({ action: 'writeGraph', params: graphData });
      engine.deleteNode(nodeId);
    }
  }

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

  function renderLayerActions(view) {
    return (
      '<div class="inspector-group">' +
        '<div class="inspector-group-label">Layer Order</div>' +
        '<button class="inspector-layer-btn" data-node-id="' + view.nodeId + '" data-host-uuid="' + view.hostingCompUUID + '" data-direction="up">' +
          '<i class="ti ti-chevron-up"></i> Move Up' +
        '</button>' +
        '<button class="inspector-layer-btn" data-node-id="' + view.nodeId + '" data-host-uuid="' + view.hostingCompUUID + '" data-direction="down">' +
          '<i class="ti ti-chevron-down"></i> Move Down' +
        '</button>' +
      '</div>'
    );
  }

  function renderErrorActions(view) {
    return (
      '<div class="inspector-group">' +
        '<div class="inspector-group-label">Error Recovery</div>' +
        '<button class="inspector-recover-btn" data-node-id="' + view.nodeId + '" data-action="recreate">' +
          '<i class="ti ti-refresh"></i> Re-create in AE' +
        '</button>' +
        '<button class="inspector-recover-btn" data-node-id="' + view.nodeId + '" data-action="remove">' +
          '<i class="ti ti-trash"></i> Remove from Graph' +
        '</button>' +
      '</div>'
    );
  }

  function renderNodeContent(view) {
    if (view.loading) {
      return (
        '<div class="inspector-header">' +
          '<div class="inspector-node-name">' + view.name + '</div>' +
          '<div class="inspector-state-badge">' +
            '<div class="inspector-state-dot"></div>' +
            '<span class="inspector-state-text">' + view.state + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="inspector-group">' +
          '<div class="inspector-param-row">' +
            '<span class="inspector-param-label">Schema</span>' +
            '<span class="inspector-param-value">Loading…</span>' +
          '</div>' +
        '</div>'
      );
    }

    var errorActionsHtml = '';
    if (view.state.indexOf('error') !== -1) {
      errorActionsHtml = renderErrorActions(view);
    }

    var layerActionsHtml = '';
    if (view.nodeType === 'core/comp' && view.state.indexOf('alive') !== -1 && view.hostingCompUUID) {
      layerActionsHtml = renderLayerActions(view);
    }

    var groupsHtml = '';
    for (var i = 0; i < view.groups.length; i++) {
      groupsHtml += renderGroup(view.nodeId, view.groups[i]);
    }

    return (
      '<div class="inspector-header">' +
        '<div class="inspector-node-name">' + view.name + '</div>' +
        '<div class="inspector-state-badge">' +
          '<div class="inspector-state-dot' + (view.state.indexOf('error') !== -1 ? ' error' : '') + '"></div>' +
          '<span class="inspector-state-text">' + view.state + '</span>' +
        '</div>' +
      '</div>' +
      errorActionsHtml +
      layerActionsHtml +
      groupsHtml
    );
  }

  function renderGroup(nodeId, group) {
    var paramsHtml = '';
    for (var i = 0; i < group.params.length; i++) {
      paramsHtml += renderParam(nodeId, group.params[i]);
    }
    return (
      '<div class="inspector-group">' +
        '<div class="inspector-group-label">' + group.label + '</div>' +
        paramsHtml +
      '</div>'
    );
  }

  function renderParam(nodeId, param) {
    if (param.wired) {
      return (
        '<div class="inspector-param-row">' +
          '<span class="inspector-param-label">' + param.label + '</span>' +
          '<span class="inspector-param-value wired">⬡ wired</span>' +
        '</div>'
      );
    }

    var inputHtml = '';
    if (param.type === 'boolean') {
      var checked = param.value === true || param.display === 'true' ? ' checked' : '';
      inputHtml =
        '<input type="checkbox" class="inspector-param-input" data-node-id="' + nodeId + '" ' +
        'data-param-key="' + param.key + '" data-param-type="boolean"' + checked + '>';
    } else if (param.type === 'enum') {
      inputHtml =
        '<input type="text" class="inspector-param-input" data-node-id="' + nodeId + '" ' +
        'data-param-key="' + param.key + '" data-param-type="enum" value="' + _escapeAttr(param.display) + '">';
    } else {
      inputHtml =
        '<input type="text" class="inspector-param-input" data-node-id="' + nodeId + '" ' +
        'data-param-key="' + param.key + '" data-param-type="' + (param.type || 'string') + '" ' +
        'value="' + _escapeAttr(param.display) + '">';
    }

    return (
      '<div class="inspector-param-row">' +
        '<span class="inspector-param-label">' + param.label + '</span>' +
        inputHtml +
      '</div>'
    );
  }

  function _escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function _applyChange(target) {
    var nodeId = target.getAttribute('data-node-id');
    var key    = target.getAttribute('data-param-key');
    var type   = target.getAttribute('data-param-type');
    if (!nodeId || !key) return;

    var raw = target.type === 'checkbox' ? target.checked : target.value;
    engine.setNodeProperty(nodeId, key, _parseInputValue({ type: type, key: key }, raw));
  }

  function _onInspectorChange(e) {
    var target = e.target;
    if (!target || !target.classList || !target.classList.contains('inspector-param-input')) return;
    _applyChange(target);
  }

  function _onInspectorInput(e) {
    var target = e.target;
    if (!target || !target.classList || !target.classList.contains('inspector-param-input')) return;
    if (target.type === 'checkbox') return;
    _applyChange(target);
  }

  function refresh() {
    var sel = graphState.getSelection();
    if (sel.length === 0) {
      showEmpty();
      return;
    }
    if (sel.length > 1) {
      var emptyEl = document.getElementById('inspector-empty');
      var contentEl = document.getElementById('inspector-content');
      if (emptyEl) {
        emptyEl.classList.add('visible');
        emptyEl.innerHTML =
          '<i class="ti ti-cursor-text inspector-empty-icon"></i>' +
          '<span class="inspector-empty-text">' + sel.length + ' nodes selected</span>';
      }
      if (contentEl) {
        contentEl.classList.remove('visible');
        contentEl.innerHTML = '';
      }
      return;
    }
    var nodeData = graphState.getNode(sel[0]);
    if (!nodeData) {
      showEmpty();
      return;
    }
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) {
      showEmpty();
      return;
    }
    showNode(_buildViewModel(nodeData, def));
  }

  return {
    init:      init,
    refresh:   refresh,
    showEmpty: showEmpty,
    showNode:  showNode
  };

})();
