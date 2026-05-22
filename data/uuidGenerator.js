// data/uuidGenerator.js
// DEPENDS ON: none
// MUST LOAD BEFORE: everything

var uuidGenerator = (function() {

  function rand4() {
    var s = Math.random().toString(36).substr(2, 4);
    while (s.length < 4) s = s + '0';
    return s;
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
