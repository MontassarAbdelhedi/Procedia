/**
 * @fileoverview Custom color picker widget for the inspector.
 * HSV square + hue/alpha sliders + hex preview + eyedropper.
 * Depends on: __ins_cpUtils, __ins_cpDrag, __ins_cpEyedropper
 * Exports: __ins_colorPicker.open, .close
 */
// ui/inspector/colorPicker.js
// DEPENDS ON: ui/inspector/colorPicker/utils.js, ui/inspector/colorPicker/drag.js, ui/inspector/colorPicker/eyedropper.js
// MUST LOAD BEFORE: ui/inspector/events.js

var __ins_colorPicker = (function() {

  var S = {
    open: false, nodeId: null, key: null,
    color: [1, 1, 1, 1], hsv: [0, 0, 1],
    popEl: null, triggerEl: null, dragType: null
  };

  var _cu = __ins_cpUtils;

  function _setColor(r, g, b, a) {
    S.color[0] = _cu.clamp(r, 0, 1); S.color[1] = _cu.clamp(g, 0, 1); S.color[2] = _cu.clamp(b, 0, 1); S.color[3] = _cu.clamp(a, 0, 1);
    S.hsv = _cu.rgbToHsv(S.color[0], S.color[1], S.color[2]);
    _refreshUI();
    if (S.nodeId && S.key) engine.setNodeProperty(S.nodeId, S.key, S.color.slice());
  }

  function _setHsv(h, s, v) {
    S.hsv[0] = _cu.clamp(h, 0, 1); S.hsv[1] = _cu.clamp(s, 0, 1); S.hsv[2] = _cu.clamp(v, 0, 1);
    var rgb = _cu.hsvToRgb(S.hsv[0], S.hsv[1], S.hsv[2]);
    S.color[0] = rgb[0]; S.color[1] = rgb[1]; S.color[2] = rgb[2];
    _refreshUI();
    if (S.nodeId && S.key) engine.setNodeProperty(S.nodeId, S.key, S.color.slice());
  }

  function _buildHTML() {
    var h = S.hsv[0], s = S.hsv[1], v = S.hsv[2], a = S.color[3];
    var hueRgb = _cu.hsvToRgb(h, 1, 1);
    var hueStr = _cu.rgbStr(hueRgb[0], hueRgb[1], hueRgb[2]);
    var hex = _cu.toHex(S.color[0], S.color[1], S.color[2]);
    var rgbStr = _cu.rgbStr(S.color[0], S.color[1], S.color[2]);

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
    var hueRgb = _cu.hsvToRgb(h, 1, 1);
    var hueStr = _cu.rgbStr(hueRgb[0], hueRgb[1], hueRgb[2]);
    var hex = _cu.toHex(S.color[0], S.color[1], S.color[2]);
    var rgbStr = _cu.rgbStr(S.color[0], S.color[1], S.color[2]);

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
    S.hsv = _cu.rgbToHsv(rgba[0], rgba[1], rgba[2]);

    var pop = document.createElement('div');
    pop.className = 'cp-root';
    pop.innerHTML = _buildHTML();
    document.body.appendChild(pop);
    S.popEl = pop;
    S.open = true;

    var tr = S.triggerEl.getBoundingClientRect();
    pop.style.top = (tr.bottom + 4) + 'px';
    pop.style.right = (window.innerWidth - tr.right) + 'px';

    __ins_cpDrag.init(pop, S, _setHsv);
    __ins_cpEyedropper.init(pop, function() {
      return { color: S.color, setColor: _setColor };
    });

    setTimeout(function() { document.addEventListener('mousedown', _onDocDown); }, 0);
  }

  function close() {
    S.open = false;
    __ins_cpDrag.destroy();
    __ins_cpEyedropper.destroy();
    if (S.popEl) { S.popEl.parentNode.removeChild(S.popEl); S.popEl = null; }
    document.removeEventListener('mousedown', _onDocDown);
  }

  return { open: open, close: close };
})();
