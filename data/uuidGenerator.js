// data/uuidGenerator.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: everything

var uuidGenerator = (function() {

  function rand4() {
    var r = Math.random().toString(36).substr(2, 4);
    while (r.length < 4) r += '0';
    return r;
  }

  function node() {
    return 'PROC-' + Date.now() + '-' + rand4();
  }

  function wire() {
    return 'WIRE-' + Date.now() + '-' + rand4();
  }

  return {
    node: node,
    wire: wire
  };

})();
