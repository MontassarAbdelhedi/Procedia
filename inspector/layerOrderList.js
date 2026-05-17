// inspector/layerOrderList.js
// DEPENDS ON: graph/graphState/store.js, graph/nodes/nodeRegistry.js, bridge/evalBridge.js
// MUST LOAD BEFORE: inspector/inspector.js

var layerOrderList = (function() {

  function applyStoredOrder(compUUID, nodes) {
    var compNode = graphState.getNode(compUUID);
    var order = compNode && compNode._layerOrder;
    if (!order || order.length === 0) return nodes;

    var byId = {};
    var used = {};
    var sorted = [];
    var i;

    for (i = 0; i < nodes.length; i++) {
      byId[nodes[i].id] = nodes[i];
    }

    for (i = 0; i < order.length; i++) {
      if (byId[order[i]]) {
        sorted.push(byId[order[i]]);
        used[order[i]] = true;
      }
    }

    for (i = 0; i < nodes.length; i++) {
      if (!used[nodes[i].id]) sorted.push(nodes[i]);
    }

    return sorted;
  }

  function storeLayerOrder(compUUID, orderedUUIDs) {
    var compNode = graphState.getNode(compUUID);
    if (!compNode) return;
    graphState.updateNode(compUUID, { _layerOrder: orderedUUIDs.slice(0) });
  }

  // Returns nodes wired as inputs to compUUID, honoring any inspector order.
  function getInputNodes(compUUID) {
    var allWires = graphState.getAllWires();
    var nodes = [];
    var seen = {};
    for (var wid in allWires) {
      if (!allWires.hasOwnProperty(wid)) continue;
      var w = allWires[wid];
      if (w.toNode !== compUUID) continue;
      if (seen[w.fromNode]) continue;
      seen[w.fromNode] = true;
      var n = graphState.getNode(w.fromNode);
      if (n) nodes.push(n);
    }
    return applyStoredOrder(compUUID, nodes);
  }

  function callSetLayerOrder(compUUID, orderedUUIDs) {
    evalBridge.evalScript(
      'setLayerOrder(' +
        JSON.stringify(compUUID) + ', ' +
        JSON.stringify(JSON.stringify(orderedUUIDs)) +
      ')'
    ).then(function(res) {
      if (!res.ok) console.error('[Procedia] setLayerOrder failed:', res.error);
    }).catch(function(err) {
      console.error('[Procedia] setLayerOrder error:', err.message);
    });
  }

  // Build the drag-to-reorder list DOM inside containerEl
  function build(compUUID, containerEl) {
    containerEl.innerHTML = '';

    var nodes = getInputNodes(compUUID);

    if (nodes.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'layer-list-empty';
      empty.textContent = 'No connected layers';
      containerEl.appendChild(empty);
      return;
    }

    var dragSrc = null;

    for (var i = 0; i < nodes.length; i++) {
      (function(node) {
        var row = document.createElement('div');
        row.className = 'layer-list-row';
        row.draggable = true;
        row.dataset.uuid = node.id;

        var handle = document.createElement('span');
        handle.className = 'layer-list-handle';
        handle.textContent = '⠇';  // braille ⠇ as grab handle glyph

        var lbl = document.createElement('span');
        lbl.className = 'layer-list-label';
        var def = nodeRegistry.getByType(node.type);
        lbl.textContent = node.label || (def ? def.label : node.type);

        row.appendChild(handle);
        row.appendChild(lbl);

        row.addEventListener('dragstart', function(e) {
          dragSrc = row;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', node.id);
          setTimeout(function() { row.classList.add('dragging'); }, 0);
        });

        row.addEventListener('dragend', function() {
          dragSrc = null;
          row.classList.remove('dragging');
          var all = containerEl.querySelectorAll('.layer-list-row');
          for (var j = 0; j < all.length; j++) {
            all[j].classList.remove('drag-over');
          }
        });

        row.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (row !== dragSrc) row.classList.add('drag-over');
        });

        row.addEventListener('dragleave', function() {
          row.classList.remove('drag-over');
        });

        row.addEventListener('drop', function(e) {
          e.preventDefault();
          row.classList.remove('drag-over');
          if (!dragSrc || dragSrc === row) return;

          var allRows = Array.prototype.slice.call(
            containerEl.querySelectorAll('.layer-list-row')
          );
          var srcIdx = allRows.indexOf(dragSrc);
          var tgtIdx = allRows.indexOf(row);

          if (srcIdx < tgtIdx) {
            containerEl.insertBefore(dragSrc, row.nextSibling);
          } else {
            containerEl.insertBefore(dragSrc, row);
          }

          // Read new DOM order and push to AE
          var newRows = containerEl.querySelectorAll('.layer-list-row');
          var orderedUUIDs = [];
          for (var k = 0; k < newRows.length; k++) {
            orderedUUIDs.push(newRows[k].dataset.uuid);
          }

          var compNode = graphState.getNode(compUUID);
          if (compNode && compNode.state === 'alive') {
            callSetLayerOrder(compUUID, orderedUUIDs);
          }
          storeLayerOrder(compUUID, orderedUUIDs);
        });

        containerEl.appendChild(row);
      }(nodes[i]));
    }
  }

  return {
    build:          build,
    getInputNodes:  getInputNodes
  };

}());
