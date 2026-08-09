/**
 * @fileoverview Value formatting and parsing utilities for the inspector.
 * Converts between raw typed values and display/input strings.
 * Exports: __ins_vm_fmt.roundNum, .formatValueForInput, .parseInputValue,
 *          .rgbaToHex, .hexToRgba
 */
// ui/inspector/viewModel/format.js
// MUST LOAD BEFORE: ui/inspector/viewModel/builder.js, ui/inspector/viewModel.js

var __ins_vm_fmt = (function() {

  /**
   * Rounds a number to 2 decimal places.
   * @param {number} v The number to round.
   * @return {number} The rounded number.
   */
  function roundNum(v) {
    return Number(v.toFixed(2));
  }

  /**
   * Formats a node property value as a string for display in an input.
   * @param {Object} param The parameter definition.
   * @param {*} value The raw value.
   * @return {string} The formatted display string.
   */
  function formatValueForInput(param, value) {
    if (value === undefined || value === null) {
      if (param.default !== undefined) return String(param.default);
      return '';
    }
    if (param.type === 'color' && Array.isArray(value)) {
      var r = Math.round(Math.max(0, Math.min(1, value[0])) * 255);
      var g = Math.round(Math.max(0, Math.min(1, value[1])) * 255);
      var b = Math.round(Math.max(0, Math.min(1, value[2])) * 255);
      var a = value[3] !== undefined ? value[3] : 1;
      return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
    }
    if ((param.type === 'vector2' || param.type === 'vector3') && Array.isArray(value)) {
      return value.map(roundNum).join(', ');
    }
    if (param.type === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return roundNum(value).toString();
    return String(value);
  }

  /**
   * Parses a raw input string back into a typed value.
   * @param {Object} param The parameter definition.
   * @param {string} raw The raw input value.
   * @return {*} The parsed typed value.
   */
  function parseInputValue(param, raw) {
    if (param.type === 'number') return parseFloat(raw);
    if (param.type === 'boolean') return raw === 'true' || raw === true;
    if (param.type === 'color' || param.type === 'vector2' || param.type === 'vector3') {
      var str = String(raw).replace(/^rgba?\(|\)/g, '');
      var parts = str.split(',');
      var out = [];
      for (var i = 0; i < parts.length; i++) {
        var n = parseFloat(parts[i]);
        out.push(isNaN(n) ? 0 : n);
      }
      if (param.type === 'color' && out.length >= 3) {
        if (out[0] > 1 || out[1] > 1 || out[2] > 1) {
          out[0] = out[0] / 255;
          out[1] = out[1] / 255;
          out[2] = out[2] / 255;
        }
      }
      return out;
    }
    return raw;
  }

  /**
   * Converts an RGBA float array to a hex color string (#rrggbb).
   * @param {Array} rgba RGBA float array (0-1).
   * @return {string} Hex color string.
   */
  function rgbaToHex(rgba) {
    if (!Array.isArray(rgba) || rgba.length < 3) return '#ffffff';
    var r = Math.round(Math.max(0, Math.min(1, rgba[0])) * 255);
    var g = Math.round(Math.max(0, Math.min(1, rgba[1])) * 255);
    var b = Math.round(Math.max(0, Math.min(1, rgba[2])) * 255);
    return '#' + (256 + r).toString(16).slice(1) + (256 + g).toString(16).slice(1) + (256 + b).toString(16).slice(1);
  }

  /**
   * Converts a hex color string (#rrggbb or #rgb) to an RGBA float array.
   * @param {string} hex Hex color string.
   * @param {number} alpha Alpha value (default 1).
   * @return {Array} RGBA float array.
   */
  function hexToRgba(hex, alpha) {
    if (typeof hex !== 'string') return [1, 1, 1, alpha !== undefined ? alpha : 1];
    if (hex.charAt(0) === '#') hex = hex.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = parseInt(hex.slice(0, 2), 16) / 255;
    var g = parseInt(hex.slice(2, 4), 16) / 255;
    var b = parseInt(hex.slice(4, 6), 16) / 255;
    return [r, g, b, alpha !== undefined ? alpha : 1];
  }

  return {
    roundNum:           roundNum,
    formatValueForInput: formatValueForInput,
    parseInputValue:    parseInputValue,
    rgbaToHex:          rgbaToHex,
    hexToRgba:          hexToRgba
  };

})();
