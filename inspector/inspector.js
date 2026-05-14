// inspector/inspector.js
// DEPENDS ON: graph/graphState.js, graph/nodes/nodeRegistry.js, bridge/evalBridge.js,
//             inspector/layerOrderList.js
// MUST LOAD BEFORE: index.js

var inspector = (function() {

  var el = null;
  var suppressRerender = false;

  // ─── Color helpers ─────────────────────────────────────────────────────────
  // AE color: [r, g, b] floats 0–1.  HTML color: #rrggbb hex.

  function toHex2(v) {
    var h = Math.round(v * 255).toString(16);
    return h.length === 1 ? '0' + h : h;
  }

  function rgbToHex(arr) {
    return '#' + toHex2(arr[0]) + toHex2(arr[1]) + toHex2(arr[2]);
  }

  function hexToRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16) / 255,
      parseInt(hex.slice(3, 5), 16) / 255,
      parseInt(hex.slice(5, 7), 16) / 255
    ];
  }

  // ─── Property change handler ───────────────────────────────────────────────

  function handleParamChange(uuid, param, newValue) {
    var nodeData = graphState.getNode(uuid);
    if (!nodeData) return;

    // Build updated properties object
    var updatedProps = {};
    var k;
    if (nodeData.properties) {
      for (k in nodeData.properties) {
        if (nodeData.properties.hasOwnProperty(k)) {
          updatedProps[k] = nodeData.properties[k];
        }
      }
    }
    updatedProps[param.key] = newValue;

    // Suppress inspector re-render while we mutate state
    suppressRerender = true;
    graphState.updateNode(uuid, { properties: updatedProps });
    suppressRerender = false;

    // If alive and the param declares an AE match name → write to AE layer
    if (nodeData.state === 'alive' && param.matchName) {
      var hostingCompUUID = nodeData._hostingCompUUID || null;
      var valueJSON = JSON.stringify(newValue);
      evalBridge.evalScript(
        'updateNodeProperty(' +
          JSON.stringify(uuid) + ', ' +
          JSON.stringify(hostingCompUUID) + ', ' +
          JSON.stringify(param.matchName) + ', ' +
          JSON.stringify(valueJSON) +
        ')'
      ).then(function(res) {
        if (!res.ok) console.error('[Procedia] updateNodeProperty failed:', res.error);
      }).catch(function(err) {
        console.error('[Procedia] updateNodeProperty error:', err.message);
      });
    }
  }

  // ─── Field builders ────────────────────────────────────────────────────────

  function buildNumberField(uuid, param, value) {
    var input = document.createElement('input');
    input.type = 'number';
    input.className = 'inspector-field';
    input.value = (value !== undefined && value !== null) ? value : param.default;
    if (param.min !== undefined) input.min = param.min;
    if (param.max !== undefined) input.max = param.max;
    input.step = (param.type === 'int') ? '1' : 'any';
    input.addEventListener('change', function() {
      var v = (param.type === 'int') ? parseInt(input.value, 10) : parseFloat(input.value);
      if (isNaN(v)) return;
      handleParamChange(uuid, param, v);
    });
    return input;
  }

  function buildStringField(uuid, param, value) {
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'inspector-field';
    input.value = (value !== undefined && value !== null) ? value : (param.default || '');
    input.addEventListener('change', function() {
      handleParamChange(uuid, param, input.value);
    });
    return input;
  }

  function buildColorField(uuid, param, value) {
    var colorVal = (value !== undefined && value !== null) ? value : param.default;
    var hexVal = (Array.isArray(colorVal)) ? rgbToHex(colorVal) : '#ffffff';

    var wrap = document.createElement('div');
    wrap.className = 'inspector-color-wrap';

    var swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'inspector-color-swatch';
    swatch.value = hexVal;

    var hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'inspector-field inspector-color-hex';
    hexInput.value = hexVal;
    hexInput.maxLength = 7;

    function commitColor(hex) {
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
      swatch.value = hex;
      hexInput.value = hex;
      handleParamChange(uuid, param, hexToRgb(hex));
    }

    swatch.addEventListener('input', function() { hexInput.value = swatch.value; });
    swatch.addEventListener('change', function() { commitColor(swatch.value); });
    hexInput.addEventListener('change', function() { commitColor(hexInput.value); });

    wrap.appendChild(swatch);
    wrap.appendChild(hexInput);
    return wrap;
  }

  function buildBooleanField(uuid, param, value) {
    var checked = (value !== undefined && value !== null) ? value : param.default;

    var label = document.createElement('label');
    label.className = 'inspector-toggle';

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!checked;

    var slider = document.createElement('span');
    slider.className = 'inspector-toggle-slider';

    input.addEventListener('change', function() {
      handleParamChange(uuid, param, input.checked);
    });

    label.appendChild(input);
    label.appendChild(slider);
    return label;
  }

  function buildField(uuid, param, properties) {
    var value = properties ? properties[param.key] : undefined;
    if (param.type === 'number' || param.type === 'int' || param.type === 'float') {
      return buildNumberField(uuid, param, value);
    }
    if (param.type === 'string') {
      return buildStringField(uuid, param, value);
    }
    if (param.type === 'color') {
      return buildColorField(uuid, param, value);
    }
    if (param.type === 'boolean') {
      return buildBooleanField(uuid, param, value);
    }
    return null;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  function showEmpty() {
    el.innerHTML = '<div class="inspector-empty">Select a node</div>';
  }

  function showNode(nodeData) {
    var def = nodeRegistry.getByType(nodeData.type);
    var label = nodeData.label || (def ? def.label : nodeData.type);
    var stateColor = { ghost: '#555555', alive: '#7ec98f', error: '#d46e6e' };
    var color = stateColor[nodeData.state] || '#555555';

    el.innerHTML = '';

    // Header
    var header = document.createElement('div');
    header.className = 'inspector-header';
    var labelSpan = document.createElement('span');
    labelSpan.className = 'inspector-node-label';
    labelSpan.textContent = label;
    var badgeSpan = document.createElement('span');
    badgeSpan.className = 'inspector-state-badge';
    badgeSpan.style.color = color;
    badgeSpan.textContent = nodeData.state;
    header.appendChild(labelSpan);
    header.appendChild(badgeSpan);
    el.appendChild(header);

    if (!def || !def.params || def.params.length === 0) return;

    // Body — one row per param
    var body = document.createElement('div');
    body.className = 'inspector-body';

    for (var i = 0; i < def.params.length; i++) {
      var param = def.params[i];
      var row = document.createElement('div');
      row.className = 'inspector-row';

      var lbl = document.createElement('label');
      lbl.className = 'inspector-row-label';
      lbl.textContent = param.label;

      var field = buildField(nodeData.id, param, nodeData.properties);

      row.appendChild(lbl);
      if (field) row.appendChild(field);
      body.appendChild(row);
    }

    el.appendChild(body);

    // ── Layer order section (CompNode only) ──────────────────────────────────
    if (nodeData.type === 'core/comp') {
      var divider = document.createElement('div');
      divider.className = 'inspector-section-label';
      divider.textContent = 'Layers';
      el.appendChild(divider);

      var listContainer = document.createElement('div');
      listContainer.className = 'layer-list-container';
      el.appendChild(listContainer);

      layerOrderList.build(nodeData.id, listContainer);
    }
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  function init() {
    el = document.getElementById('inspector');
    showEmpty();

    graphState.onSelectionChange(function(uuid) {
      if (!uuid) { showEmpty(); return; }
      var nodeData = graphState.getNode(uuid);
      if (nodeData) showNode(nodeData);
      else showEmpty();
    });

    // Re-render on any state change (e.g. ghost→alive badge update).
    // Suppressed while the inspector itself triggers a property update.
    graphState.onChange(function() {
      if (suppressRerender) return;
      var uuid = graphState.getSelection();
      if (!uuid) return;
      var nodeData = graphState.getNode(uuid);
      if (nodeData) showNode(nodeData);
    });
  }

  return {
    init:      init,
    showEmpty: showEmpty,
    showNode:  showNode
  };

}());
