/**
 * Deterministic checksum for snapshot content addressing.
 * Uses a simple non-crypto hash for identity and corruption detection.
 * NOT for security — security is not required by the version control system.
 * @module vcChecksum
 * @dependencies none
 */
// versioning/snapshot/snapshotChecksum.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/snapshot/snapshotSerializer.js

var vcChecksum = (function() {

  /**
   * FNV-1a 32-bit hash for strings.
   * Deterministic across all JavaScript engines.
   * @param {string} str
   * @returns {number} unsigned 32-bit integer
   */
  function fnv32(str) {
    var h = 2166136261;
    var len = str.length;
    for (var i = 0; i < len; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
      h = h >>> 0;
    }
    return h >>> 0;
  }

  /**
   * Generates a hex checksum for any JSON-safe value.
   * Canonicalizes to JSON, then hashes with FNV-1a.
   * @param {*} value
   * @returns {string} 8-char hex string
   */
  function checksum(value) {
    var json;
    try {
      json = JSON.stringify(value);
    } catch (e) {
      json = String(value);
    }
    var h = fnv32(json);
    var hex = h.toString(16);
    while (hex.length < 8) { hex = '0' + hex; }
    return hex;
  }

  /**
   * Validates that a value matches its claimed checksum.
   * @param {*} value
   * @param {string} claimedChecksum
   * @returns {boolean}
   */
  function verify(value, claimedChecksum) {
    return checksum(value) === claimedChecksum;
  }

  return {
    checksum: checksum,
    verify: verify,
    fnv32: fnv32
  };

})();
