var inspector = (function() {

  var el = null;

  function showEmpty() {
    el.innerHTML = '<div class="inspector-empty">Select a node</div>';
  }

  function showNode(nodeData) {
    var def = nodeRegistry.getByType(nodeData.type);
    var label = def ? def.label : nodeData.type;
    var stateColor = { ghost: '#555555', alive: '#7ec98f', error: '#d46e6e' };
    var color = stateColor[nodeData.state] || '#555555';
    el.innerHTML =
      '<div class="inspector-header">' +
        '<span class="inspector-node-label">' + label + '</span>' +
        '<span class="inspector-state-badge" style="color:' + color + '">' + nodeData.state + '</span>' +
      '</div>';
    // Phase 5 will add full property fields below the header
  }

  function init() {
    el = document.getElementById('inspector');
    showEmpty();

    graphState.onSelectionChange(function(uuid) {
      if (!uuid) {
        showEmpty();
        return;
      }
      var nodeData = graphState.getNode(uuid);
      if (nodeData) showNode(nodeData);
      else showEmpty();
    });
  }

  return {
    init:      init,
    showEmpty: showEmpty,
    showNode:  showNode
  };

}());
