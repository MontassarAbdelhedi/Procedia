/**
 * @fileoverview Shared internal state for comment modules.
 * Holds _comments, _elements, _selectedId, _editingId, _dragState,
 * color picker refs, COLORS palette, and basic getter/setter utilities.
 * @module comment/state
 * @dependencies data/uuidGenerator.js
 * @internal
 */
// graph/comment/commentState.js
// DEPENDS ON: data/uuidGenerator.js
// MUST LOAD BEFORE: graph/comment/commentDOM.js, graph/comment/commentColorPicker.js,
//                   graph/comment/commentEvents.js, graph/comment/commentManager.js

window.__procedia_internal.cm = {
  _comments: {},
  _elements: {},
  _selectedId: null,
  _editingId: null,
  _dragState: { active: false },
  _colorPickerEl: null,
  _colorPickerCommentId: null,

  COLORS: [
    { name: 'yellow', hex: '#FFD700' },
    { name: 'lime',   hex: '#4CAF50' },
    { name: 'red',    hex: '#F44336' },
    { name: 'blue',   hex: '#2196F3' },
    { name: 'orange', hex: '#FF9800' },
    { name: 'violet', hex: '#9C27B0' },
    { name: 'teal',   hex: '#06D6A0' },
    { name: 'white',  hex: '#E8E8E8' }
  ]
};

(function(cm) {

  cm._getViewport = function _getViewport() {
    return document.getElementById('canvas-nodes');
  };

  cm._findCommentElement = function _findCommentElement(target) {
    var el = target;
    var boundary = cm._getViewport();
    while (el && el !== boundary && el !== document.body) {
      if (el.classList && el.classList.contains('comment')) return el;
      el = el.parentElement;
    }
    return null;
  };

  cm._select = function _select(id) {
    if (cm._selectedId !== null && cm._elements[cm._selectedId]) {
      cm._elements[cm._selectedId].classList.remove('comment--selected');
    }
    cm._selectedId = id;
    if (id && cm._elements[id]) {
      cm._elements[id].classList.add('comment--selected');
    }
  };

  cm._deselect = function _deselect() {
    if (cm._selectedId !== null && cm._elements[cm._selectedId]) {
      cm._elements[cm._selectedId].classList.remove('comment--selected');
    }
    cm._selectedId = null;
  };

  cm.getAll = function getAll() {
    var result = {};
    for (var id in cm._comments) {
      if (cm._comments.hasOwnProperty(id)) {
        result[id] = cm._comments[id];
      }
    }
    return result;
  };

  cm.getSelected = function getSelected() {
    return cm._selectedId;
  };

  cm.getEditing = function getEditing() {
    return cm._editingId;
  };

  cm.select = function select(id) {
    if (id && cm._comments[id]) {
      cm._select(id);
    }
  };

  cm.deselect = function deselect() {
    cm._deselect();
  };

  cm.findByElement = function findByElement(target) {
    return cm._findCommentElement(target);
  };

})(window.__procedia_internal.cm);
