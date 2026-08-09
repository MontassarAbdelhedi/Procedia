/**
 * @fileoverview Color math utilities for the Inspector color picker.
 * Pure functions: HSV/RGB conversions, hex formatting, clamping.
 * Exposes: __ins_cpUtils
 */
// ui/inspector/colorPicker/utils.js

var __ins_cpUtils = (function() {

  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

  function rgbToHsv(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (mx === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h, mx ? d / mx : 0, mx];
  }

  function hsvToRgb(h, s, v) {
    var i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: return [v, t, p]; case 1: return [q, v, p];
      case 2: return [p, v, t]; case 3: return [p, q, v];
      case 4: return [t, p, v]; case 5: return [v, p, q];
      default: return [0, 0, 0];
    }
  }

  function toHex(r, g, b) {
    var r1 = Math.round(clamp(r, 0, 1) * 255), g1 = Math.round(clamp(g, 0, 1) * 255), b1 = Math.round(clamp(b, 0, 1) * 255);
    return '#' + (256 + r1).toString(16).slice(1) + (256 + g1).toString(16).slice(1) + (256 + b1).toString(16).slice(1);
  }

  function rgbStr(r, g, b) {
    return Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255);
  }

  return { clamp: clamp, rgbToHsv: rgbToHsv, hsvToRgb: hsvToRgb, toHex: toHex, rgbStr: rgbStr };
})();
