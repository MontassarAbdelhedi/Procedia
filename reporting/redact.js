// reporting/redact.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: reporting/envSnapshot.js, reporting/reporter.js
//
// Telemetry redaction helpers (GDPR/CCPA). Labels are truncated to their first
// 3 characters plus total length; identifiers are hashed with a fixed salt so
// the raw UUID is never shipped.

var redact = (function() {

  var _SALT = 'procedia-telemetry-v1';

  function _hashString(str) {
    var s = _SALT + '|' + str;
    var h1 = 0xdeadbeef;
    var h2 = 0x41c6ce57;
    var i;
    for (i = 0; i < s.length; i++) {
      var ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }

  /**
   * Truncates a label to its first 3 characters plus its total length.
   * "MyLayer" -> "MyL(7)". Empty/null stays empty.
   * @param {*} value The raw label.
   * @return {string} Redacted label.
   */
  function label(value) {
    if (value === null || value === undefined) return '';
    var s = String(value);
    if (s.length === 0) return '';
    return s.substr(0, 3) + '(' + s.length + ')';
  }

  /**
   * Hashes an identifier so raw UUIDs are never shipped. Deterministic so
   * graph topology stays correlatable across nodes/wires.
   * @param {*} value The raw identifier.
   * @return {string|null} Hashed identifier or null for empty input.
   */
  function id(value) {
    if (value === null || value === undefined || value === '') return null;
    return 'h' + _hashString(String(value));
  }

  /**
   * Hashes arbitrary payload content (e.g. a serialized command) for
   * correlation without shipping the payload itself.
   * @param {*} value The raw content.
   * @return {string|null} Hashed content or null for empty input.
   */
  function hash(value) {
    if (value === null || value === undefined || value === '') return null;
    return _hashString(String(value));
  }

  return {
    label: label,
    id:    id,
    hash:  hash
  };

})();
