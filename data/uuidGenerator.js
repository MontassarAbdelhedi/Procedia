var uuidGenerator = (function() {

  function generateNodeId() {
    var rand = Math.random().toString(36).substr(2, 4);
    return 'PROC-' + Date.now() + '-' + rand;
  }

  function generateWireId() {
    var rand = Math.random().toString(36).substr(2, 4);
    return 'WIRE-' + Date.now() + '-' + rand;
  }

  return {
    generateNodeId: generateNodeId,
    generateWireId: generateWireId
  };

}());
