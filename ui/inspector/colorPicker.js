/**
 * @fileoverview Custom color picker widget for the inspector.
 * HSV square + hue/alpha sliders + hex preview + eyedropper.
 * Exports: __ins_colorPicker.open, .close
 */
// ui/inspector/colorPicker.js
// DEPENDS ON: graph/engine/index.js (engine.setNodeProperty)
// MUST LOAD BEFORE: ui/inspector/events.js

var __ins_colorPicker = (function() {

  var S = {
    open: false, nodeId: null, key: null,
    color: [1, 1, 1, 1], hsv: [0, 0, 1],
    popEl: null, triggerEl: null, dragType: null
  };

  function _clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

  function _rgbToHsv(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (mx === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h, mx ? d / mx : 0, mx];
  }

  function _hsvToRgb(h, s, v) {
    var i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: return [v, t, p]; case 1: return [q, v, p];
      case 2: return [p, v, t]; case 3: return [p, q, v];
      case 4: return [t, p, v]; case 5: return [v, p, q];
      default: return [0, 0, 0];
    }
  }

  function _toHex(r, g, b) {
    var r1 = Math.round(_clamp(r, 0, 1) * 255), g1 = Math.round(_clamp(g, 0, 1) * 255), b1 = Math.round(_clamp(b, 0, 1) * 255);
    return '#' + (256 + r1).toString(16).slice(1) + (256 + g1).toString(16).slice(1) + (256 + b1).toString(16).slice(1);
  }

  function _rgbStr(r, g, b) {
    return Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255);
  }

  function _setColor(r, g, b, a) {
    S.color[0] = _clamp(r, 0, 1); S.color[1] = _clamp(g, 0, 1); S.color[2] = _clamp(b, 0, 1); S.color[3] = _clamp(a, 0, 1);
    S.hsv = _rgbToHsv(S.color[0], S.color[1], S.color[2]);
    _refreshUI();
    if (S.nodeId && S.key) engine.setNodeProperty(S.nodeId, S.key, S.color.slice());
  }

  function _setHsv(h, s, v) {
    S.hsv[0] = _clamp(h, 0, 1); S.hsv[1] = _clamp(s, 0, 1); S.hsv[2] = _clamp(v, 0, 1);
    var rgb = _hsvToRgb(S.hsv[0], S.hsv[1], S.hsv[2]);
    S.color[0] = rgb[0]; S.color[1] = rgb[1]; S.color[2] = rgb[2];
    _refreshUI();
    if (S.nodeId && S.key) engine.setNodeProperty(S.nodeId, S.key, S.color.slice());
  }

  function _buildHTML() {
    var h = S.hsv[0], s = S.hsv[1], v = S.hsv[2], a = S.color[3];
    var hueRgb = _hsvToRgb(h, 1, 1);
    var hueStr = _rgbStr(hueRgb[0], hueRgb[1], hueRgb[2]);
    var hex = _toHex(S.color[0], S.color[1], S.color[2]);
    var rgbStr = _rgbStr(S.color[0], S.color[1], S.color[2]);

    return '' +
      '<div class="cp-popover">' +
        '<div class="cp-section">' +
          '<div class="cp-sv-square" style="background:rgb(' + hueStr + ')">' +
            '<div class="cp-sv-white"></div>' +
            '<div class="cp-sv-black"></div>' +
            '<div class="cp-sv-marker" style="left:' + (s * 100) + '%;top:' + ((1 - v) * 100) + '%"></div>' +
          '</div>' +
        '</div>' +
        '<div class="cp-section">' +
          '<div class="cp-slider cp-hue-slider">' +
            '<div class="cp-slider-track"></div>' +
            '<div class="cp-slider-marker" style="left:' + (h * 100) + '%"></div>' +
          '</div>' +
        '</div>' +
        '<div class="cp-bottom">' +
          '<div class="cp-preview" title="Click to copy hex">' +
            '<div class="cp-preview-circle" style="background:rgba(' + rgbStr + ',' + a + ')"></div>' +
            '<span class="cp-hex-text">' + hex + '</span>' +
          '</div>' +
          '<button class="cp-eyedropper" title="Pick color">' +
            '<i class="ti ti-color-picker"></i>' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  function _refreshUI() {
    if (!S.popEl) return;
    var h = S.hsv[0], s = S.hsv[1], v = S.hsv[2], a = S.color[3];
    var hueRgb = _hsvToRgb(h, 1, 1);
    var hueStr = _rgbStr(hueRgb[0], hueRgb[1], hueRgb[2]);
    var hex = _toHex(S.color[0], S.color[1], S.color[2]);
    var rgbStr = _rgbStr(S.color[0], S.color[1], S.color[2]);

    var sv = S.popEl.querySelector('.cp-sv-square');
    if (sv) sv.style.background = 'rgb(' + hueStr + ')';

    var m = S.popEl.querySelector('.cp-sv-marker');
    if (m) { m.style.left = (s * 100) + '%'; m.style.top = ((1 - v) * 100) + '%'; }

    var hm = S.popEl.querySelector('.cp-hue-slider .cp-slider-marker');
    if (hm) hm.style.left = (h * 100) + '%';

    var pc = S.popEl.querySelector('.cp-preview-circle');
    if (pc) pc.style.background = 'rgba(' + rgbStr + ',' + a + ')';

    var ht = S.popEl.querySelector('.cp-hex-text');
    if (ht) ht.textContent = hex;

    if (S.triggerEl) {
      var ts = S.triggerEl.querySelector('.cp-trigger-swatch');
      if (ts) ts.style.background = 'rgba(' + rgbStr + ',' + a + ')';
      var th = S.triggerEl.querySelector('.cp-trigger-hex');
      if (th) th.textContent = hex;
    }
  }

  function _onDragStart(type, e) {
    e.preventDefault();
    S.dragType = type;
    _onDrag(e);
  }

  function _onDrag(e) {
    if (!S.dragType || !S.popEl) return;
    var sv = S.popEl.querySelector('.cp-sv-square');
    var hs = S.popEl.querySelector('.cp-hue-slider');

    if (S.dragType === 'sv' && sv) {
      var r = sv.getBoundingClientRect();
      _setHsv(S.hsv[0], _clamp((e.clientX - r.left) / r.width, 0, 1), 1 - _clamp((e.clientY - r.top) / r.height, 0, 1));
    } else if (S.dragType === 'hue' && hs) {
      var r = hs.getBoundingClientRect();
      _setHsv(_clamp((e.clientX - r.left) / r.width, 0, 1), S.hsv[1], S.hsv[2]);
    }
  }

  function _onDragEnd() { S.dragType = null; }

  function _onDocMove(e) { _onDrag(e); }
  function _onDocUp() { _onDragEnd(); }

  function _onEyedropper() {
    var inp = document.createElement('input');
    inp.type = 'color';
    inp.value = _toHex(S.color[0], S.color[1], S.color[2]);
    inp.addEventListener('input', function(e) {
      var v = e.target.value;
      _setColor(parseInt(v.slice(1, 3), 16) / 255, parseInt(v.slice(3, 5), 16) / 255, parseInt(v.slice(5, 7), 16) / 255, S.color[3]);
    });
    inp.click();
  }

  function _copyHex() {
    var hex = _toHex(S.color[0], S.color[1], S.color[2]);
    try {
      var ta = document.createElement('textarea');
      ta.value = hex;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch(e) {}
  }

  function _onDocDown(e) {
    if (!S.open || !S.popEl) return;
    if (!S.popEl.contains(e.target) && S.triggerEl && !S.triggerEl.contains(e.target)) close();
  }

  function open(triggerEl, nodeId, key, rgba) {
    close();
    S.triggerEl = triggerEl;
    S.nodeId = nodeId;
    S.key = key;
    S.color = rgba.slice();
    S.hsv = _rgbToHsv(rgba[0], rgba[1], rgba[2]);

    var pop = document.createElement('div');
    pop.className = 'cp-root';
    pop.innerHTML = _buildHTML();
    document.body.appendChild(pop);
    S.popEl = pop;
    S.open = true;

    var tr = S.triggerEl.getBoundingClientRect();
    pop.style.top = (tr.bottom + 4) + 'px';
    pop.style.right = (window.innerWidth - tr.right) + 'px';

    var sv = pop.querySelector('.cp-sv-square');
    if (sv) sv.addEventListener('mousedown', function(e) { _onDragStart('sv', e); });

    var hs = pop.querySelector('.cp-hue-slider');
    if (hs) hs.addEventListener('mousedown', function(e) { _onDragStart('hue', e); });

    var pv = pop.querySelector('.cp-preview');
    if (pv) pv.addEventListener('click', _copyHex);

    var ey = pop.querySelector('.cp-eyedropper');
    if (ey) ey.addEventListener('click', _onEyedropper);

    document.addEventListener('mousemove', _onDocMove);
    document.addEventListener('mouseup', _onDocUp);
    setTimeout(function() { document.addEventListener('mousedown', _onDocDown); }, 0);
  }

  function close() {
    S.open = false;
    if (S.popEl) { S.popEl.parentNode.removeChild(S.popEl); S.popEl = null; }
    document.removeEventListener('mousemove', _onDocMove);
    document.removeEventListener('mouseup', _onDocUp);
    document.removeEventListener('mousedown', _onDocDown);
  }

  return { open: open, close: close };
})();
