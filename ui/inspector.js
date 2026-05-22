// ui/inspector.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/engine.js
// MUST LOAD BEFORE: index.js

var inspector = (function() {

  // ── Color helpers ──────────────────────────────────────────

  function _rgbaToHex(rgba) {
    function toHex(v) {
      var h = Math.round(v * 255).toString(16);
      return h.length === 1 ? '0' + h : h;
    }
    return '#' + toHex(rgba[0]) + toHex(rgba[1]) + toHex(rgba[2]);
  }

  function _hexToRgba(hex) {
    hex = hex.replace('#', '');
    return [
      parseInt(hex.substr(0, 2), 16) / 255,
      parseInt(hex.substr(2, 2), 16) / 255,
      parseInt(hex.substr(4, 2), 16) / 255,
      1
    ];
  }

  // ── Wired check ────────────────────────────────────────────

  function _isParamWired(nodeId, paramKey) {
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      var wire = wires[wireId];
      if (wire.toNode === nodeId && wire.boundParam === paramKey) return true;
    }
    return false;
  }

  // ── Field builders ─────────────────────────────────────────

  function _buildStringField(nodeId, param, currentVal, isWired) {
    var input = document.createElement('input');
    input.className = 'inspector-field-input';
    input.type      = 'text';
    input.value     = currentVal !== undefined ? String(currentVal) : '';
    if (isWired) {
      input.classList.add('wired');
      input.readOnly = true;
    } else {
      input.addEventListener('input', (function(id, key) {
        return function(e) { engine.setNodeProperty(id, key, e.target.value); };
      })(nodeId, param.key));
    }
    return input;
  }

  function _buildNumberField(nodeId, param, currentVal, isWired) {
    var input = document.createElement('input');
    input.className = 'inspector-field-input';
    input.type      = 'number';
    input.value     = currentVal !== undefined ? currentVal : 0;
    if (param.min !== undefined) input.min = param.min;
    if (param.max !== undefined) input.max = param.max;
    if (isWired) {
      input.classList.add('wired');
      input.readOnly = true;
    } else {
      input.addEventListener('input', (function(id, key) {
        return function(e) {
          var parsed = parseFloat(e.target.value);
          if (isNaN(parsed)) return;
          engine.setNodeProperty(id, key, parsed);
        };
      })(nodeId, param.key));
    }
    return input;
  }

  function _buildColorField(nodeId, param, currentVal, isWired) {
    var wrap   = document.createElement('div');
    wrap.className = 'inspector-color-wrap';

    var hex    = _rgbaToHex(currentVal || [0, 0, 0, 1]);
    var swatch = document.createElement('div');
    swatch.className        = 'inspector-color-swatch';
    swatch.style.background = hex;

    var input = document.createElement('input');
    input.className = 'inspector-field-input';
    input.type      = 'text';
    input.value     = hex;

    if (isWired) {
      input.classList.add('wired');
      input.readOnly = true;
    } else {
      input.addEventListener('input', (function(id, key, sw) {
        return function(e) {
          var val = e.target.value.trim();
          var full = (val.indexOf('#') === 0) ? val : '#' + val;
          if (full.length !== 7) return;
          sw.style.background = full;
          engine.setNodeProperty(id, key, _hexToRgba(full));
        };
      })(nodeId, param.key, swatch));
    }

    wrap.appendChild(swatch);
    wrap.appendChild(input);
    return wrap;
  }

  function _buildVector2Field(nodeId, param, currentVal, isWired) {
    var wrap = document.createElement('div');
    wrap.className = 'inspector-vector2-wrap';

    var xInput = document.createElement('input');
    xInput.className = 'inspector-field-input inspector-v2-input';
    xInput.type      = 'number';
    xInput.value     = (currentVal && currentVal[0] !== undefined) ? currentVal[0] : 0;

    var yInput = document.createElement('input');
    yInput.className = 'inspector-field-input inspector-v2-input';
    yInput.type      = 'number';
    yInput.value     = (currentVal && currentVal[1] !== undefined) ? currentVal[1] : 0;

    if (isWired) {
      xInput.classList.add('wired'); xInput.readOnly = true;
      yInput.classList.add('wired'); yInput.readOnly = true;
    } else {
      var listener = (function(id, key, xi, yi) {
        return function() {
          var x = parseFloat(xi.value);
          var y = parseFloat(yi.value);
          if (isNaN(x) || isNaN(y)) return;
          engine.setNodeProperty(id, key, [x, y]);
        };
      })(nodeId, param.key, xInput, yInput);
      xInput.addEventListener('input', listener);
      yInput.addEventListener('input', listener);
    }

    wrap.appendChild(xInput);
    wrap.appendChild(yInput);
    return wrap;
  }

  function _buildField(nodeId, param, nodeData) {
    var field = document.createElement('div');
    field.className = 'inspector-field';

    var labelEl = document.createElement('span');
    labelEl.className   = 'inspector-field-label';
    labelEl.textContent = param.label;
    field.appendChild(labelEl);

    var valueWrap = document.createElement('div');
    valueWrap.className = 'inspector-field-value';

    var isWired    = _isParamWired(nodeId, param.key);
    var currentVal = nodeData.props[param.key];
    var control;

    if (param.type === 'string') {
      control = _buildStringField(nodeId, param, currentVal, isWired);
    } else if (param.type === 'number') {
      control = _buildNumberField(nodeId, param, currentVal, isWired);
    } else if (param.type === 'color') {
      control = _buildColorField(nodeId, param, currentVal, isWired);
    } else if (param.type === 'vector2') {
      control = _buildVector2Field(nodeId, param, currentVal, isWired);
    }

    if (control) valueWrap.appendChild(control);
    field.appendChild(valueWrap);
    return field;
  }

  function _buildSection(title, nodeId, params, nodeData) {
    var section = document.createElement('div');
    section.className = 'inspector-section';

    var titleEl = document.createElement('div');
    titleEl.className   = 'inspector-section-title';
    titleEl.textContent = title;
    section.appendChild(titleEl);

    for (var i = 0; i < params.length; i++) {
      section.appendChild(_buildField(nodeId, params[i], nodeData));
    }
    return section;
  }

  // ── Public render ──────────────────────────────────────────

  function renderInspector(nodeId) {
    var badgeEl = document.querySelector('.inspector-badge');
    var bodyEl  = document.getElementById('inspector-body');
    if (!bodyEl) return;

    var nodeData = nodeId ? graphState.getNode(nodeId) : null;
    var def      = nodeData ? nodeRegistry.getDefinition(nodeData.type) : null;

    if (!nodeData || !def) {
      if (badgeEl) badgeEl.style.display = 'none';
      bodyEl.innerHTML = '<div class="inspector-empty">Nothing selected</div>';
      return;
    }

    // Badge
    if (badgeEl) {
      badgeEl.style.display = '';
      var token  = def.category.toLowerCase();
      var dotEl  = document.createElement('span');
      dotEl.className        = 'inspector-badge-dot';
      dotEl.style.background = 'var(--cat-' + token + ')';
      badgeEl.innerHTML = '';
      badgeEl.appendChild(dotEl);
      badgeEl.appendChild(document.createTextNode(' ' + def.category + ' / ' + def.label));
    }

    // Clear body and rebuild sections
    bodyEl.innerHTML = '';

    var identityParams  = [];
    var categoryParams  = [];
    for (var i = 0; i < def.params.length; i++) {
      if (def.params[i].key === 'label') {
        identityParams.push(def.params[i]);
      } else {
        categoryParams.push(def.params[i]);
      }
    }

    if (identityParams.length > 0) {
      bodyEl.appendChild(_buildSection('IDENTITY', nodeId, identityParams, nodeData));
    }
    if (categoryParams.length > 0) {
      bodyEl.appendChild(_buildSection(def.category.toUpperCase(), nodeId, categoryParams, nodeData));
    }
  }

  function updateInspector() {
    renderInspector(graphState.getSelection());
  }

  function init() {
    // Selection callback is registered in index.js — nothing to do here
  }

  return {
    init:            init,
    renderInspector: renderInspector,
    updateInspector: updateInspector
  };

})();
