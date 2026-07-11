/**
 * @fileoverview commitTitleEdit — persists the inlined label and dispatches rename.
 * @dependencies input/state.js, input/utils.js, graph/graphState.js, graph/nodeRegistry.js,
 *               graph/canvas/renderer/index.js, flush/dirtyFlusher.js
 */

// graph/canvas/input/handlers/titleEdit/commit.js
// DEPENDS ON: input/state.js, input/utils.js, graph/graphState.js, graph/nodeRegistry.js,
//             graph/canvas/renderer/index.js, flush/dirtyFlusher.js
// MUST LOAD AFTER: input/handlers/titleEdit/helpers.js, input/handlers/titleEdit/exit.js
// MUST LOAD BEFORE: input/handlers/index.js

(function() {

  _handlersTitleEdit.commitTitleEdit = function commitTitleEdit() {
    if (!_editingNodeId) return;
    var input = document.querySelector('.node--editing .node-title-input');
    if (!input) { _handlersTitleEdit._exitTitleEdit(); return; }
    var newLabel = input.value.trim();
    var nodeId = _editingNodeId;
    _handlersTitleEdit._exitTitleEdit();
    if (!newLabel) return;
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;
    if (typeof undoManager !== 'undefined') undoManager.capture();
    graphState.updateProp(nodeId, 'label', newLabel);
    if (typeof undoManager !== 'undefined') undoManager.commit('Rename node');
    if (typeof dirtyFlusher !== 'undefined' && dirtyFlusher.schedule) dirtyFlusher.schedule();
    renderer.render();

    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    if (nodeData.type === 'core/comp') {
      _handlersTitleEdit._renameDispatch('setCompProperty', {
        nodeUUID: nodeId, key: 'label', value: newLabel
      });
      return;
    }

    if (nodeData.nodeKind === 'data' || nodeData.nodeKind === 'blending') return;

    var hostingCompUUID = (nodeData.hostingComps && nodeData.hostingComps.length > 0)
      ? nodeData.hostingComps[0] : null;
    if (!hostingCompUUID) {
      var compNodeId = _handlersTitleEdit._findOutputComp(nodeId);
      if (compNodeId) hostingCompUUID = compNodeId;
    }
    if (!hostingCompUUID) return;

    var layerUUID = _handlersTitleEdit._findLayerUUID(nodeId);
    if (!layerUUID) return;

    if (nodeData.nodeKind === 'affected') {
      _handlersTitleEdit._renameDispatch('renameNode', {
        hostingCompUUID: hostingCompUUID, nodeUUID: nodeId, layerUUID: layerUUID, label: newLabel
      });
    } else if (nodeData.nodeKind === 'effector' && def.matchName) {
      _handlersTitleEdit._renameDispatch('renameEffect', {
        hostingCompUUID: hostingCompUUID,
        layerUUID: layerUUID,
        nodeUUID: nodeId,
        effectMatchName: def.matchName,
        label: newLabel
      });
    }
  };

})();
