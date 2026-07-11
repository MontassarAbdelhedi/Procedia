/**
 * Multi-select tracking for graph nodes.
 * Provides setSelection, getSelection, addToSelection, removeFromSelection,
 * toggleSelection, isSelected, clearSelection, replaceSelection,
 * getSelectionCount, onSelectionChange.
 * @module graphState/selection
 * @dependencies graphState/state
 */
// graph/graphState/selection.js
// DEPENDS ON: graph/graphState/state.js
// MUST LOAD BEFORE: graph/graphState/index.js

(function(gs) {

  function _fireSelectionChange() {
    if (gs._onSelectionChangeCb) {
      gs._onSelectionChangeCb(gs.selection);
    }
  }

  function setSelection(uuid) {
    if (uuid === null || uuid === undefined) {
      gs.selection = [];
    } else {
      gs.selection = [uuid];
    }
    _fireSelectionChange();
  }

  function getSelection() {
    return gs.selection;
  }

  function addToSelection(uuid) {
    if (gs.selection.indexOf(uuid) === -1) {
      gs.selection.push(uuid);
    }
    _fireSelectionChange();
  }

  function removeFromSelection(uuid) {
    var idx = gs.selection.indexOf(uuid);
    if (idx !== -1) {
      gs.selection.splice(idx, 1);
    }
    _fireSelectionChange();
  }

  function toggleSelection(uuid) {
    var idx = gs.selection.indexOf(uuid);
    if (idx !== -1) {
      gs.selection.splice(idx, 1);
    } else {
      gs.selection.push(uuid);
    }
    _fireSelectionChange();
  }

  function isSelected(uuid) {
    return gs.selection.indexOf(uuid) !== -1;
  }

  function clearSelection() {
    gs.selection = [];
    _fireSelectionChange();
  }

  function replaceSelection(uuids) {
    if (!Array.isArray(uuids)) {
      gs.selection = [];
    } else {
      gs.selection = uuids.slice();
    }
    _fireSelectionChange();
  }

  function getSelectionCount() {
    return gs.selection.length;
  }

  function onSelectionChange(callback) {
    gs._onSelectionChangeCb = callback;
  }

  gs.setSelection        = setSelection;
  gs.getSelection        = getSelection;
  gs.addToSelection      = addToSelection;
  gs.removeFromSelection = removeFromSelection;
  gs.toggleSelection     = toggleSelection;
  gs.isSelected          = isSelected;
  gs.clearSelection      = clearSelection;
  gs.replaceSelection    = replaceSelection;
  gs.getSelectionCount   = getSelectionCount;
  gs.onSelectionChange   = onSelectionChange;

})(window.__procedia_internal.gs);
