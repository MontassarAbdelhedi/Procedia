// jsx/json.jsx
// JSON polyfill for ExtendScript (ES3)
// MUST be the first file evaluated in any evalBridge preamble.
// DEPENDS ON: none

if (typeof JSON === 'undefined') {
    JSON = {};
}

(function () {

    // Characters that require escaping inside JSON string values.
    var escapable = /[\\"\x00-\x1f\x7f-\x9f]/g;

    var meta = {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"':  '\\"',
        '\\': '\\\\'
    };

    function quote(string) {
        escapable.lastIndex = 0;
        if (escapable.test(string)) {
            return '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string'
                    ? c
                    : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"';
        }
        return '"' + string + '"';
    }

    function str(key, holder, seen) {
        var value = holder[key];
        var i, k, v, length, partial, type;

        if (value === null) return 'null';

        type = typeof value;

        if (type === 'boolean') return String(value);
        if (type === 'number')  return isFinite(value) ? String(value) : 'null';
        if (type === 'string')  return quote(value);

        if (type === 'object') {
            for (i = 0; i < seen.length; i++) {
                if (seen[i] === value) {
                    throw new TypeError('Converting circular structure to JSON');
                }
            }
            seen.push(value);
            partial = [];

            if (Object.prototype.toString.call(value) === '[object Array]') {
                length = value.length;
                for (i = 0; i < length; i++) {
                    v = str(i, value, seen);
                    partial[i] = (v !== undefined) ? v : 'null';
                }
                v = '[' + partial.join(',') + ']';
            } else {
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value, seen);
                        if (v !== undefined) {
                            partial.push(quote(k) + ':' + v);
                        }
                    }
                }
                v = '{' + partial.join(',') + '}';
            }

            seen.pop();
            return v;
        }

        return undefined;
    }

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value) {
            var holder = {};
            holder[''] = value;
            return str('', holder, []);
        };
    }

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text) {
            var s = String(text);

            if (/^[\],:{}\s]*$/.test(
                    s.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                     .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                     .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
                return eval('(' + s + ')');
            }

            throw new SyntaxError('JSON.parse: invalid JSON');
        };
    }

})();
