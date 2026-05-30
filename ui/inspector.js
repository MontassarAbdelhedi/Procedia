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
      loading: false,
      nodeId:  nodeData.id,
      name:    def.label || nodeData.type,
      state:   _stateLabel(nodeData, def),
      groups:  [{ label: 'Properties', params: rows }]
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

    var groupsHtml = '';
    for (var i = 0; i < view.groups.length; i++) {
      groupsHtml += renderGroup(view.nodeId, view.groups[i]);
    }

    return (
      '<div class="inspector-header">' +
        '<div class="inspector-node-name">' + view.name + '</div>' +
        '<div class="inspector-state-badge">' +
          '<div class="inspector-state-dot"></div>' +
          '<span class="inspector-state-text">' + view.state + '</span>' +
        '</div>' +
      '</div>' +
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
    if (!sel) {
      showEmpty();
      return;
    }
    var nodeData = graphState.getNode(sel);
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
