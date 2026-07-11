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
   * Parses a JSON string into an object using a recursive descent parser.
   * ES3-safe — no eval, no arbitrary code execution.
   * @param {string} text The JSON string to parse.
   * @return {*} The parsed object.
   */
  JSON.parse = function parse(text) {
    var pos = 0;
    var len = text.length;

    function skipWS() {
      while (pos < len) {
        var c = text.charAt(pos);
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { pos++; }
        else { break; }
      }
    }

    function parseValue() {
      skipWS();
      if (pos >= len) { throw new Error('Unexpected end of JSON input'); }
      var c = text.charAt(pos);
      if (c === '{') { return parseObject(); }
      if (c === '[') { return parseArray(); }
      if (c === '"') { return parseString(); }
      if (c === '-' || (c >= '0' && c <= '9')) { return parseNumber(); }
      if (c === 't') { return parseKeyword('true', true); }
      if (c === 'f') { return parseKeyword('false', false); }
      if (c === 'n') { return parseKeyword('null', null); }
      throw new Error('Unexpected character at position ' + pos + ': "' + c + '"');
    }

    function parseString() {
      pos++; // skip opening "
      var result = '';
      while (pos < len) {
        var c = text.charAt(pos);
        if (c === '"') { pos++; return result; }
        if (c === '\\') {
          pos++;
          if (pos >= len) { throw new Error('Unterminated string escape'); }
          var esc = text.charAt(pos);
          if (esc === '"')  { result += '"'; }
          else if (esc === '\\') { result += '\\'; }
          else if (esc === '/')  { result += '/'; }
          else if (esc === 'b')  { result += '\b'; }
          else if (esc === 'f')  { result += '\f'; }
          else if (esc === 'n')  { result += '\n'; }
          else if (esc === 't')  { result += '\t'; }
          else if (esc === 'r')  { result += '\r'; }
          else if (esc === 'u') {
            var hex = text.substr(pos + 1, 4);
            if (hex.length < 4) { throw new Error('Invalid unicode escape'); }
            result += String.fromCharCode(parseInt(hex, 16));
            pos += 4;
          }
          else { result += esc; }
          pos++;
        } else {
          result += c;
          pos++;
        }
      }
      throw new Error('Unterminated string');
    }

    function parseNumber() {
      var start = pos;
      if (text.charAt(pos) === '-') { pos++; }
      if (text.charAt(pos) === '0') { pos++; }
      else if (text.charAt(pos) >= '1' && text.charAt(pos) <= '9') {
        pos++;
        while (pos < len && text.charAt(pos) >= '0' && text.charAt(pos) <= '9') { pos++; }
      } else {
        throw new Error('Invalid number at position ' + start);
      }
      if (pos < len && text.charAt(pos) === '.') {
        pos++;
        if (pos >= len || text.charAt(pos) < '0' || text.charAt(pos) > '9') {
          throw new Error('Invalid decimal number at position ' + (pos - 1));
        }
        while (pos < len && text.charAt(pos) >= '0' && text.charAt(pos) <= '9') { pos++; }
      }
      if (pos < len && (text.charAt(pos) === 'e' || text.charAt(pos) === 'E')) {
        pos++;
        if (pos < len && (text.charAt(pos) === '+' || text.charAt(pos) === '-')) { pos++; }
        if (pos >= len || text.charAt(pos) < '0' || text.charAt(pos) > '9') {
          throw new Error('Invalid exponent at position ' + (pos - 1));
        }
        while (pos < len && text.charAt(pos) >= '0' && text.charAt(pos) <= '9') { pos++; }
      }
      return Number(text.substr(start, pos - start));
    }

    function parseObject() {
      pos++; // skip {
      var obj = {};
      skipWS();
      if (text.charAt(pos) === '}') { pos++; return obj; }
      while (true) {
        skipWS();
        if (pos >= len || text.charAt(pos) !== '"') { throw new Error('Expected string key in object'); }
        var key = parseString();
        skipWS();
        if (pos >= len || text.charAt(pos) !== ':') { throw new Error('Expected colon in object'); }
        pos++; // skip :
        var val = parseValue();
        obj[key] = val;
        skipWS();
        if (text.charAt(pos) === '}') { pos++; return obj; }
        if (text.charAt(pos) !== ',') { throw new Error('Expected comma or closing brace in object'); }
        pos++; // skip ,
      }
    }

    function parseArray() {
      pos++; // skip [
      var arr = [];
      skipWS();
      if (text.charAt(pos) === ']') { pos++; return arr; }
      while (true) {
        arr.push(parseValue());
        skipWS();
        if (text.charAt(pos) === ']') { pos++; return arr; }
        if (text.charAt(pos) !== ',') { throw new Error('Expected comma or closing bracket in array'); }
        pos++; // skip ,
      }
    }

    function parseKeyword(word, val) {
      for (var i = 0; i < word.length; i++) {
        if (pos >= len || text.charAt(pos) !== word.charAt(i)) {
          throw new Error('Unexpected token at position ' + pos);
        }
        pos++;
      }
      return val;
    }

    skipWS();
    var result = parseValue();
    skipWS();
    if (pos !== len) { throw new Error('Unexpected trailing characters at position ' + pos); }
    return result;
  };
}
