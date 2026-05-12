var inspector = (function() {

  var el = null;

  function showEmpty() {
    el.innerHTML = '<div class="inspector-empty">Select a node</div>';
  }

  function init() {
    el = document.getElementById('inspector');
    showEmpty();
  }

  // Phase 5 will add: showNode(nodeData), update(patch)
  return {
    init: init,
    showEmpty: showEmpty
  };

}());
