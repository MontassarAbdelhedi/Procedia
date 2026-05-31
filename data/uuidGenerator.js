/**
 * UUID generators for Procedia nodes and wires.
 * Produces unique identifiers using a timestamp + random suffix pattern.
 * Depends on: (none)
 * Exports: uuidGenerator object with node() and wire()
 */
// data/uuidGenerator.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: everything

var uuidGenerator = (function() {

  /**
   * Generates a random 4-character alphanumeric string.
   * @returns {string}
   */
  function rand4() {
    var r = Math.random().toString(36).substr(2, 4);
    while (r.length < 4) r += '0';
    return r;
  }

  /**
   * Generates a unique node UUID with a "PROC-" prefix.
   * @returns {string}
   */
  function node() {
    return 'PROC-' + Date.now() + '-' + rand4();
  }

  /**
   * Generates a unique wire UUID with a "WIRE-" prefix.
   * @returns {string}
   */
  function wire() {
    return 'WIRE-' + Date.now() + '-' + rand4();
  }

  return {
    node: node,
    wire: wire
  };

})();
