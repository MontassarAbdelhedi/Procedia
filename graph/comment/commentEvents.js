/**
 * @fileoverview Event handlers for canvas comment interaction.
 * Handles drag (header mousedown/move/up), text input/focus/blur,
 * and click delegation (delete, collapse, color, select).
 * @module comment/events
 * @dependencies comment/state, graph/canvas/viewport.js
 * @internal
 */
// graph/comment/commentEvents.js
// DEPENDS ON: graph/comment/commentState.js, graph/comment/commentDOM.js,
//             graph/comment/commentColorPicker.js, graph/canvas/viewport.js
// MUST LOAD AFTER: graph/comment/commentState.js, graph/comment/commentDOM.js,
//                  graph/comment/commentColorPicker.js
// MUST LOAD BEFORE: graph/comment/commentManager.js

(function(cm) {

  cm._onHeaderMouseDown = function _onHeaderMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('[data-action]')) return;
    if (e.target.tagName === 'TEXTAREA') return;
    var commentEl = cm._findCommentElement(e.target);
    if (!commentEl) return;
    var id = commentEl.getAttribute('data-comment-id');
    if (!id || !cm._comments[id]) return;

    cm._select(id);
    cm._dragState = {
      active: true,
      commentId: id,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      startCommentX: cm._comments[id].x,
      startCommentY: cm._comments[id].y,
      moved: false
    };

    commentEl.classList.add('comment--dragging');
    e.stopPropagation();
    e.preventDefault();
  };

  cm._onDragMove = function _onDragMove(e) {
    if (!cm._dragState.active) return;

    var dx = e.clientX - cm._dragState.startScreenX;
    var dy = e.clientY - cm._dragState.startScreenY;

    if (!cm._dragState.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      cm._dragState.moved = true;
    }

    if (cm._dragState.moved) {
      var cmt = cm._comments[cm._dragState.commentId];
      if (!cmt) return;
      var zoom = viewport.getTransform().zoom;
      cmt.x = cm._dragState.startCommentX + dx / zoom;
      cmt.y = cm._dragState.startCommentY + dy / zoom;
      cm._updateElementPosition(cm._elements[cm._dragState.commentId], cmt);
    }
  };

  cm._onDragEnd = function _onDragEnd(e) {
    if (!cm._dragState.active) return;
    var el = cm._elements[cm._dragState.commentId];
    if (el) el.classList.remove('comment--dragging');
    cm._dragState = { active: false };
  };

  cm._onTextInput = function _onTextInput(e) {
    var ta = e.target;
    var commentEl = cm._findCommentElement(ta);
    if (!commentEl) return;
    var id = commentEl.getAttribute('data-comment-id');
    if (id && cm._comments[id]) {
      cm._comments[id].text = ta.value;
      cm._comments[id].updatedAt = Date.now();
    }
  };

  cm._onTextFocus = function _onTextFocus(e) {
    var commentEl = cm._findCommentElement(e.target);
    if (!commentEl) return;
    cm._editingId = commentEl.getAttribute('data-comment-id');
  };

  cm._onTextBlur = function _onTextBlur(e) {
    cm._editingId = null;
  };

  cm._onCommentClick = function _onCommentClick(e) {
    if (cm._dragState.moved) return;

    var target = e.target;
    var btn = target.closest('[data-action]');
    if (btn) {
      var action = btn.getAttribute('data-action');
      var commentEl = cm._findCommentElement(btn);
      if (!commentEl) return;
      var id = commentEl.getAttribute('data-comment-id');
      if (!id) return;
      switch (action) {
        case 'delete':
          e.stopPropagation();
          cm._remove(id);
          break;
        case 'collapse':
          e.stopPropagation();
          cm._toggleCollapse(id);
          break;
        case 'color':
          e.stopPropagation();
          cm._toggleColorPicker(id, btn);
          break;
      }
      return;
    }

    if (target.tagName === 'TEXTAREA') {
      return;
    }

    var commentEl = cm._findCommentElement(target);
    if (commentEl) {
      e.stopPropagation();
      cm._select(commentEl.getAttribute('data-comment-id'));
    }
  };

})(window.__procedia_internal.cm);
