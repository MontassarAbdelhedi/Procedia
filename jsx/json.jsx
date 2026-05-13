// jsx/json.jsx
// JSON polyfill for ExtendScript — native JSON is unavailable in AE 2025
// MUST be first in the evalBridge preamble — all other JSX depends on this

var JSON = (function() {

  function escapeStr(s) {
    var out = '"';
    for (var i = 0; i < s.length; i++) {
      var c    = s.charAt(i);
      var code = s.charCodeAt(i);
      if      (c === '"')  { out += '\\"'; }
      else if (c === '\\') { out += '\\\\'; }
      else if (c === '\n') { out += '\\n'; }
      else if (c === '\r') { out += '\\r'; }
      else if (c === '\t') { out += '\\t'; }
      else if (code < 32) {
        var hex = code.toString(16);
        out += '\\u00' + (hex.length < 2 ? '0' + hex : hex);
      } else {
        out += c;
      }
    }
    return out + '"';
  }

  function stringify(val) {
    if (val === null)      return 'null';
    if (val === undefined) return undefined;
    var t = typeof val;
    if (t === 'boolean')   return val ? 'true' : 'false';
    if (t === 'number')    return isFinite(val) ? String(val) : 'null';
    if (t === 'string')    return escapeStr(val);
    if (t === 'function')  return undefined;

    var i, item, parts;

    if (val instanceof Array) {
      parts = [];
      for (i = 0; i < val.length; i++) {
        item = stringify(val[i]);
        parts.push(item === undefined ? 'null' : item);
      }
      return '[' + parts.join(',') + ']';
    }

    parts = [];
    for (var k in val) {
      if (val.hasOwnProperty(k)) {
        var v = stringify(val[k]);
        if (v !== undefined) {
          parts.push(escapeStr(k) + ':' + v);
        }
      }
    }
    return '{' + parts.join(',') + '}';
  }

  function parse(text) {
    return eval('(' + text + ')');
  }

  return { stringify: stringify, parse: parse };

}());
