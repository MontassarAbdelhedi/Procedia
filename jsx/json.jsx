/**
 * @fileoverview JSON polyfill for ExtendScript (ES3-safe).
 * MUST be the FIRST file in the evalBridge preamble, every time, without exception.
 * JSON is not a native global in ExtendScript on AE 2025.
 * Exports: polyfills for JSON.stringify, JSON.parse
 */
// json.jsx — JSON polyfill for ExtendScript (ES3-safe)
// MUST be the FIRST file in the evalBridge preamble, every time, without exception.
// JSON is not a native global in ExtendScript on AE 2025.

if (typeof JSON === 'undefined') {
  var JSON = {};
}

if (typeof JSON.stringify !== 'function') {
  /**
   * Serializes a value to a JSON string.
   * @param {*} val The value to stringify.
   * @return {string|undefined} JSON string or undefined for unsupported types.
   */
  JSON.stringify = function stringify(val) {
    var type = typeof val;
    if (val === null)         return 'null';
    if (type === 'undefined') return undefined;
    if (type === 'boolean')   return val ? 'true' : 'false';
    if (type === 'number') {
      if (isNaN(val) || !isFinite(val)) return 'null';
      return String(val);
    }
    if (type === 'string') {
      return '"' + val
        .replace(/\\/g,   '\\\\')
        .replace(/"/g,    '\\"')
        .replace(/\x08/g, '\\b')
        .replace(/\t/g,   '\\t')
        .replace(/\n/g,   '\\n')
        .replace(/\f/g,   '\\f')
        .replace(/\r/g,   '\\r')
        + '"';
    }
    if (type === 'object') {
      if (val instanceof Array) {
        var aParts = [];
        for (var i = 0; i < val.length; i++) {
          var aItem = stringify(val[i]);
          aParts.push(typeof aItem === 'undefined' ? 'null' : aItem);
        }
        return '[' + aParts.join(',') + ']';
      }
      var oParts = [];
      for (var k in val) {
        if (val.hasOwnProperty(k)) {
          var oVal = stringify(val[k]);
          if (typeof oVal !== 'undefined') {
            oParts.push(stringify(k) + ':' + oVal);
          }
        }
      }
      return '{' + oParts.join(',') + '}';
    }
    return undefined;
  };
}

if (typeof JSON.parse !== 'function') {
  /**
   * Parses a JSON string into an object using eval.
   * @param {string} text The JSON string to parse.
   * @return {*} The parsed object.
   */
  JSON.parse = function parse(text) {
    return eval('(' + String(text) + ')');
  };
}
