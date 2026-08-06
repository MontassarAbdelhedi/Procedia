/**
 * @fileoverview Render orchestration and state-mutating CRUD for canvas comments.
 * Handles full re-render, remove, collapse toggle, color set, create, removeAll,
 * and bulk load. Delegates element construction/update to commentElement.js.
 * @module comment/DOM
 * @dependencies comment/state, comment/commentElement.js
 * @internal
 */
// graph/comment/commentDOM.js
// DEPENDS ON: graph/comment/commentState.js, graph/comment/commentElement.js
// MUST LOAD AFTER: graph/comment/commentState.js, graph/comment/commentElement.js
// MUST LOAD BEFORE: graph/comment/commentColorPicker.js, graph/comment/commentEvents.js,
//                   graph/comment/commentManager.js

(function(cm) {

  cm._render = function _render() {
    var vp = cm._getViewport();
    if (!vp) return;

    for (var id in cm._elements) {
      if (cm._elements.hasOwnProperty(id) && !cm._comments[id]) {
        var stale = cm._elements[id];
        if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
        delete cm._elements[id];
      }
    }

    for (var cid in cm._comments) {
      if (!cm._comments.hasOwnProperty(cid)) continue;
      var cmt = cm._comments[cid];
      if (cm._elements[cid]) {
        cm._updateElement(cm._elements[cid], cmt);
      } else {
        var el = cm._buildElement(cid, cmt);
        vp.appendChild(el);
        cm._elements[cid] = el;
      }
    }
  };

  cm._remove = function _remove(id) {
    if (!cm._comments[id]) return;
    delete cm._comments[id];
    if (cm._selectedId === id) cm._selectedId = null;
    if (cm._editingId === id) cm._editingId = null;
    cm._render();
  };

  cm._toggleCollapse = function _toggleCollapse(id) {
    if (!cm._comments[id]) return;
    cm._comments[id].collapsed = !cm._comments[id].collapsed;
    cm._render();
  };

  cm._setColor = function _setColor(id, color) {
    if (!cm._comments[id]) return;
    cm._comments[id].color = color;
    cm._render();
  };

  cm.create = function create(x, y, text) {
    var id = uuidGenerator.comment();
    cm._comments[id] = {
      id: id,
      x: x,
      y: y,
      text: text || '',
      color: '#FFD700',
      collapsed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    cm._render();

    var el = cm._elements[id];
    if (el) {
      var ta = el.querySelector('.comment-textarea');
      if (ta) {
        ta.focus();
      }
    }

    return id;
  };

  cm.removeAll = function removeAll() {
    for (var id in cm._elements) {
      if (cm._elements.hasOwnProperty(id)) {
        var el = cm._elements[id];
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
    }
    cm._comments = {};
    cm._elements = {};
    cm._selectedId = null;
    cm._editingId = null;
    cm._dragState = { active: false };
    cm._hideColorPicker();
    cm._colorPickerCommentId = null;
  };

  cm.load = function load(comments) {
    if (!comments) return;
    for (var id in comments) {
      if (comments.hasOwnProperty(id)) {
        cm._comments[id] = comments[id];
      }
    }
    cm._render();
  };

})(window.__procedia_internal.cm);
